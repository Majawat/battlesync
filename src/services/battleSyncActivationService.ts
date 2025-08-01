import { PrismaClient } from '@prisma/client';
import { BattleSyncService } from './battleSyncService';
import { BattleActionHistoryService } from './battleActionHistoryService';
import { 
  BattleSyncBattleState,
  BattleSyncArmy,
  BattleSyncUnit,
  BattleSyncActivationSlot,
  BattleSyncUnitAction
} from '../types/battleSync';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface BattleSyncActivationRequest {
  unitId: string;
  action: 'hold' | 'advance' | 'rush' | 'charge';
  targetPosition?: { x: number; y: number }; // Not enforced, just for logging
  targetUnitId?: string; // For charge/shooting targets
}

export interface BattleSyncActivationResult {
  success: boolean;
  error?: string;
  unitActivated?: BattleSyncUnit;
  actionCompleted?: boolean;
  nextPlayer?: string;
  roundComplete?: boolean;
}

export class BattleSyncActivationService {

  /**
   * Activate a unit for the current player
   */
  static async activateUnit(
    battleId: string,
    userId: string,
    request: BattleSyncActivationRequest
  ): Promise<BattleSyncActivationResult> {
    try {
      const battleState = await BattleSyncService.getBattleSyncState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      // Find the unit and army
      let targetUnit: BattleSyncUnit | null = null;
      let userArmy: BattleSyncArmy | null = null;

      for (const army of battleState.armies) {
        if (army.userId === userId) {
          userArmy = army;
          for (const unit of army.units) {
            if (unit.battleSyncUnitId === request.unitId) {
              targetUnit = unit;
              break;
            }
          }
          break;
        }
      }

      if (!targetUnit || !userArmy) {
        return { success: false, error: 'Unit not found or not owned by user' };
      }

      // Validate unit can activate
      const validationResult = this.validateUnitActivation(battleState, targetUnit, userId);
      if (!validationResult.canActivate) {
        return { success: false, error: validationResult.reason };
      }

      // Store previous state for undo functionality
      const beforeState = JSON.parse(JSON.stringify(battleState));

      // Execute the unit activation
      const actionResult = await this.executeUnitAction(targetUnit, request);
      if (!actionResult.success) {
        return { success: false, error: actionResult.error };
      }

      // Mark unit as activated
      targetUnit.activationState.hasActivated = true;
      targetUnit.activationState.canActivate = false;
      targetUnit.activationState.activatedInRound = battleState.currentRound;
      targetUnit.activationState.activatedInTurn = battleState.activationState.currentTurn;
      targetUnit.action = request.action;

      // Add to activated units list
      battleState.activationState.unitsActivatedThisRound.push(request.unitId);

      // Advance turn order
      const turnResult = this.advanceTurnOrder(battleState);

      // Record battle action for undo system
      await BattleActionHistoryService.recordAction(
        battleId,
        userId,
        'UNIT_ACTION_SET',
        {
          action: request.action,
          targetUnitId: request.targetUnitId,
          targetPosition: request.targetPosition,
          round: battleState.currentRound,
          turn: battleState.activationState.currentTurn,
          description: `${targetUnit.name} performed ${request.action} action`
        },
        beforeState as any,
        JSON.parse(JSON.stringify(battleState)) as any,
        {
          canUndo: true,
          undoComplexity: 'simple',
          affectedUnitIds: [targetUnit.battleSyncUnitId]
        }
      );

      // Save battle state
      await BattleSyncService.saveBattleState(battleState);

      return {
        success: true,
        unitActivated: targetUnit,
        actionCompleted: true,
        nextPlayer: turnResult.nextPlayer,
        roundComplete: turnResult.roundComplete
      };

    } catch (error) {
      logger.error('Failed to activate unit:', error);
      return { success: false, error: 'Internal error during activation' };
    }
  }

