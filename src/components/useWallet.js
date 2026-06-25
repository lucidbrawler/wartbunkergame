// useWallet.js - Custom hook for wallet functionality (warthog-js)
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  NODE_OPTIONS,
  DEFAULT_NODE_URL,
  isDefiNode,
  isMainnetNode,
} from '../utils/presetNodes.js';
import {
  createWarthogApi,
  signAndSubmitTransaction,
  parseRecipientAddress,
  formatSubmitResult,
  normalizeNodeUrl,
} from '../utils/warthogClient.js';
import {
  generateWallet,
  deriveWallet,
  importFromPrivateKey,
} from '../utils/warthogWallet.js';
import {
  formatWartBalance,
  validateWarthogAddressInput,
  getNextNonceFromAccount,
} from '../utils/warthogFormat.js';
import {
  AUTO_LOCK_MS,
  encryptWallet,
  decryptWallet,
  getSavedWallets,
  migrateLegacyWalletStorage,
} from '../utils/walletStorage.js';
import {
  persistPublicSession,
  readPublicSession,
  readCurrentWalletName,
  clearWalletSession,
} from '../utils/sessionWallet.js';
import {
  setSigningPrivateKey,
  clearSigningPrivateKey,
  getSigningPrivateKey,
} from '../utils/signingVault.js';

