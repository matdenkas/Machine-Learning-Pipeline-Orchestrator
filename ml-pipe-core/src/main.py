from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from session import Session_Manager
app = FastAPI()
SESSION_MANAGER = Session_Manager()



@app.get("/api")
async def root():
    return {"message": "Hello World"}

@app.get("/api/fetchtoken")
async def init_newSession():
    return {"token": SESSION_MANAGER.new_session()}

# Mount the front end website to root
app.mount("/", StaticFiles(directory="static", html = True), name="static")
