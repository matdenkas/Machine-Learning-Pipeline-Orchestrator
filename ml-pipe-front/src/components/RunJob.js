import React, { useState } from 'react';

const BASE_URL = "http://localhost";
const CORE_PORT = 8000;
let jobSpec = undefined;
let token = undefined;
let workerPort = undefined;
let lastStatus = undefined;
let pollingIntervalID = undefined;

const RunJob = ({ jobSpecification, dataFile, onBack }) => {
  const [csvFile, setCsvFile] = useState(null); // Store the uploaded CSV file

  jobSpec = jobSpecification

  const handleSubmitJob = () => {
    if (!dataFile) {
      alert('Please choose a CSV file before submitting the job!');
      return;
    }

    // First, send job specification to backend
    pollingIntervalID = setInterval(pollBackend, 2000);
  };

  const pollBackend = () => {
    // If we have never talked to the backend
    // we ask for a session token
    if (!token) {
      fetch(`${BASE_URL}:${CORE_PORT}/api/fetchtoken`)
        .then(response => response.json())
        .then(response => { 
          token = response["token"];
          alert(`Session token: ${token}`); 
        });
    } else {
      // With our session token we can fetch the status of our training job
      // and use that status to decide what to do
      fetch(`${BASE_URL}:${CORE_PORT}/api/pollstatus/?token=${token}`)
        .then(response => response.json())
        .then(response => { 
          lastStatus = response["status"];
          handleStatus(lastStatus);
          alert(`Status: ${lastStatus}`); 
        });
    }
  };

  const handleStatus = (lastStatus) => {
    // There are steps of the process where we need to do something
    // We check for those statuses and call the correct logic
    if (lastStatus === "PENDING_JOB") {
      send_job(); // Send the job to the backend
    } else if (lastStatus === "PENDING_DATA_TRANSFER") {
      send_data(); // Send the data to the trainer
    } else if (lastStatus === "PENDING_RESPONSE_FETCH") {
      get_results(); // Training has finished so fetch the results
    } else if (lastStatus === "FINISHED" || lastStatus === "KILLED") {
      clearInterval(pollingIntervalID); // We can stop talking to the backend now
    }
  };

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
    });
  };

  const send_data = () => {
    // First, we have to ask the controller what port we can talk to the trainer on
    fetch(`${BASE_URL}:${CORE_PORT}/api/getworkerport/?token=${token}`)
      .then(response => response.json())
      .then(response => {
        workerPort = response["workerPort"];
        alert(`WorkerPort: ${workerPort}`);

        // Create a FormData to send CSV content as text
        const formData = new FormData();
        
        // Read the CSV file as text (using FileReader)
        const reader = new FileReader();
        reader.onload = function(event) {
          // Append the CSV file content as text to the form data
          formData.append("data_file", event.target.result);
        
          // Send the request with multipart/form-data, including the file content as text
          fetch(`${BASE_URL}:${workerPort}/api/postData/`, {
            method: 'POST',
            mode: 'no-cors',
            body: formData,
          }).catch(error => {
            console.error('Error sending data:', error);
            alert('Error sending data to the backend!');
          });
        };

        // Read the CSV file as text
        if (dataFile) {
          reader.readAsText(dataFile);
        } else {
          alert("No file selected.");
        }
      });
  };

  const get_results = () => {
    fetch(`${BASE_URL}:${workerPort}/api/getresults`)
      .then(response => response.json())
      .then(response => { 
        alert(`Training Results: ${JSON.stringify(response)}`); // This should be the results
      });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Run Job</h2>
      <pre>{JSON.stringify(jobSpecification, null, 2)}</pre>
      
      {/* File name will be displayed instead of the file upload option */}
      <div>
        {dataFile ? (
          <div><strong>File selected:</strong> {dataFile.name}</div>
        ) : (
          <div>No file selected</div>
        )}
      </div>

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