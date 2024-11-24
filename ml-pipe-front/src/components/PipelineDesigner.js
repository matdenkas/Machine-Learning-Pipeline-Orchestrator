import React, { useState } from "react";
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
} from "react-flow-renderer";
import RunJob from "./RunJob";

// Node ID Generator
let id = 1;
const getId = () => `${id++}`;

// Initial nodes to choose from
const initialNodes = [
  { id: "uploadData", label: "Upload Data", type: "uploadData" },
  { id: "modelNode", label: "Model Node", type: "modelNode" },
  { id: "preprocess", label: "Data Preprocessing", type: "preprocess" },
  { id: "output", label: "Output Node", type: "output" },
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
    random_state: 42,
  },
  RandomForestRegressor: {
    n_estimators: 100,
    criterion: "squared_error",
    max_depth: 5,
    min_samples_split: 2,
    min_samples_leaf: 1,
    max_features: "auto",
    random_state: 42,
  },
  MLPClassifier: {
    hidden_layer_sizes: "(100,)",
    activation: "relu",
    solver: "adam",
    alpha: 0.0001,
    max_iter: 200,
    random_state: 42,
  },
  MLPRegressor: {
    hidden_layer_sizes: "(100,)",
    activation: "relu",
    solver: "adam",
    alpha: 0.0001,
    max_iter: 200,
    random_state: 42,
  },
};

// Preprocessing task arguments
const preprocessingTasks = {
  Interpolation: {
    dataSeries: ["Revenue"],
    limit: 4,
    method: "linear",
  },
  DropNaNs: {
    subset: ["Revenue", "Sales_quantity"],
  },
};

