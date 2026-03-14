// src/components/GamePlayArea.jsx
import React from 'react';
import SpaceStation from './SpaceStation';
import ExplorationZone from './ExplorationZone';
import CombatZone from './CombatZone';
import TradeZone from './TradeZone';

const GamePlayArea = ({ currentScreen, onAction, hoveredCounter }) => {
  return (
    <>
      {/* Space Station (kept as a .counter so CSS works) */}
      <div className="counter" id="space-station">
        <SpaceStation onAction={onAction} hoveredCounter={hoveredCounter} />
      </div>

      {/* The three zones – only the active one shows */}
      {currentScreen === 'zone1' && (
        <ExplorationZone onAction={onAction} hoveredCounter={hoveredCounter} />
      )}
      {currentScreen === 'zone2' && (
        <CombatZone onAction={onAction} hoveredCounter={hoveredCounter} />
      )}
      {currentScreen === 'zone3' && (
        <TradeZone onAction={onAction} hoveredCounter={hoveredCounter} />
      )}
    </>
  );
};

export default GamePlayArea;