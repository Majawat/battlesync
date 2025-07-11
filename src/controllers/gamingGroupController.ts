import { Request, Response } from 'express';
import { GamingGroupService } from '../services/gamingGroupService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class GamingGroupController {
  // Create a new gaming group
  static async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupData = await GamingGroupService.createGroup(userId, req.body);
      
      logger.info('Gaming group created', { groupId: groupData.id, userId });
      
      res.status(201).json({
        status: 'success',
        data: groupData,
        message: 'Gaming group created successfully'
      });
    } catch (error: any) {
      logger.error('Gaming group creation failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to create gaming group'
      });
    }
  }

  // Join an existing gaming group
  static async joinGroup(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupData = await GamingGroupService.joinGroup(userId, req.body);
      
      logger.info('User joined gaming group', { groupId: groupData.id, userId });
      
      res.json({
        status: 'success',
        data: groupData,
        message: 'Successfully joined gaming group'
      });
    } catch (error: any) {
      logger.error('Join gaming group failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to join gaming group'
      });
    }
  }

  // Get all gaming groups for the current user
  static async getUserGroups(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groups = await GamingGroupService.getUserGroups(userId);
      
      res.json({
        status: 'success',
        data: groups
      });
    } catch (error: any) {
      logger.error('Get user groups failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch gaming groups'
      });
    }
  }

  // Get a specific gaming group by ID
  static async getGroupById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.id;
      
      const group = await GamingGroupService.getGroupById(groupId, userId);
      
      res.json({
        status: 'success',
        data: group
      });
    } catch (error: any) {
      logger.error('Get group by ID failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id, groupId: req.params.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch gaming group'
      });
    }
  }

  // Update a gaming group
  static async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.id;
      
      const updatedGroup = await GamingGroupService.updateGroup(groupId, userId, req.body);
      
      logger.info('Gaming group updated', { groupId, userId });
      
      res.json({
        status: 'success',
        data: updatedGroup,
        message: 'Gaming group updated successfully'
      });
    } catch (error: any) {
      logger.error('Update gaming group failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id, groupId: req.params.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to update gaming group'
      });
    }
  }

  // Leave a gaming group
  static async leaveGroup(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.id;
      
      await GamingGroupService.leaveGroup(groupId, userId);
      
      logger.info('User left gaming group', { groupId, userId });
      
      res.json({
        status: 'success',
        message: 'Successfully left gaming group'
      });
    } catch (error: any) {
      logger.error('Leave gaming group failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id, groupId: req.params.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to leave gaming group'
      });
    }
  }

  // Delete a gaming group (owner only)
  static async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.id;
      
      await GamingGroupService.deleteGroup(groupId, userId);
      
      logger.info('Gaming group deleted', { groupId, userId });
      
      res.json({
        status: 'success',
        message: 'Gaming group deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete gaming group failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id, groupId: req.params.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to delete gaming group'
      });
    }
  }

  // Regenerate invite code (owner only)
  static async regenerateInviteCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.id;
      
      const newInviteCode = await GamingGroupService.regenerateInviteCode(groupId, userId);
      
      logger.info('Gaming group invite code regenerated', { groupId, userId });
      
      res.json({
        status: 'success',
        data: { inviteCode: newInviteCode },
        message: 'Invite code regenerated successfully'
      });
    } catch (error: any) {
      logger.error('Regenerate invite code failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id, groupId: req.params.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to regenerate invite code'
      });
    }
  }
}