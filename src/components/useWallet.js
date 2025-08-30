// useWallet.js - Custom hook for wallet functionality
import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { ethers } from 'ethers';

const API_URL = '/api/proxy';

const defaultNodeList = [
  'https://warthognode.duckdns.org',
  'http://51.75.21.134:3001',
  'http://62.72.44.89:3001',
  'http://dev.node-s.com:3001',
  'https://node.wartscan.io'
];

const useWallet = () => {
  // Wallet state
  const [walletData, setWalletData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
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
  const [saveWalletConsent, setSaveWalletConsent] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isWalletProcessed, setIsWalletProcessed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedNode, setSelectedNode] = useState(defaultNodeList[4]);

  // UI state
  const [consentToClose, setConsentToClose] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [currentModal, setCurrentModal] = useState(null);
  const [error, setError] = useState(null);

  // Results
  const [validateResult, setValidateResult] = useState(null);
  const [sendResult, setSendResult] = useState(null);

  // Initialize wallet from localStorage on mount
  useEffect(() => {
    const encryptedWallet = localStorage.getItem('warthogWallet');
    if (encryptedWallet) {
      setShowPasswordPrompt(true);
      setCurrentModal('unlock-wallet');
    }
  }, []);

  // Fetch balance and nonce when wallet or node changes
  useEffect(() => {
    if (wallet?.address) {
      fetchBalanceAndNonce(wallet.address);
    }
  }, [wallet, selectedNode]);

  // Utility functions
  const wartToE8 = (wart) => {
    try {
      const num = parseFloat(wart);
      if (isNaN(num) || num <= 0) return null;
      return Math.round(num * 100000000);
    } catch {
      return null;
    }
  };

  const closeModal = () => {
    setCurrentModal(null);
    setError(null);
  };

  // API functions
  const fetchBalanceAndNonce = async (address) => {
    setError(null);
    setBalance(null);
    setNonceId(null);
    setPinHeight(null);
    setPinHash(null);

    try {
      const nodeBaseParam = `nodeBase=${encodeURIComponent(selectedNode)}`;
      
      // Fetch chain head
      const chainHeadResponse = await axios.get(`${API_URL}?nodePath=chain/head&${nodeBaseParam}`);
      const chainHeadData = chainHeadResponse.data.data || chainHeadResponse.data;
      setPinHeight(chainHeadData.pinHeight);
      setPinHash(chainHeadData.pinHash);

      // Fetch balance
      const balanceResponse = await axios.get(`${API_URL}?nodePath=account/${address}/balance&${nodeBaseParam}`);
      const balanceData = balanceResponse.data.data || balanceResponse.data;
      const balanceInWart = balanceData.balance !== undefined ? (balanceData.balance / 1).toFixed(8) : '0';
      setBalance(balanceInWart);

      setNonceId(balanceData.nonceId !== undefined ? Number(balanceData.nonceId) + 1 : 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not fetch chain head or balance');
    }
  };

  // Wallet encryption/decryption
  const encryptWallet = (walletData, password) => {
    const { privateKey, publicKey, address } = walletData;
    const walletToSave = { privateKey, publicKey, address };
    return CryptoJS.AES.encrypt(JSON.stringify(walletToSave), password).toString();
  };

  const decryptWallet = (encrypted, password) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error('Invalid password');
      return JSON.parse(decrypted);
    } catch {
      throw new Error('Failed to decrypt wallet: Invalid password');
    }
  };

  // Wallet management functions
  const saveWalletFunc = (walletData, pass, consent) => {
    if (!consent || !pass) {
      setError('Please provide a password and consent to save the wallet');
      return false;
    }
    
    try {
      const encrypted = encryptWallet(walletData, pass);
      localStorage.setItem('warthogWallet', encrypted);
      setWallet(walletData);
      setShowPasswordPrompt(false);
      setError(null);
      setIsWalletProcessed(true);
      setIsLoggedIn(true);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const downloadWalletFunc = (walletData, pass) => {
    if (!pass) {
      setError('Please provide a password to encrypt the wallet file');
      return;
    }
    
    try {
      const encrypted = encryptWallet(walletData, pass);
      const blob = new Blob([encrypted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'warthog_wallet.txt';
      a.click();
      URL.revokeObjectURL(url);
      setIsWalletProcessed(true);
    } catch (err) {
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
      setUploadedFile(e.target.result);
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  };

  const loadWallet = (pass) => {
    if (!pass) {
      setError('Please provide a password');
      return;
    }
    
    try {
      let encrypted;
      if (uploadedFile) {
        encrypted = uploadedFile;
      } else {
        encrypted = localStorage.getItem('warthogWallet');
        if (!encrypted) throw new Error('No wallet found in storage or file');
      }
      
      const decryptedWallet = decryptWallet(encrypted, pass);
      setWallet(decryptedWallet);
      setShowPasswordPrompt(false);
      setUploadedFile(null);
      setError(null);
      setIsWalletProcessed(false);
      setIsLoggedIn(true);
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const clearWallet = () => {
    localStorage.removeItem('warthogWallet');
    setWallet(null);
    setBalance(null);
    setNonceId(null);
    setPinHeight(null);
    setPinHash(null);
    setError(null);
    setPassword('');
    setSaveWalletConsent(false);
    setUploadedFile(null);
    setIsWalletProcessed(false);
    setIsLoggedIn(false);
  };

  // Wallet generation functions
  const generateWallet = async (wordCnt, pType) => {
    try {
      const strengthBytes = wordCnt === 12 ? 16 : 32;
      const entropy = window.crypto.getRandomValues(new Uint8Array(strengthBytes));
      const mnemonicObj = ethers.Mnemonic.fromEntropy(ethers.hexlify(entropy));
      const mn = mnemonicObj.phrase;
      const path = pType === 'hardened' ? "m/44'/2070'/0'/0/0" : "m/44'/2070'/0/0/0";
      const hdWallet = ethers.HDNodeWallet.fromPhrase(mn, '', path);
      const publicKey = hdWallet.publicKey.slice(2);
      const sha = ethers.sha256('0x' + publicKey).slice(2);
      const ripemd = ethers.ripemd160('0x' + sha).slice(2);
      const checksum = ethers.sha256('0x' + ripemd).slice(2, 10);
      const addr = ripemd + checksum;
      
      return {
        mnemonic: mn,
        wordCount: wordCnt,
        pathType: pType,
        privateKey: hdWallet.privateKey.slice(2),
        publicKey,
        address: addr,
      };
    } catch (err) {
      throw new Error('Failed to generate wallet');
    }
  };

  const deriveWallet = (mn, wordCnt, pType) => {
    try {
      const words = mn.trim().split(/\s+/);
      if (words.length !== wordCnt) {
        throw new Error(`Invalid mnemonic: must have exactly ${wordCnt} words`);
      }
      
      const path = pType === 'hardened' ? "m/44'/2070'/0'/0/0" : "m/44'/2070'/0/0/0";
      const hdWallet = ethers.HDNodeWallet.fromPhrase(mn, '', path);
      const publicKey = hdWallet.publicKey.slice(2);
      const sha = ethers.sha256('0x' + publicKey).slice(2);
      const ripemd = ethers.ripemd160('0x' + sha).slice(2);
      const checksum = ethers.sha256('0x' + ripemd).slice(2, 10);
      const addr = ripemd + checksum;
      
      return {
        mnemonic: mn,
        wordCount: wordCnt,
        pathType: pType,
        privateKey: hdWallet.privateKey.slice(2),
        publicKey,
        address: addr,
      };
    } catch (err) {
      throw new Error('Invalid mnemonic');
    }
  };

  const importFromPrivateKey = (privKey) => {
    try {
      const signer = new ethers.Wallet('0x' + privKey);
      const publicKey = signer.publicKey.slice(2);
      const sha = ethers.sha256('0x' + publicKey).slice(2);
      const ripemd = ethers.ripemd160('0x' + sha).slice(2);
      const checksum = ethers.sha256('0x' + ripemd).slice(2, 10);
      const addr = ripemd + checksum;
      
      return {
        privateKey: privKey,
        publicKey,
        address: addr,
      };
    } catch (err) {
      throw new Error('Invalid private key');
    }
  };

  // Main wallet action handler
  const handleWalletActionFunc = async () => {
    setError(null);
    setIsWalletProcessed(false);

    // Validation
    if (walletAction === 'login' && !uploadedFile) {
      setError('Please upload the warthog_wallet.txt file');
      return;
    }

    if (walletAction === 'login') {
      loadWallet(password);
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
        data = deriveWallet(mnemonic, Number(wordCount), pathType);
      } else if (walletAction === 'import') {
        data = importFromPrivateKey(privateKeyInput);
      }
      
      setWalletData(data);
      setCurrentModal('wallet-info');
    } catch (err) {
      setError(err.message || `Failed to ${walletAction} wallet`);
      clearWallet();
    }
  };

  // Address validation
  const validateAddress = (addr) => {
    if (typeof addr !== 'string' || addr.length !== 48) {
      return { valid: false };
    }
    
    const ripemdHex = addr.slice(0, 40);
    const checksumHex = addr.slice(40);
    const computedChecksum = ethers.sha256('0x' + ripemdHex).slice(2, 10);
    
    return { valid: computedChecksum === checksumHex };
  };

  const handleValidateAddress = () => {
    setError(null);
    setValidateResult(null);
    
    if (!address) {
      setError('Please enter an address');
      return;
    }
    
    try {
      const result = validateAddress(address);
      setValidateResult(result);
    } catch (err) {
      setError(err.message || 'Failed to validate address');
    }
  };

  // Transaction functions
  const getRoundedFeeE8 = async (feeWart) => {
    const nodeBaseParam = `nodeBase=${encodeURIComponent(selectedNode)}`;
    
    try {
      const response = await axios.get(`${API_URL}?nodePath=tools/encode16bit/from_string/${feeWart}&${nodeBaseParam}`);
      const feeData = response.data.data || response.data;
      return feeData.roundedE8;
    } catch (err) {
      throw new Error('Failed to round fee');
    }
  };

  const handleSendTransaction = async () => {
    setError(null);
    setSendResult(null);
    
    // Validation
    if (!toAddr || !amount || !fee) {
      setError('Please fill in all transaction fields');
      return;
    }
    
    const amountE8 = wartToE8(amount);
    let feeE8;
    
    try {
      feeE8 = await getRoundedFeeE8(fee);
    } catch {
      setError('Invalid fee or failed to round');
      return;
    }
    
    if (!amountE8 || !feeE8) {
      setError('Invalid amount or fee: must be positive numbers');
      return;
    }
    
    const txPrivateKey = wallet?.privateKey;
    if (!txPrivateKey) {
      setError('No wallet saved. Please create, derive, or log in with a wallet first.');
      return;
    }
    
    if (nonceId === null || pinHeight === null || pinHash === null) {
      setError('Nonce or chain head not available. Please refresh balance and try again.');
      return;
    }
    
    try {
      // Prepare transaction data
      const pinHashBytes = ethers.getBytes('0x' + pinHash);
      const heightBytes = new Uint8Array(4);
      new DataView(heightBytes.buffer).setUint32(0, pinHeight, false);
      const nonceBytes = new Uint8Array(4);
      new DataView(nonceBytes.buffer).setUint32(0, nonceId, false);
      const reserved = new Uint8Array(3);
      const feeBytes = new Uint8Array(8);
      new DataView(feeBytes.buffer).setBigUint64(0, BigInt(feeE8), false);
      const toRawBytes = ethers.getBytes('0x' + toAddr.slice(0, 40));
      const amountBytes = new Uint8Array(8);
      new DataView(amountBytes.buffer).setBigUint64(0, BigInt(amountE8), false);

      // Create message bytes
      const messageBytes = ethers.concat([
        pinHashBytes,
        heightBytes,
        nonceBytes,
        reserved,
        feeBytes,
        toRawBytes,
        amountBytes,
      ]);

      // Sign transaction
      const txHash = ethers.sha256(messageBytes);
      const txHashBytes = ethers.getBytes(txHash);
      const signer = new ethers.Wallet('0x' + txPrivateKey);
      const sig = signer.signingKey.sign(txHashBytes);

      const rHex = sig.r.slice(2);
      const sHex = sig.s.slice(2);
      const recid = sig.v - 27;
      const recidHex = recid.toString(16).padStart(2, '0');
      const signature65 = rHex + sHex + recidHex;

      // Send transaction
      const nodeBaseParam = `nodeBase=${encodeURIComponent(selectedNode)}`;
      const response = await axios.post(
        `${API_URL}?nodePath=transaction/add&${nodeBaseParam}`,
        {
          pinHeight,
          nonceId,
          toAddr,
          amountE8,
          feeE8,
          signature65,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      setSendResult(response.data);
      setToAddr('');
      setAmount('');
      setFee('');
      
      // Refresh balance
      if (wallet?.address) {
        fetchBalanceAndNonce(wallet.address);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send transaction');
    }
  };

  return {
    // Wallet state
    walletData,
    wallet,
    balance,
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
    setWallet,
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
    setUploadedFile,
    setIsWalletProcessed,
    setIsLoggedIn,
    setSelectedNode,
    setConsentToClose,
    setShowDownloadPrompt,
    setShowPasswordPrompt,
    setCurrentModal,
    setError,
    setValidateResult,
    setSendResult,
    
    // Functions
    closeModal,
    saveWalletFunc,
    downloadWalletFunc,
    handleFileUpload,
    loadWallet,
    clearWallet,
    handleWalletActionFunc,
    handleValidateAddress,
    handleSendTransaction,
    defaultNodeList,
  };
};

export default useWallet;