from fastapi import FastAPI, UploadFile
from io import BytesIO
import pandas as pd

from manager import run_pipeline

app = FastAPI()

def bytes_to_dataframe(file: UploadFile):
    """Converts uploaded file to BytesIO stream, and then to Pandas DataFrame"""
    contents = file.file.read()
    buffer = BytesIO(contents)
    df = pd.read_csv(buffer)
    buffer.close()
    file.file.close()

    return df

@app.get("/api")
async def root():
    return {"message": "Hello World"}

@app.post("/runjob/")
async def run_job(data_file: UploadFile, job_specification_file: dict):
    df_dataset = bytes_to_dataframe(data_file)

    df_performance_metrics = run_pipeline(df_dataset, job_specification_file)

    return df_performance_metrics