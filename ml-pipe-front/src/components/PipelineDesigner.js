import React, { useState } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
} from 'react-flow-renderer';

// Mock RunJob Component
const RunJob = ({ jobSpecification, onBack }) => {
  const handleSubmitJob = () => {
    console.log("Submitting job to backend with specification:", jobSpecification);

    // Replace this with your backend API URL
    const backendUrl = "http://localhost:8000/api/run-job";

    fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: jobSpecification, // Sending the JSON data to the backend
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("Failed to submit the job");
      })
      .then((data) => {
        alert("Job successfully submitted!");
        console.log("Response from backend:", data);
      })
      .catch((error) => {
        console.error("Error submitting job:", error);
        alert("Failed to submit the job. Check the console for more details.");
      });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Run Job</h2>
      <pre>{jobSpecification}</pre>
      <button onClick={handleSubmitJob} style={{ marginTop: "10px" }}>
        Submit Job
      </button>
      <button onClick={onBack} style={{ marginTop: "10px" }}>
        Back to Pipeline Designer
      </button>
    </div>
  );
};


let id = 1; // Initial id for nodes
const getId = () => `${id++}`; // Utility to generate unique node ids

const initialNodes = [
  { id: 'input', label: 'Input Data', type: 'input' },
  { id: 'preprocess', label: 'Data Preprocessing', type: 'preprocess' },
  { id: 'model', label: 'Model', type: 'model' },
  { id: 'output', label: 'Output Predictions', type: 'output' },
];

// Model-specific parameters
const models = {
  RandomForestClassifier: {
    n_estimators: 100,
    criterion: "gini",
    max_depth: null,
    min_samples_split: 2,
    min_samples_leaf: 1,
    max_features: "sqrt",
    random_state: null,
  },
  RandomForestRegressor: {
    n_estimators: 100,
    criterion: "squared_error",
    max_depth: null,
    min_samples_split: 2,
    min_samples_leaf: 1,
    max_features: 1.0,
    random_state: null,
  },
  MLPClassifier: {
    hidden_layer_sizes: "(100,)",
    activation: "relu",
    solver: "adam",
    alpha: 0.0001,
    max_iter: 200,
    random_state: null,
  },
  MLPRegressor: {
    hidden_layer_sizes: "(100,)",
    activation: "relu",
    solver: "adam",
    alpha: 0.0001,
    max_iter: 200,
    random_state: null,
  },
};

// Preprocessing tasks
const preprocessingTasks = {
  Interpolation: {
    dataSeries: [],
    limit: 4,
    method: "linear",
  },
  DropNaNs: {
    subset: [],
  },
};

