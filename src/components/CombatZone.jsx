import React from 'react';

const CombatZone = ({ progress, hoveredCounter, onAction }) => {
  if (progress === 0) {
    return (
      <>
        <div className={`counter ${hoveredCounter === 'deploy-defenses' ? 'interaction-zone' : ''}`} id="deploy-defenses" style={{ left: '22%', top: '42%' }} onClick={() => onAction('zone2', 'defend')}>
          <div className="sign-left">Deploy Defenses</div>
        </div>
        <div className={`counter ${hoveredCounter === 'counterattack' ? 'interaction-zone' : ''}`} id="counterattack" style={{ left: '68%', top: '42%' }} onClick={() => onAction('zone2', 'attack')}>
          <div className="sign-right">Launch Attack</div>
        </div>
      </>
    );
  }
  return null;
};

export default CombatZone;