// WalletManagementModal.jsx
import React from 'react';

const WalletManagementModal = ({
  walletAction,
  setWalletAction,
  mnemonic,
  setMnemonic,
  privateKeyInput,
  setPrivateKeyInput,
  password,
  setPassword,
  wordCount,
  setWordCount,
  pathType,
  setPathType,
  handleFileUpload,
  handleWalletActionFunc,
  closeModal,
  error,
}) => {
  return (
    <div >
      <h2>Wallet Management</h2>
      <div className="form-group">
        <label>Action:</label>
        <select value={walletAction} onChange={(e) => setWalletAction(e.target.value)} className="input">
          <option value="create">Create New Wallet</option>
          <option value="derive">Derive Wallet from Seed Phrase</option>
          <option value="import">Import from Private Key</option>
          <option value="login">Login with Wallet File</option>
        </select>
      </div>
      {walletAction === 'derive' && (
        <div className="form-group">
          <label>Seed Phrase:</label>
          <input
            type="text"
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            placeholder="Enter 12 or 24-word seed phrase"
            className="input"
          />
        </div>
      )}
      {walletAction === 'import' && (
        <div className="form-group">
          <label>Private Key:</label>
          <input
            type="text"
            value={privateKeyInput}
            onChange={(e) => setPrivateKeyInput(e.target.value.trim())}
            placeholder="Enter 64-character hex private key"
            className="input"
          />
        </div>
      )}
      {walletAction === 'login' && (
        <>
          <div className="form-group">
            <label>Upload Wallet File (warthog_wallet.txt):</label>
            <input type="file" accept=".txt" onChange={handleFileUpload} className="input" />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to decrypt wallet"
              className="input"
            />
          </div>
        </>
      )}
      {(walletAction === 'create' || walletAction === 'derive') && (
        <div className="form-group">
          <label>Word Count:</label>
          <select value={wordCount} onChange={(e) => setWordCount(e.target.value)} className="input">
            <option value="12">12 Words</option>
            <option value="24">24 Words</option>
          </select>
        </div>
      )}
      {(walletAction === 'create' || walletAction === 'derive') && wordCount === '12' && (
        <div className="form-group">
          <label>Derivation Path Type:</label>
          <select value={pathType} onChange={(e) => setPathType(e.target.value)} className="input">
            <option value="hardened">Hardened (m/44'/2070'/0'/0/0)</option>
            <option value="non-hardened">Non-Hardened (m/44'/2070'/0/0/0)</option>
          </select>
        </div>
      )}
      <button onClick={handleWalletActionFunc}>
        {walletAction === 'create' ? 'Create Wallet' : walletAction === 'derive' ? 'Derive Wallet' : walletAction === 'import' ? 'Import Wallet' : 'Login'}
      </button>
      <button onClick={closeModal}>Close</button>
      {error && <div className="error"><strong>Error:</strong> {error}</div>}
    </div>
  );
};

export default WalletManagementModal;