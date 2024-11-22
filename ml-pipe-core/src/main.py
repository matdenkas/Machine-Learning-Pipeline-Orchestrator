from fastapi import FastAPI
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from session import Session_Manager
from jobs import Job, Job_Manager


app = FastAPI()
SESSION_MANAGER = Session_Manager()
JOB_MANAGER = Job_Manager(SESSION_MANAGER)

import docker
docker.from_env()
@app.get("/api")
async def root():
    return {"message": "I am core"}

@app.get("/api/fetchtoken")
async def init_newSession():
    return {"token": SESSION_MANAGER.new_session()}

@app.post('/api/postjob/')
async def post_job(request: Request):

    request_json = await request.json()
    token = request_json['session_token']
    job_spec = request_json['job_spec']
    job = Job(token, job_spec)
    print(job)
    JOB_MANAGER.queue_job(job)

@app.get("/api/pollstatus/")
async def poll_status(token: str):
    status = SESSION_MANAGER.poll_session_status(token)
    return {"status": status}


@app.get("/api/getworkerport/")
async def get_worker_port(token: str):
    worker_port = SESSION_MANAGER.get_worker_port(token)
    return {"workerPort": worker_port}


@app.post('/api/postterminating/')
async def post_terminating(request: Request):
    request_json = await request.json()
    token = request_json['session_token']
    print(f'----DOCKER reports to be terminated Session: {token}-----')
    
    SESSION_MANAGER.report_terminated(token)


@app.post('/api/postfinishedtraining/')
async def post_finishedtraining(request: Request):
    request_json = await request.json()
    token = request_json['session_token']
    print(f'----DOCKER reports finished Session: {token}-----')

    SESSION_MANAGER.report_finished_training(token)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):

    exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
    # or logger.error(f'{exc}')
    print(request, exc_str)
    print(await request.body())
    content = {'status_code': 10422, 'message': exc_str, 'data': None}
    return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)

# Mount the front end website to root
app.mount("/", StaticFiles(directory="static", html = True), name="static")
