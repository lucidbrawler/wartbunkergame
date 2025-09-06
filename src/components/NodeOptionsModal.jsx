// NodeOptionsModal.jsx
import React from 'react';

const NodeOptionsModal = ({ selectedNode, setSelectedNode, defaultNodeList, closeModal }) => {
  return (
    <div >
      <h2>Node Options</h2>
      <div className="form-group">
        <label>Select Node:</label>
        <select value={selectedNode} onChange={(e) => setSelectedNode(e.target.value)} className="input">
          {defaultNodeList.map((node, index) => (
            <option key={index} value={node}>
              {node}
            </option>
          ))}
        </select>
      </div>
      <button onClick={closeModal}>Close</button>
    </div>
  );
};

export default NodeOptionsModal;