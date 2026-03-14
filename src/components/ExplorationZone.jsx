import React from 'react';

const ExplorationZone = ({ progress, hoveredCounter, onAction }) => {
  if (progress === 0) {
    return (
      <>
        <div className={`counter ${hoveredCounter === 'scan-planets' ? 'interaction-zone' : ''}`} id="scan-planets" style={{ left: '18%', top: '38%' }} onClick={() => onAction('zone1', 'scan')}>
          <div className="sign-center">Scan Planets</div>
        </div>
        <div className={`counter ${hoveredCounter === 'check-ship' ? 'interaction-zone' : ''}`} id="check-ship" style={{ left: '68%', top: '38%' }} onClick={() => onAction('zone1', 'check_ship')}>
          <div className="sign-center">Check Ship</div>
        </div>
      </>
    );
  }
  if (progress === 1) {
    return (
      <>
        <div className={`counter ${hoveredCounter === 'planet-alpha' ? 'interaction-zone' : ''}`} id="planet-alpha" style={{ left: '12%', top: '52%' }} onClick={() => onAction('zone1', 'planet_alpha')}>
          <div className="sign-left">Planet Alpha</div>
        </div>
        <div className={`counter ${hoveredCounter === 'planet-beta' ? 'interaction-zone' : ''}`} id="planet-beta" style={{ left: '45%', top: '35%' }} onClick={() => onAction('zone1', 'planet_beta')}>
          <div className="sign-center">Planet Beta</div>
        </div>
        <div className={`counter ${hoveredCounter === 'planet-gamma' ? 'interaction-zone' : ''}`} id="planet-gamma" style={{ left: '78%', top: '52%' }} onClick={() => onAction('zone1', 'planet_gamma')}>
          <div className="sign-right">Planet Gamma</div>
        </div>
      </>
    );
  }
  return null;
};

export default ExplorationZone;