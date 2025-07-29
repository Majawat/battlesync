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
import { DeploymentService } from './deploymentService';
import { getWebSocketManager } from './websocket';
import { NotificationService } from './notificationService';
import { logger } from '../utils/logger';
import { ValidationUtils } from '../utils/validation';

const prisma = new PrismaClient();

export class OPRBattleService {

  /**
   * Refresh caster tokens for all caster units at the start of a new round
   */
  private static refreshCasterTokens(battleState: OPRBattleState): void {
    for (const army of battleState.armies) {
      for (const unit of army.units) {
        // Refresh caster tokens for regular models
        for (const model of unit.models) {
          if (model.casterTokens > 0 || model.specialRules.some(rule => rule.includes('Caster('))) {
            // Extract the max caster tokens from special rules
            const casterRule = model.specialRules.find(rule => rule.includes('Caster('));
            if (casterRule) {
              const match = casterRule.match(/Caster\((\d+)\)/i);
              if (match) {
                const maxTokens = parseInt(match[1], 10);
                // Refresh to max tokens (max 6 as per OPR rules)
                model.casterTokens = Math.min(maxTokens, 6);
              }
            }
          }
        }
        
        // Refresh caster tokens for joined heroes
        if (unit.joinedHero && (unit.joinedHero.casterTokens > 0 || unit.joinedHero.specialRules.some(rule => rule.includes('Caster(')))) {
          const casterRule = unit.joinedHero.specialRules.find(rule => rule.includes('Caster('));
          if (casterRule) {
            const match = casterRule.match(/Caster\((\d+)\)/i);
            if (match) {
              const maxTokens = parseInt(match[1], 10);
              // Refresh to max tokens (max 6 as per OPR rules)
              unit.joinedHero.casterTokens = Math.min(maxTokens, 6);
            }
          }
        }
      }
    }
  }

  /**
   * Refresh command points for growing/temporary methods
   */
  private static refreshCommandPoints(battleState: OPRBattleState, campaign: any): void {
    const commandPointMethod = campaign.settings?.commandPointMethod || 'fixed';
    const methodConfig = this.getCommandPointMethodConfig(commandPointMethod);
    
    if (!methodConfig.isGrowing) {
      return; // Only refresh for growing methods
    }
    
    for (const army of battleState.armies) {
      // Calculate command points for this round
      const { CommandPointService } = require('./commandPointService');
      const result = CommandPointService.calculateCommandPoints(army.totalPoints, commandPointMethod);
      
      if (methodConfig.isTemporary) {
        // Temporary: Reset to new amount (discard unspent)
        army.currentCommandPoints = result.totalCommandPoints;
      } else {
        // Growing: Add to existing amount
        army.currentCommandPoints += result.totalCommandPoints;
      }
      
      // Update max for tracking purposes
      army.maxCommandPoints = Math.max(army.maxCommandPoints, army.currentCommandPoints);
    }
  }

  /**
   * Get command point method configuration
   */
  private static getCommandPointMethodConfig(method: string) {
    switch (method) {
      case 'fixed':
        return { basePerThousand: 4, isRandom: false, isGrowing: false, isTemporary: false };
      case 'growing':
        return { basePerThousand: 1, isRandom: false, isGrowing: true, isTemporary: false };
      case 'temporary':
        return { basePerThousand: 1, isRandom: false, isGrowing: true, isTemporary: true };
      case 'fixed-random':
        return { basePerThousand: 2, isRandom: true, isGrowing: false, isTemporary: false };
      case 'growing-random':
        return { basePerThousand: 0.5, isRandom: true, isGrowing: true, isTemporary: false };
      case 'temporary-random':
        return { basePerThousand: 0.5, isRandom: true, isGrowing: true, isTemporary: true };
      default:
        return { basePerThousand: 4, isRandom: false, isGrowing: false, isTemporary: false };
    }
  }

  /**
   * Helper method to broadcast WebSocket messages to battle room
   */
  private static broadcastToBattleRoom(battleId: string, type: string, data: any): void {
    try {
      const wsManager = getWebSocketManager();
      if (wsManager) {
        const roomId = `battles:${battleId}`;
        const message = {
          type,
          data,
          timestamp: new Date().toISOString()
        };
        
        // Use the public broadcastToRoom method via the manager instance
        wsManager.broadcastToRoomPublic(roomId, message);
        logger.debug(`Broadcasting to battle room ${roomId}:`, { type, data });
      } else {
        logger.warn('WebSocket manager not available for battle broadcast');
      }
    } catch (error) {
      logger.error('Error broadcasting to battle room:', error);
    }
  }

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

