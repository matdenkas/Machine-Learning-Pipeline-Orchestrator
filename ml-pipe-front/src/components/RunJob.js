import React from 'react';



const BASE_URL = "http://localhost"
const CORE_PORT = 8000
let jobSpec = undefined
let token = undefined
let workerPort = undefined
let lastStatus = undefined
let pollingIntervalID = undefined
const RunJob = ({ jobSpecification, onBack }) => {

  const handleSubmitJob = () => {
    // Placeholder for job submission logic to the backend
    console.log('Submitting job to backend with specification:', jobSpecification);
    jobSpec = jobSpecification

    // This interval will talk with the backend every 2 seconds to 
    // handel the training process
    pollingIntervalID = setInterval(pollBackend, 2000);
  };

  const pollBackend = () => {
    // If we have never talked to the backend
    // we ask for a session token
    if (!token) {
      fetch(`${BASE_URL}:${CORE_PORT}/api/fetchtoken`)
      .then(response=>response.json())
      .then(response=>{ 
        token = response["token"]
        alert(`Session token: ${token}`); 
      })
    } else {

      // With our session token we can fetch the status of our training job
      // and use that status to decide what to do
      fetch(`${BASE_URL}:${CORE_PORT}/api/pollstatus/?token=${token}`)
      .then(response=>response.json())
      .then(response=>{ 
        lastStatus = response["status"]
        handleStatus(lastStatus);
        alert(`Status: ${lastStatus}`); 
      })
    }
  }

  const handleStatus = (lastStatus) => {
    // There are steps of the process where we need to do something
    // We check for those statuses and call the correct logic
    if (lastStatus == "PENDING_JOB") {
      send_job(); // Send the job to the backend
    } else if (lastStatus == "PENDING_DATA_TRANSFER") {
      send_data(); // Send the data to the trainer
    } else if (lastStatus == "PENDING_RESPONSE_FETCH") {
      get_results(); // Training has finished so fetch the results
    } else if (lastStatus == "FINISHED") {
      clearInterval(pollingIntervalID); // We can stop talking to the backend now
    }
  }


  const send_job = () => {
    // In the body we supply the session token and the specification
    const body = JSON.stringify({
      "session_token": token,
      "job_spec": jobSpec
    });

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    fetch(`${BASE_URL}:${CORE_PORT}/api/postjob/`, {
      method: 'POST',
      headers: headers,
      body: body
    })
  }

  const send_data = () => {
    // First we have to ask the controller what port we can talk to the trainer on
    fetch(`${BASE_URL}:${CORE_PORT}/api/getworkerport/?token=${token}`)
      .then(response=>response.json())
      .then(response=>{ 
        workerPort = response["workerPort"];
        alert(`WorkerPort: ${workerPort}`);

        // TODO:: THIS NEEDS TO BE THE UPLOADED CSV
        fetch(`${BASE_URL}:${workerPort}/api/postData/`, {
          method: 'POST',
        }).then((response) => { alert(`Data posted: ${response}`); });
      });
  }

  const get_results = () => {
    fetch(`${BASE_URL}:${workerPort}/api/getresults`)
      .then(response=>response.json())
      .then(response=>{ 
        alert(`Training Results: ${response}`); // THis should be the results
      });

  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Run Job</h2>
      <pre>{jobSpecification}</pre>
      <button onClick={handleSubmitJob} style={{ marginTop: '10px' }}>
        Submit Job
      </button>
      <button onClick={onBack} style={{ marginTop: '10px' }}>
        Back to Pipeline Designer
      </button>
    </div>
  );
};

export default RunJob;
