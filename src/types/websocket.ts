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
  | 'notification'   // General notifications
  | 'battlearua_event' // BattleAura ESP32 events
  | 'device_register' // ESP32 device registration
  | 'device_status'; // ESP32 device status updates

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

// BattleAura ESP32 Integration Types
export interface BattleAuraDevice {
  id: string;              // MAC address or unique identifier
  name: string;            // "BattleAura-A1B2C3"
  ipAddress?: string;      // Local IP for discovery
  status: 'online' | 'offline' | 'connecting' | 'discovered';
  lastSeen: Date;
  unitId?: string;         // Assigned BattleSync unit ID
  capabilities: {
    ledCount: number;
    hasAudio: boolean;
    hasTiltSensor: boolean;
    batteryLevel?: number;
    firmwareVersion: string;
  };
}

export interface BattleAuraEvent {
  type: 'UNIT_SHOOTING' | 'UNIT_DAMAGE' | 'UNIT_ACTIVATION' | 'UNIT_MOVEMENT';
  battleId: string;
  unitId: string;
  timestamp: string;
  
  // BattleAura-specific effect data
  battleAura?: {
    deviceId?: string;
    effect: 'WEAPON_FIRE' | 'DAMAGE_TAKEN' | 'ACTIVATION' | 'MOVEMENT' | 'DESTROYED';
    weaponName?: string;
    intensity?: number;     // 1-10 scale
    duration?: number;      // Effect duration in ms
    color?: string;         // LED color code
  };
}

export interface DeviceRegistration {
  deviceId: string;
  name: string;
  capabilities: BattleAuraDevice['capabilities'];
  serverAddress: string;   // Server the device is connecting to
}

export interface DeviceStatusUpdate {
  deviceId: string;
  status: BattleAuraDevice['status'];
  batteryLevel?: number;
  lastActivity: string;
}