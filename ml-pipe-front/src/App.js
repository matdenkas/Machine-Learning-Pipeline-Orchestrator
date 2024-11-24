import React from 'react';
import PipelineDesigner from './components/PipelineDesigner'; // Existing component
import './styles.css'; // Import your CSS file

const App = () => {
  return (
    <div className="container">
      <div className="pipeline-designer">
        <h1>Pipeline Designer</h1>
        <PipelineDesigner />
      </div>
    </div>
  );
};

export default App;
