import CryptoJS from 'crypto-js';

export const AUTO_LOCK_MS = 15 * 60 * 1000;

export function encryptWallet(data, pass) {
  const { privateKey, publicKey, address } = data;
  const walletToSave = { privateKey, publicKey, address };
  return CryptoJS.AES.encrypt(JSON.stringify(walletToSave), pass).toString();
}

export function decryptWallet(encrypted, pass) {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, pass);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error('Invalid password');
    return JSON.parse(decrypted);
  } catch {
    throw new Error('Invalid password');
  }
}

export function getSavedWallets() {
  try {
    if (typeof localStorage === 'undefined') return [];
    return Object.keys(localStorage)
      .filter((key) => key.startsWith('warthogWallet_'))
      .map((key) => key.replace('warthogWallet_', ''))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function migrateLegacyWalletStorage() {
  try {
    const legacy = localStorage.getItem('warthogWallet');
    if (!legacy || localStorage.getItem('warthogWallet_browser')) return;
    localStorage.setItem('warthogWallet_browser', legacy);
    localStorage.removeItem('warthogWallet');
  } catch {
    // ignore migration errors
  }
}