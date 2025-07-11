import { PrismaClient } from '@prisma/client';
import { ValidationUtils } from '../utils/validation';
import { CampaignData, CreateCampaignRequest, UpdateCampaignRequest, JoinCampaignRequest, CampaignSummary } from '../types/campaign';

const prisma = new PrismaClient();

export class CampaignService {
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
}