import React, { useState } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
} from 'react-flow-renderer';
import RunJob from './RunJob'; // Import the RunJob component

let id = 1; // Initial id for nodes
const getId = () => `${id++}`; // Utility to generate unique node ids

const initialNodes = [
  { id: 'input', label: 'Input Data', type: 'input' },
  { id: 'preprocess', label: 'Data Preprocessing', type: 'preprocess' },
  { id: 'model', label: 'Model', type: 'model' },
  { id: 'output', label: 'Output Predictions', type: 'output' },
];

const models = {
  RandomForest: { n_estimators: 100, max_depth: null, min_samples_split: 2 },
  SVM: { kernel: 'linear', C: 1.0 },
  DecisionTree: { max_depth: null, min_samples_split: 2 },
  KNN: { n_neighbors: 5, weights: 'uniform' },
  GradientBoosting: { n_estimators: 100, learning_rate: 0.1 },
};

const preprocessings = {
  Scaling: { method: 'standard', range: [0, 1] },
  PCA: { n_components: 2 },
  Normalization: { norm: 'l2' },
  Imputation: { strategy: 'mean' },
};

const PipelineDesigner = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null); // Selected node state
  const [nodeConfig, setNodeConfig] = useState({}); // Node configuration state
  const [generatedJson, setGeneratedJson] = useState(''); // State for generated JSON
  const [runMode, setRunMode] = useState(false); // State to toggle between design and run modes

  const onConnect = (params) => setEdges((eds) => addEdge(params, eds));

  // Callback for adding a new node
  const addNode = (nodeType) => {
    const newNode = {
      id: getId(),
      type: nodeType,
      data: { label: nodeType, onDelete: handleDeleteNode },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Function to delete a node by id
  const handleDeleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
  };

  // Handle node selection to configure
  const handleNodeClick = (event, node) => {
    setSelectedNode(node);
    setNodeConfig(getDefaultConfig(node.type)); // Load default configuration for the selected node
  };

  // Get default configuration for each node type
  const getDefaultConfig = (type) => {
    switch (type) {
      case 'input':
        return { file: null };
      case 'preprocess':
        return { method: 'Scaling', params: preprocessings['Scaling'] };
      case 'model':
        return { algorithm: 'RandomForest', params: models['RandomForest'] };
      case 'output':
        return {};
      default:
        return {};
    }
  };

  // Handle model parameter changes
  const handleParamChange = (param, value) => {
    setNodeConfig((prevConfig) => ({
      ...prevConfig,
      params: { ...prevConfig.params, [param]: value },
    }));
  };

  // Generate JSON based on the current state of the pipeline
  const generateJson = () => {
    const json = {
      nodes: [],
      edges: [],
    };

    nodes.forEach((node) => {
      if (node.type === 'input') {
        json.nodes.push({
          id: node.id,
          type: 'input',
          data: { file: nodeConfig.file ? nodeConfig.file.name : 'No file selected' },
        });
      }
      if (node.type === 'preprocess') {
        json.nodes.push({
          id: node.id,
          type: 'preprocess',
          task: nodeConfig.method,
          params: nodeConfig.params,
        });
      }
      if (node.type === 'model') {
        json.nodes.push({
          id: node.id,
          type: 'model',
          mlAlgorithm: nodeConfig.algorithm,
          modelParams: nodeConfig.params,
        });
      }
      if (node.type === 'output') {
        json.nodes.push({
          id: node.id,
          type: 'output',
          data: 'Output Predictions',
        });
      }
    });

    edges.forEach((edge) => {
      json.edges.push({
        source: edge.source,
        target: edge.target,
      });
    });

    setGeneratedJson(JSON.stringify(json, null, 2)); // Pretty print JSON
  };

  const handleRunModeToggle = () => {
    setRunMode((prevRunMode) => !prevRunMode);
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Partition for Node Selection */}
      <div style={{ width: '200px', padding: '20px', borderRight: '1px solid #ccc' }}>
        <h2>Available Nodes</h2>
        {initialNodes.map((node) => (
          <button key={node.id} onClick={() => addNode(node.type)}>
            Add {node.label}
          </button>
        ))}
      </div>

      {/* Middle Partition for Pipeline Flow */}
      <div style={{ flex: 1, padding: '20px' }}>
        {!runMode ? (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onConnect={onConnect}
              onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
              onEdgesChange={(changes) => setEdges((eds) => applyEdgeChanges(changes, eds))}
              onNodeClick={handleNodeClick} // Handle node click for configuration
              style={{ width: '100%', height: '80%' }}
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
            <button onClick={generateJson} style={{ marginTop: '10px' }}>
              Generate JSON
            </button>
            <button onClick={handleRunModeToggle} style={{ marginTop: '10px' }}>
              Go to Run Job
            </button>
          </>
        ) : (
          <RunJob jobSpecification={generatedJson} onBack={handleRunModeToggle} />
        )}
      </div>

      {/* Right Partition for Node Configuration and JSON Output */}
      {!runMode && (
        <div style={{ width: '300px', padding: '20px' }}>
          <h2>Node Configuration</h2>
          {selectedNode && (
            <div>
              {selectedNode.type === 'input' && (
                <>
                  <label>Upload File:</label>
                  <input
                    type="file"
                    onChange={(e) => setNodeConfig({ ...nodeConfig, file: e.target.files[0] })}
                  />
                </>
              )}

              {selectedNode.type === 'preprocess' && (
                <>
                  <label>Select Preprocessing Method:</label>
                  <select
                    value={nodeConfig.method}
                    onChange={(e) => {
                      const selectedMethod = e.target.value;
                      setNodeConfig({
                        method: selectedMethod,
                        params: preprocessings[selectedMethod], // Load default params for the selected preprocessing
                      });
                    }}
                  >
                    {Object.keys(preprocessings).map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <label>Parameters:</label>
                  {Object.keys(nodeConfig.params).map((param) => (
                    <div key={param}>
                      <label>{param}:</label>
                      <input
                        type="text"
                        value={nodeConfig.params[param]}
                        onChange={(e) => handleParamChange(param, e.target.value)}
                      />
                    </div>
                  ))}
                </>
              )}

              {selectedNode.type === 'model' && (
                <>
                  <label>Select Model:</label>
                  <select
                    value={nodeConfig.algorithm}
                    onChange={(e) => {
                      const selectedAlgorithm = e.target.value;
                      setNodeConfig({
                        algorithm: selectedAlgorithm,
                        params: models[selectedAlgorithm], // Load default params for the selected algorithm
                      });
                    }}
                  >
                    {Object.keys(models).map((modelName) => (
                      <option key={modelName} value={modelName}>
                        {modelName}
                      </option>
                    ))}
                  </select>
                  <label>Hyperparameters:</label>
                  {Object.keys(nodeConfig.params).map((param) => (
                    <div key={param}>
                      <label>{param}:</label>
                      <input
                        type="text"
                        value={nodeConfig.params[param]}
                        onChange={(e) => handleParamChange(param, e.target.value)}
                      />
                    </div>
                  ))}
                </>
              )}

              {selectedNode.type === 'output' && <p>Output Node: No configuration needed</p>}
            </div>
          )}

          <h2>Generated JSON</h2>
          <pre>{generatedJson}</pre>
        </div>
      )}
    </div>
  );
};

export default PipelineDesigner;
