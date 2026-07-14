import { useCallback, useEffect, useRef, useState } from 'react';
import { CoopClient } from '../utils/coopClient.js';

const STATE_SYNC_INTERVAL_MS = 66;

export function useCoopSession({ name, address }) {
  const clientRef = useRef(null);
  const lastSentRef = useRef(0);
  const pendingStateRef = useRef(null);
  const isInRoomRef = useRef(false);

  const [status, setStatus] = useState('idle');
  const [roomCode, setRoomCode] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [partner, setPartner] = useState(null);
  const [error, setError] = useState(null);
  const [isInRoom, setIsInRoom] = useState(false);

  const playerMeta = {
    name: name || 'Pilot',
    address: address || '',
  };

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'room_created':
        setRoomCode(msg.code);
        setPlayerId(msg.player?.id ?? null);
        isInRoomRef.current = true;
        setIsInRoom(true);
        setError(null);
        setStatus('in_room');
        break;
      case 'joined':
        setRoomCode(msg.code);
        setPlayerId(msg.player?.id ?? null);
        isInRoomRef.current = true;
        setIsInRoom(true);
        setError(null);
        setStatus('in_room');
        if (Array.isArray(msg.players)) {
          const remote = msg.players.find((p) => p.id !== msg.player?.id);
          if (remote) setPartner(remote);
        }
        break;
      case 'partner_joined':
        setPartner(msg.player ?? null);
        break;
      case 'partner_state':
        setPartner(msg.player ?? null);
        break;
      case 'partner_left':
        setPartner(null);
        break;
      case 'error':
        setError(msg.error || 'Co-op error');
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    const client = new CoopClient({
      onMessage: handleMessage,
      onStatus: (nextStatus, detail) => {
        if (nextStatus === 'error') {
          setError(detail || 'Connection error');
        } else if (nextStatus === 'disconnected' && isInRoomRef.current) {
          setStatus('disconnected');
        } else if (!isInRoomRef.current) {
          setStatus(nextStatus);
        }
      },
    });
    clientRef.current = client;

    return () => {
      client.leave();
      client.disconnect();
      clientRef.current = null;
    };
  }, [handleMessage]);

  const createRoom = useCallback(() => {
    setError(null);
    setPartner(null);
    clientRef.current?.createRoom(playerMeta);
  }, [playerMeta.name, playerMeta.address]);

  const joinRoom = useCallback((code) => {
    if (!code?.trim()) {
      setError('Enter a room code');
      return;
    }
    setError(null);
    setPartner(null);
    clientRef.current?.joinRoom(code, playerMeta);
  }, [playerMeta.name, playerMeta.address]);

  const leaveRoom = useCallback(() => {
    clientRef.current?.leave();
    isInRoomRef.current = false;
    setRoomCode(null);
    setPlayerId(null);
    setPartner(null);
    setIsInRoom(false);
    setStatus('idle');
    setError(null);
  }, []);

  const publishState = useCallback((state) => {
    if (!isInRoomRef.current || !clientRef.current) return;
    pendingStateRef.current = {
      x: state.x,
      y: state.y,
      room: state.room,
      screen: state.screen,
      boosting: Boolean(state.boosting),
    };

    const now = Date.now();
    if (now - lastSentRef.current < STATE_SYNC_INTERVAL_MS) return;
    lastSentRef.current = now;
    clientRef.current.sendState(pendingStateRef.current);
  }, []);

  return {
    status,
    roomCode,
    playerId,
    partner,
    error,
    isInRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    publishState,
  };
}