      // Convert armies to battle format or use existing battle data
      const battleArmies: OPRBattleArmy[] = [];
      for (const army of armies) {
        if (army.armyData) {
          const armyData = army.armyData as any;
          
          // Check if we have pre-converted battle data
          if (armyData.convertedBattleData) {
            // Use the stored converted data
            battleArmies.push(armyData.convertedBattleData as OPRBattleArmy);
          } else if (armyData.armyId && armyData.units && Array.isArray(armyData.units)) {
            // Legacy: already in battle format, use directly
            battleArmies.push(armyData as OPRBattleArmy);
          } else {
            // Fallback: convert on the fly from ArmyForge data
            if (!army.armyForgeId) {
              logger.error(`Army ${army.id} is missing armyForgeId, cannot convert to battle format`);
              throw new Error(`Army ${army.name} is not linked to ArmyForge and cannot be used in battles`);
            }
            
            const conversionResult = await OPRArmyConverter.convertArmyToBattle(
              army.userId,
              army.armyForgeId,
              armyData,
              {
                allowCombined: true,
                allowJoined: true,
                preserveCustomNames: true
              }
            );

            if (conversionResult.success && conversionResult.army) {
              battleArmies.push(conversionResult.army);
            } else {
              logger.error(`Failed to convert army ${army.name}:`, conversionResult.errors);
            }
          }
        }
      }

