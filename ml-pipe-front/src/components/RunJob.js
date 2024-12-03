import React, { useState } from 'react';
import '../styles.css';  // Ensure the CSS is imported

const BASE_URL = "http://localhost";
const CORE_PORT = 8000;
let jobSpec = undefined;
let token = undefined;
let workerPort = undefined;
let lastStatus = undefined;
let pollingIntervalID = undefined;

const RunJob = ({ jobSpecification, dataFile, onBack }) => {
  const [csvFile, setCsvFile] = useState(null); // Store the uploaded CSV file
  const [logs, setLogs] = useState([]); // Store logs to display in the UI
  const [fileError, setFileError] = useState(""); // Track file selection errors

  jobSpec = jobSpecification;

  // Function to add logs to the UI with different log types
  const addLog = (message, type = "info") => {
    setLogs((prevLogs) => [...prevLogs, { message, type }]);
  };

  jobSpec = jobSpecification

  const handleSubmitJob = () => {
    if (!dataFile) {
      setFileError('Please choose a CSV file before submitting the job!');
      addLog('Please choose a CSV file before submitting the job!', "error");
      return;
    }

    // Reset error message
    setFileError('');

    // First, send job specification to backend
    pollingIntervalID = setInterval(pollBackend, 2000);
    addLog('Submitting job and starting polling...', "info");
  };

  const pollBackend = () => {
    // If we have never talked to the backend
    if (!token) {
      fetch(`${BASE_URL}:${CORE_PORT}/api/fetchtoken`)
        .then(response => response.json())
        .then(response => { 
          token = response["token"];
          addLog(`Session token: ${token}`, "info");
        });
    } else {
      // With our session token we can fetch the status of our training job
      fetch(`${BASE_URL}:${CORE_PORT}/api/pollstatus/?token=${token}`)
        .then(response => response.json())
        .then(response => { 
          lastStatus = response["status"];
          handleStatus(lastStatus);
          addLog(`Status: ${lastStatus}`, "info");
        });
    }
  };

  const handleStatus = (lastStatus) => {
    // There are steps of the process where we need to do something
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
      .then(() => addLog('Job submitted to backend.', "success"));
  };

  const send_data = () => {
    fetch(`${BASE_URL}:${CORE_PORT}/api/getworkerport/?token=${token}`)
      .then(response => response.json())
      .then(response => {
        workerPort = response["workerPort"];
        addLog(`WorkerPort: ${workerPort}`, "info");

        // Create a FormData to send CSV content as text
        const formData = new FormData();
        
        // Read the CSV file as text (using FileReader)
        const reader = new FileReader();
        reader.onload = function(event) {
          formData.append("data_file", event.target.result);
        
          // Send the request with multipart/form-data, including the file content as text
          fetch(`${BASE_URL}:${workerPort}/api/postData/`, {
            method: 'POST',
            mode: 'no-cors',
            body: formData,
          }).catch(error => {
            console.error('Error sending data:', error);
            addLog('Error sending data to the backend!', "error");
          });
        };

        if (dataFile) {
          reader.readAsText(dataFile);
        } else {
          addLog("No file selected.", "error");
        }
      });
  };

  const get_results = () => {
    fetch(`${BASE_URL}:${workerPort}/api/getResults`)
      .then(response => response.json())
      .then(response => { 
        addLog(`Training Results: ${JSON.stringify(response)}`, "success");
      });
  };

  return (
    <div className="container" style={{ padding: '20px' }}>
      <div className="run-job" style={{ flex: 1 }}>
        <h2>Run Job</h2>
        <pre>{JSON.stringify(jobSpecification, null, 2)}</pre>
        
        {/* File upload or selection */}
        <div>
          {dataFile ? (
            <div><strong>File selected:</strong> {dataFile.name}</div>
          ) : (
            <div>No file selected</div>
          )}
        </div>

        {/* Show error message if no file is selected */}
        {fileError && <div style={{ color: 'red' }}>{fileError}</div>}

        <button onClick={handleSubmitJob} style={{ marginTop: '10px' }}>
          Submit Job
        </button>
        <button onClick={onBack} style={{ marginTop: '10px' }}>
          Back to Pipeline Designer
        </button>
      </div>

      {/* Logs Section */}
      <div className="logs-panel">
        <h3>Logs:</h3>
        <div>
          {logs.map((log, index) => (
            <div key={index} className={`logs-message ${log.type}`}>{log.message}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RunJob;
