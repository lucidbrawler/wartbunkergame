import { ensureBuffer } from './ensureBuffer.js';
import { shouldUseNodeProxy } from './nodeAccess.js';
import { createBrowserWarthogApi } from './browserWarthogApi.js';
import { getSigningPrivateKey } from './signingVault.js';

/** Normalize a node base URL from user input. */
export function normalizeNodeUrl(nodeBase) {
  let normalized = String(nodeBase || '').trim().replace(/\/+$/, '');
  if (!normalized) return '';
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized)) {
    normalized = `http://${normalized}`;
  }
  return normalized;
}

/** Create a WarthogApi client for browser use. */
export async function createWarthogApi(nodeBase) {
  await ensureBuffer();
  const { WarthogApi } = await import('warthog-js');
  const normalized = normalizeNodeUrl(nodeBase);
  return createBrowserWarthogApi(WarthogApi, normalized, {
    useProxy: shouldUseNodeProxy(normalized),
  });
}

/** Convert WarthogApi result to the `{ code, data, error }` shape UI components expect. */
export function toNodeResponse(result) {
  if (result.success) {
    return { code: 0, data: result.data };
  }
  return { code: result.code, error: result.error };
}

/** Shape a successful submit result for transaction result cards. */
export function formatSubmitResult(data) {
  return { code: 0, data };
}

/** Shape a failed submit result for transaction result cards. */
export function formatSubmitError(message) {
  return { code: -1, error: message };
}

/** GET a node path and return the legacy `{ code, data, error }` response shape. */
export async function getNodeData(api, path) {
  return toNodeResponse(await api.getNodePath(path));
}

/** Parse a 40- or 48-char recipient address. */
export function parseRecipientAddress(Address, raw) {
  const trimmed = raw.trim().replace(/^0x/i, '');
  return Address.fromHex(trimmed) ?? Address.fromRaw(trimmed);
}

/** Normalize an asset hash to lowercase 64-char hex (no 0x). */
export function normalizeAssetHash(raw) {
  return raw.trim().replace(/^0x/i, '').toLowerCase();
}

/**
 * Fetch fee + chain pin, sign a tx, and submit via WarthogApi.
 * Supports legacy buildTx or buildSpec (asset/DEX transactions).
 * @returns {{ nonce: number, data: unknown }}
 */
export async function signAndSubmitTransaction(api, { privateKey, nonceId, buildTx, buildSpec }) {
  const { Account, NonceId, RoundedFee } = await import('warthog-js');

  const feeRes = await api.getMinFee();
  if (!feeRes.success) {
    throw new Error(feeRes.error || 'Could not fetch minimum fee');
  }

  const fee = RoundedFee.fromE8(BigInt(feeRes.data.minFee.E8), true);
  if (!fee) {
    throw new Error('Invalid fee from node');
  }

  const nonce = NonceId.fromNumber(nonceId);
  if (!nonce) {
    throw new Error('Invalid nonce');
  }

  const key = privateKey || getSigningPrivateKey();
  if (!key) {
    throw new Error('Wallet is locked — unlock to sign transactions');
  }

  const ctx = await api.createTransactionContext(fee, nonce);
  const account = Account.fromPrivateKeyHex(key);

  let tx;
  if (buildSpec) {
    const { executeBuildSpec } = await import('./txBuildHandlers.js');
    tx = await executeBuildSpec(ctx, account, buildSpec);
  } else if (buildTx) {
    tx = await buildTx(ctx, account);
  } else {
    throw new Error('No transaction builder provided');
  }

  const submitResult = await api.submitTransaction(tx);

  if (!submitResult.success) {
    throw new Error(submitResult.error || 'Node rejected transaction');
  }

  return { nonce: nonce.value, data: submitResult.data };
}