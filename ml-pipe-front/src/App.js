import React, { useState } from 'react';
import PipelineDesigner from './components/PipelineDesigner'; // Existing component
import RunJob from './components/RunJob'; // New RunJob component
import './styles.css'; // Import your CSS file

const App = () => {
  // State to control which component is displayed
  const [isJobRunning, setIsJobRunning] = useState(false); // Tracks if the "Run Job" mode is active
  const [jobSpecification, setJobSpecification] = useState(null); // Holds the job specification data

  // Function to switch to RunJob mode and pass job specification data
  const handleRunJobClick = (jobSpec) => {
    setJobSpecification(jobSpec); // Set the job specification when transitioning to RunJob
    setIsJobRunning(true); // Switch to RunJob view
  };

  // Function to go back to PipelineDesigner
  const handleBackToPipeline = () => {
    setIsJobRunning(false); // Go back to PipelineDesigner view
  };

  return (
    <div className="container">
      {!isJobRunning ? (
        <div className="pipeline-designer">
          <h1>Pipeline Designer</h1>
          <PipelineDesigner onRunJob={handleRunJobClick} />
        </div>
      ) : (
        <div className="run-job">
          <h1>Run Job</h1>
          <RunJob
            jobSpecification={jobSpecification}
            onBack={handleBackToPipeline}
          />
        </div>
      )}
    </div>
  );
};

export default App;
