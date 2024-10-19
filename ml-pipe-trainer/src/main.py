from fastapi import FastAPI, Form, UploadFile
from io import BytesIO
import json
import pandas as pd

from src.manager import run_pipeline

app = FastAPI()

def bytes_to_dataframe(file: UploadFile):
    """Converts uploaded file to BytesIO stream, and then to Pandas DataFrame"""
    contents = file.file.read()
    buffer = BytesIO(contents)
    # NOTE:: This assumes that the first column is the index. Probably not ideal.
    df = pd.read_csv(buffer, index_col=0)
    buffer.close()
    file.file.close()

    return df

@app.get("/api")
async def root():
    return {"message": "Hello World"}

@app.post("/runjob/")
async def run_job(data_file: UploadFile, job_specification: str = Form(...)):

    df_dataset = bytes_to_dataframe(data_file)

    job_specification_dict = json.loads(job_specification)

    df_performance_metrics = run_pipeline(df_dataset, job_specification_dict)

    return df_performance_metrics.to_json(orient="records")