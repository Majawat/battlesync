import { PrismaClient } from '@prisma/client';
import { ValidationUtils } from '../utils/validation';

const prisma = new PrismaClient();

export interface CreateBattleRequest {
  missionId: string;
  participants: Array<{
    userId: string;
    armyId: string;
  }>;
}

export interface BattleState {
  battleId: string;
  status: 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  currentTurn: number;
  participants: Array<{
    userId: string;
    armyId: string;
    faction: string;
    units: UnitState[];
  }>;
  events: BattleEventData[];
}

export interface UnitState {
  unitId: string;
  name: string;
  currentHp: number;
  maxHp: number;
  status: 'active' | 'shaken' | 'routed' | 'destroyed';
  kills: number;
  lastModified: Date;
}

export interface BattleEventData {
  id: string;
  type: string;
  userId: string;
  timestamp: Date;
  data: any;
}

export interface ApplyDamageRequest {
  battleId: string;
  userId: string;
  targetUnitId: string;
  damage: number;
  sourceDescription?: string;
}

export interface RecordKillRequest {
  battleId: string;
  userId: string;
  killedUnitId: string;
  killerUnitId?: string;
}

export class BattleService {
  
  /**
   * Create a new battle session from a mission
   */
  static async createBattle(data: CreateBattleRequest, creatorId: string) {
    // Validate mission exists and user has access
    const mission = await prisma.mission.findFirst({
      where: { id: data.missionId },
      include: {
        campaign: {
          include: {
            memberships: {
              where: { userId: creatorId }
            }
          }
        }
      }
    });

    if (!mission) {
      throw ValidationUtils.createError('Mission not found', 404);
    }

    if (mission.campaign.memberships.length === 0) {
      throw ValidationUtils.createError('You are not a member of this campaign', 403);
    }

    // Validate all participants have armies in the campaign
    for (const participant of data.participants) {
      const army = await prisma.army.findFirst({
        where: {
          id: participant.armyId,
          userId: participant.userId,
          campaignId: mission.campaignId
        }
      });

      if (!army) {
        throw ValidationUtils.createError(`Army not found for participant ${participant.userId}`, 400);
      }
    }

    // Create battle
    const battle = await prisma.battle.create({
      data: {
        campaignId: mission.campaignId,
        missionId: data.missionId,
        status: 'SETUP',
        currentState: this.createInitialBattleState(data.participants) as any,
        participants: {
          create: await Promise.all(data.participants.map(async (p) => {
            const army = await prisma.army.findUnique({ 
              where: { id: p.armyId },
              select: { faction: true, points: true }
            });
            return {
              userId: p.userId,
              armyId: p.armyId,
              faction: army?.faction || 'Unknown',
              startingPoints: army?.points || 0
            };
          }))
        }
      },
      include: {
        mission: true,
        participants: {
          include: {
            army: {
              select: { name: true, faction: true, armyData: true }
            }
          }
        }
      }
    });

    // Create initial battle event
    await this.recordBattleEvent(battle.id, creatorId, 'BATTLE_STARTED', {
      missionId: data.missionId,
      participantCount: data.participants.length
    });

    // TODO: Add WebSocket notifications when WebSocketManager is available
    // const battleRoom = `battles:${battle.id}`;
    // Notify participants via WebSocket

    return battle;
  }

  /**
   * Get battle details with current state
   */
  static async getBattle(battleId: string, userId: string) {
    const battle = await prisma.battle.findFirst({
      where: { 
        id: battleId,
        participants: {
          some: { userId }
        }
      },
      include: {
        mission: true,
        participants: {
          include: {
            army: {
              select: { name: true, faction: true, armyData: true }
            }
          }
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 50
        }
      }
    });

    if (!battle) {
      throw ValidationUtils.createError('Battle not found or access denied', 404);
    }

    return battle;
  }

