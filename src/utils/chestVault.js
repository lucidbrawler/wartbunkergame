/**
 * Astro-Hog WART chest vault
 * — Offline: "Stardust WART" (local pouch) + seeded demo caches.
 * — DeFi testnet: on-chain escrow chests (real WART) via chestEscrow.js.
 * — Share: short HOG-XXXX (same browser) or AH1.… portable payload.
 */

import { decodeSharePayload, encodeSharePayload } from './chestEscrow.js';

const STORAGE_KEY = 'wartbunker.astrohog.chests.v1';
const INVENTORY_KEY = 'wartbunker.astrohog.inventory.v1';
const CLAIMED_KEY = 'wartbunker.astrohog.claimed.v1';

const STAR_NAMES = ['Nova', 'Vega', 'Rigel', 'Lyra', 'Orion', 'Pulsar'];

function randomId() {
  return `ch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'HOG-';
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Seeded demo chests — super easy for first runs (guided 1–2 star taps).
 * Stars: 0 Nova, 1 Vega, 2 Rigel, 3 Lyra, 4 Orion, 5 Pulsar
 */
function getSeededChests() {
  return [
    {
      id: 'seed_alpha_cache',
      code: 'HOG-SEED',
      amount: 2.5,
      puzzleType: 'constellation',
      // Just two taps: Nova then Vega
      puzzleSolution: [0, 1],
      puzzleHint: 'TAP IN ORDER: Nova → Vega',
      puzzleReveal: true,
      easy: true,
      message: 'Tutorial cache — follow the glowing star!',
      authorName: 'Colony Survey',
      authorAddress: '',
      mapX: 14,
      mapY: 4,
      seeded: true,
      onChain: false,
      claimed: false,
      createdAt: 0,
    },
    {
      id: 'seed_moon_shrine',
      code: 'HOG-MOON',
      amount: 5,
      puzzleType: 'constellation',
      // Single tap — hard to fail
      puzzleSolution: [0],
      puzzleHint: 'TAP the glowing star: Nova',
      puzzleReveal: true,
      easy: true,
      message: 'One-star practice chest. You got this.',
      authorName: 'Old Miner',
      authorAddress: '',
      mapX: 3,
      mapY: 10,
      seeded: true,
      onChain: false,
      claimed: false,
      createdAt: 0,
    },
    {
      id: 'seed_path_starter',
      code: 'HOG-EASY',
      amount: 1,
      puzzleType: 'constellation',
      puzzleSolution: [1],
      puzzleHint: 'TAP: Vega (the only glowing button)',
      puzzleReveal: true,
      easy: true,
      message: 'Starter chest right by the path.',
      authorName: 'Scout Hog',
      authorAddress: '',
      mapX: 4,
      mapY: 3,
      seeded: true,
      onChain: false,
      claimed: false,
      createdAt: 0,
    },
  ];
}

/** Clear claimed flags on tutorial chests so they can be reopened while testing. */
export function resetPracticeChests() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CLAIMED_KEY);
  // Drop any stale local copies of seeded ids if they were persisted somehow
  const stored = safeParse(localStorage.getItem(STORAGE_KEY), []);
  const filtered = stored.filter((c) => !c?.seeded && !String(c?.id || '').startsWith('seed_'));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getStarNames() {
  return STAR_NAMES;
}

export function loadChests() {
  if (typeof window === 'undefined') return getSeededChests();
  const stored = safeParse(localStorage.getItem(STORAGE_KEY), []);
  const byId = new Map();
  getSeededChests().forEach((c) => byId.set(c.id, { ...c }));
  stored.forEach((c) => {
    if (c?.id) byId.set(c.id, c);
  });
  // Mark claimed seeds from claimed set
  const claimed = new Set(safeParse(localStorage.getItem(CLAIMED_KEY), []));
  return Array.from(byId.values()).map((c) =>
    claimed.has(c.id) ? { ...c, claimed: true } : c,
  );
}

function persistPlayerChests(allChests) {
  const playerOnly = allChests.filter((c) => !c.seeded);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playerOnly));
}

export function loadInventory() {
  if (typeof window === 'undefined') {
    return { stardust: 8, crystals: 0, badges: [] };
  }
  return safeParse(localStorage.getItem(INVENTORY_KEY), {
    stardust: 8,
    crystals: 0,
    badges: [],
  });
}

export function saveInventory(inv) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
}

/**
 * Seal offline Stardust WART into a puzzle chest at a map cell.
 */
export function buryChest({
  amount,
  puzzleSolution,
  puzzleHint,
  message,
  authorName,
  authorAddress,
  mapX,
  mapY,
}) {
  const chests = loadChests();
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error('Amount must be a positive number');
  }
  if (!Array.isArray(puzzleSolution) || puzzleSolution.length < 3) {
    throw new Error('Puzzle needs at least 3 stars');
  }

  const inv = loadInventory();
  if (inv.stardust < amountNum) {
    throw new Error(`Not enough Stardust WART (have ${inv.stardust})`);
  }

  const chest = {
    id: randomId(),
    code: randomCode(),
    amount: Math.round(amountNum * 1000) / 1000,
    puzzleType: 'constellation',
    puzzleSolution: puzzleSolution.map((n) => Number(n)),
    puzzleHint: puzzleHint || 'Trace the stars in order…',
    message: message || 'A sealed WART cache.',
    authorName: authorName || 'Anonymous Hog',
    authorAddress: authorAddress || '',
    mapX: Number(mapX),
    mapY: Number(mapY),
    seeded: false,
    onChain: false,
    claimed: false,
    createdAt: Date.now(),
  };

  inv.stardust = Math.round((inv.stardust - amountNum) * 1000) / 1000;
  saveInventory(inv);

  const next = [...chests.filter((c) => c.id !== chest.id), chest];
  persistPlayerChests(next);
  return { chest, inventory: inv };
}

/** Register an already-funded on-chain chest in the local vault. */
export function registerOnChainChest(chest) {
  const chests = loadChests();
  const next = [...chests.filter((c) => c.id !== chest.id), { ...chest, onChain: true }];
  persistPlayerChests(next);
  return loadChests();
}

/** Mark chest claimed locally (on-chain sweep already done). */
export function markChestClaimed(chestId) {
  const chests = loadChests();
  const idx = chests.findIndex((c) => c.id === chestId);
  if (idx < 0) return loadChests();
  chests[idx] = { ...chests[idx], claimed: true, claimedAt: Date.now() };
  persistPlayerChests(chests);
  if (chests[idx].seeded) {
    const claimed = new Set(safeParse(localStorage.getItem(CLAIMED_KEY), []));
    claimed.add(chestId);
    localStorage.setItem(CLAIMED_KEY, JSON.stringify([...claimed]));
  }
  return loadChests();
}

export function findChestByCode(code) {
  if (!code) return null;
  const raw = String(code).trim();
  // Portable on-chain payload
  if (raw.toUpperCase().startsWith('AH1.')) {
    const imported = decodeSharePayload(raw);
    if (!imported) return null;
    registerOnChainChest(imported);
    return imported;
  }
  const normalized = raw.toUpperCase();
  return loadChests().find((c) => String(c.code).toUpperCase() === normalized) || null;
}

export function getShareCodeForChest(chest) {
  if (!chest) return '';
  if (chest.shareCode) return chest.shareCode;
  if (chest.onChain && chest.encryptedKey) return encodeSharePayload(chest);
  return chest.code || '';
}

export function getChestAt(x, y) {
  return (
    loadChests().find(
      (c) => !c.claimed && c.mapX === x && c.mapY === y,
    ) || null
  );
}

/**
 * Attempt claim. Returns { ok, chest, inventory, error, expectedNext }.
 */
export function claimChest(chestId, attemptSequence) {
  const chests = loadChests();
  const idx = chests.findIndex((c) => c.id === chestId);
  if (idx < 0) return { ok: false, error: 'Chest not found' };
  const chest = chests[idx];
  if (chest.claimed) return { ok: false, error: 'Already claimed — hit Reset practice' };

  const expected = (chest.puzzleSolution || []).map((n) => Number(n));
  const got = (attemptSequence || []).map((n) => Number(n));

  if (got.length < expected.length) {
    const next = expected[got.length];
    return {
      ok: false,
      incomplete: true,
      error: `Need ${expected.length - got.length} more star(s)`,
      expectedNext: next,
    };
  }

  if (
    got.length !== expected.length ||
    !expected.every((v, i) => v === got[i])
  ) {
    return {
      ok: false,
      error: `Wrong order. Need: ${expected
        .map((i) => STAR_NAMES[i] || i)
        .join(' → ')}`,
      expectedNext: expected[0],
    };
  }

  chest.claimed = true;
  chest.claimedAt = Date.now();
  chests[idx] = chest;
  persistPlayerChests(chests);

  if (chest.seeded) {
    const claimed = new Set(safeParse(localStorage.getItem(CLAIMED_KEY), []));
    claimed.add(chest.id);
    localStorage.setItem(CLAIMED_KEY, JSON.stringify([...claimed]));
  }

  const inv = loadInventory();
  inv.stardust = Math.round((inv.stardust + chest.amount) * 1000) / 1000;
  if (!inv.badges.includes('chest_raider')) inv.badges.push('chest_raider');
  saveInventory(inv);

  return { ok: true, chest, inventory: inv };
}

export function getPuzzleLength(chest, easyMode = true) {
  if (chest?.puzzleSolution?.length) return chest.puzzleSolution.length;
  return easyMode ? 2 : 4;
}

export function addStardust(amount) {
  const inv = loadInventory();
  inv.stardust = Math.round((inv.stardust + amount) * 1000) / 1000;
  saveInventory(inv);
  return inv;
}

export function addCrystal() {
  const inv = loadInventory();
  inv.crystals = (inv.crystals || 0) + 1;
  inv.stardust = Math.round((inv.stardust + 0.5) * 1000) / 1000;
  saveInventory(inv);
  return inv;
}
