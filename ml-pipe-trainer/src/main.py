# -*- coding: utf-8 -*-
#----------------------------------
# Created By : Beto Estrada
# Created Date: 10/24/2024
# version 1.1
#----------------------------------
""" This file contains the different FastAPI routes
for the trainer container.
 """ 
#----------------------------------
# 
#
from fastapi import FastAPI, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO, StringIO
import pandas as pd
import requests

from src.pipeline_manager import run_pipeline

app = FastAPI()

# Allow CORS from all origins (*)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class worker:
    job_specification = None
    data = None
    results = None
    token = None

THIS_WORKER = worker()

@app.post("/api/init")
async def init(request: Request):
    json = await request.json()
    THIS_WORKER.token = json['session_token']


@app.post("/api/postJob/")
async def post_job(request: Request):
    THIS_WORKER.job_specification = await request.json()


@app.post("/api/postData/")
async def post_data(request: Request):
    form_data = await request.form()

    # Extract the CSV content (sent as text in the "data_file" key)
    csv_content = form_data["data_file"]
    
    # Convert the CSV text content into a Pandas DataFrame
    df_data = pd.read_csv(StringIO(csv_content), index_col = 0)

    THIS_WORKER.data = df_data

    THIS_WORKER.results = run_pipeline(df_data, THIS_WORKER.job_specification).to_json(orient="records")

    requests.post('http://host.docker.internal:8000/api/postfinishedtraining/', json={'session_token': THIS_WORKER.token})


@app.post("/runJob/")
async def run_job():
    # NOTE:: Currently implemented in post_data above instead. Probably should be moved here, but left there for now
    # THIS_WORKER.results = run_pipeline(THIS_WORKER.data, THIS_WORKER.job_specification).to_json(orient="records")
    print('TRAINING FINISHED')
    requests.post('http://host.docker.internal:8000/api/postfinishedtraining/', json={'session_token': THIS_WORKER.token})
    

@app.get("/api/getResults")
async def get_results():
    # As the front has asked us for the results, we know we are safe to be killed, we tell the controller to terminate us
    requests.post('http://host.docker.internal:8000/api/postterminating/', json={'session_token': THIS_WORKER.token})

    # Return the results
    return THIS_WORKER.results