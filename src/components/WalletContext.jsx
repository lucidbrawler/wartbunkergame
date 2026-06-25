import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createWarthogApi, normalizeAssetHash } from '../utils/warthogClient.js';
import { isDefiNode as checkDefiNode } from '../utils/presetNodes.js';

const WalletContext = createContext(null);

const getWatchedAssetsKey = (address) => (
  address ? `warthogWatchedAssets_${address.toLowerCase()}` : null
);

const loadWatchedAssets = (address) => {
  if (!address) return [];
  const key = getWatchedAssetsKey(address);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return [];
};

const saveWatchedAssets = (address, assets) => {
  if (!address) return;
  const key = getWatchedAssetsKey(address);
  try {
    localStorage.setItem(key, JSON.stringify(assets));
  } catch {
    // ignore storage errors
  }
};

export function GameWalletProvider({ children, walletHook }) {
  const {
    wallet,
    nonceId,
    selectedNode,
    balance,
    usdBalance,
    fetchBalanceAndNonce,
    isDefiNode,
    isLoggedIn,
    isSigningUnlocked,
    isSessionLocked,
    currentWalletName,
    setCurrentModal,
    lockWallet,
    unlockWallet,
    saveNamedWallet,
    logoutWallet,
    registerAutoLockCallback,
  } = walletHook;

  const [dexPoolPrefill, setDexPoolPrefill] = useState(null);
  const [sendAssetPrefill, setSendAssetPrefill] = useState(null);
  const [overviewLiquidityPositions, setOverviewLiquidityPositions] = useState(null);
  const [overviewLiquidityExpanded, setOverviewLiquidityExpanded] = useState(false);
  const [assetBalances, setAssetBalances] = useState([]);
  const [watchedAssets, setWatchedAssets] = useState([]);

  useEffect(() => {
    setOverviewLiquidityPositions(null);
    setOverviewLiquidityExpanded(false);
  }, [wallet?.address]);

  const fetchAssetBalance = useCallback(async (assetHash, assetName = '') => {
    if (!wallet?.address || !selectedNode) return;

    try {
      const api = await createWarthogApi(selectedNode);
      const hash = normalizeAssetHash(assetHash);
      const res = await api.getAccountAssetBalance(wallet.address, hash);
      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch asset balance');
      }
      const data = res.data;

      const tokenInfo = data?.token || {};
      const balanceInfo = data?.balance?.total || data?.balance || {};

      const decimals = tokenInfo.decimals || balanceInfo.decimals || 8;
      const { formatTokenBalance } = await import('../utils/warthogFormat.js');
      const balanceStr = await formatTokenBalance(balanceInfo, decimals);

      const finalName = assetName || tokenInfo.name || 'Unknown Asset';

      const newAsset = {
        hash,
        name: finalName,
        balance: balanceStr,
        decimals,
      };

      setAssetBalances((prev) => {
        const index = prev.findIndex((a) => a.hash === hash);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = newAsset;
          return updated;
        }
        return [...prev, newAsset];
      });
    } catch (err) {
      console.error('Failed to fetch asset balance:', err);
      throw err;
    }
  }, [wallet?.address, selectedNode]);

  useEffect(() => {
    if (!isLoggedIn || !wallet?.address) {
      setAssetBalances([]);
      setWatchedAssets([]);
      return undefined;
    }

    const loaded = loadWatchedAssets(wallet.address);
    setWatchedAssets(loaded);

    if (loaded.length > 0 && selectedNode) {
      const timer = setTimeout(() => {
        loaded.forEach((asset, idx) => {
          setTimeout(() => {
            fetchAssetBalance(asset.hash, asset.customName);
          }, idx * 180);
        });
      }, 250);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [wallet?.address, isLoggedIn, selectedNode, fetchAssetBalance]);

  const addWatchedAsset = useCallback((assetHash, customName = '') => {
    if (!wallet?.address || !assetHash) return;

    const normalizedHash = assetHash.toLowerCase();
    setWatchedAssets((prev) => {
      const exists = prev.findIndex((a) => a.hash.toLowerCase() === normalizedHash);
      let next;
      if (exists !== -1) {
        next = [...prev];
        if (customName) next[exists] = { ...next[exists], customName };
      } else {
        next = [...prev, { hash: normalizedHash, customName: customName || undefined }];
      }
      saveWatchedAssets(wallet.address, next);
      return next;
    });

    fetchAssetBalance(normalizedHash, customName);
  }, [wallet?.address, fetchAssetBalance]);

  const removeWatchedAsset = useCallback((assetHash) => {
    if (!wallet?.address) return;

    const normalizedHash = assetHash.toLowerCase();
    setWatchedAssets((prev) => {
      const next = prev.filter((a) => a.hash.toLowerCase() !== normalizedHash);
      saveWatchedAssets(wallet.address, next);
      return next;
    });

    setAssetBalances((prev) => prev.filter((a) => a.hash.toLowerCase() !== normalizedHash));
  }, [wallet?.address]);

  const reorderWatchedAssets = useCallback((fromIndex, toIndex) => {
    if (!wallet?.address || fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;

    setWatchedAssets((prevWatched) => {
      if (fromIndex >= prevWatched.length || toIndex >= prevWatched.length) {
        return prevWatched;
      }

      const nextWatched = [...prevWatched];
      const [moved] = nextWatched.splice(fromIndex, 1);
      nextWatched.splice(toIndex, 0, moved);
      saveWatchedAssets(wallet.address, nextWatched);

      setAssetBalances((prevBalances) => {
        const byHash = new Map(prevBalances.map((a) => [a.hash.toLowerCase(), a]));
        return nextWatched
          .map((w) => byHash.get(w.hash.toLowerCase()))
          .filter(Boolean);
      });

      return nextWatched;
    });
  }, [wallet?.address]);

  const navigateToModal = useCallback((modalId) => {
    if (setCurrentModal) setCurrentModal(modalId);
  }, [setCurrentModal]);

  const isTestnetNode = useCallback(
    (node) => checkDefiNode(node ?? selectedNode),
    [selectedNode],
  );

  const value = useMemo(() => ({
    wallet,
    nextNonce: nonceId ?? 0,
    selectedNode,
    balance,
    usdBalance,
    isSigningUnlocked,
    isSessionLocked,
    isLoggedIn,
    currentWalletName,
    isDefiNode,
    isTestnetNode,
    dexPoolPrefill,
    setDexPoolPrefill,
    sendAssetPrefill,
    setSendAssetPrefill,
    overviewLiquidityPositions,
    setOverviewLiquidityPositions,
    overviewLiquidityExpanded,
    setOverviewLiquidityExpanded,
    assetBalances,
    watchedAssets,
    fetchAssetBalance,
    addWatchedAsset,
    removeWatchedAsset,
    reorderWatchedAssets,
    navigateToModal,
    lockWallet,
    unlockWallet,
    saveNamedWallet,
    logoutWallet,
    registerAutoLockCallback,
    refreshBalance: () => {
      if (wallet?.address) fetchBalanceAndNonce(wallet.address);
    },
  }), [
    wallet,
    nonceId,
    selectedNode,
    balance,
    usdBalance,
    isSigningUnlocked,
    isSessionLocked,
    isLoggedIn,
    currentWalletName,
    isDefiNode,
    isTestnetNode,
    dexPoolPrefill,
    sendAssetPrefill,
    overviewLiquidityPositions,
    overviewLiquidityExpanded,
    assetBalances,
    watchedAssets,
    fetchAssetBalance,
    addWatchedAsset,
    removeWatchedAsset,
    reorderWatchedAssets,
    navigateToModal,
    lockWallet,
    unlockWallet,
    saveNamedWallet,
    logoutWallet,
    registerAutoLockCallback,
    fetchBalanceAndNonce,
  ]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within GameWalletProvider');
  }
  return context;
}