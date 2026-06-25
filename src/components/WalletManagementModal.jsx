import React, { useMemo, useState } from 'react';
import { getSavedWallets } from '../utils/walletStorage.js';
import WalletOverview from './WalletOverview';

const WalletSetupForm = ({
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
  uploadedFile,
  error,
}) => {
  const savedWallets = useMemo(() => getSavedWallets(), [walletAction]);
  const [selectedSavedWallet, setSelectedSavedWallet] = useState('');

  return (
    <div>
      <div className="form-group">
        <label>Action:</label>
        <select value={walletAction} onChange={(e) => setWalletAction(e.target.value)} className="input">
          <option value="create">Create New Wallet</option>
          <option value="derive">Derive Wallet from Seed Phrase</option>
          <option value="import">Import from Private Key</option>
          <option value="login">Login to Saved Wallet</option>
          <option value="load">Login with Wallet File</option>
        </select>
      </div>

      {walletAction === 'login' && (
        <>
          <div className="form-group">
            <label>Select Saved Wallet:</label>
            {savedWallets.length > 0 ? (
              <div className="saved-wallet-grid">
                {savedWallets.map((name) => {
                  const isSelected = selectedSavedWallet === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedSavedWallet(name)}
                      className={`saved-wallet-card${isSelected ? ' saved-wallet-card--selected' : ''}`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="saved-wallet-card__name">{name}</div>
                          <div className="saved-wallet-card__meta">
                            {isSelected ? 'Selected' : 'Saved in this browser'}
                          </div>
                        </div>
                        <span className="saved-wallet-card__check" aria-hidden="true">
                          {isSelected && '✓'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 mt-1">
                No saved wallets yet. Create a wallet and save it with a name for quick login.
              </p>
            )}
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input"
              autoComplete="current-password"
            />
          </div>
        </>
      )}

      {walletAction === 'load' && (
        <>
          <div className="form-group">
            <label>Upload Wallet File (warthog_wallet.txt):</label>
            <input type="file" accept=".txt" onChange={handleFileUpload} className="input" />
            {uploadedFile && (
              <p className="text-xs text-zinc-500 mt-1">Selected: {uploadedFile.name}</p>
            )}
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
      <button
        type="button"
        onClick={() => handleWalletActionFunc(selectedSavedWallet)}
      >
        {walletAction === 'create' ? 'Create Wallet'
          : walletAction === 'derive' ? 'Derive Wallet'
            : walletAction === 'import' ? 'Import Wallet'
              : walletAction === 'login' ? 'Login to Saved Wallet'
                : 'Login with File'}
      </button>
      {error && <div className="error"><strong>Error:</strong> {error}</div>}
    </div>
  );
};

const WalletManagementModal = ({
  wallet,
  isLoggedIn,
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
  uploadedFile,
  closeModal,
  logoutWallet,
  error,
}) => {
  const [activeTab, setActiveTab] = useState(wallet ? 'overview' : 'setup');
  const showOverview = Boolean(wallet && isLoggedIn);

  const handleLogout = () => {
    logoutWallet?.();
    setActiveTab('setup');
  };

  return (
    <div className="wallet-mgmt-modal">
      {showOverview && (
        <div className="wallet-mgmt-tabs">
          <button
            type="button"
            className={`compact-btn${activeTab === 'overview' ? ' compact-btn--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`compact-btn${activeTab === 'setup' ? ' compact-btn--active' : ''}`}
            onClick={() => setActiveTab('setup')}
          >
            Wallet Setup
          </button>
        </div>
      )}

      {showOverview && activeTab === 'overview' ? (
        <WalletOverview onLogout={handleLogout} />
      ) : (
        <WalletSetupForm
          walletAction={walletAction}
          setWalletAction={setWalletAction}
          mnemonic={mnemonic}
          setMnemonic={setMnemonic}
          privateKeyInput={privateKeyInput}
          setPrivateKeyInput={setPrivateKeyInput}
          password={password}
          setPassword={setPassword}
          wordCount={wordCount}
          setWordCount={setWordCount}
          pathType={pathType}
          setPathType={setPathType}
          handleFileUpload={handleFileUpload}
          handleWalletActionFunc={handleWalletActionFunc}
          uploadedFile={uploadedFile}
          error={error}
        />
      )}

      <button type="button" className="compact-btn wallet-mgmt-close" onClick={closeModal}>
        Close
      </button>
    </div>
  );
};

export default WalletManagementModal;