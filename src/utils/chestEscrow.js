/**
 * On-chain Astro-Hog chests for DeFi testnet.
 *
 * Bury: generate ephemeral escrow wallet → encrypt its key with the constellation
 * puzzle → transfer real WART to the escrow address.
 *
 * Claim: solve puzzle → decrypt key → transfer escrow balance to claimer.
 */

import CryptoJS from 'crypto-js';
import {
  createWarthogApi,
  signAndSubmitTransaction,
  parseRecipientAddress,
} from './warthogClient.js';
import {
  formatAmountFromRaw,
  formatWartBalance,
  parseAccountWartBalance,
} from './warthogFormat.js';
import { isDefiNode, isMainnetNode } from './presetNodes.js';

const WART_E8 = 100_000_000n;

function solutionPassword(solution, salt) {
  const body = `${(solution || []).join(',')}|${salt || 'astrohog'}`;
  return CryptoJS.SHA256(body).toString(CryptoJS.enc.Hex);
}

/** Seal escrow private key so only the constellation sequence can open it. */
export function encryptEscrowKey(privateKeyHex, solution, salt) {
  const check = CryptoJS.SHA256(privateKeyHex).toString(CryptoJS.enc.Hex).slice(0, 12);
  const payload = JSON.stringify({ pk: privateKeyHex, check });
  return CryptoJS.AES.encrypt(payload, solutionPassword(solution, salt)).toString();
}

/** Open sealed key; throws if the sequence is wrong. */
export function decryptEscrowKey(encrypted, solution, salt) {
  try {
    const raw = CryptoJS.AES.decrypt(
      encrypted,
      solutionPassword(solution, salt),
    ).toString(CryptoJS.enc.Utf8);
    if (!raw) throw new Error('Wrong constellation sequence');
    const payload = JSON.parse(raw);
    if (!payload?.pk || typeof payload.pk !== 'string') {
      throw new Error('Wrong constellation sequence');
    }
    const check = CryptoJS.SHA256(payload.pk).toString(CryptoJS.enc.Hex).slice(0, 12);
    if (check !== payload.check) throw new Error('Wrong constellation sequence');
    return payload.pk.replace(/^0x/i, '').toLowerCase();
  } catch (err) {
    if (err.message === 'Wrong constellation sequence') throw err;
    throw new Error('Wrong constellation sequence');
  }
}

/** Compact portable code friends can paste (works cross-browser). */
export function encodeSharePayload(chest) {
  const slim = {
    v: 1,
    id: chest.id,
    code: chest.code,
    amount: chest.amount,
    escrowAddress: chest.escrowAddress,
    encryptedKey: chest.encryptedKey,
    salt: chest.salt,
    puzzleHint: chest.puzzleHint || '',
    message: chest.message || '',
    authorName: chest.authorName || '',
    authorAddress: chest.authorAddress || '',
    mapX: chest.mapX,
    mapY: chest.mapY,
    chain: 'defi',
  };
  const json = JSON.stringify(slim);
  const b64 =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf8').toString('base64');
  return `AH1.${b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export function decodeSharePayload(raw) {
  const text = String(raw || '').trim();
  if (!text.toUpperCase().startsWith('AH1.')) return null;
  try {
    const b64 = text
      .slice(4)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const json =
      typeof atob === 'function'
        ? decodeURIComponent(escape(atob(b64 + pad)))
        : Buffer.from(b64 + pad, 'base64').toString('utf8');
    const data = JSON.parse(json);
    if (!data?.escrowAddress || !data?.encryptedKey) return null;
    return {
      id: data.id || `import_${Date.now().toString(36)}`,
      code: data.code || 'HOG-IMP',
      amount: Number(data.amount) || 0,
      escrowAddress: data.escrowAddress,
      encryptedKey: data.encryptedKey,
      salt: data.salt || data.id || 'astrohog',
      puzzleType: 'constellation',
      puzzleHint: data.puzzleHint || '',
      message: data.message || '',
      authorName: data.authorName || 'Unknown',
      authorAddress: data.authorAddress || '',
      mapX: Number.isFinite(data.mapX) ? data.mapX : 7,
      mapY: Number.isFinite(data.mapY) ? data.mapY : 3,
      onChain: true,
      seeded: false,
      claimed: false,
      createdAt: Date.now(),
      imported: true,
    };
  } catch {
    return null;
  }
}

async function fetchWartBalanceE8(api, address, nodeUrl) {
  let balRes = isMainnetNode(nodeUrl)
    ? await api.getAccountBalance(address)
    : await api.getAccountWartBalance(address);
  if (!balRes.success) {
    balRes = isMainnetNode(nodeUrl)
      ? await api.getAccountWartBalance(address)
      : await api.getAccountBalance(address);
  }
  if (!balRes.success) {
    throw new Error(balRes.error || 'Failed to fetch balance');
  }
  const parsed = await parseAccountWartBalance(balRes.data);
  // For escrow sweeps use total (funds sit unlocked on the escrow key)
  return parsed.totalE8;
}

async function resolveNonce(api, address, nodeUrl) {
  if (isDefiNode(nodeUrl)) {
    // DeFi testnet often accepts 0; still try account endpoint when present.
    try {
      const res = await api.getAccountWartBalance(address);
      if (res.success) {
        const n = res.data?.nonceId ?? res.data?.nonce;
        if (n != null && Number.isFinite(Number(n))) return Number(n) + 1;
      }
    } catch {
      /* fall through */
    }
    return 0;
  }
  const res = await api.getAccountBalance(address);
  if (!res.success) return 0;
  const n = res.data?.nonceId ?? res.data?.nonce;
  return n != null && Number.isFinite(Number(n)) ? Number(n) + 1 : 0;
}

/**
 * Create escrow keypair, fund it with real WART, return chest fields.
 */
export async function buryOnChainChest({
  nodeUrl,
  amount,
  puzzleSolution,
  puzzleHint,
  message,
  authorName,
  authorAddress,
  mapX,
  mapY,
  nextNonce,
}) {
  if (!isDefiNode(nodeUrl)) {
    throw new Error('On-chain chests require a DeFi / testnet node');
  }
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error('Amount must be a positive number');
  }
  if (!Array.isArray(puzzleSolution) || puzzleSolution.length < 1) {
    throw new Error('Pick at least 1 star for the constellation lock');
  }

  const { Account, Wart } = await import('warthog-js');
  // Fresh random escrow account
  const entropy = crypto.getRandomValues(new Uint8Array(32));
  const pkHex = Array.from(entropy, (b) => b.toString(16).padStart(2, '0')).join('');
  const escrow = Account.fromPrivateKeyHex(pkHex);
  const escrowAddress = escrow.address.hex;
  const salt = `ah_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const encryptedKey = encryptEscrowKey(pkHex, puzzleSolution, salt);

  const amountStr =
    amountNum >= 1
      ? amountNum.toFixed(8).replace(/\.?0+$/, '') || String(amountNum)
      : String(amountNum);

  const wartAmount = Wart.parse(amountStr);
  if (!wartAmount) throw new Error('Invalid amount');

  const api = await createWarthogApi(nodeUrl);
  const nonceId =
    nextNonce != null && Number.isFinite(Number(nextNonce))
      ? Number(nextNonce)
      : await resolveNonce(api, authorAddress, nodeUrl);

  const { nonce, data } = await signAndSubmitTransaction(api, {
    nonceId,
    buildSpec: {
      type: 'TRANSFER_WART',
      recipientHex: escrowAddress,
      amount: amountStr,
    },
  });

  const chest = {
    id: salt,
    code: `HOG-${salt.slice(-4).toUpperCase()}`,
    amount: Math.round(amountNum * 1e8) / 1e8,
    puzzleType: 'constellation',
    // Do not store plaintext solution for on-chain chests
    puzzleHint:
      puzzleHint ||
      'Constellation lock — ask the pilot who buried it, or guess the stars.',
    message: message || `${authorName || 'A pilot'} sealed testnet WART here.`,
    authorName: authorName || 'Pilot',
    authorAddress: authorAddress || '',
    mapX: Number(mapX),
    mapY: Number(mapY),
    onChain: true,
    escrowAddress,
    encryptedKey,
    salt,
    fundTx: data?.txHash || data?.hash || null,
    seeded: false,
    claimed: false,
    createdAt: Date.now(),
  };

  chest.shareCode = encodeSharePayload(chest);

  return { chest, nonce, submitData: data };
}

