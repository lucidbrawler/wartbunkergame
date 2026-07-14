import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './AstroHogExplore.css';
import {
  addCrystal,
  addStardust,
  buryChest,
  claimChest,
  findChestByCode,
  getChestAt,
  getShareCodeForChest,
  getStarNames,
  loadChests,
  loadInventory,
  markChestClaimed,
  registerOnChainChest,
  resetPracticeChests,
  getPuzzleLength,
} from '../utils/chestVault.js';
import {
  buryOnChainChest,
  claimOnChainChest,
} from '../utils/chestEscrow.js';
import { DEFI_TESTNET_URL } from '../utils/presetNodes.js';
import { formatCompactWart } from '../utils/warthogFormat.js';
import { useWallet } from './WalletContext';

/** Tile legend */
const T = {
  SPACE: 0,
  ROCK: 1,
  PATH: 2,
  GRASS: 3,
  WATER: 4,
  CRYSTAL: 5,
  PAD: 6,
  CHESTPAD: 7,
  SHRINE: 8,
};

const TILE_CLASS = {
  [T.SPACE]: 'astrohog__tile--space',
  [T.ROCK]: 'astrohog__tile--rock',
  [T.PATH]: 'astrohog__tile--path',
  [T.GRASS]: 'astrohog__tile--grass',
  [T.WATER]: 'astrohog__tile--water',
  [T.CRYSTAL]: 'astrohog__tile--crystal',
  [T.PAD]: 'astrohog__tile--pad',
  [T.CHESTPAD]: 'astrohog__tile--chestpad',
  [T.SHRINE]: 'astrohog__tile--shrine',
};

const COLS = 18;
const ROWS = 12;

/**
 * Hand-crafted moon crater overworld — walkable paths, tall grass,
 * crystals, water hazards, chest pads, exit pad, shrine.
 */
const MAP = [
  // 0
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  // 1
  [1, 6, 2, 2, 2, 3, 3, 1, 4, 4, 1, 3, 2, 2, 2, 2, 5, 1],
  // 2
  [1, 2, 1, 1, 2, 3, 1, 1, 4, 4, 1, 1, 2, 1, 1, 2, 3, 1],
  // 3
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 2, 2, 1],
  // 4
  [1, 3, 1, 2, 1, 1, 1, 3, 3, 1, 1, 1, 2, 1, 2, 1, 3, 1],
  // 5
  [1, 3, 3, 2, 2, 2, 2, 2, 2, 2, 5, 2, 2, 2, 2, 3, 3, 1],
  // 6
  [1, 1, 1, 2, 1, 4, 4, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1],
  // 7
  [1, 2, 2, 2, 1, 4, 4, 1, 2, 2, 2, 2, 2, 2, 2, 2, 8, 1],
  // 8
  [1, 2, 1, 3, 1, 1, 1, 1, 2, 1, 3, 1, 1, 1, 3, 1, 2, 1],
  // 9
  [1, 2, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 2, 1],
  // 10
  [1, 2, 2, 2, 7, 2, 1, 5, 2, 1, 1, 2, 2, 1, 2, 2, 2, 1],
  // 11
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const BLOCKED = new Set([T.ROCK, T.WATER]);

const NPCS = [
  {
    id: 'scout',
    x: 5,
    y: 3,
    name: 'Scout Hog',
    lines: [
      'Welcome! Walk to a glowing CHEST and press A.',
      'Tutorial locks are easy: tap the GLOWING star button only.',
      'Try the chest on this path first — code HOG-EASY.',
      'Bury later: pick a short star list, then share the code.',
    ],
  },
  {
    id: 'merchant',
    x: 11,
    y: 9,
    name: 'Stardust Peddler',
    lines: [
      'Easy mode shows you which star to tap next.',
      'Stuck? Open a chest → “Fill answer” or “Reset practice”.',
      'On DeFi testnet, real WART goes into escrow wallets.',
    ],
  },
  {
    id: 'ranger',
    x: 16,
    y: 7,
    name: 'Ridge Ranger',
    lines: [
      'Shrine chest (HOG-MOON) is one tap: Nova.',
      'Survey chest (HOG-SEED) is two taps: Nova → Vega.',
      'You can re-open tutorial chests after Reset practice.',
    ],
  },
];

const EASY_MODE_KEY = 'wartbunker.astrohog.easyMode';
const DEFAULT_EASY = true;

const DIRS = {
  up: { dx: 0, dy: -1, face: 'up' },
  down: { dx: 0, dy: 1, face: 'down' },
  left: { dx: -1, dy: 0, face: 'left' },
  right: { dx: 1, dy: 0, face: 'right' },
};

function tileAt(x, y) {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return T.ROCK;
  return MAP[y][x];
}

function isWalkable(x, y) {
  return !BLOCKED.has(tileAt(x, y));
}

function getTileSize() {
  if (typeof window === 'undefined') return 32;
  if (window.innerWidth >= 900) return 36;
  if (window.innerWidth >= 480) return 32;
  return 28;
}

