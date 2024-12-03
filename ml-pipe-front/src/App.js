import React from 'react';
import PipelineDesigner from './components/PipelineDesigner'; // Existing component
import './styles.css'; // Import your CSS file

const App = () => {
  // Function to open the Resource Metrics page
  const handleResourceMetrics = () => {
    window.open("http://localhost:9000", "_blank");
  };

  // Function to open the Dashboard page
 // const handleDashboard = () => {
 //   window.open("http://localhost:3000", "_self");
 // };

  return (
    <div className="container">
      {/* Sidebar */}
      <div className="sidebar">
        <ul>
          <li>
            <a href="#" onClick={handleResourceMetrics}>Resource Metrics</a>
          </li>
          
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="pipeline-designer">
        <h1>ML Pipeline Designer</h1>
        <PipelineDesigner />
      </div>
    </div>
    
  )
        
  
};

export default App;