  /**
   * Validate that a unit can be activated
   */
  private static validateUnitActivation(
    battleState: BattleSyncBattleState,
    unit: BattleSyncUnit,
    userId: string
  ): { canActivate: boolean; reason?: string } {

    // Check battle is in correct phase
    if (battleState.phase !== 'BATTLE_ROUNDS') {
      return { canActivate: false, reason: 'Battle not in active rounds phase' };
    }

    // Check unit belongs to current player
    const userArmy = battleState.armies.find(a => a.userId === userId);
    if (!userArmy) {
      return { canActivate: false, reason: 'User not in this battle' };
    }

    // Check unit is not destroyed
    if (unit.casualty || unit.currentSize === 0) {
      return { canActivate: false, reason: 'Unit is destroyed' };
    }

    // Check unit is not routed
    if (unit.routed) {
      return { canActivate: false, reason: 'Unit is routed' };
    }

    // Check unit hasn't already activated
    if (unit.activationState.hasActivated && unit.activationState.activatedInRound === battleState.currentRound) {
      return { canActivate: false, reason: 'Unit already activated this round' };
    }

    // Check unit is deployed (not in reserves)
    if (unit.deploymentState.status !== 'DEPLOYED') {
      return { canActivate: false, reason: 'Unit not deployed on battlefield' };
    }

    return { canActivate: true };
  }

  /**
   * Execute the specific unit action
   */
  private static async executeUnitAction(
    unit: BattleSyncUnit,
    request: BattleSyncActivationRequest
  ): Promise<{ success: boolean; error?: string }> {

    const action: BattleSyncUnitAction = {
      actionType: this.mapActionToType(request.action),
      actionCost: 1,
      timestamp: new Date(),
      description: `Unit performed ${request.action} action`,
      targetUnitIds: request.targetUnitId ? [request.targetUnitId] : undefined,
      additionalData: {
        targetPosition: request.targetPosition
      }
    };

    // Add action to unit's action history
    unit.activationState.actionsUsed.push(action);

    // Apply action-specific effects
    switch (request.action) {
      case 'hold':
        // Hold: No movement, can shoot
        // Unit stays in position, eligible for shooting
        break;

      case 'advance':
        // Advance: Move 6" + modifiers, can shoot
        // Movement is handled on physical tabletop
        break;

      case 'rush':
        // Rush: Move 12" + modifiers, cannot shoot
        // Movement is handled on physical tabletop
        break;

      case 'charge':
        // Charge: Move 12" + modifiers into melee
        // This should trigger melee combat modal
        if (request.targetUnitId) {
          action.description += ` targeting ${request.targetUnitId}`;
        }
        break;

      default:
        return { success: false, error: 'Invalid action type' };
    }

    // Apply fatigue if unit performed strenuous action
    if (request.action === 'rush' || request.action === 'charge') {
      unit.fatigued = true;
    }

    return { success: true };
  }

  /**
   * Map action string to action type enum
   */
  private static mapActionToType(action: string): BattleSyncUnitAction['actionType'] {
    switch (action) {
      case 'hold': return 'HOLD';
      case 'advance': return 'MOVE';
      case 'rush': return 'MOVE';
      case 'charge': return 'FIGHT';
      default: return 'MOVE';
    }
  }

  /**
   * Advance the turn order after a unit activation
   */
  private static advanceTurnOrder(battleState: BattleSyncBattleState): { nextPlayer?: string; roundComplete: boolean } {
    const activationState = battleState.activationState;
    
    // Count total deployable units for each army
    const armyUnitCounts = battleState.armies.map(army => ({
      userId: army.userId,
      deployedUnits: army.units.filter(unit => 
        unit.deploymentState.status === 'DEPLOYED' && 
        !unit.casualty && 
        !unit.routed
      ).length
    }));

    // Determine if all units have been activated
    const totalDeployedUnits = armyUnitCounts.reduce((sum, army) => sum + army.deployedUnits, 0);
    const totalActivatedUnits = activationState.unitsActivatedThisRound.length;

    if (totalActivatedUnits >= totalDeployedUnits) {
      // Round is complete
      activationState.roundComplete = true;
      activationState.currentTurn = 1;
      return { roundComplete: true };
    }

    // Advance turn
    activationState.currentTurn++;

    // Simple alternating turn system (proper OPR turn order implemented in main activation service)
    const playerIds = battleState.armies.map(a => a.userId);
    const currentPlayerIndex = playerIds.findIndex(id => id === battleState.currentPlayer);
    const nextPlayerIndex = (currentPlayerIndex + 1) % playerIds.length;
    const nextPlayer = playerIds[nextPlayerIndex];

    battleState.currentPlayer = nextPlayer;

    return { nextPlayer, roundComplete: false };
  }

