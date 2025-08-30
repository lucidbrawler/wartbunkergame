// GameInterface.jsx
import React, { useRef, useEffect, useState } from 'react';
import fortress from '../images/wartbunker.svg';
import bunkersendtx from '../images/bunkersendtx.png';
import nodetower from '../images/nodetower.png';
import validatealter from '../images/validateaddress.svg';

const GameInterface = ({ currentModal, setCurrentModal, wallet, balance, onOpenDownloadWallet }) => {
  const keys = useRef({});
  const playerRef = useRef(null);
  const gameContainerRef = useRef(null);
  const positionRef = useRef({ x: 380, y: 280 });
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
        <style>{`
          .game-instructions {
            text-align: center;
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(26, 26, 46, 0.9);
            border: 2px solid #FFC107;
            border-radius: 8px;
            backdrop-filter: blur(10px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }
          
          .instruction-text {
            color: #FFC107;
            font-size: 16px;
            font-weight: bold;
            font-family: 'Montserrat', sans-serif;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
          }



          .mobile-control-toggle {
            background: rgba(255, 193, 7, 0.2);
            border: 1px solid #FFC107;
            color: #FFC107;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
          }

          .mobile-controls {
            position: fixed;
            bottom: 30px;
            right: 20px;
            transform: none;
            left: auto;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .control-btn {
            width: 50px;
            height: 50px;
            background: rgba(26, 26, 46, 0.9);
            border: 2px solid #FFC107;
            color: #FFC107;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            user-select: none;
            touch-action: manipulation;
          }

          .control-btn:active {
            transform: scale(0.95);
            background: rgba(255, 193, 7, 0.2);
          }

          .interact-btn {
            width: 60px;
            height: 60px;
            font-size: 18px;
          }

          .joystick-base {
            position: absolute;
            width: ${joystickRadius * 2}px;
            height: ${joystickRadius * 2}px;
            border-radius: 50%;
            background: rgba(255, 193, 7, 0.3);
            z-index: 999;
            pointer-events: none;
          }

          .joystick-thumb {
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #FFC107;
            transform: translate(-20px, -20px);
            z-index: 999;
            pointer-events: none;
          }


          
          #game-container {
            position: relative;
            width: 100%;
            max-width: 1200px;
            height: 65vh;
            min-height: 500px;
            max-height: 700px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            background-image: 
              radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
            border: 3px solid #FFC107;
            border-radius: 8px;
            margin: 0 auto;
            overflow: hidden;
            box-shadow: 
              0 0 20px rgba(255, 193, 7, 0.3),
              inset 0 0 50px rgba(0, 0, 0, 0.5);
          }

          @media (max-width: 768px) {
            #game-container {
              height: 60vh;
              min-height: 450px;
              max-height: 600px;
              margin: 0 10px;
            }

            .game-instructions {
              margin: 0 10px 20px 10px;
            }

            .instruction-text {
              flex-direction: column;
              gap: 15px;
            }
          }

          @media (max-width: 480px) {
          
            .mobile-controls {
              bottom: 10px;
              gap: 5px;
            }

            .control-btn {
              width: 40px;
              height: 40px;
              font-size: 16px;
            }

            .interact-btn {
              width: 50px;
              height: 50px;
              font-size: 14px;
            }


            .left-btn {
              left: 10px;
            }

            .right-btn {
              right: 10px;
            }

            .top-btn {
              top: 10px;
            }

            .bottom-btn {
              bottom: 10px;
            }

            .hint {
              padding: 2px 4px;
              font-size: 10px;
            }

            .left-hint {
              left: 10px;
            }

            .right-hint {
              right: 10px;
            }

            .top-hint {
              top: 10px;
            }

            .bottom-hint {
              bottom: 10px;
            }

            .instruction-text {
              font-size: 14px;
            }

            .mobile-control-toggle {
              padding: 6px 12px;
              font-size: 12px;
            }
          }

          @media (min-width: 1200px) {
            #game-container {
              height: 70vh;
              max-height: 800px;
            }
          }
          
          #player {
            position: absolute;
            width: 40px;
            height: 40px;
            color: #fff;
            text-align: center;
            line-height: 40px;
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 5px;
            box-sizing: border-box;
            background-image: url('https://pbs.twimg.com/profile_images/1739991331252879360/HM1JGzf8.jpg');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            background-color: transparent;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(255, 193, 7, 0.8);
            transition: all 0.2s ease;
            z-index: 10;
          }
          
          #player:hover {
            transform: scale(1.1);
            box-shadow: 0 0 15px rgba(255, 193, 7, 1);
          }
          
          .counter {
            position: absolute;
            width: 60px;
            height: 60px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
          }
          
          .counter::before {
            content: '';
            position: absolute;
            top: -15px;
            left: -15px;
            right: -15px;
            bottom: -15px;
            background: rgba(120, 119, 198, 0.08);
            border-radius: 50%;
            backdrop-filter: blur(20px);
            z-index: -1;
            transition: all 0.3s ease;
          }
          
          .counter:hover::before,
          .counter.interaction-zone::before {
            background: rgba(120, 119, 198, 0.15);
            transform: scale(1.1);
          }
          
          .counter:hover,
          .counter.interaction-zone {
            transform: scale(1.05);
            filter: brightness(1.1);
          }
          
          .counter.interaction-zone {
            animation: ambient-pulse 3s infinite;
          }
          
          @keyframes ambient-pulse {
            0%, 100% { 
              box-shadow: 0 0 15px rgba(120, 119, 198, 0.2);
            }
            50% { 
              box-shadow: 0 0 25px rgba(120, 119, 198, 0.4);
            }
          }
          
          #wallet-management {
            width: 250px;
            height: 120px;
            background-image: url(${fortress.src});
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            background-color: transparent;
            z-index: 5;
          }
          
          #send-transaction {
            width: 120px;
            height: 120px;
            background-image: url(${bunkersendtx.src});
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            background-color: transparent;
            z-index: 5;
          }
          
          #node-options {
            width: 120px;
            height: 120px;
            background-image: url(${nodetower.src});
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            background-color: transparent;
            z-index: 5;
          }
          
          #validate-address {
            width: 120px;
            height: 120px;
            background-image: url(${validatealter.src});
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            background-color: transparent;
            z-index: 5;
          }
          
          .sign-right {
            position: absolute;
            left: 75px;
            top: 50%;
            transform: translateY(-50%);
            background-color: rgba(255, 193, 7, 0.9);
            color: #1a1a2e;
            padding: 4px 8px;
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 4px;
            white-space: nowrap;
            font-size: 12px;
            font-weight: bold;
            z-index: 15;
            backdrop-filter: blur(5px);
          }
          
          .sign-right1 {
            position: absolute;
            left: 95px;
            top: 50%;
            transform: translateY(-50%);
            background-color: rgba(255, 193, 7, 0.9);
            color: #1a1a2e;
            padding: 4px 8px;
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 4px;
            white-space: nowrap;
            font-size: 12px;
            font-weight: bold;
            z-index: 15;
            backdrop-filter: blur(5px);
          }
          
          .sign-left {
            position: absolute;
            right: 100%;
            margin-right: 5px;
            top: 50%;
            transform: translateY(-50%);
            background-color: rgba(255, 193, 7, 0.9);
            color: #1a1a2e;
            padding: 4px 8px;
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 4px;
            white-space: nowrap;
            font-size: 12px;
            font-weight: bold;
            z-index: 15;
            backdrop-filter: blur(5px);
          }

          .sign-center {
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(255, 193, 7, 0.9);
            color: #1a1a2e;
            padding: 4px 8px;
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 4px;
            white-space: nowrap;
            font-size: 12px;
            font-weight: bold;
            z-index: 15;
            backdrop-filter: blur(5px);
          }

          /* Sector Navigation Hints */
          .sector-hints {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 5;
          }

          .hint {
            position: absolute;
            background-color: rgba(255, 193, 7, 0.3);
            color: rgba(255, 193, 7, 0.8);
            padding: 3px 6px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            backdrop-filter: blur(5px);
            animation: hint-pulse 3s infinite;
            opacity: 0.6;
          }

          .left-hint {
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
          }

          .right-hint {
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
          }

          .top-hint {
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
          }

          .bottom-hint {
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
          }

          @keyframes hint-pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.8; }
          }

          /* Sector Transition Buttons */
          .sector-transitions {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 10;
          }

          .transition-btn {
          max-width: 120px;
            position: absolute;
            background-color: rgba(255, 193, 7, 0.9);
            color: #1a1a2e;
            border: 2px solid rgba(255, 193, 7, 0.5);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            pointer-events: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            white-space: nowrap;
          }

          .transition-btn:hover {
            background-color: rgba(255, 193, 7, 1);
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
          }

          .left-btn {
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
          }

          .right-btn {
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
          }

          .top-btn {
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
          }

          .bottom-btn {
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
          }

          /* Mobile-specific counter positioning */
          @media (max-width: 768px) {
            .counter {
              width: 120px;
              height: 120px;
            }
          }
          
          #hud {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(26, 26, 46, 0.9);
            color: #FFC107;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #FFC107;
            font-family: 'Montserrat', sans-serif;
            font-size: 14px;
            z-index: 20;
            backdrop-filter: blur(10px);
          }
          
          #address-hud {
            position: absolute;
            top: 50px;
            right: 10px;
            background: rgba(26, 26, 46, 0.9);
            color: #FFC107;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #FFC107;
            font-family: 'Montserrat', sans-serif;
            font-size: 14px;
            cursor: pointer;
            z-index: 20;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
          }
          
          #address-hud:hover {
            background: rgba(26, 26, 46, 0.95);
            transform: scale(1.05);
          }

          #sector-hud {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(26, 26, 46, 0.95);
            color: #FFC107;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255, 193, 7, 0.6);
            font-family: 'Courier New', monospace;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            z-index: 20;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 4px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          }

          .sector-label {
            color: rgba(255, 193, 7, 0.7);
            font-size: 9px;
            letter-spacing: 1px;
          }

          .sector-number {
            color: #FFC107;
            font-size: 14px;
            font-weight: 900;
            text-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
          }

          .sector-divider {
            color: rgba(255, 193, 7, 0.6);
            font-size: 10px;
          }

          .sector-total {
            color: rgba(255, 193, 7, 0.6);
            font-size: 10px;
          }
          
          .modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(66, 63, 63, 0.95);
            padding: 20px;
            border: 2px solid #FFC107;
            border-radius: 8px;
            z-index: 1000;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            backdrop-filter: blur(10px);
          }


          
          .form-group { 
            margin-bottom: 10px; 
          }
          
          .input { 
            width: 100%; 
            padding: 5px; 
          }
          
          .error { 
            color: #ff6b6b; 
          }
          
          .result { 
            background: #2d3748; 
            padding: 10px; 
            border-radius: 4px;
            border: 1px solid #4a5568;
          }
          
          .warning { 
            color: #f6ad55; 
          }
          
          .background-elements {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
          }
          
          .star {
            position: absolute;
            width: 4px;
            height: 4px;
            background: #FFC107;
            border-radius: 50%;
            animation: twinkle 3s infinite ease-in-out;
            opacity: 0.7;
          }
          
          .star:nth-child(odd) {
            animation-delay: 1.5s;
          }
          
          .star:nth-child(3n) {
            animation-delay: 0.5s;
          }
          
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
        
        {/* Game Background Elements */}
        <div className="background-elements">
          <div className="star" style={{ left: '50px', top: '100px' }}></div>
          <div className="star" style={{ left: '150px', top: '200px' }}></div>
          <div className="star" style={{ left: '250px', top: '150px' }}></div>
          <div className="star" style={{ left: '350px', top: '300px' }}></div>
          <div className="star" style={{ left: '450px', top: '100px' }}></div>
          <div className="star" style={{ left: '550px', top: '250px' }}></div>
          <div className="star" style={{ left: '650px', top: '180px' }}></div>
          <div className="star" style={{ left: '700px', top: '400px' }}></div>
          <div className="star" style={{ left: '100px', top: '450px' }}></div>
          <div className="star" style={{ left: '200px', top: '500px' }}></div>
          <div className="star" style={{ left: '400px', top: '450px' }}></div>
          <div className="star" style={{ left: '500px', top: '500px' }}></div>
          <div className="star" style={{ left: '600px', top: '450px' }}></div>
        </div>
        
        {/* Player */}
        <div id="player" ref={playerRef}></div>
        
        {/* Joystick visuals */}
        {isMobile && showMobileControls && (
          <>
            <div className="joystick-base" style={{ left: `${joystickCenter.x - joystickRadius}px`, top: `${joystickCenter.y - joystickRadius}px` }} />
            <div className="joystick-thumb" style={{ left: `${thumbPos.x}px`, top: `${thumbPos.y}px` }} />
          </>
        )}
        
                {/* Room-based Counter Display */}
        {isMobile ? (
          // Mobile: Show only current room's counter
          <>
            {currentRoom === 0 && (
              <div 
                className={`counter ${hoveredCounter === 'wallet-management' ? 'interaction-zone' : ''}`} 
                id="wallet-management" 
                style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="sign-center">Wallet Mgmt</div>
              </div>
            )}
            
            {currentRoom === 1 && (
              <div 
                className={`counter ${hoveredCounter === 'node-options' ? 'interaction-zone' : ''}`} 
                id="node-options" 
                style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="sign-center">Node Options</div>
              </div>
            )}
            
            {currentRoom === 2 && (
              <div 
                className={`counter ${hoveredCounter === 'validate-address' ? 'interaction-zone' : ''}`} 
                id="validate-address" 
                style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="sign-center">Validate Addr</div>
              </div>
            )}
            
            {currentRoom === 3 && (
              <div 
                className={`counter ${hoveredCounter === 'send-transaction' ? 'interaction-zone' : ''}`} 
                id="send-transaction" 
                style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
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
              style={{ left: '300px', bottom: '0px' }}
            >
              <div className="sign-left">Wallet Mgmt</div>
            </div>
            
            <div 
              className={`counter ${hoveredCounter === 'node-options' ? 'interaction-zone' : ''}`} 
              id="node-options" 
              style={{ left: '350px', top: '10px' }}
            >
              <div className="sign-right1">Node Options</div>
            </div>
            
            <div 
              className={`counter ${hoveredCounter === 'validate-address' ? 'interaction-zone' : ''}`} 
              id="validate-address" 
              style={{ left: '20px', top: '250px' }}
            >
              <div className="sign-right">Validate Addr</div>
            </div>
            
            <div 
              className={`counter ${hoveredCounter === 'send-transaction' ? 'interaction-zone' : ''}`} 
              id="send-transaction" 
              style={{ right: '10px', top: '250px' }}
            >
              <div className="sign-center">Send Tx</div>
            </div>
            
            {wallet && (
              <div 
                className={`counter ${hoveredCounter === 'download-wallet' ? 'interaction-zone' : ''}`} 
                id="download-wallet" 
                style={{ right: '10px', bottom: '0px' }}
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