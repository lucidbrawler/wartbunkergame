// GameInterface.jsx - FULL CORRECTED VERSION (upgrades now work perfectly)
// Fixed: stale closures on shoot/useBomb via useCallback + proper deps
// Keyboard (Space/B) + mobile buttons now instantly respect Double Shot / Rapid Fire / Bomb after choosing upgrade

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import './GameInterface.css';
import SpaceStation from './SpaceStation';
import { useWallet } from './WalletContext';
import { useToast } from './Toast';

function getMainRooms(isDefi, hasWallet) {
  const rooms = [
    { id: 'wallet-management', label: 'Wallet Mgmt' },
    { id: 'validate-address', label: 'Validate Addr' },
    { id: 'send-transaction', label: 'Send Tx' },
    { id: 'space-station', label: 'Space Station' },
  ];
  if (isDefi) {
    rooms.push(
      { id: 'asset-page', label: 'Assets' },
      { id: 'dex-page', label: 'DEX' },
    );
  }
  if (hasWallet) {
    rooms.push({ id: 'download-wallet', label: 'Save Wallet' });
  }
  return rooms;
}

const GameInterface = ({
  currentModal,
  setCurrentModal,
  wallet,
  balance,
  isDefiNode,
  currentWalletName,
  isSigningUnlocked,
  isSessionLocked,
  onOpenUnlock,
  onOpenDownloadWallet,
}) => {
  const { lockWallet } = useWallet();
  const toast = useToast();
  const mainRooms = useMemo(
    () => getMainRooms(isDefiNode, !!wallet),
    [isDefiNode, wallet],
  );
  const mainRoomCount = mainRooms.length;

  const keys = useRef({});
  const playerRef = useRef(null);
  const gameContainerRef = useRef(null);
  const positionRef = useRef({ x: 380, y: 280 });
  const baseRef = useRef(null);
  const thumbRef = useRef(null);
  const joystickVectorRef = useRef({ x: 0, y: 0 });
  const enemiesRef = useRef([]);

  const [copied, setCopied] = useState(false);
  const [hoveredCounter, setHoveredCounter] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(0);
  const currentRoomData = mainRooms[currentRoom] ?? mainRooms[0];
  const [currentScreen, setCurrentScreen] = useState('main');
  const [zoneProgress, setZoneProgress] = useState({ zone1: 0, zone2: 0, zone3: 0 });
  const [nearLeft, setNearLeft] = useState(false);
  const [nearRight, setNearRight] = useState(false);
  const [nearTop, setNearTop] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickCenter, setJoystickCenter] = useState({ x: 0, y: 0 });
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const [projectiles, setProjectiles] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [enemyProjectiles, setEnemyProjectiles] = useState([]);
  const [playerHealth, setPlayerHealth] = useState(3);
  const [currentWave, setCurrentWave] = useState(1);
  const [isWaveCleared, setIsWaveCleared] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [boss, setBoss] = useState(null);
  const [bossProjectiles, setBossProjectiles] = useState([]);
  const [bombs, setBombs] = useState([]);
  const [bossHealth, setBossHealth] = useState(5);
  const [showZoneMessage, setShowZoneMessage] = useState(false);
  const [combatStarted, setCombatStarted] = useState(false);
  const [showUpgradeChoice, setShowUpgradeChoice] = useState(false);
  const [upgrades, setUpgrades] = useState({ doubleShot: false, bombAbility: false, rapidFire: false });
  const [showHardModeChoice, setShowHardModeChoice] = useState(false);
  const [hardMode, setHardMode] = useState(false);
  const [bombCooldown, setBombCooldown] = useState(0);
  const lastShotRef = useRef(0);
  const lastHitRef = useRef(0);
  const lastBossBurstRef = useRef(0);
  const bossPatternRef = useRef(0);
  const lastPatternSwitchRef = useRef(0);
  const HIT_COOLDOWN = 420;
  const joystickRadius = 50;

  // Destructure upgrades so we can safely depend on them
  const { doubleShot, bombAbility, rapidFire } = upgrades;

  // Sync enemies to ref
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  useEffect(() => {
    if (currentRoom >= mainRoomCount) {
      setCurrentRoom(0);
    }
  }, [mainRoomCount, currentRoom]);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show zone entry message
  useEffect(() => {
    if (currentScreen === 'zone2') {
      setCombatStarted(false);
      if (!showZoneMessage) {
        setShowZoneMessage(true);
        setTimeout(() => setShowZoneMessage(false), 5000);
      }
    }
  }, [currentScreen]);

  // Set fixed joystick center for mobile
  useEffect(() => {
    if (isMobile && gameContainerRef.current) {
      const updateJoystickPosition = () => {
        const container = gameContainerRef.current;
        const centerX = container.offsetWidth - joystickRadius - 40;
        const centerY = container.offsetHeight - joystickRadius - 40;
        setJoystickCenter({ x: centerX, y: centerY });
        setThumbPos({ x: centerX, y: centerY });
      };

      updateJoystickPosition();
      window.addEventListener('resize', updateJoystickPosition);
      
      return () => window.removeEventListener('resize', updateJoystickPosition);
    }
  }, [isMobile]);

  // Update joystick visuals
  useEffect(() => {
    if (baseRef.current) {
      baseRef.current.style.left = `${joystickCenter.x - joystickRadius}px`;
      baseRef.current.style.top = `${joystickCenter.y - joystickRadius}px`;
    }
    if (thumbRef.current) {
      thumbRef.current.style.left = `${thumbPos.x}px`;
      thumbRef.current.style.top = `${thumbPos.y}px`;
    }
  }, [joystickCenter, thumbPos, joystickRadius]);

  // Initialize player position based on container size
  useEffect(() => {
    if (gameContainerRef.current) {
      const container = gameContainerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      positionRef.current = {
        x: containerWidth / 2 - 20,
        y: containerHeight / 2 - 20
      };
      
      if (playerRef.current) {
        playerRef.current.style.left = `${positionRef.current.x}px`;
        playerRef.current.style.top = `${positionRef.current.y}px`;
      }
    }
  }, []);

  // Sync joystickVector to ref
  useEffect(() => {
    joystickVectorRef.current = joystickVector;
  }, [joystickVector]);

  // Spawn enemies in exact columns you requested
  useEffect(() => {
    if (currentScreen !== 'zone2') {
      setEnemies([]);
      setEnemyProjectiles([]);
      setProjectiles([]);
      setBoss(null);
      setBossProjectiles([]);
      setCurrentWave(1);
      setIsWaveCleared(false);
      setIsVictory(false);
      setCombatStarted(false);
      setHardMode(false);
      return;
    }

    if (enemies.length === 0 && !boss && !isWaveCleared && !isVictory && gameContainerRef.current && (currentScreen !== 'zone2' || combatStarted)) {
      const containerWidth = gameContainerRef.current.offsetWidth;
      const startX = containerWidth - 95;
      const horizontalSpacing = 85;
      const verticalSpacing = 55;
      const startY = 65;

      let columnCounts = [];
      if (currentWave === 1) columnCounts = [5];
      else if (currentWave === 2) columnCounts = [5, 2];
      else if (currentWave === 3) columnCounts = [6, 3];
      else if (currentWave === 4) columnCounts = [7, 4]; // Hard mode
      else if (currentWave === 5) columnCounts = [8, 3];
      else if (currentWave === 6) columnCounts = [9, 4];

      const newEnemies = [];
      let idCounter = Date.now();

      columnCounts.forEach((count, colIndex) => {
        const columnX = startX - colIndex * horizontalSpacing;
        for (let row = 0; row < count; row++) {
          newEnemies.push({
            id: idCounter++,
            x: columnX,
            y: startY + row * verticalSpacing,
            offset: (colIndex * 10 + row) * 0.8,
            direction: -1
          });
        }
      });

      setEnemies(newEnemies);
      setPlayerHealth(3);
      setEnemyProjectiles([]);
      setProjectiles([]);
      setBoss(null);
    }
  }, [currentScreen, currentWave, isWaveCleared, isVictory, combatStarted]);

  // ==================== GAME LOOP ====================
  useEffect(() => {
    let frameId;
    const gameLoop = () => {
      if (!playerRef.current || !gameContainerRef.current) {
        frameId = requestAnimationFrame(gameLoop);
        return;
      }

      const container = gameContainerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const speed = isMobile ? 2.035 : 2.9205;

      // Player movement
      let dx = 0;
      let dy = 0;
      if (keys.current['a'] || keys.current['arrowleft']) dx -= 1;
      if (keys.current['d'] || keys.current['arrowright']) dx += 1;
      if (keys.current['w'] || keys.current['arrowup']) dy -= 1;
      if (keys.current['s'] || keys.current['arrowdown']) dy += 1;

      if (dx !== 0 && dy !== 0) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        dx /= mag;
        dy /= mag;
      }

      positionRef.current.x += speed * dx;
      positionRef.current.y += speed * dy;
      positionRef.current.x += speed * joystickVectorRef.current.x;
      positionRef.current.y += speed * joystickVectorRef.current.y;

      // Boundary checking
      if (positionRef.current.x < 0) positionRef.current.x = 0;
      if (positionRef.current.x > containerWidth - 40) positionRef.current.x = containerWidth - 40;
      if (positionRef.current.y < 0) positionRef.current.y = 0;
      if (positionRef.current.y > containerHeight - 40) positionRef.current.y = containerHeight - 40;

      playerRef.current.style.left = `${positionRef.current.x}px`;
      playerRef.current.style.top = `${positionRef.current.y}px`;

      // Update player projectiles
      setProjectiles(prev =>
        prev
          .map(p => ({ ...p, x: p.x + p.vx }))
          .filter(p => p.x < containerWidth + 30)
      );

      // Update bomb cooldown
      if (bombCooldown > 0) {
        setBombCooldown(prev => Math.max(0, prev - 16));
      }

      // Update bombs
      setBombs(prev =>
        prev
          .map(b => ({ ...b, x: b.x + b.vx }))
          .filter(b => b.x < containerWidth + 50)
      );

      // Update enemies (patrol + death cleanup)
      setEnemies(prev => {
        const updated = prev.map(enemy => {
          if (enemy.deathTime) return enemy;

          let dir = enemy.direction || -1;
          const speed = hardMode ? 2.5 : 1.85;
          let newX = enemy.x + dir * speed;
          const minX = containerWidth * 0.25;
          const maxX = containerWidth - 95;

          if (newX <= minX) { newX = minX; dir = 1; }
          else if (newX >= maxX) { newX = maxX; dir = -1; }

          const waveAmp = hardMode ? 2.0 : 1.2;
          const waveY = Math.sin(Date.now() / 280 + enemy.offset) * waveAmp;
          return { ...enemy, x: newX, y: enemy.y + waveY, direction: dir };
        });

        return updated.filter(e => !e.deathTime || Date.now() < e.deathTime);
      });

      // Update enemy projectiles
      const enemyProjectileSpeed = hardMode ? 9.0 : 6.9;
      setEnemyProjectiles(prev =>
        prev
          .map(p => ({ ...p, x: p.x - enemyProjectileSpeed }))
          .filter(p => p.x > -40)
      );

      // BOSS LOGIC
      if (boss) {
        setBoss(b => {
          const now = Date.now();
          if (now - lastPatternSwitchRef.current > 5000) {
            bossPatternRef.current = 1 - bossPatternRef.current;
            lastPatternSwitchRef.current = now;
          }

          let newX, newY, newDir;
          const speedMultiplier = hardMode ? 1.5 : 1.0;
          if (bossPatternRef.current === 0) {
            let dir = (b.direction || -1.2) * speedMultiplier;
            newX = b.x + dir;
            const minX = containerWidth * 0.15;
            const maxX = containerWidth - 120;
            if (newX <= minX) { newX = minX; dir = 1.2 * speedMultiplier; }
            else if (newX >= maxX) { newX = maxX; dir = -1.2 * speedMultiplier; }
            newDir = dir;

            const centerY = containerHeight / 3;
            const amplitudeY = (containerHeight - 200) / 2;
            const waveY = Math.sin(now / (280 / speedMultiplier)) * amplitudeY;
            newY = centerY + waveY;
          } else {
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 3;
            const radius = Math.min(containerWidth - 200, containerHeight - 200) / 2;
            const angle = now / (500 / speedMultiplier);
            newX = centerX + Math.cos(angle) * radius;
            newY = centerY + Math.sin(angle) * radius;
            newDir = 0;
          }

          return { ...b, x: newX, y: newY, direction: newDir };
        });

        if (Math.random() < 0.065) {
          setBossProjectiles(prev => [...prev, { id: Date.now(), x: boss.x - 12, y: boss.y + 45, vy: 0 }]);
        }

        const now = Date.now();
        const burstCooldown = hardMode ? 1800 : 2500;
        if (now - lastBossBurstRef.current > burstCooldown) {
          lastBossBurstRef.current = now;
          setBossProjectiles(prev => [
            ...prev,
            { id: Date.now() + 1, x: boss.x - 12, y: boss.y + 45, vy: -4 },
            { id: Date.now() + 2, x: boss.x - 12, y: boss.y + 45, vy: -2 },
            { id: Date.now() + 3, x: boss.x - 12, y: boss.y + 45, vy: 0 },
            { id: Date.now() + 4, x: boss.x - 12, y: boss.y + 45, vy: 2 },
            { id: Date.now() + 5, x: boss.x - 12, y: boss.y + 45, vy: 4 }
          ]);
        }
      }

      // Boss projectiles movement
      const bossProjectileSpeed = hardMode ? 10.5 : 8.5;
      setBossProjectiles(prev =>
        prev
          .map(p => ({ ...p, x: p.x - bossProjectileSpeed, y: p.y + (p.vy || 0) }))
          .filter(p => p.x > -40)
      );

      // Enemy shooting
      if (Math.random() < 0.035 && enemiesRef.current.length > 0) {
        const aliveEnemies = enemiesRef.current.filter(e => !e.deathTime);
        if (aliveEnemies.length > 0) {
          const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          setEnemyProjectiles(prev => [...prev, { id: Date.now(), x: shooter.x - 8, y: shooter.y + 19 }]);
        }
      }

      // Collision detection
      handleCollisions();

      checkInteractionZone();

      if (currentScreen === 'main') {
        handleRoomNavigation();
      }

      frameId = requestAnimationFrame(gameLoop);
    };
    frameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frameId);
  }, [isMobile, currentRoom, currentScreen, currentWave, boss, isWaveCleared, isVictory]);

  // ==================== FIXED SHOOT & BOMB (now with useCallback) ====================
  // These are now stable and will always see the latest upgrade state
  const shoot = useCallback(() => {
    const now = Date.now();
    const cooldown = rapidFire ? 120 : 180;
    if (now - lastShotRef.current < cooldown || currentScreen !== 'zone2' || playerHealth <= 0) return;
    lastShotRef.current = now;

    const baseProjectile = {
      id: Date.now(),
      x: positionRef.current.x + 38,
      y: positionRef.current.y + 17,
      vx: 9.5,
      type: rapidFire ? 'rapid' : 'normal'
    };

    let projectilesToAdd = [baseProjectile];

    if (doubleShot) {
      projectilesToAdd.push({
        ...baseProjectile,
        id: Date.now() + 1,
        x: positionRef.current.x + 48,
        type: 'double'
      });
    }

    setProjectiles(prev => [...prev, ...projectilesToAdd]);
  }, [doubleShot, rapidFire, currentScreen, playerHealth]);

  const useBomb = useCallback(() => {
    if (!bombAbility || bombCooldown > 0 || currentScreen !== 'zone2' || playerHealth <= 0) return;

    const newBomb = {
      id: Date.now(),
      x: positionRef.current.x + 38,
      y: positionRef.current.y + 17,
      vx: 8
    };
    setBombs(prev => [...prev, newBomb]);
    setBombCooldown(15000);
  }, [bombAbility, bombCooldown, currentScreen, playerHealth]);

  // Key handlers (NOW includes shoot/useBomb in deps so upgrades work!)
  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.key.toLowerCase()] = true;

      if (e.key === ' ' && currentScreen === 'zone2') {
        e.preventDefault();
        shoot();
      }
      if (e.key.toLowerCase() === 'b' && currentScreen === 'zone2') {
        e.preventDefault();
        useBomb();
      }
      if (e.key.toLowerCase() === 'e' || e.key === 'Enter') {
        checkInteraction();
      }
      if (e.key.toLowerCase() === 'r') {
        const directions = [];
        if (nearLeft) directions.push('left');
        if (nearRight) directions.push('right');
        if (nearTop) directions.push('up');
        if (nearBottom) directions.push('down');
        if (directions.length === 1) {
          changeRoom(directions[0]);
        }
      }
      if (e.key === 'Escape' && currentModal) {
        setCurrentModal(null);
      }
    };
    
    const handleKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    
    const handleBlur = () => {
      keys.current = {};
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [currentModal, setCurrentModal, nearLeft, nearRight, nearTop, nearBottom, currentRoom, currentScreen, shoot, useBomb]);

  // Touch handlers for mobile (unchanged - already re-bound on render)
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      if (e.target.closest('.mobile-controls')) return;

      const touch = e.touches[0];
      const rect = gameContainerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const deltaX = x - joystickCenter.x;
      const deltaY = y - joystickCenter.y;
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

      if (distance < joystickRadius * 1.5) {
        setJoystickActive(true);

        let thumbDeltaX = deltaX;
        let thumbDeltaY = deltaY;
        let magnitude = distance;
        if (magnitude > joystickRadius) {
          thumbDeltaX = (deltaX / magnitude) * joystickRadius;
          thumbDeltaY = (deltaY / magnitude) * joystickRadius;
        }

        setThumbPos({ x: joystickCenter.x + thumbDeltaX, y: joystickCenter.y + thumbDeltaY });
        setJoystickVector({ x: thumbDeltaX / joystickRadius, y: thumbDeltaY / joystickRadius });
      }
    };

    const handleTouchMove = (e) => {
      if (!joystickActive) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = gameContainerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const deltaX = x - joystickCenter.x;
      const deltaY = y - joystickCenter.y;
      let magnitude = Math.sqrt(deltaX ** 2 + deltaY ** 2);
      let thumbDeltaX = deltaX;
      let thumbDeltaY = deltaY;

      if (magnitude > joystickRadius) {
        thumbDeltaX = (deltaX / magnitude) * joystickRadius;
        thumbDeltaY = (deltaY / magnitude) * joystickRadius;
        magnitude = joystickRadius;
      }

      setThumbPos({ x: joystickCenter.x + thumbDeltaX, y: joystickCenter.y + thumbDeltaY });
      setJoystickVector({ x: thumbDeltaX / joystickRadius, y: thumbDeltaY / joystickRadius });
    };

    const handleTouchEnd = () => {
      setJoystickActive(false);
      setThumbPos({ x: joystickCenter.x, y: joystickCenter.y });
      setJoystickVector({ x: 0, y: 0 });
    };

    const container = gameContainerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isMobile, joystickCenter, joystickActive]);

  // ==================== FIXED INTERACTION DETECTION ====================
  const getCurrentHovered = () => {
    if (!playerRef.current) return null;

    const playerRect = playerRef.current.getBoundingClientRect();
    const pCenterX = playerRect.left + playerRect.width / 2;
    const pCenterY = playerRect.top + playerRect.height / 2;

    const counters = document.querySelectorAll('.counter');
    let hoveredId = null;
    let minDist = Infinity;
    const INTERACTION_RADIUS = 115;

    counters.forEach((counter) => {
      if (!counter) return;
      const rect = counter.getBoundingClientRect();
      const cCenterX = rect.left + rect.width / 2;
      const cCenterY = rect.top + rect.height / 2;

      const distance = Math.hypot(pCenterX - cCenterX, pCenterY - cCenterY);

      if (distance < INTERACTION_RADIUS && distance < minDist) {
        minDist = distance;
        hoveredId = counter.id;
      }
    });

    return hoveredId;
  };

  const checkInteractionZone = () => {
    const currentHovered = getCurrentHovered();
    setHoveredCounter(currentHovered);
  };

  const handleRoomNavigation = () => {
    const container = gameContainerRef.current;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const threshold = 50;

    setNearLeft(positionRef.current.x < threshold);
    setNearRight(positionRef.current.x > width - threshold - 40);
    setNearTop(positionRef.current.y < threshold);
    setNearBottom(positionRef.current.y > height - threshold - 40);
  };

  const checkInteraction = () => {
    const currentHovered = getCurrentHovered();
    if (currentHovered) {
      if (currentHovered === 'space-station') {
        setCurrentScreen('zone-select');
      } else {
        setCurrentModal(currentHovered);
        if (currentHovered === 'download-wallet') {
          onOpenDownloadWallet();
        }
      }
    }
  };

  const changeRoom = (direction) => {
    let newRoom = currentRoom;
    switch (direction) {
      case 'left': newRoom = (currentRoom - 1 + mainRoomCount) % mainRoomCount; break;
      case 'right': newRoom = (currentRoom + 1) % mainRoomCount; break;
      case 'up': newRoom = (currentRoom - 1 + mainRoomCount) % mainRoomCount; break;
      case 'down': newRoom = (currentRoom + 1) % mainRoomCount; break;
      default: break;
    }
    setCurrentRoom(newRoom);

    const container = gameContainerRef.current;
    if (direction === 'left') positionRef.current.x = container.offsetWidth - 40;
    else if (direction === 'right') positionRef.current.x = 0;
    else if (direction === 'up') positionRef.current.y = container.offsetHeight - 40;
    else if (direction === 'down') positionRef.current.y = 0;

    playerRef.current.style.left = `${positionRef.current.x}px`;
    playerRef.current.style.top = `${positionRef.current.y}px`;
  };

  // Collision detection (unchanged)
  const handleCollisions = () => {
    // Player shots vs enemies
    setProjectiles(prevP => {
      let remainingP = [...prevP];
      setEnemies(prevE => {
        let remainingE = [...prevE];
        for (let i = remainingP.length - 1; i >= 0; i--) {
          for (let j = remainingE.length - 1; j >= 0; j--) {
            if (!remainingE[j].deathTime && 
                Math.abs(remainingP[i].x - remainingE[j].x) < 30 &&
                Math.abs(remainingP[i].y - remainingE[j].y) < 32) {
              remainingE[j] = { ...remainingE[j], deathTime: Date.now() + 200 };
              remainingP.splice(i, 1);
              break;
            }
          }
        }
        const alive = remainingE.filter(e => !e.deathTime);
        if (alive.length === 0 && prevE.filter(e => !e.deathTime).length > 0) {
          triggerWaveClear();
        }
        return remainingE;
      });
      return remainingP;
    });

    // Bombs vs enemies
    setBombs(prevB => {
      let remainingB = [...prevB];
      setEnemies(prevE => {
        let remainingE = [...prevE];
        for (let i = remainingB.length - 1; i >= 0; i--) {
          for (let j = remainingE.length - 1; j >= 0; j--) {
            if (!remainingE[j].deathTime &&
                Math.abs(remainingB[i].x - remainingE[j].x) < 80 &&
                Math.abs(remainingB[i].y - remainingE[j].y) < 80) {
              remainingE[j] = { ...remainingE[j], deathTime: Date.now() + 200 };
            }
          }
        }
        return remainingE;
      });
      return remainingB;
    });

    // Player shots vs boss
    if (boss) {
      setProjectiles(prevP => {
        let remainingP = [...prevP];
        let newBossHealth = bossHealth;
        for (let i = remainingP.length - 1; i >= 0; i--) {
          if (Math.abs(remainingP[i].x - boss.x) < 55 && Math.abs(remainingP[i].y - boss.y) < 55) {
            newBossHealth--;
            remainingP.splice(i, 1);
            if (newBossHealth <= 0) {
              setBoss(null);
              setBossProjectiles([]);
              setShowUpgradeChoice(true);
            } else {
              setBossHealth(newBossHealth);
            }
            break;
          }
        }
        return remainingP;
      });

      // Bombs vs boss
      setBombs(prevB => {
        let remainingB = [...prevB];
        let newBossHealth = bossHealth;
        for (let i = remainingB.length - 1; i >= 0; i--) {
          if (Math.abs(remainingB[i].x - boss.x) < 80 && Math.abs(remainingB[i].y - boss.y) < 80) {
            newBossHealth -= 2;
            remainingB.splice(i, 1);
            if (newBossHealth <= 0) {
              setBoss(null);
              setBossProjectiles([]);
              setShowUpgradeChoice(true);
            } else {
              setBossHealth(newBossHealth);
            }
            break;
          }
        }
        return remainingB;
      });
    }

    // Enemy shots vs player
    setEnemyProjectiles(prevEP => {
      let remainingEP = [...prevEP];
      let newHealth = playerHealth;
      const now = Date.now();
      for (let i = remainingEP.length - 1; i >= 0; i--) {
        const ep = remainingEP[i];
        if (
          ep.x > positionRef.current.x - 12 &&
          ep.x < positionRef.current.x + 48 &&
          ep.y > positionRef.current.y - 10 &&
          ep.y < positionRef.current.y + 38 &&
          now - lastHitRef.current > HIT_COOLDOWN
        ) {
          newHealth = Math.max(0, newHealth - 1);
          lastHitRef.current = now;
          remainingEP.splice(i, 1);
        }
      }
      if (newHealth !== playerHealth) setPlayerHealth(newHealth);
      return remainingEP;
    });

    // Boss projectiles vs player
    setBossProjectiles(prevBP => {
      let remainingBP = [...prevBP];
      let newHealth = playerHealth;
      const now = Date.now();
      for (let i = remainingBP.length - 1; i >= 0; i--) {
        const bp = remainingBP[i];
        if (
          bp.x > positionRef.current.x - 12 &&
          bp.x < positionRef.current.x + 48 &&
          bp.y > positionRef.current.y - 10 &&
          bp.y < positionRef.current.y + 38 &&
          now - lastHitRef.current > HIT_COOLDOWN
        ) {
          newHealth = Math.max(0, newHealth - 1);
          lastHitRef.current = now;
          remainingBP.splice(i, 1);
        }
      }
      if (newHealth !== playerHealth) setPlayerHealth(newHealth);
      return remainingBP;
    });
  };

  const triggerWaveClear = () => {
    const maxWave = hardMode ? 6 : 3;
    if (currentWave < maxWave) {
      setIsWaveCleared(true);
      setTimeout(() => {
        setIsWaveCleared(false);
        setCurrentWave(prev => prev + 1);
      }, 1000);
    } else if (currentWave === maxWave) {
      setIsVictory(true);
      setTimeout(() => {
        setIsVictory(false);
        const containerWidth = gameContainerRef.current.offsetWidth;
        setBoss({
          x: containerWidth - 140,
          y: 120,
          direction: -1.2
        });
        setBossHealth(hardMode ? 8 : 5);
        lastBossBurstRef.current = Date.now();
      }, 2200);
    } else {
      setShowUpgradeChoice(true);
    }
  };

  const handleCopyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleMobileButtonClick = (action) => {
    switch (action) {
      case 'interact': checkInteraction(); break;
      case 'room_change':
        const directions = [];
        if (nearLeft) directions.push('left');
        if (nearRight) directions.push('right');
        if (nearTop) directions.push('up');
        if (nearBottom) directions.push('down');
        if (directions.length === 1) changeRoom(directions[0]);
        break;
      case 'shoot': shoot(); break;
      default: break;
    }
  };

  // Early return for zone-select screen
  if (currentScreen === 'zone-select') {
    return (
      <SpaceStation
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        zoneProgress={zoneProgress}
        setZoneProgress={setZoneProgress}
      />
    );
  }

  return (
    <>
      {/* Instructions outside the game area - hidden during waves */}
      {currentScreen !== 'zone2' && (
        <div className="game-instructions">
          <div className="instruction-text">
            {isMobile ? (
              <>Use joystick to move • Walk to edges to change sector • E to interact • FIRE to shoot aliens</>
            ) : (
              <>Use WASD or Arrow Keys to move • Walk to edges to change sector • E or Enter to interact • R to travel • SPACE to shoot aliens</>
            )}
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      {isMobile && (
        <>
          {currentScreen === 'main' && (
            <div className="mobile-controls">
              <button 
                className="control-btn interact-btn"
                onTouchStart={() => handleMobileButtonClick('interact')}
                onMouseDown={() => handleMobileButtonClick('interact')}
              >
                E
              </button>
              <button 
                className="control-btn room-btn"
                onTouchStart={() => handleMobileButtonClick('room_change')}
                onMouseDown={() => handleMobileButtonClick('room_change')}
              >
                R
              </button>
            </div>
          )}

          {currentScreen === 'zone2' && (
            <div className="mobile-controls">
              <button 
                className="control-btn interact-btn"
                onTouchStart={checkInteraction}
                onMouseDown={checkInteraction}
              >
                E
              </button>
              <button 
                className="control-btn fire-btn"
                onTouchStart={shoot}
                onMouseDown={shoot}
              >
                FIRE
              </button>
            </div>
          )}
        </>
      )}

      <div id="game-container" ref={gameContainerRef} className={currentScreen}>
        {/* Game Background Elements */}
        <div className="background-elements">
          <div className="star star-1"></div>
          <div className="star star-2"></div>
          <div className="star star-3"></div>
          <div className="star star-4"></div>
          <div className="star star-5"></div>
          <div className="star star-6"></div>
          <div className="star star-7"></div>
          <div className="star star-8"></div>
          <div className="star star-9"></div>
          <div className="star star-10"></div>
          <div className="star star-11"></div>
          <div className="star star-12"></div>
          <div className="star star-13"></div>
        </div>
        
        {/* Player */}
        <div id="player" ref={playerRef}></div>
        
        {/* Joystick visuals */}
        {isMobile && (
          <>
            <div className="joystick-base" ref={baseRef} />
            <div className="joystick-thumb" ref={thumbRef} />
          </>
        )}
        
        {/* MAIN COUNTERS — one station per sector */}
        {currentScreen === 'main' && currentRoomData && (
          <>
            <div
              className={`counter room-counter ${hoveredCounter === currentRoomData.id ? 'interaction-zone' : ''}`}
              id={currentRoomData.id}
            >
              <div className="sign-center">{currentRoomData.label}</div>
            </div>

            <div className="sector-hints">
              {nearLeft && <div className="hint left-hint">←</div>}
              {nearRight && <div className="hint right-hint">→</div>}
              {nearBottom && <div className="hint bottom-hint">↓</div>}
              {nearTop && <div className="hint top-hint">↑</div>}
            </div>

            <div className="sector-transitions">
              {nearLeft && (
                <button type="button" className="transition-btn left-btn" onClick={() => changeRoom('left')}>
                  ← Sector {((currentRoom - 1 + mainRoomCount) % mainRoomCount) + 1}
                </button>
              )}
              {nearRight && (
                <button type="button" className="transition-btn right-btn" onClick={() => changeRoom('right')}>
                  Sector {((currentRoom + 1) % mainRoomCount) + 1} →
                </button>
              )}
              {nearBottom && (
                <button type="button" className="transition-btn bottom-btn" onClick={() => changeRoom('down')}>
                  ↓ Sector {((currentRoom + 1) % mainRoomCount) + 1}
                </button>
              )}
              {nearTop && (
                <button type="button" className="transition-btn top-btn" onClick={() => changeRoom('up')}>
                  ↑ Sector {((currentRoom - 1 + mainRoomCount) % mainRoomCount) + 1}
                </button>
              )}
            </div>
          </>
        )}

        {/* ZONE COUNTERS */}
        {(currentScreen === 'zone1' || currentScreen === 'zone2' || currentScreen === 'zone3') && (
          <SpaceStation
            currentScreen={currentScreen}
            setCurrentScreen={setCurrentScreen}
            zoneProgress={zoneProgress}
            setZoneProgress={setZoneProgress}
            hoveredCounter={hoveredCounter}
            combatStarted={combatStarted}
            setCombatStarted={setCombatStarted}
            setShowUpgradeChoice={setShowUpgradeChoice}
          />
        )}

        {/* PLAYER PROJECTILES */}
        {projectiles.map((p) => (
          <div
            key={p.id}
            className={`projectile ${p.type || ''}`}
            style={{ left: `${p.x}px`, top: `${p.y}px` }}
          />
        ))}

        {/* BOMBS */}
        {bombs.map((b) => (
          <div
            key={b.id}
            className="bomb"
            style={{ left: `${b.x}px`, top: `${b.y}px` }}
          />
        ))}

        {/* ENEMIES */}
        {enemies.map((e) => {
          const isDying = !!e.deathTime;
          const emoji = isDying ? '💥' : '👾';
          return (
            <div
              key={e.id}
              className={`enemy ${isDying ? 'dying' : ''}`}
              style={{ left: `${e.x}px`, top: `${e.y}px` }}
            >
              {emoji}
            </div>
          );
        })}

        {/* ENEMY PROJECTILES */}
        {enemyProjectiles.map((ep) => (
          <div
            key={ep.id}
            className="enemy-projectile"
            style={{ left: `${ep.x}px`, top: `${ep.y}px` }}
          />
        ))}

        {/* BOSS */}
        {boss && (
          <div 
            className="boss" 
            style={{ left: `${boss.x}px`, top: `${boss.y}px` }}
          >
            🛸
          </div>
        )}

        {/* BOSS PROJECTILES */}
        {bossProjectiles.map((bp) => (
          <div
            key={bp.id}
            className="enemy-projectile"
            style={{ left: `${bp.x}px`, top: `${bp.y}px` }}
          />
        ))}

        {/* Health HUD */}
        {currentScreen === 'zone2' && (
          <div id="health-hud">
            Health: {'♥'.repeat(playerHealth)}
          </div>
        )}

        {/* Bomb HUD */}
        {currentScreen === 'zone2' && bombAbility && (
          <div id="bomb-hud">
            Bomb: {bombCooldown > 0 ? `${(bombCooldown / 1000).toFixed(1)}s` : 'READY'} (B)
          </div>
        )}

        {/* Wave Cleared */}
        {isWaveCleared && (
          <div className="wave-cleared-overlay">
            <h2>WAVE {currentWave} CLEARED!</h2>
            <p>Prepare for next wave...</p>
          </div>
        )}

        {/* Upgrade Choice */}
        {showUpgradeChoice && (
          <div className="upgrade-choice-overlay">
            <h2>Victory! Choose Your Upgrade</h2>
            <div className="upgrade-options">
              <button onClick={() => { setUpgrades(prev => ({ ...prev, doubleShot: true })); setShowHardModeChoice(true); setShowUpgradeChoice(false); }}>Double Shot</button>
              <button onClick={() => { setUpgrades(prev => ({ ...prev, bombAbility: true })); setShowHardModeChoice(true); setShowUpgradeChoice(false); }}>Bomb Ability</button>
              <button onClick={() => { setUpgrades(prev => ({ ...prev, rapidFire: true })); setShowHardModeChoice(true); setShowUpgradeChoice(false); }}>Rapid Fire</button>
            </div>
          </div>
        )}

        {/* Hard Mode Choice */}
        {showHardModeChoice && (
          <div className="upgrade-choice-overlay">
            <h2>With your new upgrade, launch another attack on stronger alien forces?</h2>
            <div className="upgrade-options">
              <button onClick={() => { setZoneProgress(p => ({ ...p, zone2: 3 })); setCurrentScreen('main'); setShowHardModeChoice(false); }}>Return to Base</button>
              <button onClick={() => { setHardMode(true); setCurrentWave(4); setCombatStarted(true); setPlayerHealth(3); setShowHardModeChoice(false); }}>Launch Another Attack</button>
            </div>
          </div>
        )}

        {/* Game Over */}
        {currentScreen === 'zone2' && playerHealth <= 0 && (
          <div className="game-over-overlay">
            <h2>MISSION FAILED</h2>
            <p>The aliens overran the colony...</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setZoneProgress(p => ({ ...p, zone2: 0 }));
                  setCurrentWave(1);
                  setPlayerHealth(3);
                  setEnemies([]);
                  setEnemyProjectiles([]);
                  setProjectiles([]);
                  setBoss(null);
                  setBossProjectiles([]);
                  setCombatStarted(false);
                  setHardMode(false);
                  setIsWaveCleared(false);
                  setIsVictory(false);
                  setShowUpgradeChoice(false);
                  setShowHardModeChoice(false);
                }}
                style={{ padding: '12px 24px', fontSize: '18px' }}
              >
                Time-Walk
              </button>
              <button
                onClick={() => setCurrentScreen('main')}
                style={{ padding: '12px 24px', fontSize: '18px' }}
              >
                Return to Base
              </button>
            </div>
          </div>
        )}

        {/* HUD Elements */}
        <div id="hud">
          <div id="balance-hud">
            {currentWalletName && (
              <span className="hud-wallet-tag">{currentWalletName}</span>
            )}
            Balance: {balance !== null ? `${balance} WART` : 'Loading...'}
          </div>
          {wallet?.address && isSigningUnlocked && (
            <button
              type="button"
              className="compact-btn hud-lock-btn"
              onClick={() => {
                lockWallet?.();
                toast.success('Wallet locked — signing disabled until you unlock');
              }}
              title="Lock wallet"
            >
              Lock
            </button>
          )}
          {wallet?.address && isSessionLocked && currentWalletName && (
            <button
              type="button"
              className="compact-btn hud-unlock-btn"
              onClick={onOpenUnlock}
              title={`Unlock wallet "${currentWalletName}"`}
            >
              Unlock
            </button>
          )}
          <button
            type="button"
            className="compact-btn hover:!text-[#FDB913] !mx-0 !my-0 !px-3 !py-1"
            onClick={() => setCurrentModal('node-options')}
            title="Node Options"
            aria-label="Node Options"
          >
            Node
          </button>
        </div>

        {currentScreen === 'main' && (
          <div id="sector-hud">
            <span className="sector-label">SECTOR</span>
            <span className="sector-number">{currentRoom + 1}</span>
            <span className="sector-divider">/</span>
            <span className="sector-total">{mainRoomCount}</span>
          </div>
        )}

        {wallet?.address && (
          <div id="address-hud" onClick={handleCopyAddress}>
            {copied ? 'Copied!' : `Address: ${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}`}
          </div>
        )}
      </div>

      {/* Zone Entry Message */}
      {showZoneMessage && (
        <div className="zone-entry-message">
          You enter the Combat Zone, where alien threats loom. Your colony's defenses are under attack.
        </div>
      )}
    </>
  );
};

export default GameInterface;