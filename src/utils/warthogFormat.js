import { ensureBuffer } from './ensureBuffer.js';

const WART_PRECISION = 8;

/** Format a raw integer amount at the given decimal precision. */
export function formatAmountFromRaw(raw, precision) {
  const value = BigInt(raw);
  const divisor = 10n ** BigInt(precision);
  const whole = value / divisor;
  const frac = value % divisor;
  if (precision === 0) return whole.toString();
  return `${whole}.${frac.toString().padStart(precision, '0')}`;
}

/** Format a WART balance object `{ str, E8 }` from the node API. */
export async function formatWartBalance(wartObj) {
  if (wartObj == null || wartObj === '') return '0.00000000';
  // Some mainnet responses return a bare decimal string
  if (typeof wartObj === 'string') {
    const n = Number(wartObj);
    if (Number.isFinite(n)) return wartObj.includes('.') ? wartObj : `${wartObj}.00000000`;
    return '0.00000000';
  }
  if (typeof wartObj === 'number' && Number.isFinite(wartObj)) {
    return wartObj.toFixed(WART_PRECISION);
  }
  if (wartObj.str != null && wartObj.str !== '') return String(wartObj.str);
  if (wartObj.E8 !== undefined && wartObj.E8 !== null) {
    try {
      return formatAmountFromRaw(BigInt(wartObj.E8), WART_PRECISION);
    } catch {
      return '0.00000000';
    }
  }
  if (wartObj.balanceE8 !== undefined && wartObj.balanceE8 !== null) {
    try {
      return formatAmountFromRaw(BigInt(wartObj.balanceE8), WART_PRECISION);
    } catch {
      return '0.00000000';
    }
  }
  return '0.00000000';
}

/** Convert a node amount field to E8 bigint (0n if missing). */
export function amountToE8(amount) {
  if (amount == null) return 0n;
  if (typeof amount === 'bigint') return amount;
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    return BigInt(Math.round(amount));
  }
  if (typeof amount === 'string') {
    if (/^\d+$/.test(amount)) return BigInt(amount);
    // decimal string → E8
    const [w, f = ''] = amount.split('.');
    const frac = (f + '00000000').slice(0, 8);
    return BigInt(w || '0') * 10n ** 8n + BigInt(frac || '0');
  }
  if (typeof amount === 'object') {
    if (amount.E8 != null) return BigInt(amount.E8);
    if (amount.balanceE8 != null) return BigInt(amount.balanceE8);
    if (amount.str != null) return amountToE8(String(amount.str));
  }
  return 0n;
}

/**
 * Normalize account balance API payloads (mainnet + DeFi testnet).
 * @returns {{ total: string, available: string, locked: string, mempool: string, totalE8: bigint, availableE8: bigint, lockedE8: bigint }}
 */
export async function parseAccountWartBalance(data) {
  // DeFi: data.wart.{total,locked,mempool}
  // Mainnet legacy: data.balance.total | data.balance (string) | data.balanceE8
  let totalObj =
    data?.wart?.total ??
    data?.balance?.total ??
    (typeof data?.balance === 'object' && data?.balance?.E8 != null
      ? data.balance
      : null);

  if (!totalObj && (typeof data?.balance === 'string' || data?.balanceE8 != null)) {
    totalObj =
      data.balanceE8 != null
        ? { E8: data.balanceE8, str: data.balance }
        : data.balance;
  }

  const lockedObj = data?.wart?.locked ?? data?.balance?.locked ?? null;
  const mempoolObj = data?.wart?.mempool ?? data?.balance?.mempool ?? null;

  const totalE8 = amountToE8(totalObj);
  const lockedE8 = amountToE8(lockedObj);
  const mempoolE8 = amountToE8(mempoolObj);
  const availableE8 = totalE8 > lockedE8 ? totalE8 - lockedE8 : 0n;

  const total = await formatWartBalance(
    totalObj ?? { E8: totalE8.toString() },
  );
  const locked = await formatWartBalance(
    lockedObj ?? { E8: lockedE8.toString() },
  );
  const mempool = await formatWartBalance(
    mempoolObj ?? { E8: mempoolE8.toString() },
  );
  const available = formatAmountFromRaw(availableE8, WART_PRECISION);

  return {
    total,
    available,
    locked,
    mempool,
    totalE8,
    availableE8,
    lockedE8,
    mempoolE8,
  };
}

