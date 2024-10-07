from fastapi import FastAPI

app = FastAPI()

STATUS = 'awaiting_tokens'

@app.get("/api")
async def root():
    return {"message": "Hello World"}


@app.post('/api/postjob/')
async def post_job(job: dict):
    print(job)
