import { DEFI_TESTNET_URL } from './presetNodes.js';

/** Production co-op relay — proxied by nginx on the defitestnet VPS. */
export const PRODUCTION_COOP_WS_URL = `${DEFI_TESTNET_URL.replace(/^http/, 'ws')}/coop/ws`;