/** Compact display for HUDs (keeps full precision in title attributes). */
export function formatCompactWart(value) {
  if (value == null || value === '') return '…';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(2)}k`;
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

/**
 * Validate a Warthog address locally (no node required).
 * Accepts 40-char account IDs (checksum computed) or 48-char full addresses.
 */
export async function validateWarthogAddressInput(address) {
  const clean = (address || '').trim().replace(/^0x/i, '').toLowerCase();

  if (!clean) {
    return { valid: false, error: 'Please enter an address' };
  }

  if (!/^[0-9a-f]+$/.test(clean)) {
    return { valid: false, error: 'Address must contain only hexadecimal characters (0-9, a-f)' };
  }

  await ensureBuffer();
  const { Address } = await import('warthog-js');

  if (clean.length === 40) {
    const derived = Address.fromRaw(clean);
    if (!derived) {
      return { valid: false, error: 'Invalid 40-character account ID' };
    }
    return {
      valid: true,
      format: 'raw',
      accountId: clean,
      fullAddress: derived.hex,
      checksumValid: true,
      message: 'Valid address',
    };
  }

  if (clean.length === 48) {
    if (!Address.validate(clean)) {
      return {
        valid: false,
        error: 'Checksum invalid — one or more characters may be wrong in this 48-character address.',
      };
    }
    return {
      valid: true,
      format: 'full',
      fullAddress: clean,
      accountId: clean.slice(0, 40),
      checksumValid: true,
      message: 'Valid address',
    };
  }

  return {
    valid: false,
    error: `Address must be 40 hex characters (account ID) or 48 hex characters (full address with checksum). You entered ${clean.length}.`,
  };
}

/** Format a token balance object from the node API. */
export async function formatTokenBalance(balanceObj, decimals = 8) {
  if (!balanceObj) return '0';
  if (balanceObj.str) return balanceObj.str;

  const raw = balanceObj.u64 ?? balanceObj.E8 ?? balanceObj.amount;
  if (raw !== undefined) {
    return formatAmountFromRaw(raw, decimals);
  }

  return '0';
}

/** Format a limit order price using warthog-js Price when a hex encoding is available. */
export async function formatLimitPrice(limit, assetDecimals = 8) {
  if (limit == null) return '0.00000000';
  if (typeof limit === 'number') return limit.toFixed(8);
  if (typeof limit === 'string') {
    if (limit.length === 6) {
      return formatLimitPriceFromHex(limit, assetDecimals);
    }
    const asNum = Number(limit);
    return Number.isFinite(asNum) ? asNum.toFixed(8) : limit;
  }
  if (limit.doubleAdjusted != null) {
    return Number(limit.doubleAdjusted).toFixed(8);
  }
  if (limit.hex?.length === 6) {
    return formatLimitPriceFromHex(limit.hex, assetDecimals);
  }
  return '0.00000000';
}

async function formatLimitPriceFromHex(hex, assetDecimals) {
  await ensureBuffer();
  const { Price, TokenPrecision } = await import('warthog-js');
  const price = Price.fromHex(hex);
  if (!price) return '0.00000000';
  const prec = new TokenPrecision(assetDecimals);
  return price.toDoubleAdjusted(prec).toFixed(8);
}

/** Validate a 64-character asset hash. */
export function isValidAssetHash(hash) {
  const clean = (hash || '').trim().toLowerCase();
  return clean.length === 64 && /^[0-9a-f]+$/.test(clean);
}

/** Parse a nonce from account data and return the next usable nonce id. */
export async function getNextNonceFromAccount(data) {
  const current = data?.nonceId ?? data?.nonce;
  if (current === undefined) return 0;
  await ensureBuffer();
  const { NonceId } = await import('warthog-js');
  const nonce = NonceId.fromNumber(Number(current));
  if (!nonce) return 0;
  const next = NonceId.fromNumber(nonce.value + 1);
  return next ? next.value : 0;
}