  /**
   * Apply damage to a unit in battle
   */
  static async applyDamage(data: ApplyDamageRequest) {
    const battle = await this.getBattle(data.battleId, data.userId);
    
    if (battle.status !== 'ACTIVE') {
      throw ValidationUtils.createError('Battle is not active', 400);
    }

    const battleState = battle.currentState as any as BattleState;
    
    // Find the target unit
    let targetUnit: UnitState | null = null;
    let participantIndex = -1;
    let unitIndex = -1;

    for (let i = 0; i < battleState.participants.length; i++) {
      const unitIdx = battleState.participants[i].units.findIndex(u => u.unitId === data.targetUnitId);
      if (unitIdx !== -1) {
        targetUnit = battleState.participants[i].units[unitIdx];
        participantIndex = i;
        unitIndex = unitIdx;
        break;
      }
    }

    if (!targetUnit) {
      throw ValidationUtils.createError('Target unit not found', 404);
    }

    if (targetUnit.status === 'destroyed') {
      throw ValidationUtils.createError('Cannot damage destroyed unit', 400);
    }

    // Apply damage
    const newHp = Math.max(0, targetUnit.currentHp - data.damage);
    const wasDestroyed = newHp === 0 && targetUnit.currentHp > 0;
    
    // Update unit state
    battleState.participants[participantIndex].units[unitIndex] = {
      ...targetUnit,
      currentHp: newHp,
      status: newHp === 0 ? 'destroyed' : targetUnit.status,
      lastModified: new Date()
    };

    // Update battle in database
    await prisma.battle.update({
      where: { id: data.battleId },
      data: { 
        currentState: battleState as any,
        updatedAt: new Date()
      }
    });

    // Record event
    await this.recordBattleEvent(data.battleId, data.userId, 'UNIT_DAMAGED', {
      targetUnitId: data.targetUnitId,
      damage: data.damage,
      newHp: newHp,
      wasDestroyed,
      sourceDescription: data.sourceDescription
    });

    // If unit was destroyed, also record kill event
    if (wasDestroyed) {
      await this.recordBattleEvent(data.battleId, data.userId, 'UNIT_KILLED', {
        killedUnitId: data.targetUnitId,
        unitName: targetUnit.name
      });
      
      // Update participant kill count
      await prisma.battleParticipant.updateMany({
        where: {
          battleId: data.battleId,
          userId: data.userId
        },
        data: {
          kills: { increment: 1 }
        }
      });
    }

    // TODO: Add WebSocket broadcast when WebSocketManager is available
    // Broadcast update to battle room

    return { success: true, newHp, wasDestroyed };
  }

  /**
   * Start an active battle
   */
  static async startBattle(battleId: string, userId: string) {
    const battle = await this.getBattle(battleId, userId);
    
    if (battle.status !== 'SETUP') {
      throw ValidationUtils.createError('Battle is not in setup phase', 400);
    }

    await prisma.battle.update({
      where: { id: battleId },
      data: { 
        status: 'ACTIVE',
        startedAt: new Date()
      }
    });

    await this.recordBattleEvent(battleId, userId, 'BATTLE_STARTED', {
      startedBy: userId
    });

    // TODO: Add WebSocket broadcast when WebSocketManager is available
    // Broadcast to battle room

    return { success: true };
  }

  /**
   * Complete a battle and calculate experience
   */
  static async completeBattle(battleId: string, userId: string, winnerId?: string) {
    const battle = await this.getBattle(battleId, userId);
    
    if (battle.status !== 'ACTIVE') {
      throw ValidationUtils.createError('Battle is not active', 400);
    }

    // Calculate final experience and update participants
    const participants = await prisma.battleParticipant.findMany({
      where: { battleId }
    });

    for (const participant of participants) {
      const isWinner = participant.userId === winnerId;
      const baseExp = participant.kills * 5; // 5 exp per kill
      const winBonus = isWinner ? 10 : 5; // 10 for win, 5 for participation
      const finalExperience = baseExp + winBonus;

      await prisma.battleParticipant.update({
        where: { id: participant.id },
        data: {
          finalExperience,
          isWinner
        }
      });
    }

    await prisma.battle.update({
      where: { id: battleId },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    await this.recordBattleEvent(battleId, userId, 'BATTLE_ENDED', {
      endedBy: userId,
      winnerId
    });

    // TODO: Add WebSocket broadcast when WebSocketManager is available
    // Broadcast completion

    return { success: true };
  }

  /**
   * Get campaign battles
   */
  static async getCampaignBattles(campaignId: string, userId: string) {
    // Verify user is campaign member
    const membership = await prisma.campaignMembership.findFirst({
      where: { campaignId, userId }
    });

    if (!membership) {
      throw ValidationUtils.createError('Access denied to campaign', 403);
    }

    const battles = await prisma.battle.findMany({
      where: { campaignId },
      include: {
        mission: {
          select: { title: true, number: true }
        },
        participants: {
          include: {
            army: {
              select: { name: true, faction: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return battles;
  }

  /**
   * Helper method to create initial battle state
   */
  private static createInitialBattleState(participants: Array<{ userId: string; armyId: string }>): BattleState {
    return {
      battleId: '', // Will be set after creation
      status: 'SETUP',
      currentTurn: 0,
      participants: participants.map(p => ({
        userId: p.userId,
        armyId: p.armyId,
        faction: 'Unknown', // Will be updated when armies are loaded
        units: [] // Will be populated when battle starts
      })),
      events: []
    };
  }

  /**
   * Helper method to record battle events
   */
  private static async recordBattleEvent(battleId: string, userId: string, eventType: string, data: any) {
    await prisma.battleEvent.create({
      data: {
        battleId,
        userId,
        eventType: eventType as any,
        data
      }
    });
  }
}