// Wallet.jsx - Main wallet component
import React from 'react';
import useWallet from './useWallet';
import GameInterface from './GameInterface';
import WalletManagementModal from './WalletManagementModal';
import NodeOptionsModal from './NodeOptionsModal';
import ValidateAddressModal from './ValidateAddressModal';
import SendTransactionModal from './SendTransactionModal';
import WalletInfoModal from './WalletInfoModal';
import DownloadWalletPrompt from './DownloadWalletPrompt';
import UnlockWalletModal from './UnlockWalletModal';
import './Wallet.css';

const Wallet = () => {
  const {
    // Wallet state
    walletData,
    wallet,
    balance,
    address,
    toAddr,
    amount,
    fee,
    mnemonic,
    privateKeyInput,
    password,
    wordCount,
    pathType,
    walletAction,
    saveWalletConsent,
    uploadedFile,
    isWalletProcessed,
    isLoggedIn,
    selectedNode,
    
    // UI state
    consentToClose,
    showDownloadPrompt,
    showPasswordPrompt,
    currentModal,
    error,
    
    // Results
    validateResult,
    sendResult,
    
    // Setters
    setWalletData,
    setConsentToClose,
    setMnemonic,
    setPrivateKeyInput,
    setAddress,
    setToAddr,
    setAmount,
    setFee,
    setPassword,
    setWordCount,
    setPathType,
    setWalletAction,
    setSaveWalletConsent,
    setShowDownloadPrompt,
    setSelectedNode,
    setCurrentModal,
    
    // Functions
    closeModal,
    saveWalletFunc,
    downloadWalletFunc,
    handleFileUpload,
    loadWallet,
    handleWalletActionFunc,
    handleValidateAddress,
    handleSendTransaction,
    defaultNodeList,
  } = useWallet();

  const handleOpenDownload = () => {
    setWalletData(wallet);
    setShowDownloadPrompt(true);
    setCurrentModal('download-wallet');
  };

  const renderModal = () => {
    switch (currentModal) {
      case 'wallet-management':
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <WalletManagementModal 
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
                closeModal={closeModal}
                error={error}
              />
            </div>
          </div>
        );
        
      case 'node-options':
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <NodeOptionsModal
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                defaultNodeList={defaultNodeList}
                closeModal={closeModal}
              />
            </div>
          </div>
        );
        
      case 'validate-address':
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <ValidateAddressModal
                address={address}
                setAddress={setAddress}
                handleValidateAddress={handleValidateAddress}
                closeModal={closeModal}
                validateResult={validateResult}
                error={error}
              />
            </div>
          </div>
        );
        
      case 'send-transaction':
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <SendTransactionModal
                toAddr={toAddr}
                setToAddr={setToAddr}
                amount={amount}
                setAmount={setAmount}
                fee={fee}
                setFee={setFee}
                handleSendTransaction={handleSendTransaction}
                closeModal={closeModal}
                sendResult={sendResult}
                error={error}
              />
            </div>
          </div>
        );
        
      case 'wallet-info':
        return walletData ? (
          <div className="modal-overlay">
            <div className="modal-content">
              <WalletInfoModal
                walletData={walletData}
                password={password}
                setPassword={setPassword}
                saveWalletConsent={saveWalletConsent}
                setSaveWalletConsent={setSaveWalletConsent}
                saveWalletFunc={saveWalletFunc}
                setShowDownloadPrompt={setShowDownloadPrompt}
                consentToClose={consentToClose}
                setConsentToClose={setConsentToClose}
                closeModal={() => {
                  closeModal();
                  setWalletData(null);
                }}
                error={error}
              />
            </div>
          </div>
        ) : null;
        
      case 'unlock-wallet':
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <UnlockWalletModal
                handleFileUpload={handleFileUpload}
                password={password}
                setPassword={setPassword}
                loadWallet={loadWallet}
                closeModal={closeModal}
                showPasswordPrompt={showPasswordPrompt}
                error={error}
              />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="container">
      {/* Main Game Interface */}
      <GameInterface
        currentModal={currentModal}
        setCurrentModal={setCurrentModal}
        wallet={wallet}
        balance={balance}
        onOpenDownloadWallet={handleOpenDownload}
      />

      {/* Render appropriate modal based on currentModal state */}
      {renderModal()}

      {/* Download Wallet Prompt */}
      {showDownloadPrompt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <DownloadWalletPrompt
              showDownloadPrompt={showDownloadPrompt}
              setShowDownloadPrompt={setShowDownloadPrompt}
              walletData={walletData}
              password={password}
              setPassword={setPassword}
              downloadWalletFunc={downloadWalletFunc}
              closeModal={() => {
                closeModal();
                setWalletData(null);
              }}
              error={error}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;