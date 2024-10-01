from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from session import Session_Manager
from jobs import Job, Job_Manager


app = FastAPI()
SESSION_MANAGER = Session_Manager()
JOB_MANAGER = Job_Manager()


@app.get("/api")
async def root():
    return {"message": "Hello World"}

@app.get("/api/fetchtoken")
async def init_newSession():
    return {"token": SESSION_MANAGER.new_session()}

@app.post('/api/postjob/')
async def post_job(job: Job):
    JOB_MANAGER.queue_job(job)

@app.get('/api/pollstatus/token={token}')
async def poll_status(token: str):
    status = SESSION_MANAGER.poll_session(token)
    return {"status": status}


# Mount the front end website to root
app.mount("/", StaticFiles(directory="static", html = True), name="static")
