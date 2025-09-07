// SendTransactionModal.jsx
import React from 'react';

const SendTransactionModal = ({
  toAddr,
  setToAddr,
  amount,
  setAmount,
  fee,
  setFee,
  handleSendTransaction,
  closeModal,
  sendResult,
  error,
}) => {
  return (
    <div >
      <h2>Send Transaction</h2>
      <div className="form-group">
        <label>To Address:</label>
        <input
          type="text"
          value={toAddr}
          onChange={(e) => setToAddr(e.target.value.trim())}
          placeholder="Enter 48-character to address"
          className="input"
        />
      </div>
      <div className="form-group">
        <label>Amount (WART):</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value.trim())}
          placeholder="Enter amount in WART (e.g., 1)"
          className="input"
        />
      </div>
      <div className="form-group">
        <label>Fee (WART):</label>
        <input
          type="text"
          value={fee}
          onChange={(e) => setFee(e.target.value.trim())}
          placeholder="Enter fee in WART (e.g., 0.0001)"
          className="input"
        />
      </div>
      <button onClick={handleSendTransaction}>Send Transaction</button>
      <button onClick={closeModal}>Close</button>
      {sendResult && <div className="result"><pre>{JSON.stringify(sendResult, null, 2)}</pre></div>}
      {error && <div className="error"><strong>Error:</strong> {error}</div>}
    </div>
  );
};

export default SendTransactionModal;