const PipelineDesigner = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null); // Selected node state
  const [nodeConfigs, setNodeConfigs] = useState({}); // Store configurations keyed by node ID
  const [generatedJson, setGeneratedJson] = useState(''); // State for generated JSON
  const [runMode, setRunMode] = useState(false); // State to toggle between Pipeline Designer and Run Job

  const onConnect = (params) => setEdges((eds) => addEdge(params, eds));

  const addNode = (nodeType) => {
    const newNode = {
      id: getId(),
      type: nodeType,
      data: { label: nodeType },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    setNodes((nds) => [...nds, newNode]);
    setNodeConfigs((prev) => ({ ...prev, [newNode.id]: getDefaultConfig(nodeType) }));
  };

  const handleNodeClick = (event, node) => {
    setSelectedNode(node);
    if (!nodeConfigs[node.id]) {
      setNodeConfigs((prev) => ({ ...prev, [node.id]: getDefaultConfig(node.type) }));
    }
  };

  const getDefaultConfig = (type) => {
    switch (type) {
      case 'input':
        return {
          file: null,
          target: "Revenue",
          trainingYears: [],
          testingYears: [],
        };
      case 'preprocess':
        return { task: 'Interpolation', args: { ...preprocessingTasks['Interpolation'] } };
      case 'model':
        return { algorithm: 'RandomForestClassifier', params: { ...models['RandomForestClassifier'] } };
      case 'output':
        return {};
      default:
        return {};
    }
  };

  const handleInputChange = (field, value) => {
    setNodeConfigs((prev) => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        [field]: Array.isArray(prev[selectedNode.id][field])
          ? (typeof value === 'string' ? value.split(',').map((item) => item.trim()) : [])
          : value,
      },
    }));
  };

  const handleFileUpload = (e, nodeId) => {
    const file = e.target.files[0];
    if (file) {
      setNodeConfigs((prev) => ({
        ...prev,
        [nodeId]: { ...prev[nodeId], file: file.name },
      }));
    }
  };

  const handleModelChange = (field, value) => {
    setNodeConfigs((prev) => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        [field]: value,
        params: { ...models[value] }, // Load parameters for the selected model
      },
    }));
  };

  const handleParamChange = (param, value) => {
    setNodeConfigs((prev) => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        params: { ...prev[selectedNode.id].params, [param]: value },
      },
    }));
  };

  const handlePreprocessChange = (field, value) => {
    setNodeConfigs((prev) => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        [field]: value,
        args: { ...preprocessingTasks[value] },
      },
    }));
  };

  const handlePreprocessArgChange = (arg, value) => {
    setNodeConfigs((prev) => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        args: { ...prev[selectedNode.id].args, [arg]: value },
      },
    }));
  };

  const generateBackendJson = () => {
    const backendJson = {
      modelDefinitions: [],
      preprocessingTasks: [],
      edges: [],
    };

    nodes.forEach((node) => {
      const config = nodeConfigs[node.id];

      if (node.type === 'input') {
        backendJson.modelDefinitions.push({
          id: node.id,
          type: 'input',
          data: config.file || "No file selected",
          target: config.target,
          trainingYears: config.trainingYears,
          testingYears: config.testingYears,
        });
      }

      if (node.type === 'preprocess') {
        backendJson.preprocessingTasks.push({
          task: config.task,
          args: config.args,
        });
      }

      if (node.type === 'model') {
        const filteredParams = Object.fromEntries(
          Object.entries(config.params).filter(([key, value]) => value !== models[config.algorithm][key])
        );
        backendJson.modelDefinitions.push({
          id: node.id,
          mlFramework: "scikit-learn",
          mlAlgorithm: config.algorithm,
          predictionProblem: config.algorithm.includes("Regressor") ? "regression" : "classification",
          modelParams: filteredParams,
        });
      }
    });

    edges.forEach((edge) => {
      backendJson.edges.push({
        source: edge.source,
        target: edge.target,
      });
    });

    setGeneratedJson(JSON.stringify(backendJson, null, 2));
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {!runMode ? (
        <>
          {/* Node Selection */}
          <div style={{ width: '200px', padding: '20px', borderRight: '1px solid #ccc' }}>
            <h2>Available Nodes</h2>
            {initialNodes.map((node) => (
              <button key={node.id} onClick={() => addNode(node.type)}>
                Add {node.label}
              </button>
            ))}
          </div>

          {/* Pipeline Designer */}
          <div style={{ flex: 1, padding: '20px' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onConnect={onConnect}
              onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
              onEdgesChange={(changes) => setEdges((eds) => applyEdgeChanges(changes, eds))}
              onNodeClick={handleNodeClick}
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
            <button onClick={generateBackendJson} style={{ marginTop: '10px' }}>
              Generate JSON
            </button>
            <button onClick={() => setRunMode(true)} style={{ marginTop: '10px' }}>
              Run Job
            </button>
          </div>
        </>
      ) : (
        <RunJob jobSpecification={generatedJson} onBack={() => setRunMode(false)} />
      )}

      {/* Node Configuration */}
      {!runMode && (
        <div style={{ width: '300px', padding: '20px' }}>
          {selectedNode && selectedNode.type === 'input' && (
            <>
              <h3>Configure Input Node</h3>
              <label>Upload CSV:</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, selectedNode.id)}
              />
              <label>Target Variable:</label>
              <input
                type="text"
                value={nodeConfigs[selectedNode.id]?.target || ''}
                onChange={(e) => handleInputChange('target', e.target.value)}
              />
              <label>Training Years:</label>
              <input
                type="text"
                value={nodeConfigs[selectedNode.id]?.trainingYears.join(', ') || ''}
                onChange={(e) =>
                  handleInputChange('trainingYears', e.target.value)
                }
              />
              <label>Testing Years:</label>
              <input
                type="text"
                value={nodeConfigs[selectedNode.id]?.testingYears.join(', ') || ''}
                onChange={(e) =>
                  handleInputChange('testingYears', e.target.value)
                }
              />
            </>
          )}

          {selectedNode && selectedNode.type === 'preprocess' && (
            <>
              <h3>Configure Preprocessing Node</h3>
              <label>Task:</label>
              <select
                value={nodeConfigs[selectedNode.id]?.task || ''}
                onChange={(e) => handlePreprocessChange('task', e.target.value)}
              >
                {Object.keys(preprocessingTasks).map((task) => (
                  <option key={task} value={task}>
                    {task}
                  </option>
                ))}
              </select>
              <h4>Arguments</h4>
              {Object.keys(nodeConfigs[selectedNode.id]?.args || {}).map((arg) => (
                <div key={arg}>
                  <label>{arg}:</label>
                  <input
                    type="text"
                    value={nodeConfigs[selectedNode.id].args[arg] || ''}
                    onChange={(e) => handlePreprocessArgChange(arg, e.target.value)}
                  />
                </div>
              ))}
            </>
          )}

          {selectedNode && selectedNode.type === 'model' && (
            <>
              <h3>Configure Model Node</h3>
              <label>Select Model:</label>
              <select
                value={nodeConfigs[selectedNode.id]?.algorithm || ''}
                onChange={(e) => handleModelChange('algorithm', e.target.value)}
              >
                {Object.keys(models).map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <h4>Model Parameters</h4>
              {Object.keys(nodeConfigs[selectedNode.id]?.params || {}).map((param) => (
                <div key={param}>
                  <label>{param}:</label>
                  <input
                    type="text"
                    value={nodeConfigs[selectedNode.id].params[param] || ''}
                    onChange={(e) => handleParamChange(param, e.target.value)}
                  />
                </div>
              ))}
            </>
          )}

          <h3>Generated JSON</h3>
          <pre>{generatedJson}</pre>
        </div>
      )}
    </div>
  );
};

export default PipelineDesigner;
