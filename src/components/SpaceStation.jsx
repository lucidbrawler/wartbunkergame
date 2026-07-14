// SpaceStation.jsx (new separate component for the Space Station + its three zones)
import React from 'react';

const SpaceStation = ({
  currentScreen,
  setCurrentScreen,
  zoneProgress,
  setZoneProgress,
  hoveredCounter = null,
  combatStarted,
  defenseLoadout = { turrets: false, shield: false },
  defenseMenuOpen = false,
  onOpenDefenseMenu,
  onSelectDefenseOption,
  onLaunchCombat,
  setShowUpgradeChoice,
  turretPositions = [],
  maxTurrets = 2,
  onResetCombat,
}) => {
  const defensesDeployed = defenseLoadout.turrets || defenseLoadout.shield;

  const getLaunchLabel = () => {
    if (!defensesDeployed) return 'Launch Attack';
    const parts = [];
    if (defenseLoadout.turrets) parts.push('Turrets');
    if (defenseLoadout.shield) parts.push('Shield');
    return `Launch Attack (${parts.join(' + ')})`;
  };

  const handleZoneAction = (zone, action) => {
    if (action === 'reset') {
      setZoneProgress(prev => ({ ...prev, [zone]: 0 }));
    } else if (action === 'defend') {
      onOpenDefenseMenu?.();
    } else if (action === 'start_combat') {
      onLaunchCombat?.();
    } else {
      setZoneProgress(prev => ({ ...prev, [zone]: prev[zone] + 1 }));
    }
  };

  const getStoryText = () => {
    const progress = zoneProgress[currentScreen] || 0;
    if (currentScreen === 'zone1') {
      return "Astro-Hog Explore: roam Crater Ridge, dig crystals, and seal Stardust WART in puzzle chests for other pilots.";
    } else if (currentScreen === 'zone2') {
      if (progress === 0 && !combatStarted) {
        if (defenseMenuOpen) {
          return "Choose a defense package at the Defense Console, then launch your attack.";
        }
        if (defensesDeployed) {
          const active = [];
          if (defenseLoadout.turrets) {
            active.push(
              `auto-turrets (${turretPositions.length}/${maxTurrets} placed — click the field to position)`,
            );
          }
          if (defenseLoadout.shield) active.push('shield capacitors charged');
          return `${active.join(' · ').replace(/^./, (c) => c.toUpperCase())}. Launch your attack when ready.`;
        }
        return "Alien signatures detected. Visit the Defense Console to pick turrets, a shield boost, or both — or launch an immediate attack.";
      }
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
            <h2>Astro-Hog Explore</h2>
            <p>Game Boy–style moon trek · bury WART in puzzle chests</p>
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
      {/* Zone 1 is AstroHogExplore (mounted from GameInterface) */}

      {/* Zone 2 pre-combat counters */}
      {currentScreen === 'zone2' && zoneProgress.zone2 === 0 && !combatStarted && (
        <>
          <div
            className={`counter zone-counter ${hoveredCounter === 'deploy-defenses' ? 'interaction-zone' : ''}`}
            id="deploy-defenses"
            style={{ left: '22%', top: '42%' }}
            onClick={() => handleZoneAction('zone2', 'defend')}
          >
            <div className="sign-center">Defense Console</div>
          </div>
          <div
            className={`counter zone-counter ${hoveredCounter === 'counterattack' ? 'interaction-zone' : ''}`}
            id="counterattack"
            style={{ left: '68%', top: '42%' }}
            onClick={() => handleZoneAction('zone2', 'start_combat')}
          >
            <div className="sign-center">{getLaunchLabel()}</div>
          </div>
        </>
      )}

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

      {/* Story HUD for zones — hidden during active combat */}
      {!(currentScreen === 'zone2' && combatStarted) && (
        <div id="story-hud">
          <div className="story-text">
            {getStoryText()}
          </div>
          {currentScreen === 'zone2' && zoneProgress.zone2 === 0 && !combatStarted && defenseMenuOpen && (
            <div className="defense-options">
              <p className="defense-options-title">Select defense package</p>
              <div className="defense-options-grid">
                <button type="button" onClick={() => onSelectDefenseOption?.('turrets')}>
                  Auto-Turrets
                  <span>Click the battlefield to place up to 2 turrets</span>
                </button>
                <button type="button" onClick={() => onSelectDefenseOption?.('shield')}>
                  Shield Boost
                  <span>+1 HP colony shield layer</span>
                </button>
                <button type="button" onClick={() => onSelectDefenseOption?.('both')}>
                  Full Grid
                  <span>Turrets and shield combined</span>
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            className="back-btn"
            onClick={() => {
              if (currentScreen === 'zone2') {
                onResetCombat?.();
              }
              setCurrentScreen('main');
            }}
          >
            Exit Zone
          </button>
        </div>
      )}

      {currentScreen === 'zone2' && combatStarted && (
        <button
          type="button"
          className="zone2-combat-exit"
          onClick={() => {
            onResetCombat?.();
            setCurrentScreen('main');
          }}
        >
          Exit Zone
        </button>
      )}
    </>
  );
};

export default SpaceStation;