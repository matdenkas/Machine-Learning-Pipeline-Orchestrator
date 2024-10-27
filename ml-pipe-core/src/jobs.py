# -*- coding: utf-8 -*-
#----------------------------------
# Created By : Matthew Kastl
# Created Date: 09/30/2024
# version 1.0
#----------------------------------
""" This file contains the logic controlling
jobs and the multithreaded load balancer
 """ 
#----------------------------------
# 
#
#Imports
from pydantic import BaseModel
import threading
from queue import Queue, Empty
from session import Session_Manager, Session_Status, Session
from os import getenv
import docker
import requests

JOB_QUEUE_SIZE = 200


class Job:

    def __init__(self, session_token: str, job_spec: any):
        self.session_token = session_token
        self.job_spec = job_spec


class Job_Manager:
    def __init__(self, session_manager: Session_Manager):
        self.__session_manager = session_manager
        self.__job_queue = Queue(JOB_QUEUE_SIZE)

        # The port registry holds what ports we are allowed to give out and 
        # if something is already holding it
        MIN_PORT = int(getenv('MIN_PORT'))
        MAX_PORT = int(getenv('MAX_PORT'))

        # Port numbers are mapped to owning session tokens
        self.__port_registry = {port_number : '' for port_number in range(MIN_PORT, MAX_PORT + 1)}
        self.__dispatcher = Dispatcher(self.__job_queue, self.__session_manager, self.__port_registry).start()
        self.__overwatch = Overwatch(self.__session_manager, self.__port_registry).start()

    def __del__(self):
        self.__job_queue.join()

        self.__dispatcher.stop()
        self.__dispatcher.join()

        self.__overwatch.stop()
        self.__overwatch.join()

    def queue_job(self, job: Job):
        related_session: Session | None = self.__session_manager.session_registry.get(job.session_token)
        if related_session is None: return 
        related_session.status = Session_Status.PENDING_AVAILABLE_TRAINER
        self.__job_queue.put(job)


class Dispatcher(threading.Thread):

    def __init__(self, queue: Queue, session_manager: Session_Manager, port_registry: dict[int:bool], *args, **kwargs):
        self.__queue = queue
        self.__session_manager = session_manager
        self.__stop_event = threading.Event()

        self.__docker_client = docker.from_env()

        self.__port_registry = port_registry

        super().__init__(*args, **kwargs)


    def stop(self):
        self.__stop_event.set()

    def run(self):
        while(True):
            if self.__stop_event.is_set():
                break

            try:

                job: Job = self.__queue.get(block=True, timeout= 5)
                
                was_successful = self.__def_try_dispatch_job(job, self.__session_manager)
                if not  was_successful:
                    self.__queue.put_nowait(job)
                self.__queue.task_done()

            except Empty:
                pass
 
    def __def_try_dispatch_job(self, job: Job, session_manager: Session_Manager) -> bool: 

        # Identify a valid port we can raise this container at
        valid_port = None
        for port, mapped_token in self.__port_registry.items():
            if not mapped_token:
                valid_port = port
                self.__port_registry[port] = job.session_token # Claim the port

        # If there are no valid ports we wont spin up a new container
        # The job should be requeued
        if valid_port is None: return False

        # Update the session from the session registry such that overwatch can take over from here
        related_session: Session =  session_manager.session_registry[job.session_token]
        related_session.worker_port = valid_port
        related_session.job = job
        related_session.status = Session_Status.PENDING_HEALTHY_RESPONSE

        # Start up a worker container
        self.__docker_client.containers.run(
            image= "machine-learning-pipeline-orchestrator-trainer:latest", 
            command= ["fastapi", "dev", "./main.py", "--host", "0.0.0.0", "--port", "80"],
            ports= {80:valid_port},
            name= related_session.token,
            detach= True
        )

        return True


class Overwatch(threading.Thread):

    def __init__(self, session_manager: Session_Manager, port_registry: dict[int:bool], *args, **kwargs):
        self.__session_manager = session_manager
        self.__stop_event = threading.Event()

        self.__ROOT_WORKER_URL = str(getenv('ROOT_WORKER_URL'))

        self.__port_registry = port_registry

        self.__docker_client = docker.from_env()

        super().__init__(*args, **kwargs)


    def stop(self):
        self.__stop_event.set()

    def run(self):
        while(True):
            # Stop when we are told
            if self.__stop_event.is_set():
                break
            
            # If not look for active workers to manage
            for _, session_token in self.__port_registry.items():
                if session_token:
                    self.__handel_active_worker(session_token)
                    

    def __handel_active_worker(self, session_token: str):

        related_session: Session = self.__session_manager.session_registry[session_token]

        worker_url = f'{self.__ROOT_WORKER_URL}:{related_session.worker_port}/api'

        match related_session.status:
            case Session_Status.PENDING_AVAILABLE_TRAINER:
                pass # We should never be able to hit this
            case Session_Status.PENDING_HEALTHY_RESPONSE:

                init_url = worker_url + '/init/'
                response = None
                try:
                    response = requests.post(init_url, json={'session_token': related_session.token})
                except requests.exceptions.RequestException as e:  # This is the correct syntax
                    print(f'{e}\n\nPort: {related_session.worker_port} Token: {related_session.token}')

                if response and response.status_code == 200:
                    related_session.status = Session_Status.PENDING_JOB
                
            case Session_Status.PENDING_JOB:
                post_job_url = worker_url + '/postJob/'

                response = None
                try:
                    response = requests.post(post_job_url, json=related_session.job.job_spec)
                except requests.exceptions.RequestException as e:  # This is the correct syntax
                    print(f'{e}\n\nPort: {related_session.worker_port} Token: {related_session.token}')
                

                if response and response.status_code == 200:
                    related_session.status = Session_Status.PENDING_DATA_TRANSFER
                
            case Session_Status.PENDING_DATA_TRANSFER:
                pass
            case Session_Status.TRAINING:
                pass
            case Session_Status.PENDING_RESPONSE_FETCH:
                pass
            case Session_Status.FINISHED:

                self.__docker_client.containers.get(related_session.token).kill()


                # free port
                self.__port_registry[related_session.worker_port] = ''
                related_session.worker_port = None
            case _:
                raise NotImplementedError('related_session.status found in Overwatch__handel_active_worker')



