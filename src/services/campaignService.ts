import { PrismaClient } from '@prisma/client';
import { ValidationUtils } from '../utils/validation';
import { CampaignData, CreateCampaignRequest, UpdateCampaignRequest, JoinCampaignRequest, CampaignSummary } from '../types/campaign';

export interface InviteMemberRequest {
  username: string;
  role?: 'ADMIN' | 'MEMBER';
}

export interface UpdateMemberRequest {
  role?: 'ADMIN' | 'MEMBER';
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CampaignMemberDetailed {
  id: string;
  userId: string;
  username: string;
  email: string | null;
  role: 'CREATOR' | 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REMOVED';
  totalExperience: number;
  battlesWon: number;
  battlesLost: number;
  joinedAt: Date;
  invitedBy?: string;
  invitedAt?: Date;
  primaryArmyId?: string;
  primaryArmyName?: string;
}

const prisma = new PrismaClient();

export class CampaignService {
  static async getUserCampaigns(userId: string): Promise<CampaignSummary[]> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        memberships: {
          some: { 
            userId,
            status: { in: ['ACTIVE', 'INACTIVE'] }
          }
        }
      },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        memberships: {
          where: { userId },
          select: {
            role: true
          }
        },
        _count: {
          select: {
            memberships: true,
            battles: true
          }
        },
        battles: {
          where: {
            status: 'COMPLETED'
          },
          select: {
            id: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      memberCount: campaign._count.memberships,
      battleCount: campaign._count.battles,
      completedBattles: campaign.battles.length,
      createdAt: campaign.createdAt,
      userRole: campaign.memberships[0]?.role || 'MEMBER'
    }));
  }
  static async createCampaign(groupId: string, userId: string, data: CreateCampaignRequest): Promise<CampaignData> {
    // Validate user is a member of the group
    await this.validateGroupMembership(groupId, userId);
    
    // Validate input
    if (!data.name) {
      throw ValidationUtils.createError('Campaign name is required', 400);
    }
    if (data.name.length < 3 || data.name.length > 100) {
      throw ValidationUtils.createError('Campaign name must be between 3 and 100 characters', 400);
    }
    
    if (data.description && data.description.length > 1000) {
      throw ValidationUtils.createError('Description must be less than 1000 characters', 400);
    }

    if (data.narrative && data.narrative.length > 5000) {
      throw ValidationUtils.createError('Narrative must be less than 5000 characters', 400);
    }

    // Validate campaign settings
    this.validateCampaignSettings(data.settings);

    try {
      const campaign = await prisma.campaign.create({
        data: {
          groupId,
          name: data.name,
          description: data.description,
          narrative: data.narrative,
          settings: data.settings as any,
          createdBy: userId,
          status: 'PLANNING',
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          battles: {
            include: {
              participants: {
                include: {
                  battle: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
          missions: {
            select: {
              id: true,
              number: true,
              title: true,
              points: true,
              status: true,
              scheduledDate: true,
            },
          },
          _count: {
            select: {
              memberships: true,
              battles: true,
            },
          },
        },
      });

      // Automatically add the creator as a member with CREATOR role
      await prisma.campaignMembership.create({
        data: {
          userId,
          campaignId: campaign.id,
          role: 'CREATOR',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });

      return this.toCampaignData(campaign);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw ValidationUtils.createError('A campaign with this name already exists in the group', 409);
      }
      throw error;
    }
  }

  static async joinCampaign(campaignId: string, userId: string, data?: JoinCampaignRequest): Promise<CampaignData> {
    // Verify campaign exists and user has access
    const campaign = await this.getCampaignById(campaignId, userId);
    
    if (campaign.status === 'COMPLETED') {
      throw ValidationUtils.createError('Cannot join a completed campaign', 403);
    }

    // Check if user is already a member
    const existingMembership = campaign.members.find(m => m.userId === userId);
    if (existingMembership) {
      throw ValidationUtils.createError('You are already a member of this campaign', 409);
    }

    try {
      await prisma.campaignMembership.create({
        data: {
          userId,
          campaignId,
          primaryArmyId: data?.primaryArmyId,
        },
      });

      // Return updated campaign data
      return this.getCampaignById(campaignId, userId);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw ValidationUtils.createError('You are already a member of this campaign', 409);
      }
      throw error;
    }
  }

  static async getGroupCampaigns(groupId: string, userId: string): Promise<CampaignSummary[]> {
    // Validate user is a member of the group
    await this.validateGroupMembership(groupId, userId);

    const campaigns = await prisma.campaign.findMany({
      where: {
        groupId,
      },
      include: {
        battles: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            memberships: true,
            battles: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status as any,
      memberCount: campaign._count.memberships,
      battleCount: campaign._count.battles,
      completedBattles: campaign.battles.filter(b => b.status === 'COMPLETED').length,
      createdAt: campaign.createdAt,
    }));
  }

  static async getCampaignById(campaignId: string, userId: string): Promise<CampaignData> {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        group: {
          OR: [
            { ownerId: userId },
            { memberships: { some: { userId } } },
          ],
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        battles: {
          include: {
            participants: {
              include: {
                battle: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        missions: {
          select: {
            id: true,
            number: true,
            title: true,
            points: true,
            status: true,
            scheduledDate: true,
          },
        },
        _count: {
          select: {
            memberships: true,
            battles: true,
          },
        },
      },
    });

    if (!campaign) {
      throw ValidationUtils.createError('Campaign not found', 404);
    }

    return this.toCampaignData(campaign);
  }

  static async updateCampaign(campaignId: string, userId: string, data: UpdateCampaignRequest): Promise<CampaignData> {
    // Verify user has permission (group member or campaign creator)
    const campaign = await this.getCampaignById(campaignId, userId);
    
    // Only creator or group admin can update campaign
    const group = await prisma.gamingGroup.findUnique({
      where: { id: campaign.groupId },
      include: {
        memberships: {
          where: { userId },
        },
      },
    });

    const isCreator = campaign.creator.id === userId;
    const isGroupOwner = group?.ownerId === userId;
    const isGroupAdmin = group?.memberships.some(m => m.userId === userId && m.role === 'ADMIN');

    if (!isCreator && !isGroupOwner && !isGroupAdmin) {
      throw ValidationUtils.createError('You do not have permission to update this campaign', 403);
    }

    // Validate input
    if (data.name && (data.name.length < 3 || data.name.length > 100)) {
      throw ValidationUtils.createError('Campaign name must be between 3 and 100 characters', 400);
    }
    
    if (data.description && data.description.length > 1000) {
      throw ValidationUtils.createError('Description must be less than 1000 characters', 400);
    }

    if (data.narrative && data.narrative.length > 5000) {
      throw ValidationUtils.createError('Narrative must be less than 5000 characters', 400);
    }

    if (data.settings) {
      this.validateCampaignSettings(data.settings as any);
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.narrative !== undefined && { narrative: data.narrative }),
        ...(data.status && { status: data.status }),
        ...(data.settings && { 
          settings: {
            ...campaign.settings as any,
            ...data.settings,
          }
        }),
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        battles: {
          include: {
            participants: {
              include: {
                battle: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        missions: {
          select: {
            id: true,
            number: true,
            title: true,
            points: true,
            status: true,
            scheduledDate: true,
          },
        },
        _count: {
          select: {
            memberships: true,
            battles: true,
          },
        },
      },
    });

    return this.toCampaignData(updatedCampaign);
  }

  static async leaveCampaign(campaignId: string, userId: string): Promise<void> {
    const membership = await prisma.campaignMembership.findFirst({
      where: {
        campaignId,
        userId,
      },
    });

    if (!membership) {
      throw ValidationUtils.createError('You are not a member of this campaign', 404);
    }

    await prisma.campaignMembership.delete({
      where: { id: membership.id },
    });
  }

  static async deleteCampaign(campaignId: string, userId: string): Promise<void> {
    // Verify user has permission (campaign creator or group owner)
    const campaign = await this.getCampaignById(campaignId, userId);
    
    const group = await prisma.gamingGroup.findUnique({
      where: { id: campaign.groupId },
    });

    const isCreator = campaign.creator.id === userId;
    const isGroupOwner = group?.ownerId === userId;

    if (!isCreator && !isGroupOwner) {
      throw ValidationUtils.createError('You do not have permission to delete this campaign', 403);
    }

    // Note: This will cascade delete related data (memberships, battles, etc.)
    await prisma.campaign.delete({
      where: { id: campaignId },
    });
  }

  private static async validateGroupMembership(groupId: string, userId: string): Promise<void> {
    const group = await prisma.gamingGroup.findFirst({
      where: {
        id: groupId,
        OR: [
          { ownerId: userId },
          { memberships: { some: { userId } } },
        ],
        isActive: true,
      },
    });

    if (!group) {
      throw ValidationUtils.createError('Gaming group not found or you are not a member', 404);
    }
  }

  private static validateCampaignSettings(settings: any): void {
    if (!settings.pointsLimit || settings.pointsLimit < 100 || settings.pointsLimit > 10000) {
      throw ValidationUtils.createError('Points limit must be between 100 and 10000', 400);
    }

    if (!settings.gameSystem) {
      throw ValidationUtils.createError('Game system is required', 400);
    }

    const validGameSystems = ['grimdark-future', 'age-of-fantasy', 'firefight', 'warfleets-ftl'];
    if (!validGameSystems.includes(settings.gameSystem)) {
      throw ValidationUtils.createError(`Game system must be one of: ${validGameSystems.join(', ')}`, 400);
    }

    // Validate experience values
    if (settings.experiencePerWin < 0 || settings.experiencePerWin > 100) {
      throw ValidationUtils.createError('Experience per win must be between 0 and 100', 400);
    }

    if (settings.experiencePerLoss < 0 || settings.experiencePerLoss > 100) {
      throw ValidationUtils.createError('Experience per loss must be between 0 and 100', 400);
    }

    if (settings.experiencePerKill < 0 || settings.experiencePerKill > 10) {
      throw ValidationUtils.createError('Experience per kill must be between 0 and 10', 400);
    }
  }

  private static toCampaignData(campaign: any): CampaignData {
    return {
      id: campaign.id,
      groupId: campaign.groupId,
      name: campaign.name,
      description: campaign.description,
      narrative: campaign.narrative,
      status: campaign.status,
      settings: campaign.settings,
      creator: {
        id: campaign.creator.id,
        username: campaign.creator.username,
        email: campaign.creator.email,
      },
      members: campaign.memberships.map((membership: any) => ({
        id: membership.id,
        userId: membership.userId,
        user: {
          id: membership.user.id,
          username: membership.user.username,
          email: membership.user.email,
        },
        primaryArmyId: membership.primaryArmyId,
        totalExperience: membership.totalExperience,
        battlesWon: membership.battlesWon,
        battlesLost: membership.battlesLost,
        joinedAt: membership.joinedAt,
      })),
      battles: campaign.battles.map((battle: any) => ({
        id: battle.id,
        missionId: battle.missionId,
        status: battle.status,
        startedAt: battle.startedAt,
        completedAt: battle.completedAt,
        participants: battle.participants.map((p: any) => p.user?.username || 'Unknown'),
      })),
      missions: campaign.missions.map((mission: any) => ({
        id: mission.id,
        number: mission.number,
        title: mission.title,
        points: mission.points,
        status: mission.status,
        scheduledDate: mission.scheduledDate,
      })),
      memberCount: campaign._count.memberships,
      battleCount: campaign._count.battles,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  // ============= MEMBERSHIP MANAGEMENT =============

  /**
   * Get detailed campaign members list
   */
  static async getCampaignMembers(campaignId: string, requesterId: string): Promise<CampaignMemberDetailed[]> {
    // Verify requester has access to campaign
    await this.validateCampaignAccess(campaignId, requesterId);

    const memberships = await prisma.campaignMembership.findMany({
      where: { 
        campaignId,
        status: { in: ['PENDING', 'ACTIVE', 'INACTIVE'] }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
      },
      orderBy: [
        { role: 'asc' }, // CREATOR first, then ADMIN, then MEMBER
        { joinedAt: 'asc' }
      ]
    });

    return memberships.map(membership => {
      return {
        id: membership.id,
        userId: membership.userId,
        username: membership.user.username,
        email: membership.user.email,
        role: membership.role as 'CREATOR' | 'ADMIN' | 'MEMBER',
        status: membership.status as 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REMOVED',
        totalExperience: membership.totalExperience,
        battlesWon: membership.battlesWon,
        battlesLost: membership.battlesLost,
        joinedAt: membership.joinedAt,
        invitedBy: membership.invitedBy || undefined,
        invitedAt: membership.invitedAt || undefined,
        primaryArmyId: membership.primaryArmyId || undefined,
        primaryArmyName: undefined // TODO: Fetch from armies table if needed
      };
    });
  }

  /**
   * Invite a user to campaign by username
   */
  static async inviteMemberToCampaign(
    campaignId: string, 
    requesterId: string, 
    data: InviteMemberRequest
  ): Promise<CampaignMemberDetailed> {
    // Verify requester can manage campaign
    await this.validateCampaignManageAccess(campaignId, requesterId);

    // Find user to invite
    const userToInvite = await prisma.user.findUnique({
      where: { username: data.username },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true
      }
    });

    if (!userToInvite) {
      throw ValidationUtils.createError(`User '${data.username}' not found`, 404);
    }

    if (!userToInvite.isActive) {
      throw ValidationUtils.createError('Cannot invite inactive user', 400);
    }

    // Check if user is already a member
    const existingMembership = await prisma.campaignMembership.findFirst({
      where: {
        campaignId,
        userId: userToInvite.id,
        status: { in: ['PENDING', 'ACTIVE', 'INACTIVE'] }
      }
    });

    if (existingMembership) {
      throw ValidationUtils.createError('User is already a member or has a pending invitation', 409);
    }

    // Create membership with PENDING status
    const membership = await prisma.campaignMembership.create({
      data: {
        userId: userToInvite.id,
        campaignId,
        role: data.role || 'MEMBER',
        status: 'PENDING',
        invitedBy: requesterId,
        invitedAt: new Date()
      }
    });

    return {
      id: membership.id,
      userId: userToInvite.id,
      username: userToInvite.username,
      email: userToInvite.email,
      role: membership.role as 'CREATOR' | 'ADMIN' | 'MEMBER',
      status: 'PENDING',
      totalExperience: 0,
      battlesWon: 0,
      battlesLost: 0,
      joinedAt: membership.joinedAt,
      invitedBy: requesterId,
      invitedAt: membership.invitedAt || undefined
    };
  }

  /**
   * Accept campaign invitation
   */
  static async acceptCampaignInvitation(campaignId: string, userId: string): Promise<void> {
    const membership = await prisma.campaignMembership.findFirst({
      where: {
        campaignId,
        userId,
        status: 'PENDING'
      }
    });

    if (!membership) {
      throw ValidationUtils.createError('No pending invitation found', 404);
    }

    await prisma.campaignMembership.update({
      where: { id: membership.id },
      data: {
        status: 'ACTIVE',
        joinedAt: new Date() // Update join date to acceptance time
      }
    });
  }

  /**
   * Update member role or status
   */
  static async updateCampaignMember(
    campaignId: string,
    membershipId: string,
    requesterId: string,
    data: UpdateMemberRequest
  ): Promise<CampaignMemberDetailed> {
    // Verify requester can manage campaign
    await this.validateCampaignManageAccess(campaignId, requesterId);

    const membership = await prisma.campaignMembership.findFirst({
      where: {
        id: membershipId,
        campaignId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!membership) {
      throw ValidationUtils.createError('Member not found', 404);
    }

    // Cannot change creator role
    if (membership.role === 'CREATOR') {
      throw ValidationUtils.createError('Cannot modify campaign creator', 403);
    }

    // Update membership
    const updatedMembership = await prisma.campaignMembership.update({
      where: { id: membershipId },
      data: {
        ...(data.role && { role: data.role }),
        ...(data.status && { status: data.status })
      }
    });

    return {
      id: updatedMembership.id,
      userId: membership.user.id,
      username: membership.user.username,
      email: membership.user.email,
      role: updatedMembership.role as 'CREATOR' | 'ADMIN' | 'MEMBER',
      status: updatedMembership.status as 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REMOVED',
      totalExperience: updatedMembership.totalExperience,
      battlesWon: updatedMembership.battlesWon,
      battlesLost: updatedMembership.battlesLost,
      joinedAt: updatedMembership.joinedAt,
      invitedBy: updatedMembership.invitedBy || undefined,
      invitedAt: updatedMembership.invitedAt || undefined,
      primaryArmyId: updatedMembership.primaryArmyId || undefined
    };
  }

  /**
   * Remove member from campaign
   */
  static async removeCampaignMember(
    campaignId: string,
    membershipId: string,
    requesterId: string
  ): Promise<void> {
    // Verify requester can manage campaign
    await this.validateCampaignManageAccess(campaignId, requesterId);

    const membership = await prisma.campaignMembership.findFirst({
      where: {
        id: membershipId,
        campaignId
      }
    });

    if (!membership) {
      throw ValidationUtils.createError('Member not found', 404);
    }

    // Cannot remove creator
    if (membership.role === 'CREATOR') {
      throw ValidationUtils.createError('Cannot remove campaign creator', 403);
    }

    // Mark as removed instead of deleting to preserve history
    await prisma.campaignMembership.update({
      where: { id: membershipId },
      data: { status: 'REMOVED' }
    });
  }

  // ============= HELPER METHODS =============

  /**
   * Validate user has access to campaign (is a member)
   */
  private static async validateCampaignAccess(campaignId: string, userId: string): Promise<void> {
    const membership = await prisma.campaignMembership.findFirst({
      where: {
        campaignId,
        userId,
        status: { in: ['ACTIVE', 'INACTIVE'] }
      }
    });

    if (!membership) {
      throw ValidationUtils.createError('Access denied to campaign', 403);
    }
  }

  /**
   * Validate user can manage campaign (is creator or admin)
   */
  private static async validateCampaignManageAccess(campaignId: string, userId: string): Promise<void> {
    const membership = await prisma.campaignMembership.findFirst({
      where: {
        campaignId,
        userId,
        role: { in: ['CREATOR', 'ADMIN'] },
        status: 'ACTIVE'
      }
    });

    if (!membership) {
      throw ValidationUtils.createError('Insufficient permissions to manage campaign', 403);
    }
  }
}