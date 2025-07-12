import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SimpleMission {
  id: string;
  title: string;
  campaignId: string;
  points: number;
}

export class SimpleMissionService {
  static async createTestMission(campaignId: string, userId: string): Promise<SimpleMission> {
    const mission = await prisma.mission.create({
      data: {
        campaignId,
        number: 1,
        title: 'Test Battle Mission',
        description: 'A test mission for OPR battle tracking',
        points: 1000,
        objectives: { primary: 'Eliminate enemy forces' },
        specialRules: [],
        terrainSuggestions: [],
        status: 'ACTIVE'
      }
    });

    return {
      id: mission.id,
      title: mission.title,
      campaignId: mission.campaignId,
      points: mission.points
    };
  }

  static async getMission(missionId: string): Promise<SimpleMission | null> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId }
    });

    if (!mission) return null;

    return {
      id: mission.id,
      title: mission.title,
      campaignId: mission.campaignId,
      points: mission.points
    };
  }
}