import React from 'react';

const TradeZone = ({ progress, hoveredCounter, onAction }) => {
  if (progress === 0) {
    return (
      <>
        <div className={`counter ${hoveredCounter === 'browse-weapons' ? 'interaction-zone' : ''}`} id="browse-weapons" style={{ left: '15%', top: '38%' }} onClick={() => onAction('zone3', 'weapons')}>
          <div className="sign-left">Browse Weapons</div>
        </div>
        <div className={`counter ${hoveredCounter === 'check-fuel' ? 'interaction-zone' : ''}`} id="check-fuel" style={{ left: '48%', top: '55%' }} onClick={() => onAction('zone3', 'fuel')}>
          <div className="sign-center">Check Fuel</div>
        </div>
        <div className={`counter ${hoveredCounter === 'negotiate-artifacts' ? 'interaction-zone' : ''}`} id="negotiate-artifacts" style={{ left: '75%', top: '38%' }} onClick={() => onAction('zone3', 'artifacts')}>
          <div className="sign-right">Artifacts</div>
        </div>
      </>
    );
  }
  return null;
};

export default TradeZone;