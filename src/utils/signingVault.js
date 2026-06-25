let privateKeyHex = null;

export function setSigningPrivateKey(key) {
  privateKeyHex = key ? String(key).trim().replace(/^0x/i, '') : null;
}

export function clearSigningPrivateKey() {
  privateKeyHex = null;
}

export function getSigningPrivateKey() {
  return privateKeyHex;
}