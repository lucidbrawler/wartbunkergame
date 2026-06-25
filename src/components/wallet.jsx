// Wallet.jsx - Main wallet component
import React, { useEffect, useState } from 'react';
import useWalletHook from './useWallet';
import { GameWalletProvider } from './WalletContext';
import { ToastProvider, useToast } from './Toast';
import GameInterface from './GameInterface';
import WalletManagementModal from './WalletManagementModal';
import NodeOptionsModal from './NodeOptionsModal';
import ValidateAddressModal from './ValidateAddressModal';
import SendTransactionModal from './SendTransactionModal';
import WalletInfoModal from './WalletInfoModal';
import DownloadWalletPrompt from './DownloadWalletPrompt';
import DeFiModal from './DeFiModal';
import AssetPage from './AssetPage';
import DexPage from './DexPage';
import { WalletNamePromptModal, WalletUnlockModal } from './WalletSessionModals';
import './Wallet.css';
import './DeFiWallet.css';

const WalletApp = ({ walletHook }) => {
  const {
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
    confirmPassword,
    walletName,
    wordCount,
    pathType,
    walletAction,
    saveWalletConsent,
    uploadedFile,
    isWalletProcessed,
    isLoggedIn,
    isSigningUnlocked,
    isSessionLocked,
    currentWalletName,
    selectedNode,
    customNode,
    isDefiNode,
    nodeOptions,
    consentToClose,
    showDownloadPrompt,
    currentModal,
    error,
    validateResult,
    sendResult,
    setWalletData,
    setConsentToClose,
    setMnemonic,
    setPrivateKeyInput,
    setAddress,
    setToAddr,
    setAmount,
    setFee,
    setPassword,
    setConfirmPassword,
    setWalletName,
    setWordCount,
    setPathType,
    setWalletAction,
    setSaveWalletConsent,
    setShowDownloadPrompt,
    setSelectedNode,
    setCustomNode,
    setCurrentModal,
    closeModal,
    saveWalletFunc,
    downloadWalletFunc,
    handleFileUpload,
    useWalletWithoutSaving,
    logoutWallet,
    handleWalletActionFunc,
    handleValidateAddress,
    fetchBalanceAndNonce,
    saveNamedWallet,
    unlockWallet,
    registerAutoLockCallback,
  } = walletHook;

  const toast = useToast();

  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [promptWalletName, setPromptWalletName] = useState('');
  const [promptPassword, setPromptPassword] = useState('');
  const [promptConfirmPassword, setPromptConfirmPassword] = useState('');
  const [promptError, setPromptError] = useState(null);
  const [namePromptDismissed, setNamePromptDismissed] = useState(false);

  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockPromptError, setUnlockPromptError] = useState(null);

  useEffect(() => {
    registerAutoLockCallback?.(({ hasSavedWallet }) => {
      if (hasSavedWallet) {
        toast.info('Wallet auto-locked after inactivity — use Unlock to sign again');
      } else {
        toast.info('Wallet auto-locked after inactivity');
      }
    });
    return () => registerAutoLockCallback?.(null);
  }, [registerAutoLockCallback, toast]);

  useEffect(() => {
    if (isLoggedIn && wallet && !currentWalletName && !namePromptDismissed) {
      setShowNamePrompt(true);
    } else if (!isLoggedIn || currentWalletName) {
      setShowNamePrompt(false);
    }
  }, [isLoggedIn, wallet, currentWalletName, namePromptDismissed]);

  const handleOpenDownload = () => {
    setWalletData(wallet);
    setShowDownloadPrompt(true);
    setCurrentModal('download-wallet');
  };

  const handlePromptSaveWallet = async () => {
    setPromptError(null);
    const name = promptWalletName.trim();
    if (!name || !promptPassword || promptPassword !== promptConfirmPassword) {
      setPromptError('Please provide a wallet name and matching passwords');
      return;
    }
    const ok = await saveNamedWallet(name, promptPassword);
    if (ok) {
      toast.success(`Wallet saved as "${name}"`);
      setShowNamePrompt(false);
      setPromptWalletName('');
      setPromptPassword('');
      setPromptConfirmPassword('');
      setPromptError(null);
    } else {
      setPromptError('Save failed — check the error message');
    }
  };

  const handleSkipNamePrompt = () => {
    setShowNamePrompt(false);
    setNamePromptDismissed(true);
    setPromptWalletName('');
    setPromptPassword('');
    setPromptConfirmPassword('');
    setPromptError(null);
    toast.info('Wallet session active. You can name & save it later for easy login.');
  };

  const handleUnlockWallet = async () => {
    setUnlockPromptError(null);
    if (!unlockPassword) {
      setUnlockPromptError('Password is required to unlock');
      return;
    }
    const ok = await unlockWallet(unlockPassword);
    if (ok) {
      toast.success(currentWalletName ? `Unlocked "${currentWalletName}"` : 'Wallet unlocked');
      setShowUnlockPrompt(false);
      setUnlockPassword('');
      setUnlockPromptError(null);
    } else {
      setUnlockPromptError('Unlock failed — check password');
    }
  };

  const renderModal = () => {
    switch (currentModal) {
      case 'wallet-management':
        return wallet?.address && isLoggedIn ? (
          <DeFiModal title="Wallet Management" onClose={closeModal}>
            <WalletManagementModal
              wallet={wallet}
              isLoggedIn={isLoggedIn}
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
              closeModal={closeModal}
              logoutWallet={logoutWallet}
              error={error}
            />
          </DeFiModal>
        ) : (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Wallet Management</h2>
              <WalletManagementModal
                wallet={wallet}
                isLoggedIn={isLoggedIn}
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
                closeModal={closeModal}
                logoutWallet={logoutWallet}
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
                nodeOptions={nodeOptions}
                customNode={customNode}
                setCustomNode={setCustomNode}
                isDefiNode={isDefiNode}
                fetchBalanceAndNonce={fetchBalanceAndNonce}
                wallet={wallet}
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
        return wallet?.address ? (
          <DeFiModal title="Send" onClose={closeModal}>
            <SendTransactionModal closeModal={closeModal} />
          </DeFiModal>
        ) : (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Send Transaction</h2>
              <SendTransactionModal closeModal={closeModal} />
            </div>
          </div>
        );

      case 'asset-page':
        return (
          <DeFiModal title="Assets" onClose={closeModal}>
            <AssetPage selectedNode={selectedNode} wallet={wallet} />
          </DeFiModal>
        );

      case 'dex-page':
        return (
          <DeFiModal title="DEX" onClose={closeModal}>
            <DexPage selectedNode={selectedNode} wallet={wallet} />
          </DeFiModal>
        );

      case 'wallet-info':
        return walletData ? (
          <div className="modal-overlay">
            <div className="modal-content">
              <WalletInfoModal
                walletData={walletData}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                walletName={walletName}
                setWalletName={setWalletName}
                saveWalletConsent={saveWalletConsent}
                setSaveWalletConsent={setSaveWalletConsent}
                saveWalletFunc={saveWalletFunc}
                useWalletWithoutSaving={useWalletWithoutSaving}
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

      default:
        return null;
    }
  };

  return (
    <div className="page-shell">
      <div className="container">
        <GameInterface
          currentModal={currentModal}
          setCurrentModal={setCurrentModal}
          wallet={wallet}
          balance={balance}
          isDefiNode={isDefiNode}
          currentWalletName={currentWalletName}
          isSigningUnlocked={isSigningUnlocked}
          isSessionLocked={isSessionLocked}
          onOpenUnlock={() => setShowUnlockPrompt(true)}
          onOpenDownloadWallet={handleOpenDownload}
        />

        {renderModal()}

        <WalletNamePromptModal
          open={showNamePrompt}
          walletName={promptWalletName}
          setWalletName={setPromptWalletName}
          password={promptPassword}
          setPassword={setPromptPassword}
          confirmPassword={promptConfirmPassword}
          setConfirmPassword={setPromptConfirmPassword}
          error={promptError}
          onSave={handlePromptSaveWallet}
          onSkip={handleSkipNamePrompt}
        />

        <WalletUnlockModal
          open={showUnlockPrompt}
          walletName={currentWalletName}
          password={unlockPassword}
          setPassword={setUnlockPassword}
          error={unlockPromptError}
          onUnlock={handleUnlockWallet}
          onCancel={() => {
            setShowUnlockPrompt(false);
            setUnlockPassword('');
            setUnlockPromptError(null);
          }}
        />

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
    </div>
  );
};

const Wallet = () => {
  const walletHook = useWalletHook();

  return (
    <ToastProvider>
      <GameWalletProvider walletHook={walletHook}>
        <WalletApp walletHook={walletHook} />
      </GameWalletProvider>
    </ToastProvider>
  );
};

export default Wallet;