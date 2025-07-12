import { PrismaClient } from '@prisma/client';
import { 
  OPRBattleState, 
  OPRBattleArmy, 
  OPRBattleUnit, 
  OPRBattleModel,
  OPRBattlePhase,
  OPRBattleEvent,
  OPRBattleEventType,
  ApplyDamageRequest,
  DamageResult,
  BattleResult,
  PhaseTransition,
  CommandPointAction,
  UnderdogPointGain,
  TouchDamageInput
} from '../types/oprBattle';
import { Army } from '../types/army';
import { OPRArmyConverter } from './oprArmyConverter';
import { logger } from '../utils/logger';
import { ValidationUtils } from '../utils/validation';

const prisma = new PrismaClient();

export class OPRBattleService {

  /**
   * Create a new OPR battle from a mission
   */
  static async createOPRBattle(
    missionId: string,
    participants: Array<{ userId: string; armyId: string }>,
    createdBy: string
  ): Promise<{ success: boolean; battleId?: string; battle?: OPRBattleState; error?: string }> {
    try {
      // Validate mission exists and get campaign
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          campaign: true
        }
      });

      if (!mission) {
        return { success: false, error: 'Mission not found' };
      }

      // Validate all participants and their armies
      const armies: Army[] = [];
      for (const participant of participants) {
        const army = await prisma.army.findUnique({
          where: { id: participant.armyId },
          include: { user: true }
        });

        if (!army) {
          return { success: false, error: `Army ${participant.armyId} not found` };
        }

        if (army.userId !== participant.userId) {
          return { success: false, error: `User ${participant.userId} does not own army ${participant.armyId}` };
        }

        if (army.campaignId !== mission.campaignId) {
          return { success: false, error: `Army ${army.name} is not registered to this campaign` };
        }

        armies.push(army as any); // Type assertion for testing
      }

      // Create battle in database
      const battle = await prisma.battle.create({
        data: {
          missionId,
          groupId: mission.campaign?.groupId || mission.campaignId,
          campaignId: mission.campaignId,
          status: 'SETUP',
          currentState: {},
          createdBy
        }
      });

      // Create battle participants
      await Promise.all(participants.map(p => {
        const army = armies.find(a => a.id === p.armyId);
        return prisma.battleParticipant.create({
          data: {
            battleId: battle.id,
            userId: p.userId,
            armyId: p.armyId,
            faction: army?.armyData?.faction || 'Unknown',
            startingPoints: army?.points || 0
          }
        });
      }));

      // Convert armies to battle format
      const battleArmies: OPRBattleArmy[] = [];
      for (const army of armies) {
        if (army.armyData) {
          const conversionResult = await OPRArmyConverter.convertArmyToBattle(
            army.userId,
            army.id,
            army.armyData as any, // Type assertion for JSON data
            {
              allowCombined: true,
              allowJoined: true,
              preserveCustomNames: true
            }
          );

          if (conversionResult.success) {
            battleArmies.push(conversionResult.army);
          } else {
            logger.error(`Failed to convert army ${army.name}:`, conversionResult.errors);
          }
        }
      }

      // Create initial OPR battle state
      const oprBattleState: OPRBattleState = {
        battleId: battle.id,
        status: 'SETUP',
        phase: 'GAME_SETUP',
        currentRound: 0,
        armies: battleArmies,
        events: [],
        gameSettings: {
          gameSystem: 'grimdark-future', // Default to GF for now
          pointsLimit: 1000, // Default points
          allowUnderdog: true,
          customRules: []
        }
      };

      // Save battle state
      await prisma.battle.update({
        where: { id: battle.id },
        data: { currentState: oprBattleState as any }
      });

      // Record battle creation event
      await this.recordBattleEvent(
        battle.id,
        createdBy,
        'BATTLE_STARTED',
        {
          description: `Battle created with ${participants.length} participants`,
          missionId,
          participantCount: participants.length
        }
      );

      // Notify participants via WebSocket
      // Note: WebSocket integration would be implemented here

      logger.info(`OPR Battle ${battle.id} created for mission ${missionId}`);

      return {
        success: true,
        battleId: battle.id,
        battle: oprBattleState
      };

    } catch (error) {
      logger.error('Error creating OPR battle:', error);
      return { success: false, error: 'Failed to create battle' };
    }
  }

  /**
   * Get OPR battle state
   */
  static async getOPRBattleState(battleId: string, userId: string): Promise<OPRBattleState | null> {
    try {
      const battle = await prisma.battle.findUnique({
        where: { id: battleId },
        include: {
          participants: true,
          mission: {
            include: { campaign: true }
          }
        }
      });

      if (!battle) return null;

      // Verify user has access to this battle
      const hasAccess = battle.participants.some(p => p.userId === userId);
      if (!hasAccess) {
        throw new Error('User does not have access to this battle');
      }

      return battle.currentState as unknown as OPRBattleState;

    } catch (error) {
      logger.error('Error getting OPR battle state:', error);
      return null;
    }
  }

  /**
   * Transition battle phase
   */
  static async transitionPhase(
    battleId: string,
    userId: string,
    newPhase: OPRBattlePhase
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const oldPhase = battleState.phase;

      // Validate phase transition
      const validTransition = this.validatePhaseTransition(oldPhase, newPhase);
      if (!validTransition.valid) {
        return { success: false, error: validTransition.error };
      }

      // Update battle state
      battleState.phase = newPhase;
      
      // Special phase handling
      if (newPhase === 'BATTLE_ROUNDS' && oldPhase === 'DEPLOYMENT') {
        battleState.status = 'ACTIVE';
        battleState.currentRound = 1;
      }

      // Save updated state
      await prisma.battle.update({
        where: { id: battleId },
        data: { 
          currentState: battleState as any,
          status: battleState.status as any
        }
      });

      // Record event
      await this.recordBattleEvent(
        battleId,
        userId,
        'PHASE_CHANGED',
        {
          description: `Battle phase changed from ${oldPhase} to ${newPhase}`,
          fromPhase: oldPhase,
          toPhase: newPhase
        }
      );

      // Broadcast phase change
      // Note: WebSocket integration would be implemented here

      return { success: true };

    } catch (error) {
      logger.error('Error transitioning battle phase:', error);
      return { success: false, error: 'Failed to transition phase' };
    }
  }

  /**
   * Apply damage to unit/model (optimized for touch interface)
   */
  static async applyDamage(request: ApplyDamageRequest): Promise<DamageResult> {
    try {
      const battleState = await this.getOPRBattleState(request.battleId, request.userId);
      if (!battleState) {
        throw new Error('Battle not found');
      }

      // Find target army and unit
      const targetArmy = battleState.armies.find(a => 
        a.units.some(u => u.unitId === request.targetUnitId)
      );
      
      if (!targetArmy) {
        throw new Error('Target unit not found');
      }

      const targetUnit = targetArmy.units.find(u => u.unitId === request.targetUnitId);
      if (!targetUnit || targetUnit.routed) {
        throw new Error('Invalid target unit');
      }

      // Apply damage logic
      const damageResult = await this.processDamage(
        targetUnit,
        request.damage,
        request.targetModelId,
        request.ignoreTough
      );

      // Update army kill count if unit was destroyed
      if (damageResult.unitDestroyed && request.sourceUnitId) {
        const sourceArmy = battleState.armies.find(a => 
          a.units.some(u => u.unitId === request.sourceUnitId)
        );
        if (sourceArmy) {
          sourceArmy.killCount += 1;
          const sourceUnit = sourceArmy.units.find(u => u.unitId === request.sourceUnitId);
          if (sourceUnit) {
            sourceUnit.kills += 1;
          }
        }
      }

      // Mark who killed the unit
      if (damageResult.unitDestroyed && request.sourceUnitId) {
        targetUnit.killedBy = request.sourceUnitId;
      }

      // Save updated battle state
      await prisma.battle.update({
        where: { id: request.battleId },
        data: { currentState: battleState as any }
      });

      // Record damage event
      await this.recordBattleEvent(
        request.battleId,
        request.userId,
        damageResult.unitDestroyed ? 'UNIT_DESTROYED' : 'DAMAGE_APPLIED',
        {
          description: request.sourceDescription || 'Damage applied',
          targetUnitId: request.targetUnitId,
          targetModelId: request.targetModelId,
          damage: request.damage,
          modelsDestroyed: damageResult.modelsDestroyed,
          sourceUnitId: request.sourceUnitId
        }
      );

      // Broadcast damage update
      // Note: WebSocket integration would be implemented here

      return damageResult;

    } catch (error) {
      logger.error('Error applying damage:', error);
      throw error;
    }
  }

  /**
   * Quick damage application for touch interface
   */
  static async applyQuickDamage(
    battleId: string,
    userId: string,
    input: TouchDamageInput
  ): Promise<DamageResult> {
    const damage = input.customDamage || input.quickDamage;
    
    return this.applyDamage({
      battleId,
      userId,
      targetUnitId: input.unitId,
      targetModelId: input.modelId,
      damage,
      sourceDescription: `Quick damage: ${damage} point(s)`
    });
  }

  /**
   * Join hero to unit
   */
  static async joinHeroToUnit(
    battleId: string,
    userId: string,
    heroUnitId: string,
    targetUnitId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      // Find hero and target units
      const userArmy = battleState.armies.find(a => a.userId === userId);
      if (!userArmy) {
        return { success: false, error: 'User army not found' };
      }

      const heroUnit = userArmy.units.find(u => u.unitId === heroUnitId);
      const targetUnit = userArmy.units.find(u => u.unitId === targetUnitId);

      if (!heroUnit || !targetUnit) {
        return { success: false, error: 'Units not found' };
      }

      // Validate hero can join
      const heroModel = heroUnit.models.find(m => m.isHero);
      if (!heroModel) {
        return { success: false, error: 'Unit is not a hero' };
      }

      if (heroModel.maxTough > 6) {
        return { success: false, error: 'Hero has Tough(7+) and cannot join units' };
      }

      if (targetUnit.models.some(m => m.isHero)) {
        return { success: false, error: 'Target unit already has a hero' };
      }

      // Join hero to unit
      targetUnit.type = 'JOINED';
      targetUnit.joinedHero = heroModel;
      targetUnit.models.push(heroModel);
      targetUnit.originalSize += 1;
      targetUnit.currentSize += 1;

      // Remove hero unit from army
      userArmy.units = userArmy.units.filter(u => u.unitId !== heroUnitId);

      // Save state
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // Record event
      await this.recordBattleEvent(
        battleId,
        userId,
        'UNIT_ACTIVATED',
        {
          description: `Hero ${heroModel.name} joined unit ${targetUnit.name}`,
          unitId: targetUnitId,
          heroUnitId: heroUnitId
        }
      );

      // Broadcast update
      // Note: WebSocket integration would be implemented here

      return { success: true };

    } catch (error) {
      logger.error('Error joining hero to unit:', error);
      return { success: false, error: 'Failed to join hero' };
    }
  }

  /**
   * Process damage on unit/model
   */
  private static async processDamage(
    unit: OPRBattleUnit,
    damage: number,
    targetModelId?: string,
    ignoreTough: boolean = false
  ): Promise<DamageResult> {
    
    let modelsDestroyed = 0;
    let moraleTestRequired = false;
    
    // Find target model or use first available
    let targetModel: OPRBattleModel;
    
    if (targetModelId) {
      const found = unit.models.find(m => m.modelId === targetModelId && !m.isDestroyed);
      if (!found) {
        throw new Error('Target model not found or already destroyed');
      }
      targetModel = found;
    } else {
      // Auto-target: non-heroes first, then heroes
      const availableModels = unit.models.filter(m => !m.isDestroyed);
      const nonHeroes = availableModels.filter(m => !m.isHero);
      targetModel = nonHeroes.length > 0 ? nonHeroes[0] : availableModels[0];
      
      if (!targetModel) {
        throw new Error('No available models to damage');
      }
    }

    // Apply damage
    if (ignoreTough) {
      targetModel.isDestroyed = true;
      modelsDestroyed = 1;
    } else {
      targetModel.currentTough -= damage;
      if (targetModel.currentTough <= 0) {
        targetModel.isDestroyed = true;
        modelsDestroyed = 1;
      }
    }

    // Update unit size
    const aliveModels = unit.models.filter(m => !m.isDestroyed);
    unit.currentSize = aliveModels.length;

    // Check for unit destruction
    const unitDestroyed = unit.currentSize === 0;

    // Check for shaken/routing (OPR morale rules)
    let unitShaken = false;
    let unitRouted = false;

    if (!unitDestroyed && modelsDestroyed > 0) {
      const originalSize = unit.originalSize;
      const currentSize = unit.currentSize;
      
      // Unit is shaken if it lost models this turn
      unitShaken = true;
      unit.shaken = true;
      
      // Unit might rout if at half strength or less
      if (currentSize <= Math.floor(originalSize / 2)) {
        moraleTestRequired = true;
        // For simplicity, auto-fail morale test (user can override in UI)
        unitRouted = true;
        unit.routed = true;
      }
    }

    return {
      success: true,
      modelsDestroyed,
      unitDestroyed,
      unitShaken,
      unitRouted,
      moraleTestRequired,
      experienceGained: modelsDestroyed, // 1 XP per model killed
      events: [] // Events handled by caller
    };
  }

  /**
   * Validate phase transition
   */
  private static validatePhaseTransition(
    from: OPRBattlePhase, 
    to: OPRBattlePhase
  ): { valid: boolean; error?: string } {
    
    const validTransitions: Record<OPRBattlePhase, OPRBattlePhase[]> = {
      'GAME_SETUP': ['DEPLOYMENT'],
      'DEPLOYMENT': ['BATTLE_ROUNDS'],
      'BATTLE_ROUNDS': ['GAME_END'],
      'GAME_END': [] // Terminal phase
    };

    if (!validTransitions[from].includes(to)) {
      return {
        valid: false,
        error: `Invalid phase transition from ${from} to ${to}`
      };
    }

    return { valid: true };
  }

  /**
   * Record battle event
   */
  private static async recordBattleEvent(
    battleId: string,
    userId: string,
    eventType: OPRBattleEventType,
    data: any
  ): Promise<void> {
    await prisma.battleEvent.create({
      data: {
        battleId,
        userId,
        eventType: eventType as any,
        data
      }
    });
  }

  /**
   * Complete OPR battle and calculate results
   */
  static async completeBattle(
    battleId: string,
    userId: string,
    winnerId?: string
  ): Promise<BattleResult> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        throw new Error('Battle not found');
      }

      // Calculate final scores (kill counts)
      const finalScores: Record<string, number> = {};
      const experienceAwarded: Record<string, number> = {};

      for (const army of battleState.armies) {
        finalScores[army.userId] = army.killCount;
        
        // Award experience: base XP + kills
        const baseXP = 5; // Base XP for participation
        const killXP = army.killCount * 2; // 2 XP per kill
        const winXP = winnerId === army.userId ? 10 : 0; // Bonus for winning
        
        experienceAwarded[army.userId] = baseXP + killXP + winXP;
      }

      // Update battle status
      battleState.status = 'COMPLETED';
      battleState.phase = 'GAME_END';

      // Save final state
      await prisma.battle.update({
        where: { id: battleId },
        data: {
          currentState: battleState as any,
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Update participant records
      for (const army of battleState.armies) {
        await prisma.battleParticipant.updateMany({
          where: {
            battleId,
            userId: army.userId
          },
          data: {
            kills: army.killCount,
            finalExperience: experienceAwarded[army.userId],
            isWinner: winnerId === army.userId
          }
        });
      }

      // Record completion event
      await this.recordBattleEvent(
        battleId,
        userId,
        'BATTLE_ENDED',
        {
          description: 'Battle completed',
          winner: winnerId,
          finalScores,
          experienceAwarded
        }
      );

      // Broadcast completion
      // Note: WebSocket integration would be implemented here

      const result: BattleResult = {
        battleId,
        winner: winnerId,
        finalScores,
        experienceAwarded,
        duration: 0, // Calculate from battle start/end times
        totalRounds: battleState.currentRound,
        finalState: battleState
      };

      logger.info(`OPR Battle ${battleId} completed`);
      return result;

    } catch (error) {
      logger.error('Error completing OPR battle:', error);
      throw error;
    }
  }
}