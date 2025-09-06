// WalletInfoModal.jsx
import React from 'react';

const WalletInfoModal = ({
  walletData,
  password,
  setPassword,
  saveWalletConsent,
  setSaveWalletConsent,
  saveWalletFunc,
  setShowDownloadPrompt,
  consentToClose,
  setConsentToClose,
  closeModal,
  error,
}) => {
  return (
    <div >
      <h2>Wallet Information</h2>
      <p className="warning">
        Warning: Please write down your seed phrase (if available) and private key on a piece of paper and store them securely. Do not share them with anyone.
      </p>
      <p>Options for securing your wallet:</p>
      <ul>
        <li>Save the wallet to localStorage (encrypted with your password). This allows easy access but is tied to this browser.</li>
        <li>Download the wallet as an encrypted file (warthog_wallet.txt). You can store this file securely and upload it later to login.</li>
      </ul>
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
        <label>
          <input
            type="checkbox"
            checked={saveWalletConsent}
            onChange={(e) => setSaveWalletConsent(e.target.checked)}
          />
          Save wallet to localStorage (encrypted)
        </label>
      </div>
      <button onClick={() => {
        if (saveWalletFunc(walletData, password, saveWalletConsent)) {
          closeModal();
          // setWalletData(null); // Assuming this is handled in parent if needed
        }
      }}>Save Wallet</button>
      <button onClick={() => setShowDownloadPrompt(true)}>Download Wallet File</button>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
        <label>
          <input
            type="checkbox"
            checked={consentToClose}
            onChange={(e) => setConsentToClose(e.target.checked)}
          />
          I consent to close without saving or downloading
        </label>
        <button disabled={!consentToClose} onClick={() => {
          closeModal();
          // setWalletData(null); // Handled in parent
          setConsentToClose(false);
        }}>Close</button>
      </div>
      {error && <div className="error"><strong>Error:</strong> {error}</div>}
    </div>
  );
};

export default WalletInfoModal;