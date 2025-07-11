import { WebSocketServer } from 'ws';
import { WebSocketManager } from './websocketManager';

let wsManager: WebSocketManager | null = null;

export const setupWebSocket = (wss: WebSocketServer): WebSocketManager => {
  wsManager = new WebSocketManager(wss);
  return wsManager;
};

export const getWebSocketManager = (): WebSocketManager | null => {
  return wsManager;
};