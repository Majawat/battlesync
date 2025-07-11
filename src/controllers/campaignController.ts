import { Request, Response } from 'express';
import { CampaignService } from '../services/campaignService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { ValidationUtils } from '../utils/validation';

const prisma = new PrismaClient();

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

  // ============= CAMPAIGN MEMBERSHIP COMPATIBILITY LAYER =============
  // These endpoints provide frontend compatibility while using the new group-based architecture

  // Get campaign members (maps from group membership + campaign participation)
  static async getCampaignMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      // Verify user has access to campaign
      const campaign = await CampaignService.getCampaignById(campaignId, userId);
      
      // Get all participants with their group membership info
      const participants = await prisma.campaignParticipation.findMany({
        where: { campaignId },
        include: {
          groupMembership: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          }
        }
      });

      const members = participants.map(participation => ({
        id: participation.id,
        userId: participation.groupMembership.user.id,
        username: participation.groupMembership.user.username,
        email: participation.groupMembership.user.email,
        role: participation.campaignRole,
        status: participation.groupMembership.status,
        totalExperience: participation.totalExperience,
        battlesWon: participation.battlesWon,
        battlesLost: participation.battlesLost,
        joinedAt: participation.joinedCampaignAt,
        primaryArmyId: participation.primaryArmyId
      }));
      
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

  // Invite member to campaign (creates group membership if needed, then campaign participation)
  static async inviteMemberToCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      const { username, role = 'PARTICIPANT' } = req.body;
      
      // Verify user can invite (must be campaign creator or group admin)
      const campaign = await CampaignService.getCampaignById(campaignId, userId);
      if (campaign.creator.id !== userId) {
        throw ValidationUtils.createError('Only campaign creator can invite members', 403);
      }

      // Find target user
      const targetUser = await prisma.user.findUnique({
        where: { username }
      });

      if (!targetUser) {
        throw ValidationUtils.createError('User not found', 404);
      }

      // Check if user is already a group member
      let groupMembership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId: targetUser.id,
            groupId: campaign.groupId
          }
        }
      });

      // If not a group member, add them
      if (!groupMembership) {
        groupMembership = await prisma.groupMembership.create({
          data: {
            userId: targetUser.id,
            groupId: campaign.groupId,
            role: 'MEMBER',
            status: 'ACTIVE',
            invitedBy: userId,
            invitedAt: new Date()
          }
        });
      }

      // Check if already participating in campaign
      const existingParticipation = await prisma.campaignParticipation.findUnique({
        where: {
          groupMembershipId_campaignId: {
            groupMembershipId: groupMembership.id,
            campaignId
          }
        }
      });

      if (existingParticipation) {
        throw ValidationUtils.createError('User is already participating in this campaign', 409);
      }

      // Create campaign participation
      const participation = await prisma.campaignParticipation.create({
        data: {
          groupMembershipId: groupMembership.id,
          campaignId,
          campaignRole: role as any
        },
        include: {
          groupMembership: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          }
        }
      });

      const newMember = {
        id: participation.id,
        userId: participation.groupMembership.user.id,
        username: participation.groupMembership.user.username,
        email: participation.groupMembership.user.email,
        role: participation.campaignRole,
        status: participation.groupMembership.status,
        totalExperience: participation.totalExperience,
        battlesWon: participation.battlesWon,
        battlesLost: participation.battlesLost,
        joinedAt: participation.joinedCampaignAt,
        primaryArmyId: participation.primaryArmyId
      };
      
      logger.info('Member invited to campaign', { campaignId, invitedUser: username, invitedBy: userId });
      
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

  // Update campaign member role/status
  static async updateCampaignMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      const participationId = req.params.membershipId;
      const { role, status } = req.body;
      
      // Verify user can update (must be campaign creator)
      const campaign = await CampaignService.getCampaignById(campaignId, userId);
      if (campaign.creator.id !== userId) {
        throw ValidationUtils.createError('Only campaign creator can update members', 403);
      }

      // Update campaign participation
      const updatedParticipation = await prisma.campaignParticipation.update({
        where: { id: participationId },
        data: {
          ...(role && { campaignRole: role as any })
        },
        include: {
          groupMembership: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // Update group membership status if provided
      if (status) {
        await prisma.groupMembership.update({
          where: { id: updatedParticipation.groupMembershipId },
          data: { status: status as any }
        });
      }

      const updatedMember = {
        id: updatedParticipation.id,
        userId: updatedParticipation.groupMembership.user.id,
        username: updatedParticipation.groupMembership.user.username,
        email: updatedParticipation.groupMembership.user.email,
        role: updatedParticipation.campaignRole,
        status: status || updatedParticipation.groupMembership.status,
        totalExperience: updatedParticipation.totalExperience,
        battlesWon: updatedParticipation.battlesWon,
        battlesLost: updatedParticipation.battlesLost,
        joinedAt: updatedParticipation.joinedCampaignAt,
        primaryArmyId: updatedParticipation.primaryArmyId
      };
      
      logger.info('Campaign member updated', { campaignId, participationId, updatedBy: userId });
      
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
  static async removeCampaignMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      const participationId = req.params.membershipId;
      
      // Verify user can remove (must be campaign creator)
      const campaign = await CampaignService.getCampaignById(campaignId, userId);
      if (campaign.creator.id !== userId) {
        throw ValidationUtils.createError('Only campaign creator can remove members', 403);
      }

      // Remove campaign participation (keeps group membership intact)
      await prisma.campaignParticipation.delete({
        where: { id: participationId }
      });
      
      logger.info('Campaign member removed', { campaignId, participationId, removedBy: userId });
      
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