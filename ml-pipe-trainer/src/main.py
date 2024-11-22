# -*- coding: utf-8 -*-
#----------------------------------
# Created By : Beto Estrada
# Created Date: 10/18/2024
# version 1.0
#----------------------------------
""" This file contains the different FastAPI routes
for the trainer container.
 """ 
#----------------------------------
# 
#
from fastapi import FastAPI, Form, UploadFile, Request
from io import BytesIO
import json
import pandas as pd
import requests
import os
import signal

from src.pipeline_manager import run_pipeline

app = FastAPI()
class worker:
    job_specification = None
    results = None
    token = None

THIS_WORKER = worker()

def bytes_to_dataframe(file: UploadFile):
    """Converts uploaded file to BytesIO stream, and then to Pandas DataFrame"""
    contents = file.file.read()
    buffer = BytesIO(contents)
    # NOTE:: This assumes that the first column is the index. Probably not ideal.
    df = pd.read_csv(buffer, index_col=0)
    buffer.close()
    file.file.close()

    return df

@app.post("/api/init")
async def init(request: Request):
    json = await request.json()
    THIS_WORKER.token = json['session_token']
    print(f'MY TOKEN IS: {THIS_WORKER.token}')


@app.post("/api/postJob/")
async def post_job(request: Request):
    THIS_WORKER.job_specification = await request.json()

@app.post("/api/postData/")
async def post_job():
    print("Data posted")

    #TODO:: When the front end file sharing is ready this endpoint can actually run the training logic
    # df_dataset = bytes_to_dataframe(data_file)

    # job_specification_dict = json.loads(THIS_WORKER.job_specification)

    # THIS_WORKER.results = run_pipeline(df_dataset, job_specification_dict).to_json(orient="records")

    print('TRAINING FINISHED')
    requests.post('http://host.docker.internal:8000/api/postfinishedtraining/', json={'session_token': THIS_WORKER.token})

    
@app.get("/api/getresults")
async def get_results():
    # As the front has asked us for the results, we know we are safe to be killed, we tell the controller to terminate us
    requests.post('http://host.docker.internal:8000/api/postterminating/', json={'session_token': THIS_WORKER.token})

    # Return the results
    return THIS_WORKER.results

@app.post("/runjob/")
async def run_job(data_file: UploadFile, job_specification: str = Form(...)):

    df_dataset = bytes_to_dataframe(data_file)

    job_specification_dict = json.loads(job_specification)

    df_performance_metrics = run_pipeline(df_dataset, job_specification_dict)

    return df_performance_metrics.to_json(orient="records")