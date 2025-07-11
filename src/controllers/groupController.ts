import { Request, Response } from 'express';
import { GroupMembershipService, UpdateGroupMemberRequest } from '../services/groupMembershipService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { ValidationUtils } from '../utils/validation';

export class GroupController {
  // ============= GROUP MEMBERSHIP MANAGEMENT =============

  // Get all members of a gaming group
  static async getGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.groupId;
      
      const members = await GroupMembershipService.getGroupMembers(groupId, userId);
      
      res.json({
        status: 'success',
        data: members
      });
    } catch (error: any) {
      logger.error('Get group members failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch group members'
      });
    }
  }

  // Invite a user to the group by username
  static async inviteUserToGroup(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.groupId;
      const { username, role = 'MEMBER' } = req.body;
      
      if (!username) {
        throw ValidationUtils.createError('Username is required', 400);
      }

      const newMember = await GroupMembershipService.inviteMemberToGroup(
        groupId,
        userId,
        { username, role }
      );
      
      logger.info('User invited to group', { groupId, invitedUser: username, invitedBy: userId });
      
      res.status(201).json({
        status: 'success',
        data: newMember,
        message: 'User invited successfully'
      });
    } catch (error: any) {
      logger.error('Invite user to group failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to invite user to group'
      });
    }
  }

  // Accept a group invitation
  static async acceptGroupInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.groupId;
      
      await GroupMembershipService.acceptGroupInvitation(groupId, userId);
      
      logger.info('Group invitation accepted', { groupId, userId });
      
      res.json({
        status: 'success',
        message: 'Group invitation accepted successfully'
      });
    } catch (error: any) {
      logger.error('Accept group invitation failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to accept group invitation'
      });
    }
  }

  // Update a group member's role or status
  static async updateGroupMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.groupId;
      const membershipId = req.params.membershipId;
      const updateData = req.body;
      
      const updatedMember = await GroupMembershipService.updateGroupMember(
        groupId,
        membershipId,
        userId,
        updateData as UpdateGroupMemberRequest
      );
      
      logger.info('Group member updated', { groupId, membershipId, updatedBy: userId });
      
      res.json({
        status: 'success',
        data: updatedMember,
        message: 'Member updated successfully'
      });
    } catch (error: any) {
      logger.error('Update group member failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to update member'
      });
    }
  }

  // Remove a member from the group
  static async removeGroupMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.groupId;
      const membershipId = req.params.membershipId;
      
      await GroupMembershipService.removeGroupMember(groupId, membershipId, userId);
      
      logger.info('Group member removed', { groupId, membershipId, removedBy: userId });
      
      res.json({
        status: 'success',
        message: 'Member removed successfully'
      });
    } catch (error: any) {
      logger.error('Remove group member failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to remove member'
      });
    }
  }

  // Get pending invitations for the current user
  static async getPendingInvitations(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      
      const invitations = await GroupMembershipService.getPendingInvitations(userId);
      
      res.json({
        status: 'success',
        data: invitations
      });
    } catch (error: any) {
      logger.error('Get pending invitations failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch pending invitations'
      });
    }
  }

  // Decline a group invitation
  static async declineGroupInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.groupId;
      
      await GroupMembershipService.declineGroupInvitation(groupId, userId);
      
      logger.info('Group invitation declined', { groupId, userId });
      
      res.json({
        status: 'success',
        message: 'Group invitation declined'
      });
    } catch (error: any) {
      logger.error('Decline group invitation failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to decline group invitation'
      });
    }
  }
}