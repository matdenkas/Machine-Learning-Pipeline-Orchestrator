import React from 'react';

const RunJob = ({ jobSpecification, onBack }) => {
  const handleSubmitJob = () => {
    // Placeholder for job submission logic to the backend
    console.log('Submitting job to backend with specification:', jobSpecification);
    alert('Job submitted!');
  };

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
