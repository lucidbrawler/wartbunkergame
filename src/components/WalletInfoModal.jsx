import React from 'react';

const WalletInfoModal = ({
  walletData,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  walletName,
  setWalletName,
  saveWalletConsent,
  setSaveWalletConsent,
  saveWalletFunc,
  useWalletWithoutSaving,
  setShowDownloadPrompt,
  consentToClose,
  setConsentToClose,
  closeModal,
  error,
}) => {
  return (
    <div>
      <h2>Wallet Information</h2>
      <p className="warning">
        Warning: Please write down your seed phrase (if available) and private key on a piece of paper and store them securely. Do not share them with anyone.
      </p>
      {walletData.wordCount && <p><strong>Word Count:</strong> {walletData.wordCount}</p>}
      {walletData.mnemonic && (
        <div>
          <strong>Seed Phrase:</strong>
          <p style={{ backgroundColor: '#ffecb33d', padding: '10px', borderRadius: '5px' }}>
            <span style={{ color: '#caa21e', fontSize: 'large', fontWeight: 'bold' }}>{walletData.mnemonic}</span>
          </p>
        </div>
      )}
      {walletData.pathType && <p><strong>Path Type:</strong> {walletData.pathType}</p>}
      <p><strong>Private Key:</strong><br /><span>{walletData.privateKey}</span></p>
      <p><strong>Public Key:</strong><br /><span>{walletData.publicKey}</span></p>
      <p><strong>Address:</strong><br /><span>{walletData.address}</span></p>

      <div className="form-group">
        <label>Wallet Name (for saved login):</label>
        <input
          type="text"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
          placeholder="e.g. main-wallet or trading"
          className="input"
        />
      </div>
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
      <div className="form-group">
        <label>Confirm Password:</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          className="input"
        />
      </div>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={saveWalletConsent}
            onChange={(e) => setSaveWalletConsent(e.target.checked)}
          />
          Save wallet to this browser (encrypted with your password)
        </label>
      </div>

      <button
        type="button"
        disabled={!saveWalletConsent || !walletName?.trim() || !password || password !== confirmPassword}
        onClick={() => saveWalletFunc(walletData, password, saveWalletConsent, walletName)}
      >
        Save Named Wallet
      </button>
      <button type="button" onClick={() => setShowDownloadPrompt(true)}>Download Wallet File</button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
        <label>
          <input
            type="checkbox"
            checked={consentToClose}
            onChange={(e) => setConsentToClose(e.target.checked)}
          />
          I have backed up my keys securely
        </label>
        <button
          type="button"
          disabled={!consentToClose}
          onClick={() => useWalletWithoutSaving(walletData)}
        >
          Use Without Saving
        </button>
        <button type="button" onClick={closeModal}>Cancel</button>
      </div>
      {error && <div className="error"><strong>Error:</strong> {error}</div>}
    </div>
  );
};

export default WalletInfoModal;