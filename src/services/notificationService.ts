import { getWebSocketManager } from './websocket';
import { NotificationData } from '../types/websocket';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class NotificationService {
  static async sendToUser(userId: string, notification: Omit<NotificationData, 'id' | 'targetUsers'>): Promise<void> {
    const wsManager = getWebSocketManager();
    if (!wsManager) {
      logger.warn('WebSocket manager not available for notification');
      return;
    }

    const fullNotification: NotificationData = {
      id: uuidv4(),
      targetUsers: [userId],
      ...notification,
    };

    wsManager.sendNotification(fullNotification);
    logger.debug(`Notification sent to user ${userId}: ${notification.title}`);
  }

  static async sendToRoom(roomId: string, notification: Omit<NotificationData, 'id' | 'targetRooms'>): Promise<void> {
    const wsManager = getWebSocketManager();
    if (!wsManager) {
      logger.warn('WebSocket manager not available for notification');
      return;
    }

    const fullNotification: NotificationData = {
      id: uuidv4(),
      targetRooms: [roomId],
      ...notification,
    };

    wsManager.sendNotification(fullNotification);
    logger.debug(`Notification sent to room ${roomId}: ${notification.title}`);
  }

  static async sendToGroup(groupId: string, notification: Omit<NotificationData, 'id' | 'targetRooms'>): Promise<void> {
    await this.sendToRoom(`group:${groupId}`, notification);
  }

  static async sendToCampaign(campaignId: string, notification: Omit<NotificationData, 'id' | 'targetRooms'>): Promise<void> {
    await this.sendToRoom(`campaign:${campaignId}`, notification);
  }

  static async sendToBattle(battleId: string, notification: Omit<NotificationData, 'id' | 'targetRooms'>): Promise<void> {
    await this.sendToRoom(`battle:${battleId}`, notification);
  }

  // Convenience methods for common notification types
  static async notifyGroupUpdate(groupId: string, action: string, details: any): Promise<void> {
    await this.sendToGroup(groupId, {
      type: 'info',
      title: 'Group Updated',
      message: `Gaming group ${action}`,
      persistent: false,
    });
  }

  static async notifyCampaignUpdate(campaignId: string, action: string, details: any): Promise<void> {
    await this.sendToCampaign(campaignId, {
      type: 'info',
      title: 'Campaign Updated',
      message: `Campaign ${action}`,
      persistent: false,
    });
  }

  static async notifyMissionUpdate(campaignId: string, action: string, missionTitle: string): Promise<void> {
    await this.sendToCampaign(campaignId, {
      type: 'info',
      title: 'Mission Updated',
      message: `Mission "${missionTitle}" ${action}`,
      persistent: false,
    });
  }

  static async notifyUserJoinedGroup(groupId: string, username: string): Promise<void> {
    await this.sendToGroup(groupId, {
      type: 'success',
      title: 'New Member',
      message: `${username} joined the gaming group`,
      persistent: false,
    });
  }

  static async notifyUserJoinedCampaign(campaignId: string, username: string): Promise<void> {
    await this.sendToCampaign(campaignId, {
      type: 'success',
      title: 'New Campaign Member',
      message: `${username} joined the campaign`,
      persistent: false,
    });
  }

  static async notifyBattleStateChange(battleId: string, newState: string, details?: any): Promise<void> {
    await this.sendToBattle(battleId, {
      type: 'info',
      title: 'Battle Update',
      message: `Battle is now ${newState}`,
      persistent: false,
    });
  }

  static async notifyError(userId: string, title: string, message: string): Promise<void> {
    await this.sendToUser(userId, {
      type: 'error',
      title,
      message,
      persistent: true,
      expiresAt: new Date(Date.now() + 10000), // 10 seconds
    });
  }

  static async notifySuccess(userId: string, title: string, message: string): Promise<void> {
    await this.sendToUser(userId, {
      type: 'success',
      title,
      message,
      persistent: false,
    });
  }

  // Check if user is online
  static isUserOnline(userId: string): boolean {
    const wsManager = getWebSocketManager();
    return wsManager ? wsManager.isUserOnline(userId) : false;
  }

  // Get online users
  static getOnlineUsers(): string[] {
    const wsManager = getWebSocketManager();
    return wsManager ? wsManager.getOnlineUsers() : [];
  }

  // Get room participants
  static getRoomParticipants(roomId: string): string[] {
    const wsManager = getWebSocketManager();
    return wsManager ? wsManager.getRoomParticipants(roomId) : [];
  }
}