const PipelineDesigner = () => {
  const [nodes, setNodes] = useState([]); // List of nodes
  const [edges, setEdges] = useState([]); // List of edges
  const [nodeConfigs, setNodeConfigs] = useState({}); // Node-specific configurations
  const [generatedJson, setGeneratedJson] = useState(""); // Generated JSON
  const [selectedNode, setSelectedNode] = useState(null); // Currently selected node
  const [runMode, setRunMode] = useState(false); // Toggle for running jobs
  const [dataFile, setDataFile] = useState(null); // Store the uploaded file
  const [fileName, setFileName] = useState(""); // Store the file name for preview
  const [csvContent, setCsvContent] = useState(""); // Store the CSV file content as text

  // Function to add a new node
  const addNode = (nodeType) => {
    const newNode = {
      id: getId(),
      type: nodeType,
      data: { label: nodeType },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    setNodes((nds) => [...nds, newNode]);
    setNodeConfigs((prev) => ({
      ...prev,
      [newNode.id]: getDefaultConfig(nodeType),
    }));
  };

  // Default configurations for nodes
  const getDefaultConfig = (type) => {
    switch (type) {
      case "uploadData":
        return { file: null }; // File upload for data nodes
      case "modelNode":
        return {
          target: ["Revenue"],
          trainingYears: [2016, 2017, 2018],
          validationYears: [2019],
          testingYears: [2020],
          algorithm: "RandomForestClassifier",
        };
      case "preprocess":
        return { task: "Interpolation", args: { ...preprocessingTasks["Interpolation"] } };
      default:
        return {};
    }
  };

  // Handle input changes for nodes
  const handleInputChange = (key, value) => {
    if (!selectedNode) return;
    setNodeConfigs((prev) => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        [key]: value,
      },
    }));
  };

  // Handle parameter changes for models
  const handleParamChange = (paramKey, value) => {
    if (!selectedNode) return;
    setNodeConfigs((prev) => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        params: {
          ...prev[selectedNode.id]?.params,
          [paramKey]: value,
        },
      },
    }));
  };

  // Generate JSON for the preview
  const generateBackendJson = () => {
    if (nodes.length === 0) {
      alert("No nodes added to generate JSON.");
      return;
    }

    const backendJson = {
      data: [],
      modelDefinitions: [],
      preprocessingTasks: [],
      edges: [],
    };

    nodes.forEach((node) => {
      const config = nodeConfigs[node.id];
      if (!config) {
        console.warn(`Skipping node ${node.id}: Missing configuration.`);
        return; // Skip nodes with missing configurations
      }

      if (node.type === "uploadData") {
        backendJson.data.push({
          id: node.id,
          type: "data",
          file: fileName || "No file selected",
        });
      }

      if (node.type === "modelNode") {
        backendJson.modelDefinitions.push({
          id: node.id,
          mlFramework: "scikit-learn",
          mlAlgorithm: config.algorithm || "Random Forest",
          predictionProblem: "regression",
          target: config.target,
          crossValidation: {
            type: "year",
            trainingYears: config.trainingYears || [],
            validationYears: config.validationYears || [],
            testingYears: config.testingYears || [],
          },
          modelParams: config.params || {},
        });
      }

      if (node.type === "preprocess") {
        backendJson.preprocessingTasks.push({
          task: config.task,
          args: config.args,
        });
      }
    });

    setGeneratedJson(JSON.stringify(backendJson, null, 2));
  };

  // Prepare JSON for backend submission
  const prepareSubmissionJson = () => {
    const parsedJson = JSON.parse(generatedJson || "{}");
    return {
      modelDefinitions: parsedJson.modelDefinitions || [],
      preprocessingTasks: parsedJson.preprocessingTasks || [],
      dataFile: csvContent || "No file selected",
    };
  };

  // Handle file change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : "No file selected");
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvContent(e.target.result);
    };
    reader.readAsText(file);
    setDataFile(file);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {!runMode ? (
        <>
          <div style={{ width: "200px", padding: "20px", borderRight: "1px solid #ccc" }}>
            <h2>Available Nodes</h2>
            {initialNodes.map((node) => (
              <button key={node.id} onClick={() => addNode(node.type)}>
                Add {node.label}
              </button>
            ))}
            <button onClick={generateBackendJson} style={{ marginTop: "10px" }}>
              Generate JSON
            </button>
            <button onClick={() => setRunMode(true)} style={{ marginTop: "10px" }}>
              Run Job Mode
            </button>
          </div>
          <div style={{ flex: 1, padding: "20px" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onConnect={(params) => setEdges((eds) => addEdge(params, eds))}
              onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
              onEdgesChange={(changes) => setEdges((eds) => applyEdgeChanges(changes, eds))}
              onNodeClick={(event, node) => setSelectedNode(node)}
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
          </div>
          <div style={{ width: "300px", padding: "20px", borderLeft: "1px solid #ccc" }}>
            <h3>Node Configuration</h3>
            {selectedNode?.type === "uploadData" && (
              <>
                <h4>Upload Data Node</h4>
                <label>Upload File:</label>
                <input type="file" accept=".csv" onChange={handleFileChange} />
                {fileName && <div><strong>File selected:</strong> {fileName}</div>}
              </>
            )}
            {selectedNode?.type === "modelNode" && (
              <>
                <h4>Model Node</h4>
                <label>Target Variable:</label>
                <input
                  type="text"
                  value={nodeConfigs[selectedNode.id]?.target || ""}
                  onChange={(e) => handleInputChange("target", e.target.value)}
                />
                <label>Training Years:</label>
                <input
                  type="text"
                  value={nodeConfigs[selectedNode.id]?.trainingYears?.join(", ") || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "trainingYears",
                      e.target.value.split(",").map((year) => year.trim())
                    )
                  }
                />
                <label>Validation Years:</label>
                <input
                  type="text"
                  value={nodeConfigs[selectedNode.id]?.validationYears?.join(", ") || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "validationYears",
                      e.target.value.split(",").map((year) => year.trim())
                    )
                  }
                />
                <label>Testing Years:</label>
                <input
                  type="text"
                  value={nodeConfigs[selectedNode.id]?.testingYears?.join(", ") || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "testingYears",
                      e.target.value.split(",").map((year) => year.trim())
                    )
                  }
                />
                <label>Algorithm:</label>
                <select
                  value={nodeConfigs[selectedNode.id]?.algorithm || ""}
                  onChange={(e) =>
                    setNodeConfigs((prev) => ({
                      ...prev,
                      [selectedNode.id]: {
                        ...prev[selectedNode.id],
                        algorithm: e.target.value,
                        params: { ...models[e.target.value] },
                      },
                    }))
                  }
                >
                  {Object.keys(models).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <h4>Parameters:</h4>
                {Object.keys(nodeConfigs[selectedNode.id]?.params || {}).map((param) => (
                  <div key={param}>
                    <label>{param}:</label>
                    <input
                      type="text"
                      value={nodeConfigs[selectedNode.id]?.params[param] || ""}
                      onChange={(e) => handleParamChange(param, e.target.value)}
                    />
                  </div>
                ))}
              </>
            )}
            {selectedNode?.type === "preprocess" && (
              <>
                <h4>Preprocessing Node</h4>
                <label>Task:</label>
                <select
                  value={nodeConfigs[selectedNode.id]?.task || ""}
                  onChange={(e) =>
                    setNodeConfigs((prev) => ({
                      ...prev,
                      [selectedNode.id]: {
                        ...prev[selectedNode.id],
                        task: e.target.value,
                        args: { ...preprocessingTasks[e.target.value] },
                      },
                    }))
                  }
                >
                  {Object.keys(preprocessingTasks).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <h4>Arguments:</h4>
                {Object.keys(nodeConfigs[selectedNode.id]?.args || {}).map((arg) => (
                  <div key={arg}>
                    <label>{arg}:</label>
                    <input
                      type="text"
                      value={nodeConfigs[selectedNode.id]?.args[arg] || ""}
                      onChange={(e) =>
                        setNodeConfigs((prev) => ({
                          ...prev,
                          [selectedNode.id]: {
                            ...prev[selectedNode.id],
                            args: {
                              ...prev[selectedNode.id].args,
                              [arg]: e.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </>
            )}
            <h3>Generated JSON:</h3>
            <pre
              style={{
                background: "#f4f4f4",
                padding: "10px",
                borderRadius: "5px",
                overflow: "auto",
                maxHeight: "300px",
              }}
            >
              {JSON.stringify(JSON.parse(generatedJson || "{}"), null, 2)}
            </pre>
          </div>
        </>
      ) : (
        <RunJob
          jobSpecification={prepareSubmissionJson()}
          dataFile={dataFile}
          onBack={() => setRunMode(false)}
        />
      )}
    </div>
  );
};

export default PipelineDesigner;
