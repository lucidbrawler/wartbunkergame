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
  const [copied, setCopied] = useState(false);
  const [hoveredCounter, setHoveredCounter] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
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
        const centerX = joystickRadius + 40;
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

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      if (!playerRef.current || !gameContainerRef.current) {
        requestAnimationFrame(gameLoop);
        return;
      }

      const container = gameContainerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const speed = isMobile ? 2 : 1.05;

      if (!isMobile) {
        if (keys.current['a'] || keys.current['arrowleft']) positionRef.current.x -= speed;
        if (keys.current['d'] || keys.current['arrowright']) positionRef.current.x += speed;
        if (keys.current['w'] || keys.current['arrowup']) positionRef.current.y -= speed;
        if (keys.current['s'] || keys.current['arrowdown']) positionRef.current.y += speed;
      } else {
        positionRef.current.x += speed * joystickVector.x;
        positionRef.current.y += speed * joystickVector.y;
      }

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

      requestAnimationFrame(gameLoop);
    };
    gameLoop();
  }, [isMobile, currentRoom, joystickVector]);

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
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
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

      if (x > rect.width / 2) {
        // Right side: interact
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
      e.preventDefault();
      if (!joystickActive) return;

      const touch = e.touches[0];
      const rect = gameContainerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      let deltaX = x - joystickCenter.x;
      let deltaY = y - joystickCenter.y;
      const magnitude = Math.sqrt(deltaX ** 2 + deltaY ** 2);

      if (magnitude > joystickRadius) {
        deltaX = (deltaX / magnitude) * joystickRadius;
        deltaY = (deltaY / magnitude) * joystickRadius;
      }

      setThumbPos({ x: joystickCenter.x + deltaX, y: joystickCenter.y + deltaY });
      setJoystickVector({ x: deltaX / joystickRadius, y: deltaY / joystickRadius });
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      setJoystickActive(false);
      setJoystickVector({ x: 0, y: 0 });
      setThumbPos({ x: joystickCenter.x, y: joystickCenter.y });
    };

    const container = gameContainerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart);
      container.addEventListener('touchmove', handleTouchMove);
      container.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isMobile, joystickActive, joystickCenter]);

  const checkInteractionZone = () => {
    if (!playerRef.current) return;
    
    const playerRect = playerRef.current.getBoundingClientRect();
    const counterElements = document.querySelectorAll('.counter');
    let newHoveredCounter = null;
    
    counterElements.forEach((counter) => {
      const counterRect = counter.getBoundingClientRect();
      const interactionDistance = counter.id === 'wallet-management' ? 140 : 100;
      
      if (
        Math.abs(playerRect.left - counterRect.left) < interactionDistance &&
        Math.abs(playerRect.top - counterRect.top) < interactionDistance
      ) {
        newHoveredCounter = counter.id;
      }
    });
    
    setHoveredCounter(newHoveredCounter);
  };

  const checkInteraction = () => {
    if (!playerRef.current) return;
    
    const playerRect = playerRef.current.getBoundingClientRect();
    const counterElements = document.querySelectorAll('.counter');
    
    counterElements.forEach((counter) => {
      const counterRect = counter.getBoundingClientRect();
      const interactionDistance = counter.id === 'wallet-management' ? 140 : 100;
      
      if (
        Math.abs(playerRect.left - counterRect.left) < interactionDistance &&
        Math.abs(playerRect.top - counterRect.top) < interactionDistance
      ) {
        if (counter.id === 'download-wallet') {
          onOpenDownloadWallet();
        } else {
          setCurrentModal(counter.id);
        }
      }
    });
  };

  const handleCopyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRoomNavigation = () => {
    const container = gameContainerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const margin = 80; // Much larger buffer zone - less sensitive

    // Check if player is at edge and should show transition buttons
    const nearLeftEdge = positionRef.current.x <= margin && currentRoom > 0;
    const nearRightEdge = positionRef.current.x >= containerWidth - margin - 40 && currentRoom < 3;
    const nearTopEdge = positionRef.current.y <= margin && currentRoom >= 2;
    const nearBottomEdge = positionRef.current.y >= containerHeight - margin - 40 && currentRoom < 2;

    setNearLeft(nearLeftEdge);
    setNearRight(nearRightEdge);
    setNearTop(nearTopEdge);
    setNearBottom(nearBottomEdge);
  };

  const changeRoom = (direction) => {
    const container = gameContainerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    switch (direction) {
      case 'left':
        if (currentRoom > 0) {
          setCurrentRoom(currentRoom - 1);
          positionRef.current.x = containerWidth - 100;
          positionRef.current.y = Math.min(positionRef.current.y, containerHeight - 40);
        }
        break;
      case 'right':
        if (currentRoom < 3) {
          setCurrentRoom(currentRoom + 1);
          positionRef.current.x = 100;
          positionRef.current.y = Math.min(positionRef.current.y, containerHeight - 40);
        }
        break;
      case 'up':
        if (currentRoom >= 2) {
          setCurrentRoom(currentRoom - 2);
          positionRef.current.y = containerHeight - 100;
          positionRef.current.x = Math.min(positionRef.current.x, containerWidth - 40);
        }
        break;
      case 'down':
        if (currentRoom < 2) {
          setCurrentRoom(currentRoom + 2);
          positionRef.current.y = 100;
          positionRef.current.x = Math.min(positionRef.current.x, containerWidth - 40);
        }
        break;
    }
    setNearLeft(false);
    setNearRight(false);
    setNearTop(false);
    setNearBottom(false);
  };

  const handleMobileButtonClick = (action) => {
    switch (action) {
      case 'interact':
        checkInteraction();
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
              Touch and drag to move, use E to interact
              <button 
                className="mobile-control-toggle"
                onClick={() => setShowMobileControls(!showMobileControls)}
              >
                {showMobileControls ? 'Hide' : 'Show'} Controls
              </button>
            </>
          ) : (
            <>
              Use WASD or Arrow Keys to move, E or Enter to interact and R to change sectors.
            </>
          )}
        </div>
      </div>

      {/* Mobile Controls */}
      {isMobile && showMobileControls && (
        <div className="mobile-controls">
          <button 
            className="control-btn interact-btn"
            onTouchStart={() => handleMobileButtonClick('interact')}
            onMouseDown={() => handleMobileButtonClick('interact')}
          >
            E
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
        {isMobile && showMobileControls && joystickActive && (
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
                  ← Sector {currentRoom}
                </button>
              )}
              {nearRight && (
                <button className="transition-btn right-btn" onClick={() => changeRoom('right')}>
                  Sector {currentRoom + 2} →
                </button>
              )}
              {nearBottom && (
                <button className="transition-btn bottom-btn" onClick={() => changeRoom('down')}>
                  ↓ Sector {currentRoom + 3}
                </button>
              )}
              {nearTop && (
                <button className="transition-btn top-btn" onClick={() => changeRoom('up')}>
                  ↑ Sector {currentRoom - 1}
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