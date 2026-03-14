// SpaceStation.jsx (new separate component for the Space Station + its three zones)
import React from 'react';

const SpaceStation = ({
  currentScreen,
  setCurrentScreen,
  zoneProgress,
  setZoneProgress,
  hoveredCounter = null,
  combatStarted,
  setCombatStarted,
  setShowUpgradeChoice
}) => {
  const handleZoneAction = (zone, action) => {
    if (action === 'reset') {
      setZoneProgress(prev => ({ ...prev, [zone]: 0 }));
    } else if (action === 'start_combat') {
      setCombatStarted(true);
      setZoneProgress(prev => ({ ...prev, zone2: 1 }));
    } else {
      setZoneProgress(prev => ({ ...prev, [zone]: prev[zone] + 1 }));
    }
  };

  const getStoryText = () => {
    const progress = zoneProgress[currentScreen] || 0;
    if (currentScreen === 'zone1') {
      if (progress === 0) return "You launch into the Exploration Zone, a vast expanse of uncharted space. Your mission: discover new worlds and resources for the colony.";
      if (progress === 1) return "Scanning complete! You detect three promising planets nearby.";
      if (progress === 2) return "You've made progress in your exploration. Resources gathered: 150 WART worth of minerals.";
      return "Exploration complete! You've expanded the colony's knowledge of the galaxy.";
    } else if (currentScreen === 'zone2') {
      if (progress === 0) return "";  // Message shown below game area
      if (progress === 1) return "The battle rages! Enemy forces are approaching.";
      if (progress === 2) return "Victory! The invaders have been repelled.";
      return "Combat Zone secured! Your bravery has saved the colony.";
    } else if (currentScreen === 'zone3') {
      if (progress === 0) return "Welcome to the Trade Zone, a bustling interstellar marketplace.";
      if (progress === 1) return "You've found some intriguing offers.";
      if (progress === 2) return "Trade successful! Your inventory has expanded.";
      return "Trade Zone mastered! You've built a network of contacts.";
    }
    return "";
  };

  if (currentScreen === 'zone-select') {
    return (
      <div id="zone-select-screen">
        <h1>Choose Your Zone</h1>
        <div className="zone-buttons">
          <button className="zone-btn" onClick={() => setCurrentScreen('zone1')}>
            <h2>Exploration Zone</h2>
            <p>Discover new planets and resources</p>
          </button>
          <button className="zone-btn" onClick={() => setCurrentScreen('zone2')}>
            <h2>Combat Zone</h2>
            <p>Battle alien threats and defend colonies</p>
          </button>
          <button className="zone-btn" onClick={() => setCurrentScreen('zone3')}>
            <h2>Trade Zone</h2>
            <p>Buy, sell, and trade with interstellar merchants</p>
          </button>
        </div>
        <button className="back-btn" onClick={() => setCurrentScreen('main')}>Back to Main</button>
      </div>
    );
  }

  return (
    <>
      {/* Zone 1 counters */}
      {currentScreen === 'zone1' && (() => {
        const progress = zoneProgress.zone1;
        if (progress === 0) return (
          <>
            <div 
              className={`counter ${hoveredCounter === 'scan-planets' ? 'interaction-zone' : ''}`} 
              id="scan-planets" 
              style={{ left: '18%', top: '38%' }}
              onClick={() => handleZoneAction('zone1', 'scan')}
            >
              <div className="sign-center">Scan Planets</div>
            </div>
            <div 
              className={`counter ${hoveredCounter === 'check-ship' ? 'interaction-zone' : ''}`} 
              id="check-ship" 
              style={{ left: '68%', top: '38%' }}
              onClick={() => handleZoneAction('zone1', 'check_ship')}
            >
              <div className="sign-center">Check Ship</div>
            </div>
          </>
        );
        if (progress === 1) return (
          <>
            <div 
              className={`counter ${hoveredCounter === 'planet-alpha' ? 'interaction-zone' : ''}`} 
              id="planet-alpha" 
              style={{ left: '12%', top: '52%' }}
              onClick={() => handleZoneAction('zone1', 'planet_alpha')}
            >
              <div className="sign-left">Planet Alpha</div>
            </div>
            <div 
              className={`counter ${hoveredCounter === 'planet-beta' ? 'interaction-zone' : ''}`} 
              id="planet-beta" 
              style={{ left: '45%', top: '35%' }}
              onClick={() => handleZoneAction('zone1', 'planet_beta')}
            >
              <div className="sign-center">Planet Beta</div>
            </div>
            <div 
              className={`counter ${hoveredCounter === 'planet-gamma' ? 'interaction-zone' : ''}`} 
              id="planet-gamma" 
              style={{ left: '78%', top: '52%' }}
              onClick={() => handleZoneAction('zone1', 'planet_gamma')}
            >
              <div className="sign-right">Planet Gamma</div>
            </div>
          </>
        );
        return null;
      })()}

      {/* Zone 2 counters - removed for progress 0 */}

      {/* Zone 3 counters */}
      {currentScreen === 'zone3' && (() => {
        const progress = zoneProgress.zone3;
        if (progress === 0) return (
          <>
            <div 
              className={`counter ${hoveredCounter === 'browse-weapons' ? 'interaction-zone' : ''}`} 
              id="browse-weapons" 
              style={{ left: '15%', top: '38%' }}
              onClick={() => handleZoneAction('zone3', 'weapons')}
            >
              <div className="sign-left">Browse Weapons</div>
            </div>
            <div 
              className={`counter ${hoveredCounter === 'check-fuel' ? 'interaction-zone' : ''}`} 
              id="check-fuel" 
              style={{ left: '48%', top: '55%' }}
              onClick={() => handleZoneAction('zone3', 'fuel')}
            >
              <div className="sign-center">Check Fuel</div>
            </div>
            <div 
              className={`counter ${hoveredCounter === 'negotiate-artifacts' ? 'interaction-zone' : ''}`} 
              id="negotiate-artifacts" 
              style={{ left: '75%', top: '38%' }}
              onClick={() => handleZoneAction('zone3', 'artifacts')}
            >
              <div className="sign-right">Artifacts</div>
            </div>
          </>
        );
        return null;
      })()}

      {/* Story HUD for zones */}
      <div id="story-hud">
        <div className="story-text">
          {getStoryText()}
        </div>
        {currentScreen === 'zone2' && zoneProgress.zone2 === 0 && (
          <div className="combat-buttons">
            <button onClick={() => handleZoneAction('zone2', 'defend')}>Deploy Defenses</button>
            <button onClick={() => handleZoneAction('zone2', 'start_combat')}>Launch Attack</button>
          </div>
        )}
        <button className="back-btn" onClick={() => setCurrentScreen('main')}>Exit Zone</button>
      </div>
    </>
  );
};

export default SpaceStation;
