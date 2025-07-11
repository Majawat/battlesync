import { PrismaClient } from '@prisma/client';
import { ValidationUtils } from '../utils/validation';
import { CampaignData, CreateCampaignRequest, UpdateCampaignRequest, JoinCampaignRequest, CampaignSummary } from '../types/campaign';

const prisma = new PrismaClient();

export class CampaignService {
  static async getUserCampaigns(userId: string): Promise<CampaignSummary[]> {
    // Find campaigns where user has group membership and campaign participation
    const campaigns = await prisma.campaign.findMany({
      where: {
        participations: {
          some: {
            groupMembership: {
              userId,
              status: { in: ['ACTIVE', 'INACTIVE'] }
            }
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
        participations: {
          where: {
            groupMembership: { userId }
          },
          select: {
            campaignRole: true
          }
        },
        _count: {
          select: {
            participations: true,
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
      memberCount: campaign._count.participations,
      battleCount: campaign._count.battles,
      completedBattles: campaign.battles.length,
      createdAt: campaign.createdAt,
      userRole: campaign.participations[0]?.campaignRole || 'PARTICIPANT'
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
          participations: {
            include: {
              groupMembership: {
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
              participations: true,
              battles: true,
            },
          },
        },
      });

      // Campaign creator will be handled through group membership
      // No direct campaign membership needed - handled via CampaignParticipation

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

    // Check if user is already a participant
    const existingParticipation = campaign.members.find(m => m.user.id === userId);
    if (existingParticipation) {
      throw ValidationUtils.createError('You are already a participant in this campaign', 409);
    }

    // Find user's group membership
    const groupMembership = await prisma.groupMembership.findFirst({
      where: {
        userId,
        groupId: campaign.groupId,
        status: 'ACTIVE'
      }
    });

    if (!groupMembership) {
      throw ValidationUtils.createError('You must be a member of the group to join this campaign', 403);
    }

    try {
      await prisma.campaignParticipation.create({
        data: {
          groupMembershipId: groupMembership.id,
          campaignId,
          primaryArmyId: data?.primaryArmyId,
          campaignRole: 'PARTICIPANT'
        },
      });

      // Return updated campaign data
      return this.getCampaignById(campaignId, userId);
    } catch (error: any) {
      throw ValidationUtils.createError('Failed to join campaign', 500);
    }
  }

  static async getCampaignById(campaignId: string, userId: string): Promise<CampaignData> {
    // Verify user has access through group membership
    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: campaignId,
        group: {
          memberships: {
            some: {
              userId,
              status: { in: ['ACTIVE', 'INACTIVE'] }
            }
          }
        }
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        participations: {
          include: {
            groupMembership: {
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
            participations: true,
            battles: true,
          },
        },
      },
    });

    if (!campaign) {
      throw ValidationUtils.createError('Campaign not found or access denied', 404);
    }

    return this.toCampaignData(campaign);
  }

  static async getGroupCampaigns(groupId: string, userId: string): Promise<CampaignData[]> {
    // Verify user is a member of the group
    await this.validateGroupMembership(groupId, userId);

    const campaigns = await prisma.campaign.findMany({
      where: { groupId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        participations: {
          include: {
            groupMembership: {
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
            participations: true,
            battles: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return campaigns.map(campaign => this.toCampaignData(campaign));
  }

  static async updateCampaign(campaignId: string, userId: string, data: UpdateCampaignRequest): Promise<CampaignData> {
    // Verify user is campaign creator
    const campaign = await this.getCampaignById(campaignId, userId);
    
    if (campaign.creator.id !== userId) {
      throw ValidationUtils.createError('Only the campaign creator can update the campaign', 403);
    }

    // Validate settings if provided
    if (data.settings) {
      this.validateCampaignSettings(data.settings);
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.narrative !== undefined && { narrative: data.narrative }),
        ...(data.settings && { settings: data.settings as any }),
        ...(data.status && { status: data.status }),
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        participations: {
          include: {
            groupMembership: {
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
            participations: true,
            battles: true,
          },
        },
      },
    });

    return this.toCampaignData(updatedCampaign);
  }

  static async leaveCampaign(campaignId: string, userId: string): Promise<void> {
    // Find user's participation in the campaign
    const participation = await prisma.campaignParticipation.findFirst({
      where: {
        campaignId,
        groupMembership: {
          userId
        }
      },
    });

    if (!participation) {
      throw ValidationUtils.createError('You are not a participant in this campaign', 404);
    }

    await prisma.campaignParticipation.delete({
      where: { id: participation.id },
    });
  }

  static async deleteCampaign(campaignId: string, userId: string): Promise<void> {
    // Verify user is campaign creator
    const campaign = await this.getCampaignById(campaignId, userId);
    
    if (campaign.creator.id !== userId) {
      throw ValidationUtils.createError('Only the campaign creator can delete the campaign', 403);
    }

    await prisma.campaign.delete({
      where: { id: campaignId },
    });
  }

  // ============= HELPER METHODS =============

  private static async validateGroupMembership(groupId: string, userId: string): Promise<void> {
    const membership = await prisma.groupMembership.findFirst({
      where: {
        groupId,
        userId,
        status: { in: ['ACTIVE', 'INACTIVE'] }
      }
    });

    const isOwner = await prisma.gamingGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId
      }
    });

    if (!membership && !isOwner) {
      throw ValidationUtils.createError('You are not a member of this group', 403);
    }
  }

  private static validateCampaignSettings(settings: any): void {
    if (!settings) {
      throw ValidationUtils.createError('Campaign settings are required', 400);
    }

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
      members: campaign.participations.map((participation: any) => ({
        id: participation.id,
        userId: participation.groupMembership.user.id,
        user: {
          id: participation.groupMembership.user.id,
          username: participation.groupMembership.user.username,
          email: participation.groupMembership.user.email,
        },
        primaryArmyId: participation.primaryArmyId,
        totalExperience: participation.totalExperience,
        battlesWon: participation.battlesWon,
        battlesLost: participation.battlesLost,
        joinedAt: participation.joinedCampaignAt,
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
      memberCount: campaign._count.participations,
      battleCount: campaign._count.battles,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}