export default function AstroHogExplore({
  onExit,
  walletName = 'Pilot',
  walletAddress = '',
  isMobile = false,
}) {
  const {
    selectedNode,
    balance,
    availableBalance,
    lockedBalance,
    isDefiNode,
    isSigningUnlocked,
    isSessionLocked,
    isLoggedIn,
    nextNonce,
    refreshBalance,
    applyNode,
    navigateToModal,
    wallet,
  } = useWallet();

  const onChainMode = Boolean(isDefiNode);
  const canSign = Boolean(isLoggedIn && isSigningUnlocked && walletAddress);
  const liveAddress = wallet?.address || walletAddress;

  // Prefer spendable for bury UI; show total + locked in HUD
  const displayAvailable =
    availableBalance != null ? availableBalance : balance;
  const displayTotal = balance;

  const viewportRef = useRef(null);
  const keysRef = useRef({});
  const moveCooldownRef = useRef(0);
  const stickVecRef = useRef({ x: 0, y: 0 });
  const stickTouchId = useRef(null);

  const [tilePx, setTilePx] = useState(32);
  const [player, setPlayer] = useState({ x: 2, y: 3, face: 'right' });
  const [playerMoving, setPlayerMoving] = useState(false);
  const [inventory, setInventory] = useState(() => loadInventory());
  const [chests, setChests] = useState(() => loadChests());
  const [harvested, setHarvested] = useState(() => new Set());
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [dialog, setDialog] = useState(null);
  const [mode, setMode] = useState(null); // bury | claim | code | null
  const [toast, setToast] = useState(null);
  const [stickVisual, setStickVisual] = useState({ x: 0, y: 0, active: false });
  const [buryAt, setBuryAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fx, setFx] = useState(null); // 'success' | 'shake' | null
  const [easyMode, setEasyMode] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_EASY;
    const raw = localStorage.getItem(EASY_MODE_KEY);
    if (raw == null) return DEFAULT_EASY;
    return raw === '1' || raw === 'true';
  });

  // Bury form — easy mode defaults to 2-star locks
  const [buryAmount, setBuryAmount] = useState('0.1');
  const [buryMessage, setBuryMessage] = useState('');
  const [burySequence, setBurySequence] = useState([]);
  const [claimSequence, setClaimSequence] = useState([]);
  const [claimError, setClaimError] = useState('');
  const [activeChest, setActiveChest] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [lastShareCode, setLastShareCode] = useState(null);

  const starNames = useMemo(() => getStarNames(), []);
  const buryTargetLen = easyMode ? 2 : 4;

  // First-run tip
  useEffect(() => {
    const key = 'wartbunker.astrohog.seenIntro';
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    setDialog({
      speaker: 'Astro-Hog',
      lines: [
        'Walk to a glowing chest (one is near you!) and press A.',
        'Easy mode: only the next star GLOWS — tap it, then Open.',
        'Stuck forever? Press B → Reset practice chests.',
      ],
      lineIndex: 0,
      kind: 'info',
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(EASY_MODE_KEY, easyMode ? '1' : '0');
  }, [easyMode]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const refreshChests = useCallback(() => {
    setChests(loadChests());
  }, []);

  const switchToDefiTestnet = useCallback(() => {
    applyNode?.(DEFI_TESTNET_URL);
    showToast('Node → DeFi Testnet (HTTPS)');
    // Balance refresh runs via selectedNode effect in useWallet
  }, [applyNode, showToast]);

  // Refresh chain balance when entering explore / switching nodes
  useEffect(() => {
    if (onChainMode && liveAddress) {
      refreshBalance?.();
    }
  }, [onChainMode, liveAddress, selectedNode, refreshBalance]);

  useEffect(() => {
    const update = () => setTilePx(getTileSize());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Camera follow
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const worldW = COLS * tilePx;
    const worldH = ROWS * tilePx;
    const targetX = player.x * tilePx + tilePx / 2 - vw / 2;
    const targetY = player.y * tilePx + tilePx / 2 - vh / 2;
    setCamera({
      x: Math.max(0, Math.min(worldW - vw, targetX)),
      y: Math.max(0, Math.min(worldH - vh, targetY)),
    });
  }, [player.x, player.y, tilePx]);

  const tryMove = useCallback(
    (dirKey) => {
      if (dialog || mode) return;
      const dir = DIRS[dirKey];
      if (!dir) return;
      const now = performance.now();
      if (now < moveCooldownRef.current) return;
      moveCooldownRef.current = now + (isMobile ? 145 : 115);

      setPlayer((p) => {
        const nx = p.x + dir.dx;
        const ny = p.y + dir.dy;
        if (!isWalkable(nx, ny)) {
          return { ...p, face: dir.face };
        }

        const key = `${nx},${ny}`;
        if (tileAt(nx, ny) === T.CRYSTAL) {
          queueMicrotask(() => {
            setHarvested((prev) => {
              if (prev.has(key)) return prev;
              const next = new Set(prev);
              next.add(key);
              return next;
            });
          });
        }

        setPlayerMoving(true);
        window.setTimeout(() => setPlayerMoving(false), 140);
        return { x: nx, y: ny, face: dir.face };
      });
    },
    [dialog, mode, isMobile],
  );

  // When a new crystal tile is marked harvested, credit stardust once
  const prevHarvestCount = useRef(0);
  useEffect(() => {
    if (harvested.size > prevHarvestCount.current) {
      const inv = addCrystal();
      setInventory(inv);
      showToast('+0.5 Stardust WART · crystal!');
    }
    prevHarvestCount.current = harvested.size;
  }, [harvested, showToast]);

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'z', 'x'].includes(k) || k === 'w' || k === 'a' || k === 's' || k === 'd') {
        e.preventDefault();
      }
      if (k === 'escape') {
        if (mode) {
          setMode(null);
          setActiveChest(null);
          return;
        }
        if (dialog) {
          setDialog(null);
          return;
        }
      }
      if (k === 'e' || k === 'enter' || k === ' ' || k === 'z') {
        e.preventDefault();
        handleA();
      }
      if (k === 'x' || k === 'backspace') {
        handleB();
      }
    };
    const up = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog, mode, player, chests]);

  // Movement loop (keys + stick)
  useEffect(() => {
    let raf;
    const loop = () => {
      const k = keysRef.current;
      const stick = stickVecRef.current;
      let dir = null;
      if (k.w || k.arrowup) dir = 'up';
      else if (k.s || k.arrowdown) dir = 'down';
      else if (k.a || k.arrowleft) dir = 'left';
      else if (k.d || k.arrowright) dir = 'right';
      else if (Math.abs(stick.x) > 0.35 || Math.abs(stick.y) > 0.35) {
        if (Math.abs(stick.x) > Math.abs(stick.y)) {
          dir = stick.x > 0 ? 'right' : 'left';
        } else {
          dir = stick.y > 0 ? 'down' : 'up';
        }
      }
      if (dir) tryMove(dir);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tryMove]);

  const facingCell = useCallback(() => {
    const dir = DIRS[player.face] || DIRS.down;
    return { x: player.x + dir.dx, y: player.y + dir.dy };
  }, [player]);

  const openNpcDialog = useCallback(
    (npc) => {
      setDialog({
        speaker: npc.name,
        lines: npc.lines,
        lineIndex: 0,
        kind: 'npc',
        npcId: npc.id,
      });
    },
    [],
  );

  const advanceDialog = useCallback(() => {
    setDialog((d) => {
      if (!d) return null;
      if (d.lineIndex + 1 < d.lines.length) {
        return { ...d, lineIndex: d.lineIndex + 1 };
      }
      return null;
    });
  }, []);

  const handleA = useCallback(() => {
    if (mode) return;
    if (dialog) {
      if (dialog.kind === 'npc') {
        advanceDialog();
        return;
      }
      if (dialog.kind === 'chest_prompt') {
        return;
      }
      setDialog(null);
      return;
    }

    // Interact with current tile or facing tile
    const targets = [
      { x: player.x, y: player.y },
      facingCell(),
    ];

    for (const cell of targets) {
      const npc = NPCS.find((n) => n.x === cell.x && n.y === cell.y);
      if (npc) {
        openNpcDialog(npc);
        return;
      }
    }

    for (const cell of targets) {
      const chest = chests.find(
        (c) => !c.claimed && c.mapX === cell.x && c.mapY === cell.y,
      );
      if (chest) {
        setActiveChest(chest);
        setClaimSequence([]);
        setClaimError('');
        setMode('claim');
        return;
      }
    }

    for (const cell of targets) {
      const t = tileAt(cell.x, cell.y);
      if (t === T.PAD) {
        setDialog({
          speaker: 'Exit Pad',
          lines: ['Return to the Space Station?'],
          lineIndex: 0,
          kind: 'exit_confirm',
        });
        return;
      }
      if (t === T.CHESTPAD || t === T.SHRINE) {
        const occupied = getChestAt(cell.x, cell.y);
        if (occupied && !occupied.claimed) {
          setActiveChest(occupied);
          setClaimSequence([]);
          setClaimError('');
          setMode('claim');
          return;
        }
        setBuryAt(cell);
        setDialog({
          speaker: t === T.SHRINE ? 'Moon Shrine' : 'Chest Pad',
          lines: [
            onChainMode
              ? t === T.SHRINE
                ? 'Seal real testnet WART in an on-chain escrow chest?'
                : 'Empty pad. Bury DeFi-testnet WART for other explorers?'
              : t === T.SHRINE
                ? 'Seal Stardust WART (offline) behind a constellation lock?'
                : 'Empty cache slot. Bury Stardust WART for other explorers?',
          ],
          lineIndex: 0,
          kind: 'bury_prompt',
        });
        return;
      }
      if (t === T.GRASS) {
        // Small chance of stardust rustle
        if (Math.random() < 0.35) {
          const inv = addStardust(0.25);
          setInventory(inv);
          showToast('Rustle! +0.25 Stardust WART');
        } else {
          showToast('Just space grass…');
        }
        return;
      }
    }

    showToast('Nothing here. Face an NPC, pad, or chest.');
  }, [
    mode,
    dialog,
    player,
    chests,
    facingCell,
    openNpcDialog,
    advanceDialog,
    showToast,
    onChainMode,
  ]);

  const handleB = useCallback(() => {
    if (mode) {
      setMode(null);
      setActiveChest(null);
      setBurySequence([]);
      setClaimSequence([]);
      return;
    }
    if (dialog) {
      setDialog(null);
      return;
    }
    setMode('code');
  }, [mode, dialog]);

  // Stick handlers
  const onStickStart = (e) => {
    const touch = e.changedTouches?.[0] || e;
    stickTouchId.current = touch.identifier ?? 'mouse';
    stickVecRef.current = { x: 0, y: 0 };
    setStickVisual({ x: 0, y: 0, active: true });
  };

  const onStickMove = (e) => {
    if (stickTouchId.current == null) return;
    const base = e.currentTarget.querySelector('.astrohog__stick-base');
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let touch = null;
    if (e.changedTouches) {
      touch = [...e.changedTouches].find(
        (t) => t.identifier === stickTouchId.current,
      );
      if (!touch && e.touches?.length) touch = e.touches[0];
    } else {
      touch = e;
    }
    if (!touch) return;
    const maxR = rect.width / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const mag = Math.hypot(dx, dy) || 1;
    if (mag > maxR) {
      dx = (dx / mag) * maxR;
      dy = (dy / mag) * maxR;
    }
    stickVecRef.current = { x: dx / maxR, y: dy / maxR };
    setStickVisual({ x: dx, y: dy, active: true });
  };

  const onStickEnd = () => {
    stickTouchId.current = null;
    stickVecRef.current = { x: 0, y: 0 };
    setStickVisual({ x: 0, y: 0, active: false });
  };

  const pushStar = (seq, setSeq, idx, max = 4) => {
    setSeq((prev) => {
      if (prev.length >= max) return prev;
      return [...prev, idx];
    });
  };

  /** Guided claim: only accept the next correct star when solution is known. */
  const pickClaimStar = (idx) => {
    if (!activeChest || busy) return;
    const expected = activeChest.puzzleSolution;
    const max = getPuzzleLength(activeChest, easyMode);

    if (Array.isArray(expected) && expected.length > 0) {
      const nextIdx = claimSequence.length;
      if (nextIdx >= expected.length) return;
      if (Number(expected[nextIdx]) !== Number(idx)) {
        setClaimError(
          `Not ${starNames[idx]} — tap ${starNames[expected[nextIdx]]} next`,
        );
        setFx('shake');
        window.setTimeout(() => setFx(null), 400);
        // Easy mode: don't add wrong star
        if (easyMode || activeChest.easy || activeChest.puzzleReveal) return;
      } else {
        setClaimError('');
      }
    }

    setClaimSequence((prev) => {
      if (prev.length >= max) return prev;
      return [...prev, idx];
    });
  };

  const fillClaimAnswer = () => {
    if (!activeChest?.puzzleSolution?.length) {
      showToast('No stored answer (on-chain chests need the real sequence)');
      return;
    }
    setClaimSequence([...activeChest.puzzleSolution]);
    setClaimError('');
    showToast('Answer filled — press Open Chest');
  };

  const handleResetPractice = () => {
    resetPracticeChests();
    refreshChests();
    setInventory(loadInventory());
    setMode(null);
    setActiveChest(null);
    setClaimSequence([]);
    showToast('Tutorial chests restored');
    setFx('success');
    window.setTimeout(() => setFx(null), 700);
  };

  const submitBury = async () => {
    const cell = buryAt || { x: player.x, y: player.y };
    if (getChestAt(cell.x, cell.y)) {
      showToast('This pad already has an unclaimed cache');
      return;
    }
    if (burySequence.length < buryTargetLen) {
      showToast(`Pick ${buryTargetLen} stars for the lock`);
      return;
    }

    if (onChainMode) {
      if (!isLoggedIn || !walletAddress) {
        showToast('Log in a wallet to bury testnet WART');
        navigateToModal?.('wallet-management');
        return;
      }
      if (isSessionLocked || !isSigningUnlocked) {
        showToast('Unlock wallet to sign the escrow transfer');
        navigateToModal?.('wallet-management');
        return;
      }
      setBusy(true);
      try {
        const { chest } = await buryOnChainChest({
          nodeUrl: selectedNode,
          amount: buryAmount,
          puzzleSolution: burySequence,
          puzzleHint: burySequence.map((i) => starNames[i]).join(' → '),
          message: buryMessage || `${walletName} sealed testnet WART.`,
          authorName: walletName,
          authorAddress: walletAddress,
          mapX: cell.x,
          mapY: cell.y,
          nextNonce,
        });
        registerOnChainChest(chest);
        refreshChests();
        refreshBalance?.();
        const share = getShareCodeForChest(chest);
        setLastShareCode(share);
        setMode(null);
        setBurySequence([]);
        setBuryMessage('');
        setBuryAt(null);
        setDialog({
          speaker: 'On-chain Cache Sealed',
          lines: [
            `Sent ${chest.amount} testnet WART to escrow.`,
            `Escrow: ${chest.escrowAddress.slice(0, 10)}…`,
            'Copy the AH1 share code (B menu) so other pilots can claim.',
            share.length > 48 ? `${share.slice(0, 40)}…` : share,
          ],
          lineIndex: 0,
          kind: 'info',
        });
        try {
          await navigator.clipboard?.writeText(share);
          showToast('Share code copied to clipboard');
        } catch {
          showToast('Chest funded on DeFi testnet');
        }
      } catch (err) {
        showToast(err.message || 'On-chain bury failed');
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const { chest, inventory: inv } = buryChest({
        amount: buryAmount,
        puzzleSolution: burySequence,
        puzzleHint: burySequence.map((i) => starNames[i]).join(' → '),
        message: buryMessage || `${walletName} left a cache.`,
        authorName: walletName,
        authorAddress: walletAddress,
        mapX: cell.x,
        mapY: cell.y,
      });
      setInventory(inv);
      refreshChests();
      setLastShareCode(chest.code);
      setMode(null);
      setBurySequence([]);
      setBuryMessage('');
      setBuryAt(null);
      setDialog({
        speaker: 'Cache Sealed',
        lines: [
          `Sealed ${chest.amount} Stardust WART (offline).`,
          `Share code: ${chest.code}`,
          'Switch to DeFi Testnet for real WART escrow chests.',
        ],
        lineIndex: 0,
        kind: 'info',
      });
    } catch (err) {
      showToast(err.message || 'Could not bury chest');
    }
  };

  const submitClaim = async () => {
    if (!activeChest) return;

    if (activeChest.onChain) {
      if (!isLoggedIn || !walletAddress) {
        showToast('Log in to receive claimed WART');
        return;
      }
      if (isSessionLocked || !isSigningUnlocked) {
        showToast('Unlock wallet first (signing not required for claim, but session needed)');
        // Claim signs with escrow key, not user key — still need claimer address
      }
      setBusy(true);
      try {
        const result = await claimOnChainChest({
          nodeUrl: selectedNode,
          chest: activeChest,
          puzzleAttempt: claimSequence,
          claimerAddress: walletAddress,
        });
        markChestClaimed(activeChest.id);
        refreshChests();
        refreshBalance?.();
        setMode(null);
        setActiveChest(null);
        setClaimSequence([]);
        setDialog({
          speaker: 'On-chain Cache Opened!',
          lines: [
            `+${result.amountReceived} testnet WART (after fee)`,
            activeChest.message || 'Empty note.',
            `Left by ${activeChest.authorName || 'unknown'}.`,
          ],
          lineIndex: 0,
          kind: 'info',
        });
        showToast('WART claimed to your wallet');
      } catch (err) {
        showToast(err.message || 'Claim failed');
        setClaimSequence([]);
      } finally {
        setBusy(false);
      }
      return;
    }

    const result = claimChest(activeChest.id, claimSequence);
    if (!result.ok) {
      setClaimError(result.error || 'Puzzle failed');
      showToast(result.error || 'Puzzle failed');
      if (!result.incomplete) {
        setClaimSequence([]);
        setFx('shake');
        window.setTimeout(() => setFx(null), 400);
      }
      return;
    }
    setInventory(result.inventory);
    refreshChests();
    setMode(null);
    setActiveChest(null);
    setClaimSequence([]);
    setClaimError('');
    setFx('success');
    window.setTimeout(() => setFx(null), 900);
    setDialog({
      speaker: 'Cache Opened!',
      lines: [
        `+${result.chest.amount} Stardust WART — nice!`,
        result.chest.message || 'Empty note.',
        `Left by ${result.chest.authorName || 'unknown'}.`,
      ],
      lineIndex: 0,
      kind: 'info',
    });
  };

  const submitCode = () => {
    const chest = findChestByCode(codeInput);
    if (!chest) {
      showToast('Unknown code (try HOG-XXXX or AH1.… payload)');
      return;
    }
    if (chest.claimed) {
      showToast('That cache was already claimed');
      return;
    }
    refreshChests();
    setActiveChest(chest);
    setClaimSequence([]);
    setClaimError('');
    setMode('claim');
  };

  const dialogText = dialog
    ? dialog.lines[dialog.lineIndex] || ''
    : '';

  const claimExpected = activeChest?.puzzleSolution || null;
  const claimNext =
    claimExpected && claimSequence.length < claimExpected.length
      ? claimExpected[claimSequence.length]
      : null;
  const claimDone =
    claimExpected && claimSequence.length >= claimExpected.length
      ? claimExpected.every((v, i) => Number(v) === Number(claimSequence[i]))
      : claimSequence.length >= getPuzzleLength(activeChest, easyMode);

  return (
    <div
      className={`astrohog${isMobile ? ' astrohog--mobile' : ''}${
        easyMode ? ' astrohog--easy' : ''
      }${fx === 'success' ? ' astrohog--fx-success' : ''}${
        fx === 'shake' ? ' astrohog--fx-shake' : ''
      }`}
    >
      <div className="astrohog__topbar">
        <div className="astrohog__brand">
          <div className="astrohog__brand-icon" aria-hidden />
          <span>Astro-Hog · Crater Ridge</span>
        </div>
        <div className="astrohog__stats">
          {onChainMode ? (
            <div
              className="astrohog__stat astrohog__stat--balance"
              title={
                liveAddress
                  ? `${liveAddress}\nAvailable: ${displayAvailable ?? '…'}\nTotal: ${displayTotal ?? '…'}\nLocked: ${lockedBalance ?? '0'}\nNode: ${selectedNode}`
                  : selectedNode
              }
            >
              AVAIL{' '}
              <span>
                {displayAvailable != null
                  ? formatCompactWart(displayAvailable)
                  : '…'}
              </span>
              {displayTotal != null &&
                lockedBalance != null &&
                Number(lockedBalance) > 0 && (
                  <span className="astrohog__stat-sub" title={`Total ${displayTotal}`}>
                    {' '}
                    / {formatCompactWart(displayTotal)}
                  </span>
                )}
            </div>
          ) : (
            <div className="astrohog__stat">
              ★ <span>{inventory.stardust}</span> dust
            </div>
          )}
          <div className="astrohog__stat">
            ◆ <span>{inventory.crystals || 0}</span>
          </div>
          <div
            className={`astrohog__stat astrohog__stat--mode${onChainMode ? ' is-onchain' : ''}`}
            title={selectedNode || ''}
          >
            {onChainMode ? 'DEFI' : 'OFFLINE'}
          </div>
        </div>
        <button
          type="button"
          className={`astrohog__exit${easyMode ? ' astrohog__exit--easy' : ''}`}
          onClick={() => setEasyMode((v) => !v)}
          title="Easy mode highlights the next star to tap"
        >
          {easyMode ? 'EASY' : 'HARD'}
        </button>
        {!onChainMode && (
          <button
            type="button"
            className="astrohog__exit astrohog__exit--defi"
            onClick={switchToDefiTestnet}
            title={DEFI_TESTNET_URL}
          >
            DEFI NET
          </button>
        )}
        <button type="button" className="astrohog__exit" onClick={onExit}>
          EXIT
        </button>
      </div>

      <div className="astrohog__viewport" ref={viewportRef}>
        <div
          className="astrohog__world astrohog__world--smooth"
          style={{
            width: COLS * tilePx,
            height: ROWS * tilePx,
            transform: `translate(${-camera.x}px, ${-camera.y}px)`,
          }}
        >
          {/* Tiles */}
          {MAP.map((row, y) =>
            row.map((tile, x) => {
              const isHarvested =
                tile === T.CRYSTAL && harvested.has(`${x},${y}`);
              const cls = isHarvested
                ? TILE_CLASS[T.SPACE]
                : TILE_CLASS[tile] || TILE_CLASS[T.SPACE];
              return (
                <div
                  key={`${x}-${y}`}
                  className={`astrohog__tile ${cls}`}
                  style={{
                    left: x * tilePx,
                    top: y * tilePx,
                    width: tilePx,
                    height: tilePx,
                  }}
                />
              );
            }),
          )}

          {/* Chests */}
          {chests.map((c) => (
            <div
              key={c.id}
              className={`astrohog__entity${c.claimed ? '' : ' astrohog__entity--bob'}`}
              style={{ left: c.mapX * tilePx, top: c.mapY * tilePx }}
            >
              <div
                className={`astrohog__sprite astrohog__sprite--chest${
                  c.claimed ? ' is-empty' : ' is-live'
                }${c.onChain && !c.claimed ? ' is-onchain' : ''}${
                  c.easy && !c.claimed ? ' is-tutorial' : ''
                }`}
                title={
                  c.claimed
                    ? 'Empty'
                    : c.onChain
                      ? `On-chain ${c.amount} WART`
                      : `${c.code} — press A`
                }
              />
            </div>
          ))}

          {/* NPCs */}
          {NPCS.map((npc) => (
            <div
              key={npc.id}
              className="astrohog__entity astrohog__entity--bob"
              style={{ left: npc.x * tilePx, top: npc.y * tilePx }}
            >
              <div className="astrohog__sprite astrohog__sprite--npc" />
            </div>
          ))}

          {/* Player */}
          <div
            className={`astrohog__entity astrohog__player${
              playerMoving ? ' is-moving' : ' is-idle'
            }`}
            style={{ left: player.x * tilePx, top: player.y * tilePx }}
          >
            <div
              className={`astrohog__sprite astrohog__sprite--hog${
                player.face === 'left' ? ' face-left' : ''
              }`}
            />
          </div>
        </div>

        {fx === 'success' && (
          <div className="astrohog__sparkles" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} style={{ '--i': i }} />
            ))}
          </div>
        )}

        {!isMobile && (
          <div className="astrohog__kb-hint">
            WASD / arrows move · Z/E/Space = A · X = B · Esc close
          </div>
        )}

        {toast && <div className="astrohog__toast">{toast}</div>}

        {/* Dialog box */}
        {dialog && !mode && (
          <div className="astrohog__dialog astrohog__dialog--in">
            <div className="astrohog__dialog-speaker">{dialog.speaker}</div>
            <div className="astrohog__dialog-body">{dialogText}</div>
            {dialog.kind === 'exit_confirm' && (
              <div className="astrohog__dialog-actions">
                <button type="button" className="primary" onClick={onExit}>
                  Yes, leave
                </button>
                <button type="button" onClick={() => setDialog(null)}>
                  Stay
                </button>
              </div>
            )}
            {dialog.kind === 'bury_prompt' && (
              <div className="astrohog__dialog-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setBurySequence([]);
                    setMode('bury');
                  }}
                >
                  Bury WART
                </button>
                <button type="button" onClick={() => setDialog(null)}>
                  Cancel
                </button>
              </div>
            )}
            {dialog.kind === 'npc' && (
              <div className="astrohog__dialog-hint">
                A · next ({dialog.lineIndex + 1}/{dialog.lines.length})
              </div>
            )}
            {dialog.kind === 'info' && (
              <div className="astrohog__dialog-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    if (dialog.lineIndex + 1 < dialog.lines.length) {
                      advanceDialog();
                    } else {
                      setDialog(null);
                    }
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bury modal */}
        {mode === 'bury' && (
          <div className="astrohog__overlay astrohog__overlay--in">
            <div className="astrohog__menu astrohog__menu--in">
              <h2>{onChainMode ? 'Seal Testnet WART' : 'Seal a Stardust Chest'}</h2>
              <p>
                {onChainMode
                  ? 'Funds leave your wallet into a puzzle-locked escrow. Pick a short star list you can remember.'
                  : `Easy mode uses ${buryTargetLen}-star locks. Tap stars in order, then Seal.`}
              </p>
              <p>
                {onChainMode ? (
                  <>
                    Available: <strong>{displayAvailable ?? '…'}</strong> WART
                    {displayTotal != null && (
                      <>
                        {' '}
                        · Total <strong>{displayTotal}</strong>
                      </>
                    )}
                    {lockedBalance != null && Number(lockedBalance) > 0 && (
                      <>
                        {' '}
                        · Locked <strong>{lockedBalance}</strong>
                      </>
                    )}
                    {liveAddress && (
                      <span
                        style={{
                          display: 'block',
                          marginTop: 4,
                          fontSize: 10,
                          wordBreak: 'break-all',
                          opacity: 0.7,
                        }}
                      >
                        {liveAddress}
                      </span>
                    )}
                    {!canSign && (
                      <span style={{ color: '#a40', display: 'block', marginTop: 4 }}>
                        Unlock your wallet to sign.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Pouch: <strong>{inventory.stardust}</strong> ★
                  </>
                )}
              </p>
              <label htmlFor="bury-amt">Amount</label>
              <input
                id="bury-amt"
                type="number"
                min={onChainMode ? '0.00000001' : '0.1'}
                step={onChainMode ? '0.01' : '0.1'}
                value={buryAmount}
                onChange={(e) => setBuryAmount(e.target.value)}
                disabled={busy}
              />
              <label htmlFor="bury-msg">Note (optional)</label>
              <textarea
                id="bury-msg"
                rows={2}
                maxLength={120}
                value={buryMessage}
                onChange={(e) => setBuryMessage(e.target.value)}
                placeholder="For the next hog who solves the stars…"
                disabled={busy}
              />
              <label>
                Constellation lock (pick {buryTargetLen} in order)
              </label>
              <div className="astrohog__steps">
                {Array.from({ length: buryTargetLen }).map((_, step) => {
                  const starIdx = burySequence[step];
                  return (
                    <span
                      key={step}
                      className={`astrohog__step${
                        starIdx != null ? ' is-filled' : ''
                      }${burySequence.length === step ? ' is-current' : ''}`}
                    >
                      {starIdx != null ? starNames[starIdx] : step + 1}
                    </span>
                  );
                })}
              </div>
              <div className="astrohog__star-grid">
                {starNames.map((name, idx) => (
                  <button
                    key={name}
                    type="button"
                    className={`astrohog__star-btn${
                      burySequence[burySequence.length - 1] === idx
                        ? ' is-picked'
                        : ''
                    }${
                      burySequence.length < buryTargetLen ? ' is-ready' : ''
                    }`}
                    onClick={() =>
                      pushStar(burySequence, setBurySequence, idx, buryTargetLen)
                    }
                    disabled={busy || burySequence.length >= buryTargetLen}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="astrohog__menu-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={burySequence.length < buryTargetLen || busy}
                  onClick={submitBury}
                >
                  {busy ? 'Sending…' : onChainMode ? 'Fund Escrow' : 'Seal Chest'}
                </button>
                <button type="button" onClick={() => setBurySequence([])} disabled={busy}>
                  Clear stars
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode(null);
                    setBurySequence([]);
                  }}
                  disabled={busy}
                >
                  Cancel (B)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Claim modal — guided constellation */}
        {mode === 'claim' && activeChest && (
          <div className="astrohog__overlay astrohog__overlay--in">
            <div
              className={`astrohog__menu astrohog__menu--in${
                fx === 'shake' ? ' is-shake' : ''
              }`}
            >
              <h2>
                {activeChest.easy || activeChest.puzzleReveal
                  ? 'Tutorial Lock'
                  : 'Constellation Lock'}
              </h2>
              <p>
                <strong>{activeChest.amount}</strong>{' '}
                {activeChest.onChain ? 'testnet WART' : '★ dust'} from{' '}
                <strong>{activeChest.authorName}</strong>
              </p>

              {(activeChest.puzzleReveal ||
                activeChest.easy ||
                (easyMode && claimExpected)) &&
                claimExpected && (
                  <div className="astrohog__recipe">
                    <div className="astrohog__recipe-title">
                      Tap stars in this order:
                    </div>
                    <div className="astrohog__steps">
                      {claimExpected.map((starIdx, step) => (
                        <span
                          key={step}
                          className={`astrohog__step${
                            claimSequence.length > step ? ' is-filled' : ''
                          }${claimSequence.length === step ? ' is-current' : ''}`}
                        >
                          {step + 1}. {starNames[starIdx]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {activeChest.puzzleHint && (
                <p className="astrohog__hint-line">{activeChest.puzzleHint}</p>
              )}

              {claimNext != null && (
                <p className="astrohog__next-prompt">
                  Next → <strong>{starNames[claimNext]}</strong>
                </p>
              )}

              {claimError && (
                <p className="astrohog__claim-error">{claimError}</p>
              )}

              <div className="astrohog__sequence">
                {claimSequence.length
                  ? claimSequence.map((i) => starNames[i]).join(' → ')
                  : 'Your taps appear here…'}
              </div>

              <div className="astrohog__star-grid">
                {starNames.map((name, idx) => {
                  const isNext = claimNext === idx;
                  const isDone = claimSequence.some(
                    (s, i) =>
                      s === idx && claimExpected && claimExpected[i] === idx,
                  );
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`astrohog__star-btn${
                        isNext ? ' is-next' : ''
                      }${isDone ? ' is-picked' : ''}${
                        easyMode && claimNext != null && !isNext
                          ? ' is-dim'
                          : ''
                      }`}
                      onClick={() => pickClaimStar(idx)}
                      disabled={busy || (claimExpected && claimSequence.length >= claimExpected.length)}
                    >
                      {isNext ? `👉 ${name}` : name}
                    </button>
                  );
                })}
              </div>

              <div className="astrohog__menu-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={
                    busy ||
                    (claimExpected
                      ? claimSequence.length < claimExpected.length || !claimDone
                      : claimSequence.length <
                        getPuzzleLength(activeChest, easyMode))
                  }
                  onClick={submitClaim}
                >
                  {busy
                    ? 'Opening…'
                    : activeChest.onChain
                      ? 'Claim WART'
                      : 'Open Chest'}
                </button>
                {(activeChest.puzzleReveal ||
                  activeChest.easy ||
                  easyMode) &&
                  claimExpected && (
                    <button
                      type="button"
                      onClick={fillClaimAnswer}
                      disabled={busy}
                    >
                      Fill answer
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => {
                    setClaimSequence([]);
                    setClaimError('');
                  }}
                  disabled={busy}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode(null);
                    setActiveChest(null);
                    setClaimError('');
                  }}
                  disabled={busy}
                >
                  Back (B)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Code entry + practice tools */}
        {mode === 'code' && (
          <div className="astrohog__overlay astrohog__overlay--in">
            <div className="astrohog__menu astrohog__menu--in">
              <h2>Codes & Practice</h2>
              <p>
                Paste <strong>HOG-EASY</strong>, <strong>HOG-SEED</strong>,{' '}
                <strong>HOG-MOON</strong>, or an <strong>AH1.…</strong> share code.
              </p>
              <p style={{ fontSize: 11 }}>
                Tutorial tips: walk to a bouncing chest → A → tap only the glowing
                star(s) → Open Chest.
              </p>
              {lastShareCode && (
                <p style={{ wordBreak: 'break-all', fontSize: 11 }}>
                  Your last sealed code:{' '}
                  <button
                    type="button"
                    className="primary"
                    style={{ display: 'inline', padding: '2px 6px' }}
                    onClick={() => {
                      navigator.clipboard?.writeText(lastShareCode);
                      showToast('Copied');
                    }}
                  >
                    Copy
                  </button>
                  <br />
                  <span style={{ opacity: 0.8 }}>{lastShareCode}</span>
                </p>
              )}
              <label htmlFor="hog-code">Code</label>
              <input
                id="hog-code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="HOG-EASY or AH1.…"
                autoCapitalize="off"
                spellCheck={false}
              />
              <div className="astrohog__menu-actions">
                <button type="button" className="primary" onClick={submitCode}>
                  Find Cache
                </button>
                <button type="button" onClick={handleResetPractice}>
                  Reset practice chests
                </button>
                <button type="button" onClick={() => setMode(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile stick */}
        {isMobile && (
          <div
            className="astrohog__stick-zone"
            onTouchStart={onStickStart}
            onTouchMove={onStickMove}
            onTouchEnd={onStickEnd}
            onTouchCancel={onStickEnd}
          >
            <div className="astrohog__stick-base" />
            <div
              className="astrohog__stick-thumb"
              style={{
                transform: `translate(calc(-50% + ${stickVisual.x}px), calc(50% + ${stickVisual.y}px))`,
              }}
            />
          </div>
        )}

        {/* Mobile A / B */}
        {isMobile && (
          <div className="astrohog__buttons">
            <button
              type="button"
              className="ah-btn ah-btn--b"
              onTouchStart={(e) => {
                e.preventDefault();
                handleB();
              }}
              onMouseDown={handleB}
            >
              B
            </button>
            <button
              type="button"
              className="ah-btn ah-btn--a"
              onTouchStart={(e) => {
                e.preventDefault();
                handleA();
              }}
              onMouseDown={handleA}
            >
              A
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
