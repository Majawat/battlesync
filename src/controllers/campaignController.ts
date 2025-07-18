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
      await CampaignService.getCampaignById(campaignId, userId);
      
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

      // If not a group member, add them as PENDING
      if (!groupMembership) {
        groupMembership = await prisma.groupMembership.create({
          data: {
            userId: targetUser.id,
            groupId: campaign.groupId,
            role: 'MEMBER',
            status: 'PENDING',
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

  // Get available group members who can be added to campaign
  static async getAvailableGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;

      // Get campaign with group info
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          group: {
            include: {
              memberships: {
                where: { status: 'ACTIVE' },
                include: { user: true }
              }
            }
          },
          participations: {
            include: {
              groupMembership: true
            }
          }
        }
      });

      if (!campaign) {
        throw ValidationUtils.createError('Campaign not found', 404);
      }

      // Check if user is campaign creator or group admin
      const isCreator = campaign.createdBy === userId;
      const isGroupAdmin = campaign.group.memberships.some(m => m.userId === userId && m.role === 'ADMIN');
      
      if (!isCreator && !isGroupAdmin) {
        throw ValidationUtils.createError('Only campaign creator or group admin can view available members', 403);
      }

      // Get group membership IDs that are already campaign participants
      const existingParticipantIds = new Set(
        campaign.participations.map(p => p.groupMembershipId)
      );

      // Filter out existing participants
      const availableMembers = campaign.group.memberships
        .filter(membership => !existingParticipantIds.has(membership.id))
        .map(membership => ({
          groupMembershipId: membership.id,
          userId: membership.user.id,
          username: membership.user.username,
          email: membership.user.email,
          groupRole: membership.role,
          joinedAt: membership.user.createdAt
        }));

      res.json({
        status: 'success',
        data: availableMembers
      });
    } catch (error: any) {
      logger.error('Get available group members failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to get available group members'
      });
    }
  }

  // Add existing group member to campaign
  static async addMemberToCampaign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      const { groupMembershipId, campaignRole = 'PARTICIPANT' } = req.body;

      if (!groupMembershipId) {
        throw ValidationUtils.createError('Group membership ID is required', 400);
      }

      // Get campaign with creator info
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          group: {
            include: {
              memberships: {
                include: { user: true }
              }
            }
          }
        }
      });

      if (!campaign) {
        throw ValidationUtils.createError('Campaign not found', 404);
      }

      // Check if user is campaign creator or group admin
      const isCreator = campaign.createdBy === userId;
      const isGroupAdmin = campaign.group.memberships.some(m => m.userId === userId && m.role === 'ADMIN');
      
      if (!isCreator && !isGroupAdmin) {
        throw ValidationUtils.createError('Only campaign creator or group admin can add members', 403);
      }

      // Check if the group membership exists and is active
      const groupMembership = campaign.group.memberships.find(m => m.id === groupMembershipId);
      if (!groupMembership) {
        throw ValidationUtils.createError('Group membership not found', 404);
      }

      if (groupMembership.status !== 'ACTIVE') {
        throw ValidationUtils.createError('User is not an active group member', 400);
      }

      // Check if user is already a campaign participant
      const existingParticipation = await prisma.campaignParticipation.findFirst({
        where: {
          campaignId,
          groupMembershipId
        }
      });

      if (existingParticipation) {
        throw ValidationUtils.createError('User is already a campaign participant', 400);
      }

      // Create campaign participation
      const participation = await prisma.campaignParticipation.create({
        data: {
          groupMembershipId,
          campaignId,
          campaignRole
        },
        include: {
          groupMembership: {
            include: {
              user: true
            }
          }
        }
      });

      logger.info('Member added to campaign', { 
        campaignId, 
        addedUserId: participation.groupMembership.user.id,
        addedBy: userId 
      });

      res.json({
        status: 'success',
        message: 'Member added to campaign successfully',
        data: {
          participationId: participation.id,
          member: {
            id: participation.groupMembership.user.id,
            username: participation.groupMembership.user.username,
            email: participation.groupMembership.user.email,
            campaignRole: participation.campaignRole
          }
        }
      });
    } catch (error: any) {
      logger.error('Add member to campaign failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to add member to campaign'
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

  // Accept campaign invitation
  static async acceptCampaignInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      // Find the campaign
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { group: true }
      });

      if (!campaign) {
        throw ValidationUtils.createError('Campaign not found', 404);
      }

      // Find pending group membership
      const groupMembership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId: campaign.groupId
          }
        }
      });

      if (!groupMembership) {
        throw ValidationUtils.createError('No invitation found', 404);
      }

      if (groupMembership.status !== 'PENDING') {
        throw ValidationUtils.createError('No pending invitation found', 400);
      }

      // Update group membership to ACTIVE and create campaign participation
      await prisma.$transaction(async (tx) => {
        // Activate group membership
        await tx.groupMembership.update({
          where: { id: groupMembership.id },
          data: { status: 'ACTIVE' }
        });

        // Create campaign participation
        await tx.campaignParticipation.create({
          data: {
            groupMembershipId: groupMembership.id,
            campaignId,
            campaignRole: 'PARTICIPANT'
          }
        });
      });

      logger.info('Campaign invitation accepted', { campaignId, userId });
      
      res.json({
        status: 'success',
        message: 'Successfully joined campaign'
      });
    } catch (error: any) {
      logger.error('Accept campaign invitation failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to accept invitation'
      });
    }
  }

  // Decline campaign invitation
  static async declineCampaignInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      // Find the campaign
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { group: true }
      });

      if (!campaign) {
        throw ValidationUtils.createError('Campaign not found', 404);
      }

      // Find pending group membership
      const groupMembership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId: campaign.groupId
          }
        }
      });

      if (!groupMembership || groupMembership.status !== 'PENDING') {
        throw ValidationUtils.createError('No pending invitation found', 404);
      }

      // Remove the pending group membership
      await prisma.groupMembership.delete({
        where: { id: groupMembership.id }
      });

      logger.info('Campaign invitation declined', { campaignId, userId });
      
      res.json({
        status: 'success',
        message: 'Invitation declined'
      });
    } catch (error: any) {
      logger.error('Decline campaign invitation failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to decline invitation'
      });
    }
  }

  // Get pending campaign invitations for user
  static async getPendingCampaignInvitations(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      
      // Find all pending group memberships with their campaigns
      const pendingMemberships = await prisma.groupMembership.findMany({
        where: {
          userId,
          status: 'PENDING'
        },
        include: {
          group: {
            include: {
              campaigns: {
                include: {
                  creator: {
                    select: {
                      id: true,
                      username: true
                    }
                  },
                  _count: {
                    select: {
                      participations: true
                    }
                  }
                }
              }
            }
          },
          user: false // Don't include user data
        }
      });

      const invitations = pendingMemberships.flatMap(membership => 
        membership.group.campaigns.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          groupId: membership.groupId,
          groupName: membership.group.name,
          createdBy: campaign.creator.username,
          participantCount: campaign._count.participations,
          invitedAt: membership.invitedAt,
          invitedBy: membership.invitedBy
        }))
      );
      
      res.json({
        status: 'success',
        data: invitations
      });
    } catch (error: any) {
      logger.error('Get pending campaign invitations failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch invitations'
      });
    }
  }
}