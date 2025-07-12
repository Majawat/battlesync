import { PrismaClient } from '@prisma/client';
import { ValidationUtils } from '../utils/validation';
import { MissionData, CreateMissionRequest, UpdateMissionRequest, MissionSummary, MissionTemplate } from '../types/mission';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class MissionService {
  static async createMission(campaignId: string, userId: string, data: CreateMissionRequest): Promise<MissionData> {
    // Validate user has permission to create missions in this campaign
    await this.validateCampaignAccess(campaignId, userId);
    
    // Validate input
    this.validateMissionInput(data);

    // Get the next mission number for this campaign
    const lastMission = await prisma.mission.findFirst({
      where: { campaignId },
      orderBy: { number: 'desc' },
    });
    
    const missionNumber = (lastMission?.number || 0) + 1;

    // Process objectives, rules, and terrain
    const objectives = data.objectives.map(obj => ({ ...obj, id: uuidv4() }));
    const specialRules = data.specialRules.map(rule => ({ ...rule, id: uuidv4() }));
    const terrainSuggestions = data.terrainSuggestions.map(terrain => ({ ...terrain, id: uuidv4() }));

    try {
      const mission = await prisma.mission.create({
        data: {
          campaignId,
          number: missionNumber,
          title: data.title,
          description: data.description,
          points: data.points,
          status: 'UPCOMING',
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
          objectives: objectives as any,
          specialRules: specialRules as any,
          terrainSuggestions: terrainSuggestions as any,
        },
        include: {
          battles: {
            include: {
              participants: {
                include: {
                  battle: {
                    select: {
                      id: true,
                      status: true,
                      startedAt: true,
                      completedAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return this.toMissionData(mission);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw ValidationUtils.createError('A mission with this number already exists in the campaign', 409);
      }
      throw error;
    }
  }

  static async getCampaignMissions(campaignId: string, userId: string): Promise<MissionSummary[]> {
    // Validate access
    await this.validateCampaignAccess(campaignId, userId);

    const missions = await prisma.mission.findMany({
      where: { campaignId },
      include: {
        battles: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    return missions.map(mission => ({
      id: mission.id,
      campaignId: mission.campaignId,
      number: mission.number,
      title: mission.title,
      points: mission.points,
      status: mission.status as any,
      scheduledDate: mission.scheduledDate,
      battleCount: mission.battles.length,
      completedBattles: mission.battles.filter(b => b.status === 'COMPLETED').length,
      objectiveCount: Array.isArray(mission.objectives) ? mission.objectives.length : 0,
    }));
  }

  static async getMissionById(missionId: string, userId: string): Promise<MissionData> {
    const mission = await prisma.mission.findFirst({
      where: {
        id: missionId,
        campaign: {
          group: {
            OR: [
              { ownerId: userId },
              { memberships: { some: { userId } } },
            ],
          },
        },
      },
      include: {
        battles: {
          include: {
            participants: {
              include: {
                battle: {
                  select: {
                    id: true,
                    status: true,
                    startedAt: true,
                    completedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!mission) {
      throw ValidationUtils.createError('Mission not found', 404);
    }

    return this.toMissionData(mission);
  }

  static async updateMission(missionId: string, userId: string, data: UpdateMissionRequest): Promise<MissionData> {
    // Get mission and validate access
    const mission = await this.getMissionById(missionId, userId);
    
    // Only allow updates if mission is not completed
    if (mission.status === 'COMPLETED') {
      throw ValidationUtils.createError('Cannot update a completed mission', 403);
    }

    // Validate campaign permissions (creator or admin)
    await this.validateCampaignPermissions(mission.campaignId, userId);

    // Validate input
    if (data.title || data.description || data.points) {
      this.validateMissionInput(data as CreateMissionRequest);
    }

    // Process objectives, rules, and terrain if provided
    const updateData: any = {};
    
    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.points) updateData.points = data.points;
    if (data.status) updateData.status = data.status;
    if (data.scheduledDate !== undefined) {
      updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
    }
    
    if (data.objectives) {
      updateData.objectives = data.objectives.map(obj => ({ ...obj, id: uuidv4() }));
    }
    
    if (data.specialRules) {
      updateData.specialRules = data.specialRules.map(rule => ({ ...rule, id: uuidv4() }));
    }
    
    if (data.terrainSuggestions) {
      updateData.terrainSuggestions = data.terrainSuggestions.map(terrain => ({ ...terrain, id: uuidv4() }));
    }

    const updatedMission = await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
      include: {
        battles: {
          include: {
            participants: {
              include: {
                battle: {
                  select: {
                    id: true,
                    status: true,
                    startedAt: true,
                    completedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.toMissionData(updatedMission);
  }

  static async deleteMission(missionId: string, userId: string): Promise<void> {
    // Get mission and validate access
    const mission = await this.getMissionById(missionId, userId);
    
    // Validate campaign permissions
    await this.validateCampaignPermissions(mission.campaignId, userId);

    // Cannot delete if there are active battles
    if (mission.battles.some(battle => battle.status === 'ACTIVE')) {
      throw ValidationUtils.createError('Cannot delete mission with active battles', 403);
    }

    await prisma.mission.delete({
      where: { id: missionId },
    });
  }

  static async getMissionTemplates(gameSystem?: string): Promise<MissionTemplate[]> {
    // Return built-in mission templates
    const templates: MissionTemplate[] = [
      {
        id: 'patrol-clash',
        name: 'Patrol Clash',
        description: 'A small skirmish between advance forces',
        gameSystem: 'grimdark-future',
        objectives: [
          {
            title: 'Eliminate Enemy Forces',
            description: 'Destroy or rout enemy units',
            points: 3,
            type: 'ELIMINATE_ENEMY',
            isRequired: true,
          },
        ],
        specialRules: [
          {
            title: 'Limited Reserves',
            description: 'No reserves may be deployed after turn 3',
            phase: 'DEPLOYMENT',
            isActive: true,
          },
        ],
        terrainSuggestions: [
          {
            name: 'Central Hill',
            description: 'A hill in the center providing elevated firing position',
            size: 'MEDIUM',
            category: 'HILL',
            isRequired: false,
          },
        ],
        suggestedPoints: [500, 750, 1000],
      },
      {
        id: 'control-zones',
        name: 'Control Zones',
        description: 'Secure key strategic locations across the battlefield',
        gameSystem: 'grimdark-future',
        objectives: [
          {
            title: 'Control Objective A',
            description: 'Control the northern objective marker',
            points: 2,
            type: 'CAPTURE_POINT',
            isRequired: false,
          },
          {
            title: 'Control Objective B',
            description: 'Control the southern objective marker',
            points: 2,
            type: 'CAPTURE_POINT',
            isRequired: false,
          },
          {
            title: 'Control Center',
            description: 'Control the central objective marker',
            points: 3,
            type: 'CAPTURE_POINT',
            isRequired: false,
          },
        ],
        specialRules: [
          {
            title: 'Objective Markers',
            description: 'Objectives are controlled by having more units within 6" than the opponent',
            phase: 'END_TURN',
            isActive: true,
          },
        ],
        terrainSuggestions: [
          {
            name: 'Ruined Buildings',
            description: 'Scattered ruins providing cover near objectives',
            size: 'SMALL',
            category: 'RUINS',
            isRequired: true,
          },
        ],
        suggestedPoints: [750, 1000, 1500],
      },
      {
        id: 'breakthrough',
        name: 'Breakthrough',
        description: 'Force a path through enemy lines to escape the battlefield',
        gameSystem: 'grimdark-future',
        objectives: [
          {
            title: 'Breakthrough',
            description: 'Get 50% of your force to the opposite table edge',
            points: 4,
            type: 'CUSTOM',
            isRequired: true,
          },
          {
            title: 'Prevent Escape',
            description: 'Stop enemy units from reaching your table edge',
            points: 2,
            type: 'CUSTOM',
            isRequired: false,
          },
        ],
        specialRules: [
          {
            title: 'Reserves',
            description: 'Up to 50% of forces may be held in reserve',
            phase: 'DEPLOYMENT',
            isActive: true,
          },
        ],
        terrainSuggestions: [
          {
            name: 'Central Barrier',
            description: 'A line of obstacles blocking direct movement',
            size: 'LARGE',
            category: 'OBSTACLE',
            isRequired: true,
          },
        ],
        suggestedPoints: [1000, 1500, 2000],
      },
    ];

    if (gameSystem) {
      return templates.filter(t => t.gameSystem === gameSystem);
    }
    
    return templates;
  }

  private static async validateCampaignAccess(campaignId: string, userId: string): Promise<void> {
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
    });

    if (!campaign) {
      throw ValidationUtils.createError('Campaign not found or access denied', 404);
    }
  }

  private static async validateCampaignPermissions(campaignId: string, userId: string): Promise<void> {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
      },
      include: {
        group: {
          include: {
            memberships: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw ValidationUtils.createError('Campaign not found', 404);
    }

    const isCreator = campaign.createdBy === userId;
    const isGroupOwner = campaign.group.ownerId === userId;
    const isGroupAdmin = campaign.group.memberships.some(m => m.userId === userId && m.role === 'ADMIN');

    if (!isCreator && !isGroupOwner && !isGroupAdmin) {
      throw ValidationUtils.createError('You do not have permission to modify this mission', 403);
    }
  }

  private static validateMissionInput(data: Partial<CreateMissionRequest>): void {
    if (data.title && (data.title.length < 3 || data.title.length > 100)) {
      throw ValidationUtils.createError('Mission title must be between 3 and 100 characters', 400);
    }

    if (data.description && data.description.length > 2000) {
      throw ValidationUtils.createError('Mission description must be less than 2000 characters', 400);
    }

    if (data.points && (data.points < 100 || data.points > 10000)) {
      throw ValidationUtils.createError('Mission points must be between 100 and 10000', 400);
    }

    if (data.objectives) {
      for (const obj of data.objectives) {
        if (!obj.title || obj.title.length < 3 || obj.title.length > 100) {
          throw ValidationUtils.createError('Objective titles must be between 3 and 100 characters', 400);
        }
        if (obj.points < 0 || obj.points > 10) {
          throw ValidationUtils.createError('Objective points must be between 0 and 10', 400);
        }
      }
    }

    if (data.specialRules) {
      for (const rule of data.specialRules) {
        if (!rule.title || rule.title.length < 3 || rule.title.length > 100) {
          throw ValidationUtils.createError('Rule titles must be between 3 and 100 characters', 400);
        }
      }
    }
  }

  private static toMissionData(mission: any): MissionData {
    return {
      id: mission.id,
      campaignId: mission.campaignId,
      number: mission.number,
      title: mission.title,
      description: mission.description,
      points: mission.points,
      status: mission.status,
      scheduledDate: mission.scheduledDate,
      objectives: Array.isArray(mission.objectives) ? mission.objectives : [],
      specialRules: Array.isArray(mission.specialRules) ? mission.specialRules : [],
      terrainSuggestions: Array.isArray(mission.terrainSuggestions) ? mission.terrainSuggestions : [],
      battleReportFile: mission.battleReportFile,
      battles: mission.battles?.map((battle: any) => ({
        id: battle.id,
        status: battle.status,
        startedAt: battle.startedAt,
        completedAt: battle.completedAt,
        participantCount: battle.participants?.length || 0,
        winner: null, // Will be determined from battle results
      })) || [],
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    };
  }
}