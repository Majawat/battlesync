import { WebSocket } from 'ws';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAuthenticated?: boolean;
  rooms?: Set<string>;
  lastActivity?: Date;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  room?: string;
  timestamp?: string;
  messageId?: string;
}

export interface WebSocketResponse {
  type: string;
  data?: any;
  success?: boolean;
  error?: string;
  timestamp: string;
  messageId?: string;
}

// Message Types
export type WSMessageType = 
  | 'auth'           // Authentication
  | 'join_room'      // Join a room (group, campaign, battle)
  | 'leave_room'     // Leave a room
  | 'group_update'   // Gaming group updates
  | 'campaign_update' // Campaign updates
  | 'mission_update' // Mission updates
  | 'battle_update'  // Battle state updates
  | 'user_status'    // User online/offline status
  | 'ping'           // Heartbeat
  | 'pong'           // Heartbeat response
  | 'error'          // Error response
  | 'welcome'        // Welcome message
  | 'notification';  // General notifications

// Room Types
export type RoomType = 
  | 'group'          // Gaming group room
  | 'campaign'       // Campaign room
  | 'battle'         // Battle room
  | 'user';          // Private user room

export interface Room {
  id: string;
  type: RoomType;
  participants: Set<string>; // User IDs
  metadata?: {
    groupId?: string;
    campaignId?: string;
    battleId?: string;
    missionId?: string;
  };
  createdAt: Date;
  lastActivity: Date;
}

export interface UserSession {
  userId: string;
  username: string;
  ws: AuthenticatedWebSocket;
  rooms: Set<string>;
  lastActivity: Date;
  isOnline: boolean;
}

export interface BattleEvent {
  id: string;
  battleId: string;
  userId: string;
  eventType: string;
  data: any;
  timestamp: Date;
}

export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  targetUsers?: string[];
  targetRooms?: string[];
  persistent?: boolean;
  expiresAt?: Date;
}