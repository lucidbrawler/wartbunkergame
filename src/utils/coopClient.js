import { PRODUCTION_COOP_WS_URL } from './coopConfig.js';

const LOCAL_WS_URL = 'ws://localhost:8765/ws';

export function getCoopWsUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_COOP_WS_URL) {
    return import.meta.env.PUBLIC_COOP_WS_URL;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return LOCAL_WS_URL;
    }
    return PRODUCTION_COOP_WS_URL;
  }

  return PRODUCTION_COOP_WS_URL;
}

export class CoopClient {
  constructor({ onMessage, onStatus }) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.ws = null;
    this.reconnectTimer = null;
    this.pendingAction = null;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;

    const url = getCoopWsUrl();
    this.onStatus?.('connecting');

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      this.onStatus?.('error', err.message);
      return;
    }

    this.ws.onopen = () => {
      this.onStatus?.('connected');
      if (this.pendingAction) {
        const action = this.pendingAction;
        this.pendingAction = null;
        action();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.onMessage?.(msg);
      } catch {
        // ignore malformed payloads
      }
    };

    this.ws.onclose = () => {
      this.onStatus?.('disconnected');
      this.ws = null;
    };

    this.ws.onerror = () => {
      this.onStatus?.('error', 'WebSocket connection failed');
    };
  }

  send(payload) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  runWhenOpen(callback) {
    this.connect();
    if (this.ws?.readyState === WebSocket.OPEN) {
      callback();
      return;
    }
    this.pendingAction = callback;
  }

  createRoom(playerMeta) {
    this.runWhenOpen(() => this.send({ type: 'create', player: playerMeta }));
  }

  joinRoom(code, playerMeta) {
    this.runWhenOpen(() =>
      this.send({ type: 'join', code: code.trim().toUpperCase(), player: playerMeta }),
    );
  }

  sendState(state) {
    this.send({ type: 'state', player: state });
  }

  leave() {
    this.send({ type: 'leave' });
    this.pendingAction = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.pendingAction = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}