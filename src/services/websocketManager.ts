import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { JWTUtils } from '../utils/jwt';
import { logger } from '../utils/logger';
import { 
  AuthenticatedWebSocket, 
  WebSocketMessage, 
  WebSocketResponse, 
  Room, 
  UserSession, 
  RoomType,
  NotificationData,
  WSMessageType
} from '../types/websocket';

export class WebSocketManager {
  private wss: WebSocketServer;
  private users: Map<string, UserSession> = new Map();
  private rooms: Map<string, Room> = new Map();
  private heartbeatInterval!: NodeJS.Timeout;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIP = req.socket.remoteAddress;
      const authWs = ws as AuthenticatedWebSocket;
      
      // Initialize WebSocket properties
      authWs.isAuthenticated = false;
      authWs.rooms = new Set();
      authWs.lastActivity = new Date();

      logger.info(`WebSocket client connected from ${clientIP}`);

      // Send welcome message
      this.sendMessage(authWs, {
        type: 'welcome',
        data: {
          message: 'Connected to BattleSync WebSocket server',
          serverTime: new Date().toISOString(),
          requiresAuth: true
        },
        timestamp: new Date().toISOString()
      });

      authWs.on('message', (message) => {
        this.handleMessage(authWs, message);
      });

      authWs.on('close', () => {
        this.handleDisconnection(authWs);
        logger.info(`WebSocket client disconnected from ${clientIP}`);
      });

