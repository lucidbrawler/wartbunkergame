// UnlockWalletModal.jsx
import React from 'react';

const UnlockWalletModal = ({
  handleFileUpload,
  password,
  setPassword,
  loadWallet,
  closeModal,
  showPasswordPrompt,
  error,
}) => {
  if (!showPasswordPrompt) return null;

  return (
    <div >
      <h2>Unlock Wallet</h2>
      <div className="form-group">
        <label>Upload Wallet File (optional):</label>
        <input type="file" accept=".txt" onChange={handleFileUpload} className="input" />
      </div>
      <div className="form-group">
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password to unlock wallet"
          className="input"
        />
      </div>
      <button onClick={() => loadWallet(password)}>Unlock Wallet</button>
      <button onClick={() => {
        closeModal();
        // setShowPasswordPrompt(false); // Handled in parent if needed
      }}>Cancel</button>
      {error && <div className="error"><strong>Error:</strong> {error}</div>}
    </div>
  );
};

export default UnlockWalletModal;