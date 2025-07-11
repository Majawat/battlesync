import { Request, Response } from 'express';
import { CampaignService, InviteMemberRequest, UpdateMemberRequest } from '../services/campaignService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class CampaignController {
  // Get all campaigns for a user across all groups
  static async getUserCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      
      const campaigns = await CampaignService.getUserCampaigns(userId);
      
      res.json({
        status: 'success',
        data: campaigns
      });
    } catch (error: any) {
      logger.error('Get user campaigns failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch campaigns'
      });
    }
  }
  // Create a new campaign in a gaming group
  static async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.groupId;
      
      const campaignData = await CampaignService.createCampaign(groupId, userId, req.body);
      
      logger.info('Campaign created', { campaignId: campaignData.id, groupId, userId });
      
      res.status(201).json({
        status: 'success',
        data: campaignData,
        message: 'Campaign created successfully'
      });
    } catch (error: any) {
      logger.error('Campaign creation failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to create campaign'
      });
    }
  }

  // Join an existing campaign
  static async joinCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      const campaignData = await CampaignService.joinCampaign(campaignId, userId, req.body);
      
      logger.info('User joined campaign', { campaignId, userId });
      
      res.json({
        status: 'success',
        data: campaignData,
        message: 'Successfully joined campaign'
      });
    } catch (error: any) {
      logger.error('Join campaign failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to join campaign'
      });
    }
  }

  // Get all campaigns for a gaming group
  static async getGroupCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const groupId = req.params.groupId;
      
      const campaigns = await CampaignService.getGroupCampaigns(groupId, userId);
      
      res.json({
        status: 'success',
        data: campaigns
      });
    } catch (error: any) {
      logger.error('Get group campaigns failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch campaigns'
      });
    }
  }

  // Get a specific campaign by ID
  static async getCampaignById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      const campaign = await CampaignService.getCampaignById(campaignId, userId);
      
      res.json({
        status: 'success',
        data: campaign
      });
    } catch (error: any) {
      logger.error('Get campaign by ID failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch campaign'
      });
    }
  }

  // Update a campaign
  static async updateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      const updatedCampaign = await CampaignService.updateCampaign(campaignId, userId, req.body);
      
      logger.info('Campaign updated', { campaignId, userId });
      
      res.json({
        status: 'success',
        data: updatedCampaign,
        message: 'Campaign updated successfully'
      });
    } catch (error: any) {
      logger.error('Update campaign failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to update campaign'
      });
    }
  }

  // Leave a campaign
  static async leaveCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      await CampaignService.leaveCampaign(campaignId, userId);
      
      logger.info('User left campaign', { campaignId, userId });
      
      res.json({
        status: 'success',
        message: 'Successfully left campaign'
      });
    } catch (error: any) {
      logger.error('Leave campaign failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to leave campaign'
      });
    }
  }

  // Delete a campaign
  static async deleteCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      await CampaignService.deleteCampaign(campaignId, userId);
      
      logger.info('Campaign deleted', { campaignId, userId });
      
      res.json({
        status: 'success',
        message: 'Campaign deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete campaign failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to delete campaign'
      });
    }
  }

  // ============= MEMBERSHIP MANAGEMENT =============

  // Get campaign members
  static async getCampaignMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      const members = await CampaignService.getCampaignMembers(campaignId, userId);
      
      res.json({
        status: 'success',
        data: members
      });
    } catch (error: any) {
      logger.error('Get campaign members failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch campaign members'
      });
    }
  }

  // Invite member to campaign
  static async inviteMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      const inviteData: InviteMemberRequest = req.body;
      
      const newMember = await CampaignService.inviteMemberToCampaign(campaignId, userId, inviteData);
      
      logger.info('Member invited to campaign', { campaignId, invitedUser: inviteData.username, invitedBy: userId });
      
      res.status(201).json({
        status: 'success',
        data: newMember,
        message: 'Member invited successfully'
      });
    } catch (error: any) {
      logger.error('Invite member failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to invite member'
      });
    }
  }

  // Accept campaign invitation
  static async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      await CampaignService.acceptCampaignInvitation(campaignId, userId);
      
      logger.info('Campaign invitation accepted', { campaignId, userId });
      
      res.json({
        status: 'success',
        message: 'Invitation accepted successfully'
      });
    } catch (error: any) {
      logger.error('Accept invitation failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to accept invitation'
      });
    }
  }

  // Update member role/status
  static async updateMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      const membershipId = req.params.membershipId;
      const updateData: UpdateMemberRequest = req.body;
      
      const updatedMember = await CampaignService.updateCampaignMember(campaignId, membershipId, userId, updateData);
      
      logger.info('Campaign member updated', { campaignId, membershipId, updatedBy: userId });
      
      res.json({
        status: 'success',
        data: updatedMember,
        message: 'Member updated successfully'
      });
    } catch (error: any) {
      logger.error('Update member failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to update member'
      });
    }
  }

  // Remove member from campaign
  static async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      const membershipId = req.params.membershipId;
      
      await CampaignService.removeCampaignMember(campaignId, membershipId, userId);
      
      logger.info('Campaign member removed', { campaignId, membershipId, removedBy: userId });
      
      res.json({
        status: 'success',
        message: 'Member removed successfully'
      });
    } catch (error: any) {
      logger.error('Remove member failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to remove member'
      });
    }
  }
}