      authWs.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.handleDisconnection(authWs);
      });

      authWs.on('pong', () => {
        authWs.lastActivity = new Date();
      });
    });

    logger.info('WebSocket server initialized with enhanced features');
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: any): void {
    try {
      const wsMessage: WebSocketMessage = JSON.parse(message.toString());
      const messageId = wsMessage.messageId || uuidv4();
      
      // Update last activity
      ws.lastActivity = new Date();

      // Handle different message types
      switch (wsMessage.type) {
        case 'auth':
          this.handleAuthentication(ws, wsMessage, messageId);
          break;
        case 'join_room':
          this.handleJoinRoom(ws, wsMessage, messageId);
          break;
        case 'leave_room':
          this.handleLeaveRoom(ws, wsMessage, messageId);
          break;
        case 'ping':
          this.handlePing(ws, messageId);
          break;
        case 'group_update':
        case 'campaign_update':
        case 'mission_update':
        case 'battle_update':
          this.handleRoomBroadcast(ws, wsMessage, messageId);
          break;
        default:
          this.sendError(ws, `Unknown message type: ${wsMessage.type}`, messageId);
      }
    } catch (error) {
      logger.error('Invalid WebSocket message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  private async handleAuthentication(ws: AuthenticatedWebSocket, message: WebSocketMessage, messageId: string): Promise<void> {
    try {
      const { token } = message.data;
      
      if (!token) {
        this.sendError(ws, 'Authentication token required', messageId);
        return;
      }

      // Verify JWT token
      const payload = JWTUtils.verifyToken(token);
      
      if (payload.type !== 'access') {
        this.sendError(ws, 'Invalid token type', messageId);
        return;
      }

      // Set WebSocket as authenticated
      ws.isAuthenticated = true;
      ws.userId = payload.userId;
      ws.username = payload.username;

      // Create or update user session
      const userSession: UserSession = {
        userId: payload.userId,
        username: payload.username,
        ws,
        rooms: new Set(),
        lastActivity: new Date(),
        isOnline: true
      };

      // Remove old session if exists
      const existingSession = this.users.get(payload.userId);
      if (existingSession && existingSession.ws !== ws) {
        this.handleDisconnection(existingSession.ws);
      }

      this.users.set(payload.userId, userSession);

      // Automatically join user's private room
      const userRoomId = `user:${payload.userId}`;
      this.createRoom(userRoomId, 'user', { userId: payload.userId });
      this.joinRoom(ws, userRoomId);

      this.sendMessage(ws, {
        type: 'auth',
        data: {
          success: true,
          userId: payload.userId,
          username: payload.username,
          userRoom: userRoomId
        },
        timestamp: new Date().toISOString(),
        messageId
      });

      // Notify about user coming online
      this.broadcastUserStatus(payload.userId, true);

      logger.info(`User ${payload.username} authenticated via WebSocket`);
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      this.sendError(ws, 'Authentication failed', messageId);
    }
  }

  private handleJoinRoom(ws: AuthenticatedWebSocket, message: WebSocketMessage, messageId: string): void {
    if (!this.isAuthenticated(ws)) {
      this.sendError(ws, 'Authentication required', messageId);
      return;
    }

    const { roomId, roomType, metadata } = message.data;
    
    if (!roomId || !roomType) {
      this.sendError(ws, 'Room ID and type required', messageId);
      return;
    }

    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.createRoom(roomId, roomType, metadata);
    }

    this.joinRoom(ws, roomId);

    this.sendMessage(ws, {
      type: 'join_room',
      data: {
        success: true,
        roomId,
        participantCount: this.rooms.get(roomId)?.participants.size || 0
      },
      timestamp: new Date().toISOString(),
      messageId
    });

    // Notify room about new participant
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      data: {
        userId: ws.userId,
        username: ws.username,
        roomId
      },
      timestamp: new Date().toISOString()
    }, ws.userId);

    logger.debug(`User ${ws.username} joined room ${roomId}`);
  }

  private handleLeaveRoom(ws: AuthenticatedWebSocket, message: WebSocketMessage, messageId: string): void {
    if (!this.isAuthenticated(ws)) {
      this.sendError(ws, 'Authentication required', messageId);
      return;
    }

    const { roomId } = message.data;
    
    if (!roomId) {
      this.sendError(ws, 'Room ID required', messageId);
      return;
    }

    this.leaveRoom(ws, roomId);

    this.sendMessage(ws, {
      type: 'leave_room',
      data: {
        success: true,
        roomId
      },
      timestamp: new Date().toISOString(),
      messageId
    });

    // Notify room about participant leaving
    this.broadcastToRoom(roomId, {
      type: 'user_left',
      data: {
        userId: ws.userId,
        username: ws.username,
        roomId
      },
      timestamp: new Date().toISOString()
    }, ws.userId);

    logger.debug(`User ${ws.username} left room ${roomId}`);
  }

  private handlePing(ws: AuthenticatedWebSocket, messageId: string): void {
    this.sendMessage(ws, {
      type: 'pong',
      data: { serverTime: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      messageId
    });
  }

  private handleRoomBroadcast(ws: AuthenticatedWebSocket, message: WebSocketMessage, messageId: string): void {
    if (!this.isAuthenticated(ws)) {
      this.sendError(ws, 'Authentication required', messageId);
      return;
    }

    if (!message.room) {
      this.sendError(ws, 'Room ID required for broadcast', messageId);
      return;
    }

    // Verify user is in the room
    if (!ws.rooms?.has(message.room)) {
      this.sendError(ws, 'You are not in this room', messageId);
      return;
    }

    // Broadcast to room
    this.broadcastToRoom(message.room, {
      type: message.type,
      data: {
        ...message.data,
        userId: ws.userId,
        username: ws.username
      },
      timestamp: new Date().toISOString()
    }, ws.userId);

    // Acknowledge to sender
    this.sendMessage(ws, {
      type: message.type,
      data: { success: true },
      timestamp: new Date().toISOString(),
      messageId
    });
  }

  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      // Leave all rooms
      ws.rooms?.forEach(roomId => {
        this.leaveRoom(ws, roomId);
      });

      // Remove user session
      this.users.delete(ws.userId);

      // Notify about user going offline
      this.broadcastUserStatus(ws.userId, false);

      logger.info(`User ${ws.username} disconnected from WebSocket`);
    }
  }

  private createRoom(roomId: string, type: RoomType, metadata?: any): void {
    const room: Room = {
      id: roomId,
      type,
      participants: new Set(),
      metadata,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.rooms.set(roomId, room);
    logger.debug(`Created room ${roomId} of type ${type}`);
  }

  private joinRoom(ws: AuthenticatedWebSocket, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && ws.userId) {
      room.participants.add(ws.userId);
      room.lastActivity = new Date();
      ws.rooms?.add(roomId);

      // Update user session
      const userSession = this.users.get(ws.userId);
      if (userSession) {
        userSession.rooms.add(roomId);
        userSession.lastActivity = new Date();
      }
    }
  }

  private leaveRoom(ws: AuthenticatedWebSocket, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && ws.userId) {
      room.participants.delete(ws.userId);
      room.lastActivity = new Date();
      ws.rooms?.delete(roomId);

      // Update user session
      const userSession = this.users.get(ws.userId);
      if (userSession) {
        userSession.rooms.delete(roomId);
        userSession.lastActivity = new Date();
      }

      // Clean up empty rooms (except user rooms)
      if (room.participants.size === 0 && room.type !== 'user') {
        this.rooms.delete(roomId);
        logger.debug(`Removed empty room ${roomId}`);
      }
    }
  }

  private broadcastToRoom(roomId: string, message: WebSocketResponse, excludeUserId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.forEach(userId => {
      if (userId !== excludeUserId) {
        const userSession = this.users.get(userId);
        if (userSession && userSession.isOnline) {
          this.sendMessage(userSession.ws, message);
        }
      }
    });
  }

  private broadcastUserStatus(userId: string, isOnline: boolean): void {
    const userSession = this.users.get(userId);
    if (!userSession) return;

    // Broadcast to all rooms the user is in
    userSession.rooms.forEach(roomId => {
      this.broadcastToRoom(roomId, {
        type: 'user_status',
        data: {
          userId,
          username: userSession.username,
          isOnline,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }, userId);
    });
  }

  private sendMessage(ws: AuthenticatedWebSocket, message: WebSocketResponse): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: AuthenticatedWebSocket, error: string, messageId?: string): void {
    this.sendMessage(ws, {
      type: 'error',
      error,
      success: false,
      timestamp: new Date().toISOString(),
      messageId
    });
  }

  private isAuthenticated(ws: AuthenticatedWebSocket): boolean {
    return ws.isAuthenticated === true && !!ws.userId;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 30000; // 30 seconds

      // Check for inactive connections
      this.users.forEach((session, userId) => {
        const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
        
        if (timeSinceActivity > timeout) {
          logger.debug(`Ping timeout for user ${session.username}`);
          session.ws.ping();
          
          // If still no response after another 10 seconds, disconnect
          setTimeout(() => {
            if (now.getTime() - session.lastActivity.getTime() > timeout + 10000) {
              logger.info(`Disconnecting inactive user ${session.username}`);
              session.ws.terminate();
              this.handleDisconnection(session.ws);
            }
          }, 10000);
        }
      });
    }, 25000); // Check every 25 seconds
  }

  // Public methods for external use
  public sendNotification(notification: NotificationData): void {
    const message: WebSocketResponse = {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    };

    if (notification.targetUsers) {
      // Send to specific users
      notification.targetUsers.forEach(userId => {
        const userSession = this.users.get(userId);
        if (userSession && userSession.isOnline) {
          this.sendMessage(userSession.ws, message);
        }
      });
    }

    if (notification.targetRooms) {
      // Send to specific rooms
      notification.targetRooms.forEach(roomId => {
        this.broadcastToRoom(roomId, message);
      });
    }
  }

  public getRoomParticipants(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.participants) : [];
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.users.keys());
  }

  public isUserOnline(userId: string): boolean {
    const session = this.users.get(userId);
    return session?.isOnline === true;
  }

  public getUserRooms(userId: string): string[] {
    const session = this.users.get(userId);
    return session ? Array.from(session.rooms) : [];
  }

  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  public broadcastToRoomPublic(roomId: string, message: WebSocketResponse, excludeUserId?: string): void {
    this.broadcastToRoom(roomId, message, excludeUserId);
  }

  public getConnectionCount(): number {
    return this.users.size;
  }
}