const useWallet = () => {
  const [walletData, setWalletData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [usdBalance, setUsdBalance] = useState(null);
  const [nonceId, setNonceId] = useState(null);
  const [pinHeight, setPinHeight] = useState(null);
  const [pinHash, setPinHash] = useState(null);
  const [mnemonic, setMnemonic] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [address, setAddress] = useState('');
  const [toAddr, setToAddr] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [wordCount, setWordCount] = useState('12');
  const [pathType, setPathType] = useState('hardened');
  const [walletAction, setWalletAction] = useState('create');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletName, setWalletName] = useState('');
  const [saveWalletConsent, setSaveWalletConsent] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileContent, setUploadedFileContent] = useState(null);
  const [isWalletProcessed, setIsWalletProcessed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSigningUnlocked, setIsSigningUnlocked] = useState(false);
  const [currentWalletName, setCurrentWalletName] = useState(null);
  const [selectedNode, setSelectedNode] = useState(DEFAULT_NODE_URL);
  const [customNode, setCustomNode] = useState('');

  const [consentToClose, setConsentToClose] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [currentModal, setCurrentModal] = useState(null);
  const [error, setError] = useState(null);

  const [validateResult, setValidateResult] = useState(null);
  const [sendResult, setSendResult] = useState(null);

  const autoLockCallbackRef = useRef(null);

  const isSessionLocked = Boolean(isLoggedIn && wallet && !isSigningUnlocked && currentWalletName);

  const activateWalletSession = useCallback((fullWallet, name = null) => {
    if (!fullWallet?.privateKey || !fullWallet?.address) {
      throw new Error('Invalid wallet data');
    }

    setSigningPrivateKey(fullWallet.privateKey);
    const publicWallet = persistPublicSession(fullWallet, name);
    setWallet(publicWallet);
    setCurrentWalletName(name);
    setIsLoggedIn(true);
    setIsSigningUnlocked(true);
    setError(null);
    return publicWallet;
  }, []);

  const lockWallet = useCallback(() => {
    clearSigningPrivateKey();
    setIsSigningUnlocked(false);
    setError(null);
  }, []);

  const registerAutoLockCallback = useCallback((callback) => {
    autoLockCallbackRef.current = callback;
  }, []);

  useEffect(() => {
    migrateLegacyWalletStorage();

    const savedNode = localStorage.getItem('selectedNode');
    if (savedNode) {
      setSelectedNode(savedNode);
      setCustomNode(savedNode);
    }

    const publicWallet = readPublicSession();
    const name = readCurrentWalletName();
    if (publicWallet?.address && name) {
      setWallet(publicWallet);
      setCurrentWalletName(name);
      setIsLoggedIn(true);
      setIsSigningUnlocked(false);
      clearSigningPrivateKey();
    }
  }, []);

  useEffect(() => {
    if (wallet?.address) {
      fetchBalanceAndNonce(wallet.address);
    }
  }, [wallet?.address, selectedNode]);

  useEffect(() => {
    if (!isSigningUnlocked) return undefined;

    let timerId;
    const resetTimer = () => {
      clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        lockWallet();
        autoLockCallbackRef.current?.({
          reason: 'inactivity',
          hasSavedWallet: Boolean(currentWalletName),
        });
      }, AUTO_LOCK_MS);
    };

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });
    resetTimer();

    return () => {
      clearTimeout(timerId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [isSigningUnlocked, lockWallet, currentWalletName]);

  const closeModal = () => {
    setCurrentModal(null);
    setError(null);
  };

  const applyNode = (newNode) => {
    const normalized = normalizeNodeUrl(newNode);
    if (!normalized) return;
    setSelectedNode(normalized);
    setCustomNode(normalized);
    localStorage.setItem('selectedNode', normalized);
  };

  const fetchBalanceAndNonce = async (walletAddress) => {
    setError(null);
    setBalance(null);
    setNonceId(null);
    setPinHeight(null);
    setPinHash(null);

    try {
      const api = await createWarthogApi(selectedNode);
      const { normalizeChainPin } = await import('warthog-js');

      const headRes = await api.getChainHead();
      if (!headRes.success) {
        throw new Error(headRes.error || 'Failed to fetch chain head');
      }
      const { pinHash: headPinHash, pinHeight: headPinHeight } = normalizeChainPin(headRes.data);
      setPinHeight(headPinHeight);
      setPinHash(headPinHash);

      const balRes = isMainnetNode(selectedNode)
        ? await api.getAccountBalance(walletAddress)
        : await api.getAccountWartBalance(walletAddress);
      if (!balRes.success) {
        throw new Error(balRes.error || 'Failed to fetch balance');
      }
      const data = balRes.data;

      const wartBalanceObj = isMainnetNode(selectedNode)
        ? data?.balance?.total
        : data?.wart?.total;

      const balanceInWart = await formatWartBalance(wartBalanceObj);
      setBalance(balanceInWart);

      try {
        const priceResponse = await axios.get('/api/price');
        const price = priceResponse.data?.usd || 0;
        setUsdBalance((parseFloat(balanceInWart) * price).toFixed(2));
      } catch {
        setUsdBalance('N/A');
      }

      if (isMainnetNode(selectedNode)) {
        setNonceId(await getNextNonceFromAccount(data));
      } else {
        setNonceId(0);
      }
    } catch (err) {
      setError(err.message || 'Could not fetch chain head or balance');
      setUsdBalance('N/A');
    }
  };

  const saveNamedWallet = useCallback(async (name, pass, sourceWallet = null) => {
    const trimmed = (name || '').trim();
    if (!trimmed || !pass) {
      setError('Wallet name and password are required');
      return false;
    }

    const privateKey = getSigningPrivateKey();
    const baseWallet = sourceWallet || wallet;
    if (!baseWallet?.address) {
      setError('No active wallet to save');
      return false;
    }
    if (!privateKey) {
      setError('Unlock your wallet before saving');
      return false;
    }

    try {
      const encrypted = encryptWallet({ ...baseWallet, privateKey }, pass);
      localStorage.setItem(`warthogWallet_${trimmed}`, encrypted);
      setCurrentWalletName(trimmed);
      persistPublicSession({ ...baseWallet, privateKey }, trimmed);
      setError(null);
      return true;
    } catch (err) {
      setError(`Failed to save named wallet: ${err.message}`);
      return false;
    }
  }, [wallet]);

  const unlockWallet = useCallback(async (pass) => {
    if (!currentWalletName) {
      setError('No saved wallet name for this session. Log out and use Login to Saved Wallet.');
      return false;
    }
    if (!wallet?.address) {
      setError('No active wallet session to unlock.');
      return false;
    }

    const encrypted = localStorage.getItem(`warthogWallet_${currentWalletName}`);
    if (!encrypted) {
      setError(`Saved data for "${currentWalletName}" not found in this browser.`);
      return false;
    }

    try {
      const decrypted = decryptWallet(encrypted, pass);
      if (decrypted.address.toLowerCase() !== wallet.address.toLowerCase()) {
        setError('Decrypted wallet does not match the current session address.');
        return false;
      }
      activateWalletSession(decrypted, currentWalletName);
      return true;
    } catch (err) {
      setError(err?.message === 'Invalid password' ? 'Invalid password' : `Unlock failed: ${err.message}`);
      return false;
    }
  }, [currentWalletName, wallet, activateWalletSession]);

  const loginSavedWallet = useCallback(async (name, pass) => {
    if (!name || !pass) {
      setError('Please select a saved wallet and enter password');
      return false;
    }

    const encrypted = localStorage.getItem(`warthogWallet_${name}`);
    if (!encrypted) {
      setError('Selected wallet not found');
      return false;
    }

    try {
      const decrypted = decryptWallet(encrypted, pass);
      activateWalletSession(decrypted, name);
      closeModal();
      setPassword('');
      return true;
    } catch (err) {
      setError(err?.message === 'Invalid password' ? 'Invalid password' : `Login failed: ${err.message}`);
      return false;
    }
  }, [activateWalletSession]);

  const loginFromFile = useCallback(async (pass) => {
    if (!pass) {
      setError('Please provide a password');
      return false;
    }

    try {
      const encrypted = uploadedFileContent;
      if (!encrypted) throw new Error('Please upload the warthog_wallet.txt file');
      const decrypted = decryptWallet(encrypted, pass);
      activateWalletSession(decrypted, null);
      setUploadedFile(null);
      setUploadedFileContent(null);
      setPassword('');
      closeModal();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [uploadedFileContent, activateWalletSession]);

  const useWalletWithoutSaving = useCallback((data) => {
    if (!consentToClose) {
      setError('Please confirm you have saved the seed/private key securely');
      return false;
    }
    try {
      activateWalletSession(data, null);
      setWalletData(null);
      closeModal();
      setConsentToClose(false);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [consentToClose, activateWalletSession]);

  const saveWalletFunc = async (data, pass, consent, name) => {
    if (!consent || !pass || !name?.trim()) {
      setError('Please provide a wallet name, password, and consent to save');
      return false;
    }
    if (pass !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    try {
      const trimmed = name.trim();
      const encrypted = encryptWallet(data, pass);
      localStorage.setItem(`warthogWallet_${trimmed}`, encrypted);
      activateWalletSession(data, trimmed);
      setShowPasswordPrompt(false);
      setWalletData(null);
      setError(null);
      setIsWalletProcessed(true);
      closeModal();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const downloadWalletFunc = (data, pass) => {
    if (!pass) {
      setError('Please provide a password to encrypt the wallet file');
      return;
    }

    try {
      const encrypted = encryptWallet(data, pass);
      const blob = new Blob([encrypted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'warthog_wallet.txt';
      a.click();
      URL.revokeObjectURL(url);
      setIsWalletProcessed(true);
    } catch {
      setError('Failed to download wallet');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setError('No file selected');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedFile(file);
      setUploadedFileContent(e.target.result);
      setError(null);
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  };

  const logoutWallet = useCallback(() => {
    clearSigningPrivateKey();
    clearWalletSession();
    setWallet(null);
    setBalance(null);
    setNonceId(null);
    setPinHeight(null);
    setPinHash(null);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setWalletName('');
    setSaveWalletConsent(false);
    setUploadedFile(null);
    setUploadedFileContent(null);
    setIsWalletProcessed(false);
    setIsLoggedIn(false);
    setIsSigningUnlocked(false);
    setCurrentWalletName(null);
    setWalletData(null);
  }, []);

  const clearWallet = logoutWallet;

  const handleWalletActionFunc = async (selectedSavedWallet = '') => {
    setError(null);
    setIsWalletProcessed(false);

    if (walletAction === 'login') {
      await loginSavedWallet(selectedSavedWallet, password);
      return;
    }

    if (walletAction === 'load') {
      await loginFromFile(password);
      return;
    }

    if (walletAction === 'derive' && !mnemonic) {
      setError('Please enter a seed phrase');
      return;
    }

    if (walletAction === 'import' && !privateKeyInput) {
      setError('Please enter a private key');
      return;
    }

    if (walletAction === 'derive') {
      const words = mnemonic.trim().split(/\s+/);
      if (words.length !== Number(wordCount)) {
        setError(`Seed phrase must have exactly ${wordCount} words`);
        return;
      }
    }

    try {
      let data;
      if (walletAction === 'create') {
        data = await generateWallet(Number(wordCount), pathType);
      } else if (walletAction === 'derive') {
        data = await deriveWallet(mnemonic, Number(wordCount), pathType);
      } else if (walletAction === 'import') {
        data = await importFromPrivateKey(privateKeyInput);
      }

      setWalletData(data);
      setCurrentModal('wallet-info');
    } catch (err) {
      setError(err.message || `Failed to ${walletAction} wallet`);
      logoutWallet();
    }
  };

  const handleValidateAddress = async () => {
    setError(null);
    setValidateResult(null);

    if (!address) {
      setError('Please enter an address');
      return;
    }

    try {
      const result = await validateWarthogAddressInput(address);
      setValidateResult(result);
      if (!result.valid) {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to validate address');
    }
  };

  const handleSendTransaction = async () => {
    setError(null);
    setSendResult(null);

    if (!toAddr || !amount) {
      setError('Please fill in recipient and amount');
      return;
    }

    if (!isSigningUnlocked || !getSigningPrivateKey()) {
      setError('Wallet is locked — unlock to send transactions');
      return;
    }

    if (nonceId === null || pinHeight === null || pinHash === null) {
      setError('Nonce or chain head not available. Please refresh balance and try again.');
      return;
    }

    try {
      const api = await createWarthogApi(selectedNode);
      const { Address, Wart } = await import('warthog-js');

      const recipient = parseRecipientAddress(Address, toAddr);
      if (!recipient) {
        throw new Error('Invalid recipient address (expected 40 or 48 hex chars with valid checksum)');
      }

      const wartAmount = Wart.parse(amount);
      if (!wartAmount) {
        throw new Error('Invalid amount');
      }

      const { data } = await signAndSubmitTransaction(api, {
        nonceId: nonceId ?? 0,
        buildSpec: {
          type: 'TRANSFER_WART',
          recipientHex: recipient.hex,
          amount,
        },
      });

      setSendResult(formatSubmitResult(data));
      setToAddr('');
      setAmount('');
      setFee('');

      if (wallet?.address) {
        fetchBalanceAndNonce(wallet.address);
      }
    } catch (err) {
      setError(err.message || 'Failed to send transaction');
    }
  };

  return {
    walletData,
    wallet,
    balance,
    usdBalance,
    nonceId,
    pinHeight,
    pinHash,
    mnemonic,
    privateKeyInput,
    address,
    toAddr,
    amount,
    fee,
    wordCount,
    pathType,
    walletAction,
    password,
    confirmPassword,
    walletName,
    saveWalletConsent,
    uploadedFile,
    isWalletProcessed,
    isLoggedIn,
    isSigningUnlocked,
    isSessionLocked,
    currentWalletName,
    selectedNode,
    customNode,
    isDefiNode: isDefiNode(selectedNode),

    consentToClose,
    showDownloadPrompt,
    showPasswordPrompt,
    currentModal,
    error,

    validateResult,
    sendResult,

    setWalletData,
    setWallet,
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
    setUploadedFile,
    setIsWalletProcessed,
    setIsLoggedIn,
    setSelectedNode: applyNode,
    setCustomNode,
    setConsentToClose,
    setShowDownloadPrompt,
    setShowPasswordPrompt,
    setCurrentModal,
    setError,
    setValidateResult,
    setSendResult,

    closeModal,
    saveWalletFunc,
    downloadWalletFunc,
    handleFileUpload,
    loginSavedWallet,
    loginFromFile,
    useWalletWithoutSaving,
    logoutWallet,
    clearWallet,
    handleWalletActionFunc,
    handleValidateAddress,
    handleSendTransaction,
    fetchBalanceAndNonce,
    activateWalletSession,
    lockWallet,
    unlockWallet,
    saveNamedWallet,
    registerAutoLockCallback,
    getSavedWallets,
    nodeOptions: NODE_OPTIONS,
    defaultNodeList: NODE_OPTIONS.map((n) => n.url),
  };
};

export default useWallet;