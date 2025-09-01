// GameInterface.jsx
import React, { useRef, useEffect, useState } from 'react';
import './GameInterface.css';

const GameInterface = ({ currentModal, setCurrentModal, wallet, balance, onOpenDownloadWallet }) => {
  const keys = useRef({});
  const playerRef = useRef(null);
  const gameContainerRef = useRef(null);
  const positionRef = useRef({ x: 380, y: 280 });
  const baseRef = useRef(null);
  const thumbRef = useRef(null);
  const joystickVectorRef = useRef({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [hoveredCounter, setHoveredCounter] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(0);
  const [nearLeft, setNearLeft] = useState(false);
  const [nearRight, setNearRight] = useState(false);
  const [nearTop, setNearTop] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickCenter, setJoystickCenter] = useState({ x: 0, y: 0 });
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const joystickRadius = 50;

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      
      // Center the player initially
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

  // Game loop
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
      const speed = isMobile ? 0.5 : 1.05;

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

      // Check for interaction zone hover
      checkInteractionZone();

      // Room navigation for mobile
      if (isMobile) {
        handleRoomNavigation();
      }

      frameId = requestAnimationFrame(gameLoop);
    };
    frameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frameId);
  }, [isMobile, currentRoom]);

  // Key handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.key.toLowerCase()] = true;
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
  }, [currentModal, setCurrentModal, nearLeft, nearRight, nearTop, nearBottom, currentRoom]);

  // Touch handlers for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      if (e.target.closest('.mobile-controls')) return; // Let control buttons handle their own events

      const touch = e.touches[0];
      const rect = gameContainerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      if (x < rect.width / 2) {
        // Left side: interact
        checkInteraction();
        return;
      }

      // Check distance to fixed joystick center
      const deltaX = x - joystickCenter.x;
      const deltaY = y - joystickCenter.y;
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

      if (distance < joystickRadius * 1.5) { // Activate if touch near joystick
        setJoystickActive(true);

        // Clamp to radius
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
const getCurrentHovered = () => {
  if (!playerRef.current) return null;

  const playerRect = playerRef.current.getBoundingClientRect();
  const counters = isMobile ? [document.getElementById(getCounterIdForRoom(currentRoom))] : document.querySelectorAll('.counter');
  let newHovered = null;

  counters.forEach((counter) => {
    if (counter) {
      const rect = counter.getBoundingClientRect();
      const overlap = !(
        playerRect.right < rect.left ||
        playerRect.left > rect.right ||
        playerRect.bottom < rect.top ||
        playerRect.top > rect.bottom
      );
      if (overlap) {
        newHovered = counter.id;
      }
    }
  });

  return newHovered;
};
  const checkInteractionZone = () => {
  const currentHovered = getCurrentHovered();
  setHoveredCounter(currentHovered);
};

  const getCounterIdForRoom = (room) => {
    switch (room) {
      case 0: return 'wallet-management';
      case 1: return 'node-options';
      case 2: return 'validate-address';
      case 3: return 'send-transaction';
      default: return null;
    }
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
  const currentHovered = getCurrentHovered(); // Compute fresh sync value here
  if (currentHovered) {
    setCurrentModal(currentHovered);
    if (currentHovered === 'download-wallet') {
      onOpenDownloadWallet();
    }
  }
};
  const changeRoom = (direction) => {
    let newRoom = currentRoom;
    switch (direction) {
      case 'left':
        newRoom = (currentRoom - 1 + 4) % 4;
        break;
      case 'right':
        newRoom = (currentRoom + 1) % 4;
        break;
      case 'up':
        newRoom = (currentRoom - 1 + 4) % 4;
        break;
      case 'down':
        newRoom = (currentRoom + 1) % 4;
        break;
      default:
        break;
    }
    setCurrentRoom(newRoom);
    // Reset player position to center after changing room
    const container = gameContainerRef.current;
    positionRef.current = {
      x: container.offsetWidth / 2 - 20,
      y: container.offsetHeight / 2 - 20
    };
    playerRef.current.style.left = `${positionRef.current.x}px`;
    playerRef.current.style.top = `${positionRef.current.y}px`;
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
      case 'interact':
        checkInteraction();
        break;
      case 'room_change':
        const directions = [];
        if (nearLeft) directions.push('left');
        if (nearRight) directions.push('right');
        if (nearTop) directions.push('up');
        if (nearBottom) directions.push('down');
        if (directions.length === 1) {
          changeRoom(directions[0]);
        }
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* Instructions outside the game area */}
      <div className="game-instructions">
        <div className="instruction-text">
          {isMobile ? (
            <>
              Use joystick to move, use E to interact
            </>
          ) : (
            <>
              Use WASD or Arrow Keys to move, E or Enter to interact and R to change sectors.
            </>
          )}
        </div>
      </div>

      {/* Mobile Controls */}
      {isMobile && (
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

      <div id="game-container" ref={gameContainerRef}>
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
        
        {/* Room-based Counter Display */}
        {isMobile ? (
          // Mobile: Show only current room's counter
          <>
            {currentRoom === 0 && (
              <div 
                className={`counter ${hoveredCounter === 'wallet-management' ? 'interaction-zone' : ''} mobile-counter`} 
                id="wallet-management" 
              >
                <div className="sign-center">Wallet Mgmt</div>
              </div>
            )}
            
            {currentRoom === 1 && (
              <div 
                className={`counter ${hoveredCounter === 'node-options' ? 'interaction-zone' : ''} mobile-counter`} 
                id="node-options" 
              >
                <div className="sign-center">Node Options</div>
              </div>
            )}
            
            {currentRoom === 2 && (
              <div 
                className={`counter ${hoveredCounter === 'validate-address' ? 'interaction-zone' : ''} mobile-counter`} 
                id="validate-address" 
              >
                <div className="sign-center">Validate Addr</div>
              </div>
            )}
            
            {currentRoom === 3 && (
              <div 
                className={`counter ${hoveredCounter === 'send-transaction' ? 'interaction-zone' : ''} mobile-counter`} 
                id="send-transaction" 
              >
                <div className="sign-center">Send Tx</div>
              </div>
            )}

            {/* Sector Navigation Hints */}
            <div className="sector-hints">
              {nearLeft && <div className="hint left-hint">←</div>}
              {nearRight && <div className="hint right-hint">→</div>}
              {nearBottom && <div className="hint bottom-hint">↓</div>}
              {nearTop && <div className="hint top-hint">↑</div>}
            </div>

            {/* Sector Transition Buttons */}
            <div className="sector-transitions">
              {nearLeft && (
                <button className="transition-btn left-btn" onClick={() => changeRoom('left')}>
                  ← Sector {((currentRoom - 1 + 4) % 4) + 1}
                </button>
              )}
              {nearRight && (
                <button className="transition-btn right-btn" onClick={() => changeRoom('right')}>
                  Sector {((currentRoom + 1) % 4) + 1} →
                </button>
              )}
              {nearBottom && (
                <button className="transition-btn bottom-btn" onClick={() => changeRoom('down')}>
                  ↓ Sector {((currentRoom + 1) % 4) + 1}
                </button>
              )}
              {nearTop && (
                <button className="transition-btn top-btn" onClick={() => changeRoom('up')}>
                  ↑ Sector {((currentRoom - 1 + 4) % 4) + 1}
                </button>
              )}
            </div>
          </>
        ) : (
          // Desktop: Show all counters in their original positions
          <>
            <div 
              className={`counter ${hoveredCounter === 'wallet-management' ? 'interaction-zone' : ''}`} 
              id="wallet-management" 
            >
              <div className="sign-left">Wallet Mgmt</div>
            </div>
            
            <div 
              className={`counter ${hoveredCounter === 'node-options' ? 'interaction-zone' : ''}`} 
              id="node-options" 
            >
              <div className="sign-right1">Node Options</div>
            </div>
            
            <div 
              className={`counter ${hoveredCounter === 'validate-address' ? 'interaction-zone' : ''}`} 
              id="validate-address" 
            >
              <div className="sign-right">Validate Addr</div>
            </div>
            
            <div 
              className={`counter ${hoveredCounter === 'send-transaction' ? 'interaction-zone' : ''}`} 
              id="send-transaction" 
            >
              <div className="sign-center">Send Tx</div>
            </div>
            
            {wallet && (
              <div 
                className={`counter ${hoveredCounter === 'download-wallet' ? 'interaction-zone' : ''}`} 
                id="download-wallet" 
              >
                <div className="sign-left">Download Wallet</div>
              </div>
            )}
          </>
        )}
        
        {/* HUD Elements */}
        <div id="hud">
          <div id="balance-hud">Balance: {balance !== null ? `${balance} WART` : 'Loading...'}</div>
        </div>
        
        {isMobile && (
          <div id="sector-hud">
            <span className="sector-label">SECTOR</span>
            <span className="sector-number">{currentRoom + 1}</span>
            <span className="sector-divider">/</span>
            <span className="sector-total">4</span>
          </div>
        )}
        
        {wallet?.address && (
          <div id="address-hud" onClick={handleCopyAddress}>
            {copied ? 'Copied!' : `Address: ${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}`}
          </div>
        )}
      </div>
    </>
  );
};

export default GameInterface;