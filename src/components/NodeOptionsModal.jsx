// NodeOptionsModal.jsx
import React from 'react';
import { DEFI_TESTNET_URL } from '../utils/presetNodes.js';
import { normalizeNodeUrl } from '../utils/warthogClient.js';

const NodeOptionsModal = ({
  selectedNode,
  setSelectedNode,
  nodeOptions,
  customNode,
  setCustomNode,
  isDefiNode,
  fetchBalanceAndNonce,
  wallet,
  closeModal,
}) => {
  const handleSaveCustomNode = () => {
    const normalized = normalizeNodeUrl(customNode);
    if (normalized) {
      setSelectedNode(normalized);
    }
  };

  const handleUseDefiTestnet = () => {
    setCustomNode(DEFI_TESTNET_URL);
    setSelectedNode(DEFI_TESTNET_URL);
  };

  return (
    <div>
      <h2>Node Options</h2>

      {isDefiNode && (
        <div className="result" style={{ marginBottom: '1rem' }}>
          DeFi Testnet mode — assets, DEX, and wart_balance endpoints active.
        </div>
      )}

      <div className="form-group">
        <label>Select Node:</label>
        <select
          value={selectedNode}
          onChange={(e) => setSelectedNode(e.target.value)}
          className="input"
        >
          {nodeOptions.map((node) => (
            <option key={node.url} value={node.url}>
              {node.name} — {node.url}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Custom Node URL:</label>
        <input
          type="text"
          value={customNode}
          onChange={(e) => setCustomNode(e.target.value)}
          placeholder="http://host:port or https://node.example.com"
          className="input"
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button type="button" onClick={handleSaveCustomNode}>Use Custom Node</button>
        <button type="button" onClick={handleUseDefiTestnet}>Use DeFi Testnet</button>
        {wallet?.address && (
          <button
            type="button"
            onClick={() => fetchBalanceAndNonce(wallet.address)}
          >
            Refresh Balance
          </button>
        )}
      </div>

      <button onClick={closeModal}>Close</button>
    </div>
  );
};

export default NodeOptionsModal;