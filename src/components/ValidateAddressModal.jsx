// ValidateAddressModal.jsx
import React from 'react';

const ValidateAddressModal = ({
  address,
  setAddress,
  handleValidateAddress,
  closeModal,
  validateResult,
  error,
}) => {
  return (
    <div className="modal">
      <h2>Validate Address</h2>
      <div className="form-group">
        <label>Address:</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="Enter 48-character address"
          className="input"
        />
      </div>
      <button onClick={handleValidateAddress}>Validate Address</button>
      <button onClick={closeModal}>Close</button>
      {validateResult && <div className="result"><pre>{JSON.stringify(validateResult, null, 2)}</pre></div>}
      {error && <div className="error"><strong>Error:</strong> {error}</div>}
    </div>
  );
};

export default ValidateAddressModal;