      // Initialize activation state for each unit
      for (const army of battleArmies) {
        for (const unit of army.units) {
          unit.activationState = {
            canActivate: false, // Not active until battle rounds
            hasActivated: false,
            activatedInRound: 0,
            activatedInTurn: 0,
            isSelected: false,
            actionPoints: 1, // Standard action points
            actionsUsed: []
          };
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
        },
        // Initialize empty activation state (will be populated when battle rounds start)
        activationState: {
          currentTurn: 0,
          maxTurns: 0,
          activationOrder: [],
          unitsActivatedThisRound: [],
          isAwaitingActivation: false,
          canPassTurn: false,
          passedPlayers: [],
          roundComplete: true, // Setup phase, no activation needed
          lastRoundFinishOrder: []
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
      this.broadcastToBattleRoom(battle.id, 'battle_created', {
        battleId: battle.id,
        phase: 'GAME_SETUP',
        armies: battleArmies.map(a => ({ 
          name: a.armyName, 
          faction: a.faction, 
          points: a.totalPoints 
        }))
      });

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
   * Join an existing battle with user's army
   */
  static async joinBattle(
    battleId: string,
    userId: string,
    armyId: string
  ): Promise<{ success: boolean; battleState?: OPRBattleState; error?: string }> {
    try {
      // Get battle and validate
      const battle = await prisma.battle.findUnique({
        where: { id: battleId },
        include: {
          mission: {
            include: { campaign: true }
          },
          participants: true
        }
      });

      if (!battle) {
        return { success: false, error: 'Battle not found' };
      }

      if (battle.status !== 'SETUP') {
        return { success: false, error: 'Can only join battles in SETUP phase' };
      }

      // Check if user is already a participant
      const existingParticipant = battle.participants.find(p => p.userId === userId);
      if (existingParticipant) {
        return { success: false, error: 'User is already participating in this battle' };
      }

      // Validate army ownership and campaign membership
      const army = await prisma.army.findUnique({
        where: { id: armyId },
        include: { user: true }
      });

      if (!army) {
        return { success: false, error: 'Army not found' };
      }

      if (army.userId !== userId) {
        return { success: false, error: 'You do not own this army' };
      }

      if (army.campaignId !== battle.mission?.campaignId) {
        return { success: false, error: 'Army is not registered to this campaign' };
      }

      // Check if user is a campaign member
      const campaignMember = await prisma.campaignParticipation.findFirst({
        where: {
          campaignId: battle.mission?.campaignId,
          groupMembership: {
            userId: userId
          }
        },
        include: {
          groupMembership: true
        }
      });

      if (!campaignMember) {
        return { success: false, error: 'You are not a member of this campaign' };
      }

      // Convert army to battle format
      const armyData = JSON.parse(army.armyData as string);
      const conversionResult = await OPRArmyConverter.convertArmyToBattle(userId, armyId, armyData);
      
      if (!conversionResult.success || !conversionResult.army) {
        return { 
          success: false, 
          error: `Failed to convert army: ${conversionResult.errors?.join(', ')}` 
        };
      }

      // Add participant to battle
      await prisma.battleParticipant.create({
        data: {
          battleId,
          userId,
          armyId,
          faction: conversionResult.army.faction,
          startingPoints: conversionResult.army.totalPoints
        }
      });

      // Get current battle state and add the new army
      const currentState = battle.currentState as any;
      currentState.armies.push(conversionResult.army);

      // Update battle state
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: currentState as any }
      });

      // Broadcast join event
      this.broadcastToBattleRoom(battleId, 'player_joined', {
        userId,
        armyName: conversionResult.army.armyName,
        faction: conversionResult.army.faction
      });

      logger.info(`User ${userId} joined battle ${battleId} with army ${armyId}`);

      return { success: true, battleState: currentState };

    } catch (error) {
      logger.error('Error joining battle:', error);
      return { success: false, error: 'Failed to join battle' };
    }
  }

  /**
   * Get available battles for a campaign member to join
   */
  static async getAvailableBattles(
    campaignId: string,
    userId: string
  ): Promise<Array<{
    battleId: string;
    missionName: string;
    missionNumber: number;
    createdBy: string;
    createdByUsername: string;
    participantCount: number;
    maxParticipants: number;
    status: string;
    createdAt: Date;
  }>> {
    try {
      // Verify user is a campaign member
      const campaignMember = await prisma.campaignParticipation.findFirst({
        where: {
          campaignId,
          groupMembership: {
            userId: userId
          }
        }
      });

      if (!campaignMember) {
        return [];
      }

      // Get battles in SETUP phase that user hasn't joined
      const battles = await prisma.battle.findMany({
        where: {
          mission: {
            campaignId: campaignId
          },
          status: 'SETUP',
          participants: {
            none: {
              userId: userId
            }
          }
        },
        include: {
          mission: true,
          participants: true,
          creator: {
            select: {
              username: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return battles.map(battle => ({
        battleId: battle.id,
        missionName: battle.mission!.title,
        missionNumber: battle.mission!.number,
        createdBy: battle.createdBy,
        createdByUsername: battle.creator.username,
        participantCount: battle.participants.length,
        maxParticipants: 4, // Standard OPR max - could be configurable
        status: battle.status,
        createdAt: battle.createdAt
      }));

    } catch (error) {
      logger.error('Error getting available battles:', error);
      return [];
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
   * Save battle state to database
   */
  static async saveBattleState(battleId: string, battleState: OPRBattleState): Promise<void> {
    try {
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });
      logger.info(`Battle state saved for battle ${battleId}`);
    } catch (error) {
      logger.error(`Error saving battle state for battle ${battleId}:`, error);
      throw error;
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
        
        // Get campaign data for command point settings
        const battle = await prisma.battle.findUnique({
          where: { id: battleId },
          include: {
            campaign: true
          }
        });
        
        // Refresh caster tokens at start of battle rounds
        this.refreshCasterTokens(battleState);
        
        // Refresh command points if using growing/temporary methods
        if (battle?.campaign) {
          this.refreshCommandPoints(battleState, battle.campaign);
        }
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
      this.broadcastToBattleRoom(battleId, 'phase_changed', {
        phase: newPhase,
        round: battleState.currentRound,
        status: battleState.status
      });

      return { success: true };

    } catch (error) {
      logger.error('Error transitioning battle phase:', error);
      return { success: false, error: 'Failed to transition phase' };
    }
  }

  /**
   * Advance to next round in battle
   */
  static async advanceRound(
    battleId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      if (battleState.phase !== 'BATTLE_ROUNDS') {
        return { success: false, error: 'Can only advance rounds during battle phase' };
      }

      // Advance to next round
      battleState.currentRound++;
      
      // Get campaign data for command point settings
      const battle = await prisma.battle.findUnique({
        where: { id: battleId },
        include: {
          campaign: true
        }
      });
      
      // Refresh caster tokens at start of new round
      this.refreshCasterTokens(battleState);
      
      // Refresh command points if using growing/temporary methods
      if (battle?.campaign) {
        this.refreshCommandPoints(battleState, battle.campaign);
      }

      // Save updated state
      await prisma.battle.update({
        where: { id: battleId },
        data: { 
          currentState: battleState as any
        }
      });

      // Record event
      await this.recordBattleEvent(
        battleId,
        userId,
        'ROUND_STARTED',
        {
          description: `Round ${battleState.currentRound} started`,
          round: battleState.currentRound
        }
      );

      // Broadcast update
      this.broadcastToBattleRoom(battleId, 'round_advanced', {
        battleId,
        round: battleState.currentRound,
        phase: battleState.phase,
        status: battleState.status
      });

      return { success: true };
    } catch (error) {
      logger.error('Error advancing battle round:', error);
      return { success: false, error: 'Failed to advance round' };
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
      this.broadcastToBattleRoom(request.battleId, 'damage_applied', {
        targetUnitId: request.targetUnitId,
        damage: request.damage,
        modelsDestroyed: damageResult.modelsDestroyed,
        unitDestroyed: damageResult.unitDestroyed,
        unitShaken: damageResult.unitShaken,
        currentSize: targetUnit.currentSize,
        killCount: targetArmy.killCount
      });

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
      this.broadcastToBattleRoom(battleId, 'hero_joined', {
        heroName: heroModel.name,
        targetUnitId: targetUnitId,
        newSize: targetUnit.currentSize
      });

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
  static async recordBattleEvent(
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
      this.broadcastToBattleRoom(battleId, 'battle_completed', {
        winner: winnerId,
        finalScores,
        experienceAwarded
      });

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

  /**
   * Start deployment roll-off for turn order determination
   */
  static async startDeploymentRollOff(battleId: string, userId: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      // Must be in deployment phase
      if (battleState.phase !== 'DEPLOYMENT') {
        return { success: false, error: 'Can only start roll-off during deployment phase' };
      }

      // Check if roll-off already exists
      if (battleState.activationState.deploymentRollOff) {
        return { success: false, error: 'Deployment roll-off already started' };
      }

      // Initialize deployment roll-off
      const deploymentRollOff = {
        status: 'ROLLING' as const,
        rolls: {},
        timestamp: new Date()
      };

      battleState.activationState.deploymentRollOff = deploymentRollOff;

      // Save updated state
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // Notify all players
      await NotificationService.notifyBattleStateChange(battleId, 'deployment roll-off started');

      logger.info(`Deployment roll-off started for battle ${battleId}`);
      return { 
        success: true, 
        data: { deploymentRollOff } 
      };

    } catch (error) {
      logger.error('Error starting deployment roll-off:', error);
      return { success: false, error: 'Failed to start deployment roll-off' };
    }
  }

  /**
   * Submit a player's dice roll for deployment
   */
  static async submitDeploymentRoll(battleId: string, userId: string, roll: number): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const rollOff = battleState.activationState.deploymentRollOff;
      if (!rollOff) {
        return { success: false, error: 'No deployment roll-off in progress' };
      }

      if (rollOff.status !== 'ROLLING' && rollOff.status !== 'PENDING') {
        return { success: false, error: 'Deployment roll-off is not accepting rolls' };
      }

      // Check if player is in this battle
      const playerArmy = battleState.armies.find(army => army.userId === userId);
      if (!playerArmy) {
        return { success: false, error: 'You are not a participant in this battle' };
      }

      // Check if player should be rolling in current round
      const canRoll = this.canPlayerRollInCurrentRound(rollOff, userId, battleState.armies);
      if (!canRoll.allowed) {
        return { success: false, error: canRoll.reason };
      }

      // Handle roll submission and tie-breaking logic
      const rollResult = this.processRollSubmission(rollOff, userId, roll, battleState.armies);
      
      if (rollResult.completed) {
        rollOff.winner = rollResult.winner;
        rollOff.status = 'COMPLETED';
        
        // Initialize deployment state for unit placement
        const winner = rollResult.winner || battleState.armies[0]?.userId || '';
        battleState.activationState.deploymentState = DeploymentService.initializeDeploymentState(
          battleState,
          winner,
          winner // Winner can choose to go first (for now, just use winner)
        );
        
        logger.info(`Deployment roll-off completed for battle ${battleId}, winner: ${rollResult.winner}, beginning unit deployment`);
      } else {
        rollOff.status = 'ROLLING';
        if (rollResult.tiebreakStarted) {
          logger.info(`Tie detected, starting tie-breaker round ${rollResult.tiebreakRound} between: ${rollResult.tiedPlayers?.join(', ')}`);
        }
      }

      // Save updated state
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // Notify all players
      const statusMessage = rollResult.completed ? 
        `Deployment roll-off completed, winner: ${rollOff.winner}. Begin unit deployment!` : 
        'Deployment roll submitted';
      await NotificationService.notifyBattleStateChange(battleId, statusMessage);

      return { 
        success: true, 
        data: { 
          deploymentRollOff: rollOff,
          allRollsComplete: rollResult.completed
        } 
      };

    } catch (error) {
      logger.error('Error submitting deployment roll:', error);
      return { success: false, error: 'Failed to submit deployment roll' };
    }
  }

  /**
   * Get current deployment roll-off status
   */
  static async getDeploymentRollOffStatus(battleId: string, userId: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const rollOff = battleState.activationState.deploymentRollOff;
      if (!rollOff) {
        return { success: false, error: 'No deployment roll-off started' };
      }

      // Determine current round info
      const currentRoundInfo = this.getCurrentRoundInfo(rollOff, userId);
      
      // Don't reveal other players' rolls until all are submitted
      const sanitizedRollOff = {
        status: rollOff.status,
        winner: rollOff.winner,
        timestamp: rollOff.timestamp,
        currentRound: currentRoundInfo.roundType,
        tiebreakRound: currentRoundInfo.tiebreakRound,
        canPlayerRoll: currentRoundInfo.canRoll,
        tiedPlayers: currentRoundInfo.tiedPlayers,
        // Only show rolls if completed
        rolls: rollOff.status === 'COMPLETED' ? rollOff.rolls : undefined,
        tiebreakRolls: rollOff.status === 'COMPLETED' ? rollOff.tiebreakRolls : undefined,
        // Show player's own rolls
        playerRoll: rollOff.rolls[userId],
        playerTiebreakRolls: rollOff.tiebreakRolls?.map(round => round[userId]).filter(r => r !== undefined)
      };

      return { 
        success: true, 
        data: { deploymentRollOff: sanitizedRollOff } 
      };

    } catch (error) {
      logger.error('Error getting deployment roll-off status:', error);
      return { success: false, error: 'Failed to get deployment status' };
    }
  }

  /**
   * Process roll submission and handle tie-breaking logic
   */
  private static processRollSubmission(
    rollOff: any, 
    userId: string, 
    roll: number, 
    armies: any[]
  ): {
    completed: boolean;
    winner?: string;
    tiebreakStarted?: boolean;
    tiebreakRound?: number;
    tiedPlayers?: string[];
  } {
    const allPlayerIds = armies.map(army => army.userId);
    
    // Determine which round we're in
    if (!rollOff.tiebreakRolls || rollOff.tiebreakRolls.length === 0) {
      // Initial round
      rollOff.rolls[userId] = roll;
      
      // Check if all players have rolled
      const hasAllRolls = allPlayerIds.every(playerId => rollOff.rolls[playerId] !== undefined);
      if (!hasAllRolls) {
        return { completed: false };
      }
      
      // All have rolled, check for ties
      const tieResult = this.analyzeRolls(rollOff.rolls);
      if (tieResult.tiedPlayers.length <= 1) {
        // No tie, we have a winner
        return { completed: true, winner: tieResult.tiedPlayers[0] };
      }
      
      // Tie detected, start tie-breaker
      rollOff.tiebreakRolls = [{}];
      return {
        completed: false,
        tiebreakStarted: true,
        tiebreakRound: 1,
        tiedPlayers: tieResult.tiedPlayers
      };
    } else {
      // Tie-breaker round
      const currentRound = rollOff.tiebreakRolls.length - 1;
      rollOff.tiebreakRolls[currentRound][userId] = roll;
      
      // Get players who are still tied (from previous round)
      const previousTiedPlayers = this.getTiedPlayersFromPreviousRound(rollOff);
      
      // Check if all tied players have rolled in this tie-breaker round
      const hasAllTiebreakRolls = previousTiedPlayers.every(
        playerId => rollOff.tiebreakRolls[currentRound][playerId] !== undefined
      );
      
      if (!hasAllTiebreakRolls) {
        return { completed: false };
      }
      
      // All tied players have rolled, analyze results
      const tieResult = this.analyzeRolls(rollOff.tiebreakRolls[currentRound]);
      if (tieResult.tiedPlayers.length <= 1) {
        // Tie-breaker resolved
        return { completed: true, winner: tieResult.tiedPlayers[0] };
      }
      
      // Still tied, start another tie-breaker round
      rollOff.tiebreakRolls.push({});
      return {
        completed: false,
        tiebreakStarted: true,
        tiebreakRound: rollOff.tiebreakRolls.length,
        tiedPlayers: tieResult.tiedPlayers
      };
    }
  }

  /**
   * Analyze rolls to find highest rollers (handles ties)
   */
  private static analyzeRolls(rolls: Record<string, number>): { tiedPlayers: string[] } {
    const rollEntries = Object.entries(rolls);
    
    if (rollEntries.length === 0) {
      return { tiedPlayers: [] };
    }
    
    // Find highest roll
    const maxRoll = Math.max(...rollEntries.map(([_, roll]) => roll));
    const highestRollers = rollEntries
      .filter(([_, roll]) => roll === maxRoll)
      .map(([playerId, _]) => playerId);
    
    return { tiedPlayers: highestRollers };
  }

  /**
   * Get players who were tied in the previous round
   */
  private static getTiedPlayersFromPreviousRound(rollOff: any): string[] {
    if (!rollOff.tiebreakRolls || rollOff.tiebreakRolls.length === 0) {
      // First round, analyze initial rolls
      return this.analyzeRolls(rollOff.rolls).tiedPlayers;
    }
    
    // Get the previous tie-breaker round
    const prevRoundIndex = rollOff.tiebreakRolls.length - 2;
    if (prevRoundIndex < 0) {
      // First tie-breaker round, get from initial rolls
      return this.analyzeRolls(rollOff.rolls).tiedPlayers;
    }
    
    return this.analyzeRolls(rollOff.tiebreakRolls[prevRoundIndex]).tiedPlayers;
  }

  /**
   * Check if player can roll in the current round
   */
  private static canPlayerRollInCurrentRound(
    rollOff: any, 
    userId: string, 
    armies: any[]
  ): { allowed: boolean; reason?: string } {
    // Initial round - all players can roll
    if (!rollOff.tiebreakRolls || rollOff.tiebreakRolls.length === 0) {
      if (rollOff.rolls[userId] !== undefined) {
        return { allowed: false, reason: 'You have already submitted your roll' };
      }
      return { allowed: true };
    }
    
    // Tie-breaker round - only tied players can roll
    const currentRound = rollOff.tiebreakRolls.length - 1;
    const tiedPlayers = this.getTiedPlayersFromPreviousRound(rollOff);
    
    if (!tiedPlayers.includes(userId)) {
      return { allowed: false, reason: 'Only tied players can roll in tie-breaker rounds' };
    }
    
    if (rollOff.tiebreakRolls[currentRound][userId] !== undefined) {
      return { allowed: false, reason: 'You have already submitted your tie-breaker roll' };
    }
    
    return { allowed: true };
  }

  /**
   * Get current round information for status display
   */
  private static getCurrentRoundInfo(rollOff: any, userId: string): {
    roundType: 'initial' | 'tiebreak';
    tiebreakRound?: number;
    canRoll: boolean;
    tiedPlayers?: string[];
  } {
    if (!rollOff.tiebreakRolls || rollOff.tiebreakRolls.length === 0) {
      // Initial round
      return {
        roundType: 'initial',
        canRoll: rollOff.rolls[userId] === undefined
      };
    }
    
    // Tie-breaker round
    const currentRound = rollOff.tiebreakRolls.length - 1;
    const tiedPlayers = this.getTiedPlayersFromPreviousRound(rollOff);
    const canRoll = tiedPlayers.includes(userId) && 
                   rollOff.tiebreakRolls[currentRound][userId] === undefined;
    
    return {
      roundType: 'tiebreak',
      tiebreakRound: rollOff.tiebreakRolls.length,
      canRoll,
      tiedPlayers
    };
  }

  /**
   * Deploy a unit to the battlefield
   */
  static async deployUnit(battleId: string, userId: string, unitId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const result = DeploymentService.deployUnit(battleId, userId, unitId, battleState);
      
      if (result.success) {
        // Save updated state
        await prisma.battle.update({
          where: { id: battleId },
          data: { currentState: battleState as any }
        });

        // Notify all players
        await NotificationService.notifyBattleStateChange(battleId, `Unit deployed by ${userId}`);
        
        // Check if deployment is complete and transition to battle
        if (DeploymentService.checkDeploymentComplete(battleState)) {
          await this.transitionToBattleRounds(battleId, battleState);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error deploying unit:', error);
      return { success: false, error: 'Failed to deploy unit' };
    }
  }

  /**
   * Set a unit to ambush reserves
   */
  static async ambushUnit(battleId: string, userId: string, unitId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const result = DeploymentService.setUnitToAmbush(battleId, userId, unitId, battleState);
      
      if (result.success) {
        // Save updated state
        await prisma.battle.update({
          where: { id: battleId },
          data: { currentState: battleState as any }
        });

        // Notify all players
        await NotificationService.notifyBattleStateChange(battleId, `Unit set to ambush by ${userId}`);
        
        // Check if deployment is complete and transition to battle
        if (DeploymentService.checkDeploymentComplete(battleState)) {
          await this.transitionToBattleRounds(battleId, battleState);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error setting unit to ambush:', error);
      return { success: false, error: 'Failed to set unit to ambush' };
    }
  }

  /**
   * Set a unit to scout reserves
   */
  static async scoutUnit(battleId: string, userId: string, unitId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const result = DeploymentService.setUnitToScout(battleId, userId, unitId, battleState);
      
      if (result.success) {
        // Save updated state
        await prisma.battle.update({
          where: { id: battleId },
          data: { currentState: battleState as any }
        });

        // Notify all players
        await NotificationService.notifyBattleStateChange(battleId, `Unit set to scout by ${userId}`);
        
        // Check if deployment is complete and transition to scout phase or battle
        if (DeploymentService.checkDeploymentComplete(battleState)) {
          await this.transitionToBattleRounds(battleId, battleState);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error setting unit to scout:', error);
      return { success: false, error: 'Failed to set unit to scout' };
    }
  }

  /**
   * Deploy a scout unit from reserves
   */
  static async deployScoutUnit(battleId: string, userId: string, unitId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const result = DeploymentService.deployScoutUnit(battleId, userId, unitId, battleState);
      
      if (result.success) {
        // Save updated state
        await prisma.battle.update({
          where: { id: battleId },
          data: { currentState: battleState as any }
        });

        // Notify all players
        await NotificationService.notifyBattleStateChange(battleId, `Scout unit deployed by ${userId}`);
        
        // Check if scout deployment is complete and transition to battle
        if (DeploymentService.checkDeploymentComplete(battleState)) {
          await this.transitionToBattleRounds(battleId, battleState);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error deploying scout unit:', error);
      return { success: false, error: 'Failed to deploy scout unit' };
    }
  }

  /**
   * Embark unit in transport during deployment
   */
  static async embarkUnit(battleId: string, userId: string, unitId: string, transportId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const result = DeploymentService.deployUnitEmbarked(battleState, unitId, transportId, userId);
      
      if (result.success) {
        // Save updated state
        await prisma.battle.update({
          where: { id: battleId },
          data: { currentState: battleState as any }
        });

        // Notify all players
        await NotificationService.notifyBattleStateChange(battleId, `Unit embarked in transport by ${userId}`);
        
        // Check if deployment is complete and transition to battle
        if (DeploymentService.checkDeploymentComplete(battleState)) {
          await this.transitionToBattleRounds(battleId, battleState);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error embarking unit:', error);
      return { success: false, error: 'Failed to embark unit' };
    }
  }

  /**
   * Deploy ambush unit from reserves (Round 2+)
   */
  static async deployAmbushUnit(battleId: string, userId: string, unitId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const result = DeploymentService.deployAmbushUnit(battleState, unitId, userId);
      
      if (result.success) {
        // Save updated state
        await prisma.battle.update({
          where: { id: battleId },
          data: { currentState: battleState as any }
        });

        // Notify all players
        await NotificationService.notifyBattleStateChange(battleId, `Ambush unit deployed by ${userId}`);
        
        // Record battle event
        await this.recordBattleEvent(
          battleId,
          userId,
          'UNIT_ACTIVATED',
          {
            description: `Ambush unit deployed from reserves`,
            unitId,
            additionalData: {
              deploymentMethod: 'AMBUSH',
              round: battleState.currentRound
            }
          }
        );
        
        // Clear ambush deployment flag if all decisions made
        if (DeploymentService.checkAmbushDeploymentComplete(battleState)) {
          battleState.activationState.ambushDeploymentAvailable = false;
          battleState.activationState.availableAmbushUnits = [];
        }
      }

      return result;
    } catch (error) {
      logger.error('Error deploying ambush unit:', error);
      return { success: false, error: 'Failed to deploy ambush unit' };
    }
  }

  /**
   * Keep ambush unit in reserves for this round
   */
  static async keepAmbushUnitInReserves(battleId: string, userId: string, unitId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const result = DeploymentService.keepAmbushUnitInReserves(battleState, unitId, userId);
      
      if (result.success) {
        // Save updated state
        await prisma.battle.update({
          where: { id: battleId },
          data: { currentState: battleState as any }
        });

        // Notify all players
        await NotificationService.notifyBattleStateChange(battleId, `Ambush unit kept in reserves by ${userId}`);
        
        // Record battle event
        await this.recordBattleEvent(
          battleId,
          userId,
          'UNIT_ACTION',
          {
            description: `Ambush unit kept in reserves for round ${battleState.currentRound}`,
            unitId,
            additionalData: {
              deploymentMethod: 'AMBUSH',
              round: battleState.currentRound,
              decision: 'KEEP_IN_RESERVES'
            }
          }
        );
        
        // Clear ambush deployment flag if all decisions made
        if (DeploymentService.checkAmbushDeploymentComplete(battleState)) {
          battleState.activationState.ambushDeploymentAvailable = false;
          battleState.activationState.availableAmbushUnits = [];
        }
      }

      return result;
    } catch (error) {
      logger.error('Error keeping ambush unit in reserves:', error);
      return { success: false, error: 'Failed to keep ambush unit in reserves' };
    }
  }

  /**
   * Transition battle from deployment phase to battle rounds with proper turn initialization
   */
  static async transitionToBattleRounds(battleId: string, battleState: OPRBattleState): Promise<void> {
    try {
      logger.info(`Transitioning battle ${battleId} from deployment to battle rounds`);
      
      // Import ActivationService here to avoid circular dependency
      const { ActivationService } = require('./activationService');
      
      // Change battle phase to BATTLE_ROUNDS
      battleState.phase = 'BATTLE_ROUNDS';
      battleState.status = 'ACTIVE';
      battleState.currentRound = 1;

      // Initialize turn order based on deployment roll-off winner
      const rollOff = battleState.activationState.deploymentRollOff;
      if (rollOff?.winner) {
        battleState.activationState.firstPlayerThisRound = rollOff.winner;
      }

      // Generate activation order for first round
      const newActivationState = ActivationService.generateActivationOrder(
        battleState.armies,
        1, // Round number
        battleState.activationState
      );

      // Update activation state
      battleState.activationState = {
        ...battleState.activationState,
        ...newActivationState,
        isAwaitingActivation: true,
        roundComplete: false
      };

      // Initialize unit activation states
      for (const army of battleState.armies) {
        for (const unit of army.units) {
          // Only units that are deployed can activate (not reserves)
          const canActivate = unit.deploymentState.status === 'DEPLOYED' && 
                            !unit.routed && 
                            !unit.models.every(m => m.isDestroyed);
          
          unit.activationState = {
            canActivate,
            hasActivated: false,
            activatedInRound: 0,
            activatedInTurn: 0,
            isSelected: false,
            actionPoints: 1,
            actionsUsed: []
          };
        }
      }

      // Process round start events (caster tokens, CP refresh, etc.)
      await ActivationService.processRoundStartEvents(battleState, battleId);

      // Save the updated battle state
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // Notify all players that battle has begun
      await NotificationService.notifyBattleStateChange(
        battleId, 
        `Battle Round 1 begins! ${battleState.activationState.activatingPlayerId}'s turn to activate`
      );

      logger.info(`Battle ${battleId} successfully transitioned to battle rounds with ${battleState.activationState.maxTurns} turns per round`);
      
    } catch (error) {
      logger.error(`Error transitioning battle ${battleId} to battle rounds:`, error);
      throw error;
    }
  }
}