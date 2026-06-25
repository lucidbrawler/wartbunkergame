import React from 'react';

export function WalletNamePromptModal({
  open,
  walletName,
  setWalletName,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  onSave,
  onSkip,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 2100 }}>
      <div className="modal-content">
        <h2>Name &amp; Save This Wallet</h2>
        <p className="text-sm mb-3" style={{ opacity: 0.85 }}>
          Tag this wallet with a name and password so you can pick it from saved wallets next time.
        </p>
        {error && <div className="error"><p>{error}</p></div>}
        <div className="form-group">
          <label>Wallet Name:</label>
          <input
            type="text"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="e.g. main-wallet or trading"
            className="input"
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password to encrypt saved wallet"
            className="input"
          />
        </div>
        <div className="form-group">
          <label>Confirm Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="input"
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" onClick={onSave} style={{ flex: 1 }}>Save &amp; Tag Wallet</button>
          <button type="button" onClick={onSkip} style={{ flex: 1, background: '#3f3f46' }}>Skip for Now</button>
        </div>
      </div>
    </div>
  );
}

export function WalletUnlockModal({
  open,
  walletName,
  password,
  setPassword,
  error,
  onUnlock,
  onCancel,
}) {
  if (!open || !walletName) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 2100 }}>
      <div className="modal-content">
        <h2>Unlock Wallet</h2>
        <p className="text-sm mb-3" style={{ opacity: 0.85 }}>
          Enter the password for <span className="font-mono" style={{ color: '#FDB913' }}>&quot;{walletName}&quot;</span> to restore signing.
        </p>
        {error && <div className="error"><p>{error}</p></div>}
        <div className="form-group">
          <label>Password for &quot;{walletName}&quot;:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="input"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') onUnlock(); }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" onClick={onUnlock} style={{ flex: 1 }}>Unlock</button>
          <button type="button" onClick={onCancel} style={{ flex: 1, background: '#3f3f46' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}