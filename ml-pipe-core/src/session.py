# -*- coding: utf-8 -*-
#----------------------------------
# Created By : Matthew Kastl
# Created Date: 09/30/2024
# version 1.0
#----------------------------------
""" This file contains logic and datastructures 
for a client session
 """ 
#----------------------------------
# 
#
#Imports
from secrets import token_urlsafe
from enum import Enum

class Session_Manager:
    def __init__(self):
        self.TOKEN_LENGTH = 18
        self.session_registry: dict[str:Session] = {}

    def new_session(self) -> str:

        # Ensure the token we generate isn't already used
        while(True):
            token = self.__generate_session_token()
            if self.session_registry.get('token') is None:
                break

        session = Session(token)
        self.session_registry[token] = session
        return token

    def poll_session(self, token: str) -> str | None:
        session: Session | None = self.session_registry.get(token)
        if session is None: return None
        else: return session.status.name
    
    def __generate_session_token(self):
        return token_urlsafe(self.TOKEN_LENGTH)
    

class Session():
    def __init__(self, token: str):
        self.token = token
        self.status = Session_Status.PENDING_JOB
        self.job = None


class Session_Status(Enum):
    ERROR = -1
    COMPLETED = 0
    PENDING_JOB = 1
    PENDING_AVAILABLE_TRAINER = 2
    PENDING_HEALTHY_RESPONSE = 3
    PENDING_DATA_TRANSFER = 4
    TRAINING = 5
    PENDING_RESPONSE_FETCH = 6