  /**
   * Pass activation turn
   */
  static async passActivation(
    battleId: string,
    userId: string
  ): Promise<BattleSyncActivationResult> {
    try {
      const battleState = await BattleSyncService.getBattleSyncState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      // Add to passed players
      if (!battleState.activationState.passedPlayers.includes(userId)) {
        battleState.activationState.passedPlayers.push(userId);
      }

      // Advance turn
      const turnResult = this.advanceTurnOrder(battleState);

      // Record action
      await BattleActionHistoryService.recordAction(
        battleId,
        userId,
        'UNIT_ACTION_SET',
        {
          action: 'PASS',
          round: battleState.currentRound,
          turn: battleState.activationState.currentTurn,
          description: 'Player passed activation'
        },
        JSON.parse(JSON.stringify(battleState)) as any,
        JSON.parse(JSON.stringify(battleState)) as any,
        {
          canUndo: true,
          undoComplexity: 'simple'
        }
      );

      // Save state
      await BattleSyncService.saveBattleState(battleState);

      return {
        success: true,
        nextPlayer: turnResult.nextPlayer,
        roundComplete: turnResult.roundComplete
      };

    } catch (error) {
      logger.error('Failed to pass activation:', error);
      return { success: false, error: 'Internal error passing activation' };
    }
  }

  /**
   * Start a new activation round
   */
  static async startNewActivationRound(
    battleId: string,
    userId: string
  ): Promise<BattleSyncActivationResult> {
    try {
      const battleState = await BattleSyncService.getBattleSyncState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      // Reset activation states
      battleState.activationState.unitsActivatedThisRound = [];
      battleState.activationState.passedPlayers = [];
      battleState.activationState.roundComplete = false;
      battleState.activationState.currentTurn = 1;

      // Reset unit activation flags
      for (const army of battleState.armies) {
        for (const unit of army.units) {
          if (!unit.casualty && !unit.routed && unit.deploymentState.status === 'DEPLOYED') {
            unit.activationState.hasActivated = false;
            unit.activationState.canActivate = true;
          }
        }
      }

      // Generate activation order (simple for now)
      const activationOrder: BattleSyncActivationSlot[] = [];
      let turnNumber = 1;

      // Create slots based on deployed units
      for (const army of battleState.armies) {
        const deployedUnits = army.units.filter(unit => 
          unit.deploymentState.status === 'DEPLOYED' && 
          !unit.casualty && 
          !unit.routed
        );

        for (let i = 0; i < deployedUnits.length; i++) {
          activationOrder.push({
            playerId: army.userId,
            armyId: army.armyId,
            turnNumber: turnNumber++,
            isPassed: false
          });
        }
      }

      battleState.activationState.activationOrder = activationOrder;
      battleState.activationState.maxTurns = activationOrder.length;

      // Set first player
      if (activationOrder.length > 0) {
        battleState.currentPlayer = activationOrder[0].playerId;
      }

      // Save state
      await BattleSyncService.saveBattleState(battleState);

      return {
        success: true,
        nextPlayer: battleState.currentPlayer,
        roundComplete: false
      };

    } catch (error) {
      logger.error('Failed to start new activation round:', error);
      return { success: false, error: 'Internal error starting round' };
    }
  }

  /**
   * Get units available for activation for a specific user
   */
  static async getActivatableUnits(
    battleId: string,
    userId: string
  ): Promise<{ success: boolean; units?: BattleSyncUnit[]; error?: string }> {
    try {
      const battleState = await BattleSyncService.getBattleSyncState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      const userArmy = battleState.armies.find(a => a.userId === userId);
      if (!userArmy) {
        return { success: false, error: 'User not in this battle' };
      }

      const activatableUnits = userArmy.units.filter(unit => {
        const validation = this.validateUnitActivation(battleState, unit, userId);
        return validation.canActivate;
      });

      return { success: true, units: activatableUnits };

    } catch (error) {
      logger.error('Failed to get activatable units:', error);
      return { success: false, error: 'Internal error getting units' };
    }
  }
}