/**
 * Solve puzzle and sweep escrow WART to claimer.
 */
export async function claimOnChainChest({
  nodeUrl,
  chest,
  puzzleAttempt,
  claimerAddress,
}) {
  if (!chest?.onChain || !chest.encryptedKey || !chest.escrowAddress) {
    throw new Error('Not an on-chain chest');
  }
  if (!claimerAddress) {
    throw new Error('Connect a wallet to claim on-chain WART');
  }

  const privateKey = decryptEscrowKey(
    chest.encryptedKey,
    puzzleAttempt,
    chest.salt || chest.id,
  );

  const api = await createWarthogApi(nodeUrl);
  const { Address, Wart, RoundedFee } = await import('warthog-js');

  const feeRes = await api.getMinFee();
  if (!feeRes.success) throw new Error(feeRes.error || 'Could not fetch fee');
  const fee = RoundedFee.fromE8(BigInt(feeRes.data.minFee.E8), true);
  if (!fee) throw new Error('Invalid fee');

  const balanceE8 = await fetchWartBalanceE8(api, chest.escrowAddress, nodeUrl);
  if (balanceE8 <= 0n) {
    throw new Error('Escrow is empty (already claimed or not funded yet)');
  }

  const feeE8 = fee.E8 ?? BigInt(feeRes.data.minFee.E8);
  // Leave a little headroom for fee rounding
  const sendE8 = balanceE8 > feeE8 + 1n ? balanceE8 - feeE8 - 1n : 0n;
  if (sendE8 <= 0n) {
    throw new Error('Escrow balance too small to cover network fee');
  }

  const wartAmount = Wart.fromE8(sendE8);
  if (!wartAmount) throw new Error('Could not build claim amount');
  const amountStr = formatAmountFromRaw(sendE8, 8);

  const recipient = parseRecipientAddress(Address, claimerAddress);
  if (!recipient) throw new Error('Invalid claimer address');

  const nonceId = await resolveNonce(api, chest.escrowAddress, nodeUrl);

  const { nonce, data } = await signAndSubmitTransaction(api, {
    privateKey,
    nonceId,
    buildSpec: {
      type: 'TRANSFER_WART',
      recipientHex: recipient.hex,
      amount: amountStr,
    },
  });

  return {
    nonce,
    data,
    amountReceived: amountStr,
    amountE8: sendE8,
  };
}

export async function getNodeWartBalance(nodeUrl, address) {
  const api = await createWarthogApi(nodeUrl);
  const e8 = await fetchWartBalanceE8(api, address, nodeUrl);
  return formatWartBalance({ E8: e8 });
}

export { WART_E8 };
