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
from session import Session_Manager, Session_Status
from os import getenv

JOB_QUEUE_SIZE = 200


class Job(BaseModel):
    session_token: str = None
    job_spec: dict = None



class Job_Manager:
    def __init__(self, session_manager: Session_Manager):
        self.__session_manager = session_manager
        self.__job_queue = Queue(JOB_QUEUE_SIZE)
        self.__dispatcher  = Dispatcher(self.__job_queue, self.__session_manager).start()

    def __del__(self):
        self.__job_queue.join()
        self.__dispatcher.stop()
        self.__dispatcher.join()

    def queue_job(self, job: Job):
        self.__job_queue.put(job)


class Dispatcher(threading.Thread):

    def __init__(self, queue: Queue, session_manager: Session_Manager, *args, **kwargs):
        self.__queue = queue
        self.__session_manager = session_manager
        self.__stop_event = threading.Event()

        # The port registry holds what ports we are allowed to give out and 
        # if something is already holding it
        MIN_PORT = int(getenv('MIN_PORT'))
        MAX_PORT = int(getenv('MAX_PORT'))
        self.__port_registry = [{port_number: False} for port_number in range(MIN_PORT, MAX_PORT + 1)]

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
 
    def __def_try_dispatch_job(job: Job, session_manager: Session_Manager) -> bool: 
        pass
