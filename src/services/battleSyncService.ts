import { PrismaClient } from '@prisma/client';
import { 
  BattleSyncBattleState,
  BattleSyncArmy,
  BattleSyncUnit,
  BattleSyncModel,
  BattleSyncBattlePhase,
  BattleSyncBattleEvent,
  BattleSyncBattleEventType
} from '../types/battleSync';
import { Army } from '../types/army';
import { BattleSyncConverter } from './battleSyncConverter';
import { DeploymentService } from './deploymentService';
import { getWebSocketManager } from './websocket';
import { NotificationService } from './notificationService';
import { logger } from '../utils/logger';
import { ValidationUtils } from '../utils/validation';

const prisma = new PrismaClient();

export class BattleSyncService {

  /**
   * Refresh caster tokens for all caster units at the start of a new round
   */
  private static refreshCasterTokens(battleState: BattleSyncBattleState): void {
    for (const army of battleState.armies) {
      for (const unit of army.units) {
        for (const subunit of unit.subunits) {
          for (const model of subunit.models) {
            if (model.isCaster && model.casterTokens > 0) {
              // Find the caster rule to get max tokens
              const casterRule = subunit.specialRules.find(rule => rule.includes('Caster('));
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
        }
      }
    }
  }

  /**
   * Get battle state in BattleSync format
   */
  static async getBattleSyncState(battleId: string, userId: string): Promise<BattleSyncBattleState | null> {
    try {
      // Get battle from database
      const battle = await prisma.battle.findFirst({
        where: {
          id: battleId,
          OR: [
            { createdByUserId: userId },
            { participants: { some: { userId } } }
          ]
        },
        include: {
          participants: {
            include: {
              user: true,
              army: true
            }
          },
          events: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      if (!battle) {
        return null;
      }

      // Convert stored battle data to BattleSync format
      const battleData = battle.battleData as any;
      
      // If battle data is already in BattleSync format, return it
      if (battleData?.armies && battleData.armies.length > 0 && battleData.armies[0].units) {
        return battleData as BattleSyncBattleState;
      }

      // Otherwise, we need to convert from OPR format to BattleSync format
      // This is a migration path for existing battles
      return await this.migrateBattleStateToSync(battle, userId);

    } catch (error) {
      logger.error('Failed to get BattleSync state:', error);
      return null;
    }
  }

  /**
   * Migrate an existing OPR battle to BattleSync format
   */
  private static async migrateBattleStateToSync(battle: any, userId: string): Promise<BattleSyncBattleState | null> {
    try {
      logger.info(`Migrating battle ${battle.id} to BattleSync format`);
      
      // Get fresh army data for all participants
      const syncArmies: BattleSyncArmy[] = [];
      
      for (const participant of battle.participants) {
        if (participant.army && participant.army.armyData) {
          // Convert this army to BattleSync format
          const conversionResult = await BattleSyncConverter.convertArmyToBattleSync(
            participant.userId,
            participant.army.id,
            participant.army.armyData,
            {
              allowCombined: true,
              allowJoined: true,
              preserveCustomNames: true
            }
          );

          if (conversionResult.success && conversionResult.army) {
            syncArmies.push(conversionResult.army);
          }
        }
      }

      // Create new BattleSync state
      const battleState: BattleSyncBattleState = {
        battleId: battle.id,
        status: battle.status as any,
        phase: battle.phase as BattleSyncBattlePhase || 'DEPLOYMENT',
        currentRound: battle.currentRound || 1,
        currentPlayer: battle.currentPlayer,
        armies: syncArmies,
        events: [],
        gameSettings: {
          gameSystem: 'grimdark-future',
          pointsLimit: 2500,
          allowUnderdog: true,
          customRules: []
        },
        activationState: {
          currentTurn: 1,
          maxTurns: 1,
          activationOrder: [],
          unitsActivatedThisRound: [],
          isAwaitingActivation: false,
          canPassTurn: false,
          passedPlayers: [],
          roundComplete: false
        }
      };

      // Save migrated state back to database
      await this.saveBattleState(battleState);

      return battleState;

    } catch (error) {
      logger.error('Failed to migrate battle to BattleSync format:', error);
      return null;
    }
  }

  /**
   * Save battle state to database
   */
  static async saveBattleState(battleState: BattleSyncBattleState): Promise<void> {
    try {
      await prisma.battle.update({
        where: { id: battleState.battleId },
        data: {
          battleData: battleState as any,
          currentRound: battleState.currentRound,
          status: battleState.status,
          phase: battleState.phase,
          currentPlayer: battleState.currentPlayer
        }
      });

      logger.debug(`Saved BattleSync state for battle ${battleState.battleId}`);
    } catch (error) {
      logger.error('Failed to save BattleSync state:', error);
      throw error;
    }
  }

  /**
   * Apply damage to a unit in BattleSync format
   */
  static async applyDamage(
    battleId: string,
    userId: string,
    unitId: string,
    damage: number,
    targetModelId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getBattleSyncState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      // Find the target unit
      let targetUnit: BattleSyncUnit | null = null;
      let targetArmy: BattleSyncArmy | null = null;

      for (const army of battleState.armies) {
        for (const unit of army.units) {
          if (unit.battleSyncUnitId === unitId) {
            targetUnit = unit;
            targetArmy = army;
            break;
          }
        }
        if (targetUnit) break;
      }

      if (!targetUnit || !targetArmy) {
        return { success: false, error: 'Target unit not found' };
      }

      // Apply damage to the unit
      const damageResult = this.applyDamageToUnit(targetUnit, damage, targetModelId);

      // Update battle state
      await this.saveBattleState(battleState);

      // Send WebSocket update
      const wsMessage = {
        type: 'DAMAGE_APPLIED',
        battleId,
        unitId,
        damage,
        ...damageResult
      };
      getWebSocketManager().sendToBattle(battleId, wsMessage);

      return { success: true, ...damageResult };

    } catch (error) {
      logger.error('Failed to apply damage:', error);
      return { success: false, error: 'Internal error applying damage' };
    }
  }

  /**
   * Apply damage to a specific unit
   */
  private static applyDamageToUnit(
    unit: BattleSyncUnit,
    damage: number,
    targetModelId?: string
  ): { modelsDestroyed: number; unitDestroyed: boolean } {
    let modelsDestroyed = 0;
    let remainingDamage = damage;

    // Find target models - prefer specific model if provided
    let targetModels: BattleSyncModel[] = [];
    
    if (targetModelId) {
      for (const subunit of unit.subunits) {
        const model = subunit.models.find(m => m.modelId === targetModelId);
        if (model && !model.isDestroyed) {
          targetModels = [model];
          break;
        }
      }
    }

    // If no specific target or target not found, use all living models
    if (targetModels.length === 0) {
      for (const subunit of unit.subunits) {
        targetModels.push(...subunit.models.filter(m => !m.isDestroyed));
      }
    }

    // Apply damage to models
    for (const model of targetModels) {
      if (remainingDamage <= 0) break;
      
      const damageToApply = Math.min(remainingDamage, model.currentTough);
      model.currentTough -= damageToApply;
      remainingDamage -= damageToApply;

      // Check if model is destroyed
      if (model.currentTough <= 0) {
        model.isDestroyed = true;
        modelsDestroyed++;
      }
    }

    // Update unit totals
    unit.currentSize = unit.subunits.reduce(
      (total, subunit) => total + subunit.models.filter(m => !m.isDestroyed).length, 
      0
    );
    unit.currentToughTotal = unit.subunits.reduce(
      (total, subunit) => total + subunit.models.reduce(
        (subtotal, model) => subtotal + (model.isDestroyed ? 0 : model.currentTough), 
        0
      ), 
      0
    );

    const unitDestroyed = unit.currentSize === 0;
    if (unitDestroyed) {
      unit.casualty = true;
    }

    return { modelsDestroyed, unitDestroyed };
  }

  /**
   * Start a new battle round
   */
  static async startNewRound(
    battleId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const battleState = await this.getBattleSyncState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      // Increment round
      battleState.currentRound += 1;

      // Refresh caster tokens
      this.refreshCasterTokens(battleState);

      // Reset activations
      battleState.activationState.unitsActivatedThisRound = [];
      battleState.activationState.roundComplete = false;
      battleState.activationState.currentTurn = 1;

      // Clear unit activation states
      for (const army of battleState.armies) {
        for (const unit of army.units) {
          unit.activationState.hasActivated = false;
          unit.activationState.canActivate = !unit.casualty && !unit.routed;
          unit.action = null;
          unit.fatigued = false;
        }
      }

      // Save state
      await this.saveBattleState(battleState);

      // Send notification
      getWebSocketManager().sendToBattle(battleId, {
        type: 'ROUND_STARTED',
        battleId,
        round: battleState.currentRound
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to start new round:', error);
      return { success: false, error: 'Internal error starting round' };
    }
  }

  /**
   * Create a new battle from armies using BattleSync format
   */
  static async createBattle(
    createdByUserId: string,
    missionId: string,
    armyIds: string[]
  ): Promise<{ success: boolean; battleId?: string; error?: string }> {
    try {
      // Get armies and convert to BattleSync format
      const armies: BattleSyncArmy[] = [];
      
      for (const armyId of armyIds) {
        const army = await prisma.army.findUnique({
          where: { id: armyId }
        });

        if (army && army.armyData) {
          const conversionResult = await BattleSyncConverter.convertArmyToBattleSync(
            army.userId,
            army.id,
            army.armyData,
            {
              allowCombined: true,
              allowJoined: true,
              preserveCustomNames: true
            }
          );

          if (conversionResult.success && conversionResult.army) {
            armies.push(conversionResult.army);
          }
        }
      }

      if (armies.length === 0) {
        return { success: false, error: 'No valid armies provided' };
      }

      // Create battle state
      const battleState: BattleSyncBattleState = {
        battleId: '', // Will be set after database creation
        status: 'SETUP',
        phase: 'DEPLOYMENT',
        currentRound: 1,
        armies,
        events: [],
        gameSettings: {
          gameSystem: 'grimdark-future',
          pointsLimit: Math.max(...armies.map(a => a.totalPoints)),
          allowUnderdog: true,
          customRules: []
        },
        activationState: {
          currentTurn: 1,
          maxTurns: 1,
          activationOrder: [],
          unitsActivatedThisRound: [],
          isAwaitingActivation: false,
          canPassTurn: false,
          passedPlayers: [],
          roundComplete: false
        }
      };

      // Create battle in database
      const battle = await prisma.battle.create({
        data: {
          createdByUserId,
          missionId,
          status: 'SETUP',
          phase: 'DEPLOYMENT',
          currentRound: 1,
          battleData: battleState as any
        }
      });

      // Set the battle ID and save again
      battleState.battleId = battle.id;
      await prisma.battle.update({
        where: { id: battle.id },
        data: { battleData: battleState as any }
      });

      // Create participants
      for (const army of armies) {
        await prisma.battleParticipant.create({
          data: {
            battleId: battle.id,
            userId: army.userId,
            armyId: army.armyId
          }
        });
      }

      logger.info(`Created new BattleSync battle ${battle.id} with ${armies.length} armies`);

      return { success: true, battleId: battle.id };

    } catch (error) {
      logger.error('Failed to create battle:', error);
      return { success: false, error: 'Internal error creating battle' };
    }
  }
}