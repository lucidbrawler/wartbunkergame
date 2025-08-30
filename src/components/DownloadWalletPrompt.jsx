// DownloadWalletPrompt.jsx
import React from 'react';

const DownloadWalletPrompt = ({
  showDownloadPrompt,
  setShowDownloadPrompt,
  walletData,
  password,
  setPassword,
  downloadWalletFunc,
  closeModal,
  error,
}) => {
  if (!showDownloadPrompt) return null;

  return (
    <div className="modal">
      <h2>Download Wallet File</h2>
      <div className="form-group">
        <label>Password to Encrypt Wallet:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password to encrypt wallet"
          className="input"
        />
      </div>
      <button onClick={() => {
        downloadWalletFunc(walletData, password);
        setShowDownloadPrompt(false);
        closeModal();
        // setWalletData(null); // Handled in parent
      }}>Download</button>
      <button onClick={() => setShowDownloadPrompt(false)}>Cancel</button>
      {error && <div className="error"><strong>Error:</strong> {error}</div>}
    </div>
  );
};

export default DownloadWalletPrompt;