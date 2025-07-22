import { PrismaClient } from '@prisma/client';
import { OPRBattleService } from './oprBattleService';
import { BattleActionHistoryService } from './battleActionHistoryService';
import { 
  OPRBattleState, 
  OPRActivationState,
  OPRActivationSlot,
  OPRUnitActivationState,
  OPRBattleUnit,
  OPRBattleArmy,
  ActivateUnitRequest,
  PassActivationRequest,
  StartNewRoundRequest,
  ActivationResult,
  OPRUnitAction
} from '../types/oprBattle';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class ActivationService {

  /**
   * Start a new round of battle with fresh activation order
   */
  static async startNewRound(
    battleId: string, 
    userId: string
  ): Promise<ActivationResult> {
    try {
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found', newActivationState: {} as any };
      }

      const beforeState = JSON.parse(JSON.stringify(battleState));

      // Only allow the creating user or game master to start rounds
      // For now, allow any participant to start rounds (can be restricted later)
      
      // Increment round counter
      battleState.currentRound += 1;

      // Process round end events (if this isn't the first round)
      if (battleState.currentRound > 1) {
        await this.processRoundEndEvents(battleState, beforeState.currentRound);
      }

      // Generate new activation order for this round
      const newActivationState = this.generateActivationOrder(battleState.armies, battleState.currentRound);

      // Reset all unit activation states for the new round
      for (const army of battleState.armies) {
        for (const unit of army.units) {
          unit.activationState = this.initializeUnitActivation(battleState.currentRound);
        }
      }

      // Update battle state
      battleState.activationState = newActivationState;

      // Process round start events
      await this.processRoundStartEvents(battleState, battleId);

      // Save the updated state
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // Record action in history
      await BattleActionHistoryService.recordAction(
        battleId,
        userId,
        'ROUND_ADVANCED',
        {
          description: `Started Round ${battleState.currentRound}`,
          roundNumber: battleState.currentRound,
          activationOrder: newActivationState.activationOrder.map(slot => ({
            playerId: slot.playerId,
            turnNumber: slot.turnNumber
          }))
        },
        beforeState,
        battleState,
        {
          canUndo: true,
          undoComplexity: 'cascade', // Round changes affect many things
          affectedUnitIds: battleState.armies.flatMap(a => a.units.map(u => u.unitId))
        }
      );

      // Record battle event
      await OPRBattleService.recordBattleEvent(
        battleId,
        userId,
        'ROUND_STARTED',
        {
          description: `Round ${battleState.currentRound} started`,
          additionalData: {
            roundNumber: battleState.currentRound,
            activationOrder: newActivationState.activationOrder,
            totalTurns: newActivationState.maxTurns
          }
        }
      );

      logger.info(`Round ${battleState.currentRound} started for battle ${battleId}`);

      return {
        success: true,
        newActivationState,
        nextActivatingPlayer: newActivationState.activatingPlayerId,
        roundComplete: false
      };

    } catch (error) {
      logger.error('Error starting new round:', error);
      return { success: false, error: 'Failed to start new round', newActivationState: {} as any };
    }
  }

  /**
   * Activate a specific unit
   */
  static async activateUnit(
    request: ActivateUnitRequest
  ): Promise<ActivationResult> {
    try {
      const { battleId, userId, unitId, actions = [] } = request;
      
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found', newActivationState: {} as any };
      }

      const beforeState = JSON.parse(JSON.stringify(battleState));

      // Validate activation
      const validationResult = this.validateActivation(battleState, userId, unitId);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error, newActivationState: battleState.activationState };
      }

      // Find the unit and army
      const army = battleState.armies.find(a => a.units.some(u => u.unitId === unitId));
      const unit = army?.units.find(u => u.unitId === unitId);
      
      if (!unit || !army) {
        return { success: false, error: 'Unit not found', newActivationState: battleState.activationState };
      }

      // Process unit activation
      unit.activationState.hasActivated = true;
      unit.activationState.activatedInRound = battleState.currentRound;
      unit.activationState.activatedInTurn = battleState.activationState.currentTurn;
      unit.activationState.isSelected = false;
      unit.activationState.actionsUsed = actions;

      // Add unit to activated list
      battleState.activationState.unitsActivatedThisRound.push(unitId);

      // Find current activation slot and mark it
      const currentSlot = battleState.activationState.activationOrder[battleState.activationState.currentTurn - 1];
      if (currentSlot) {
        currentSlot.activatedUnitId = unitId;
        currentSlot.timestamp = new Date();
      }

      // Determine next activation
      const nextState = this.advanceToNextActivation(battleState);
      
      // Save the updated state
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // Record action in history
      await BattleActionHistoryService.recordAction(
        battleId,
        userId,
        'UNIT_ACTION_SET',
        {
          description: `Activated ${unit.customName || unit.name}`,
          unitId,
          activatedInRound: battleState.currentRound,
          activatedInTurn: battleState.activationState.currentTurn,
          actions
        },
        beforeState,
        battleState,
        {
          canUndo: true,
          undoComplexity: 'simple',
          affectedUnitIds: [unitId]
        }
      );

      // Record battle event
      await OPRBattleService.recordBattleEvent(
        battleId,
        userId,
        'UNIT_ACTIVATED',
        {
          description: `${unit.customName || unit.name} activated`,
          unitId,
          additionalData: {
            turnNumber: battleState.activationState.currentTurn,
            roundNumber: battleState.currentRound,
            actions
          }
        }
      );

      logger.info(`Unit ${unitId} activated in battle ${battleId} by user ${userId}`);

      return {
        success: true,
        newActivationState: battleState.activationState,
        unitActivated: unit,
        nextActivatingPlayer: nextState.nextPlayer,
        roundComplete: nextState.roundComplete
      };

    } catch (error) {
      logger.error('Error activating unit:', error);
      return { success: false, error: 'Failed to activate unit', newActivationState: {} as any };
    }
  }

  /**
   * Pass activation (skip turn)
   */
  static async passActivation(
    request: PassActivationRequest
  ): Promise<ActivationResult> {
    try {
      const { battleId, userId, reason } = request;
      
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found', newActivationState: {} as any };
      }

      const beforeState = JSON.parse(JSON.stringify(battleState));

      // Validate that it's this player's turn
      if (battleState.activationState.activatingPlayerId !== userId) {
        return { 
          success: false, 
          error: 'Not your turn to activate', 
          newActivationState: battleState.activationState 
        };
      }

      // Mark current slot as passed
      const currentSlot = battleState.activationState.activationOrder[battleState.activationState.currentTurn - 1];
      if (currentSlot) {
        currentSlot.isPassed = true;
        currentSlot.timestamp = new Date();
      }

      // Add player to passed list if not already there
      if (!battleState.activationState.passedPlayers.includes(userId)) {
        battleState.activationState.passedPlayers.push(userId);
      }

      // Determine next activation
      const nextState = this.advanceToNextActivation(battleState);
      
      // Save the updated state
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // Record action in history
      await BattleActionHistoryService.recordAction(
        battleId,
        userId,
        'UNIT_ACTION_SET',
        {
          description: `Passed activation turn`,
          reason: reason || 'No reason provided'
        },
        beforeState,
        battleState,
        {
          canUndo: true,
          undoComplexity: 'simple',
          affectedUnitIds: []
        }
      );

      // Record battle event
      await OPRBattleService.recordBattleEvent(
        battleId,
        userId,
        'ACTIVATION_PASSED',
        {
          description: reason || 'Player passed activation',
          additionalData: {
            turnNumber: battleState.activationState.currentTurn,
            roundNumber: battleState.currentRound,
            reason
          }
        }
      );

      logger.info(`Player ${userId} passed activation in battle ${battleId}`);

      return {
        success: true,
        newActivationState: battleState.activationState,
        nextActivatingPlayer: nextState.nextPlayer,
        roundComplete: nextState.roundComplete
      };

    } catch (error) {
      logger.error('Error passing activation:', error);
      return { success: false, error: 'Failed to pass activation', newActivationState: {} as any };
    }
  }

  /**
   * Generate activation order for a round using alternating activation
   */
  private static generateActivationOrder(armies: OPRBattleArmy[], round: number): OPRActivationState {
    // Count units per army (excluding routed units)
    const armyUnitCounts = armies.map(army => ({
      userId: army.userId,
      armyId: army.armyId,
      unitCount: army.units.filter(unit => !unit.routed).length
    }));

    // Calculate total activations needed
    const maxUnits = Math.max(...armyUnitCounts.map(a => a.unitCount));
    const totalActivations = armyUnitCounts.reduce((sum, a) => sum + a.unitCount, 0);

    // Generate alternating activation order
    const activationOrder: OPRActivationSlot[] = [];
    let turnNumber = 1;

    // Simple alternating system - can be enhanced with initiative rolls later
    for (let turn = 1; turn <= maxUnits; turn++) {
      for (const armyData of armyUnitCounts) {
        if (turn <= armyData.unitCount) {
          activationOrder.push({
            playerId: armyData.userId,
            armyId: armyData.armyId,
            turnNumber: turnNumber++,
            isPassed: false
          });
        }
      }
    }

    return {
      currentTurn: 1,
      maxTurns: activationOrder.length,
      activatingPlayerId: activationOrder[0]?.playerId,
      activationOrder,
      unitsActivatedThisRound: [],
      isAwaitingActivation: true,
      canPassTurn: true,
      passedPlayers: [],
      roundComplete: false
    };
  }

  /**
   * Initialize unit activation state for a new round
   */
  private static initializeUnitActivation(round: number): OPRUnitActivationState {
    return {
      canActivate: true,
      hasActivated: false,
      activatedInRound: 0,
      activatedInTurn: 0,
      isSelected: false,
      actionPoints: 1, // Standard action points (can be modified by Fast rule)
      actionsUsed: []
    };
  }

  /**
   * Validate that a unit can be activated
   */
  private static validateActivation(
    battleState: OPRBattleState, 
    userId: string, 
    unitId: string
  ): { valid: boolean; error?: string } {
    // Check if it's the battle rounds phase
    if (battleState.phase !== 'BATTLE_ROUNDS') {
      return { valid: false, error: 'Not in battle rounds phase' };
    }

    // Check if it's this player's turn
    if (battleState.activationState.activatingPlayerId !== userId) {
      return { valid: false, error: 'Not your turn to activate' };
    }

    // Find the unit
    const army = battleState.armies.find(a => a.units.some(u => u.unitId === unitId));
    const unit = army?.units.find(u => u.unitId === unitId);

    if (!unit) {
      return { valid: false, error: 'Unit not found' };
    }

    // Check if unit belongs to the activating player
    if (army?.userId !== userId) {
      return { valid: false, error: 'Unit does not belong to you' };
    }

    // Check if unit is routed or destroyed
    if (unit.routed) {
      return { valid: false, error: 'Cannot activate routed units' };
    }

    if (unit.currentSize <= 0) {
      return { valid: false, error: 'Cannot activate destroyed units' };
    }

    // Check if unit has already activated this round
    if (unit.activationState.hasActivated && unit.activationState.activatedInRound === battleState.currentRound) {
      return { valid: false, error: 'Unit has already activated this round' };
    }

    return { valid: true };
  }

  /**
   * Advance to the next activation slot
   */
  private static advanceToNextActivation(battleState: OPRBattleState): { 
    nextPlayer?: string; 
    roundComplete: boolean 
  } {
    const currentTurn = battleState.activationState.currentTurn;
    const maxTurns = battleState.activationState.maxTurns;

    // Check if this was the last turn
    if (currentTurn >= maxTurns) {
      battleState.activationState.roundComplete = true;
      battleState.activationState.isAwaitingActivation = false;
      battleState.activationState.activatingPlayerId = undefined;
      return { roundComplete: true };
    }

    // Move to next turn
    battleState.activationState.currentTurn = currentTurn + 1;
    const nextSlot = battleState.activationState.activationOrder[currentTurn]; // currentTurn is now the index

    if (nextSlot) {
      battleState.activationState.activatingPlayerId = nextSlot.playerId;
      battleState.activationState.isAwaitingActivation = true;
      return { nextPlayer: nextSlot.playerId, roundComplete: false };
    }

    // Fallback - round complete
    battleState.activationState.roundComplete = true;
    battleState.activationState.isAwaitingActivation = false;
    battleState.activationState.activatingPlayerId = undefined;
    return { roundComplete: true };
  }

  /**
   * Get units available for activation by a player
   */
  static async getAvailableUnitsForActivation(
    battleId: string, 
    userId: string
  ): Promise<{ units: OPRBattleUnit[]; canActivate: boolean }> {
    try {
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { units: [], canActivate: false };
      }

      // Check if it's this player's turn
      const canActivate = battleState.activationState.activatingPlayerId === userId && 
                         battleState.phase === 'BATTLE_ROUNDS' &&
                         !battleState.activationState.roundComplete;

      if (!canActivate) {
        return { units: [], canActivate: false };
      }

      // Find player's army
      const army = battleState.armies.find(a => a.userId === userId);
      if (!army) {
        return { units: [], canActivate: false };
      }

      // Filter available units
      const availableUnits = army.units.filter(unit => 
        !unit.routed && 
        unit.currentSize > 0 && 
        (!unit.activationState.hasActivated || unit.activationState.activatedInRound !== battleState.currentRound)
      );

      return { units: availableUnits, canActivate: true };

    } catch (error) {
      logger.error('Error getting available units for activation:', error);
      return { units: [], canActivate: false };
    }
  }

  /**
   * Get current activation status for the battle
   */
  static async getActivationStatus(
    battleId: string, 
    userId: string
  ): Promise<{
    activationState: OPRActivationState;
    isYourTurn: boolean;
    availableUnits: OPRBattleUnit[];
    canStartNewRound: boolean;
  }> {
    try {
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return {
          activationState: {} as any,
          isYourTurn: false,
          availableUnits: [],
          canStartNewRound: false
        };
      }

      const { units, canActivate } = await this.getAvailableUnitsForActivation(battleId, userId);
      
      return {
        activationState: battleState.activationState,
        isYourTurn: canActivate,
        availableUnits: units,
        canStartNewRound: battleState.activationState.roundComplete && battleState.phase === 'BATTLE_ROUNDS'
      };

    } catch (error) {
      logger.error('Error getting activation status:', error);
      return {
        activationState: {} as any,
        isYourTurn: false,
        availableUnits: [],
        canStartNewRound: false
      };
    }
  }

  /**
   * Process events that happen at the start of each round
   */
  private static async processRoundStartEvents(
    battleState: OPRBattleState, 
    battleId: string
  ): Promise<void> {
    logger.info(`Processing round start events for round ${battleState.currentRound}`);

    // 1. Refresh Caster Tokens (OPR Core Rule)
    this.refreshCasterTokens(battleState);

    // 2. Refresh Command Points for growing/temporary methods
    await this.refreshCommandPointsFromBattle(battleState, battleId);

    // 3. Clear fatigue from all units (OPR: fatigue ends at start of round)
    this.clearFatigue(battleState);

    // 4. Check for random events in campaign mode
    await this.processRandomEvents(battleState, battleId);

    // 5. Reset shaken units that chose to Hold last turn
    this.processRallyingUnits(battleState);


    logger.info(`Round start events completed for round ${battleState.currentRound}`);
  }

  /**
   * Process events that happen at the end of each round
   */
  private static async processRoundEndEvents(
    battleState: OPRBattleState, 
    completedRound: number
  ): Promise<void> {
    logger.info(`Processing round end events for completed round ${completedRound}`);

    // 1. Process morale tests for units under half strength
    this.processMoraleTests(battleState);

    // 2. Update army kill counts and experience
    this.updateArmyStatistics(battleState);

    // 3. Check for victory conditions
    this.checkVictoryConditions(battleState, completedRound);

    logger.info(`Round end events completed for round ${completedRound}`);
  }

  /**
   * Refresh caster tokens for all units with Caster ability
   */
  private static refreshCasterTokens(battleState: OPRBattleState): void {
    for (const army of battleState.armies) {
      for (const unit of army.units) {
        // Refresh regular models
        for (const model of unit.models) {
          const casterRule = model.specialRules.find(rule => rule.includes('Caster('));
          if (casterRule) {
            const match = casterRule.match(/Caster\((\d+)\)/i);
            if (match) {
              const maxTokens = parseInt(match[1], 10);
              model.casterTokens = Math.min(maxTokens, 6); // OPR max is 6
            }
          }
        }

        // Refresh joined heroes
        if (unit.joinedHero) {
          const casterRule = unit.joinedHero.specialRules.find(rule => rule.includes('Caster('));
          if (casterRule) {
            const match = casterRule.match(/Caster\((\d+)\)/i);
            if (match) {
              const maxTokens = parseInt(match[1], 10);
              unit.joinedHero.casterTokens = Math.min(maxTokens, 6);
            }
          }
        }
      }
    }
  }

  /**
   * Clear fatigue from all units (OPR: fatigue ends at start of round)
   */
  private static clearFatigue(battleState: OPRBattleState): void {
    for (const army of battleState.armies) {
      for (const unit of army.units) {
        unit.fatigued = false;
      }
    }
  }

  /**
   * Process random events for campaign battles
   */
  private static async processRandomEvents(
    battleState: OPRBattleState, 
    battleId: string
  ): Promise<void> {
    // Get campaign info to check if random events are enabled
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        mission: {
          include: {
            campaign: true
          }
        }
      }
    });

    // Only process random events if this is a campaign battle
    if (battle?.mission?.campaign) {
      // Roll for random event (OPR Campaign Rules: 5+ on D6)
      const roll = Math.floor(Math.random() * 6) + 1;
      if (roll >= 5) {
        logger.info(`Random event triggered with roll of ${roll}`);
        
        // TODO: Implement specific random events based on campaign rules
        // For now, just log that an event would occur
        await OPRBattleService.recordBattleEvent(
          battleId,
          'system',
          'RANDOM_EVENT',
          {
            description: `Random event rolled (${roll}) but not yet implemented`,
            additionalData: { roll }
          }
        );
      }
    }
  }

  /**
   * Process rallying for shaken units
   */
  private static processRallyingUnits(battleState: OPRBattleState): void {
    for (const army of battleState.armies) {
      for (const unit of army.units) {
        // Units that held while shaken automatically stop being shaken
        if (unit.shaken && unit.action === 'hold') {
          unit.shaken = false;
          logger.info(`Unit ${unit.name} rallied from being shaken`);
        }
      }
    }
  }


  /**
   * Check unit status at round end (informational only)
   */
  private static processMoraleTests(battleState: OPRBattleState): void {
    // OPR Rule: Morale tests are triggered by specific events (damage, melee loss)
    // NOT automatically at round end. This method only logs unit status for information.
    for (const army of battleState.armies) {
      for (const unit of army.units) {
        // Skip already destroyed or routed units
        if (unit.currentSize === 0 || unit.routed) {
          continue;
        }

        // Check if unit is under half strength (informational)
        const isUnderHalfStrength = unit.currentSize <= Math.floor(unit.originalSize / 2);
        
        if (isUnderHalfStrength && !unit.shaken) {
          logger.info(`Unit ${unit.name} (${army.armyName}) is under half strength (${unit.currentSize}/${unit.originalSize}) - vulnerable to routing if morale test fails`);
        }
      }
    }
  }

  /**
   * Update army statistics and kill counts
   */
  private static updateArmyStatistics(battleState: OPRBattleState): void {
    // Kill counts are already tracked, just ensure consistency
    for (const army of battleState.armies) {
      let totalKills = 0;
      for (const unit of army.units) {
        totalKills += unit.kills;
      }
      army.killCount = totalKills;
    }
  }

  /**
   * Check for victory conditions
   */
  private static checkVictoryConditions(
    battleState: OPRBattleState, 
    completedRound: number
  ): void {
    // TODO: Check for victory conditions based on mission objectives
    // Standard OPR missions end after 4 rounds unless extended
    if (completedRound >= 4) {
      logger.info(`Battle has completed ${completedRound} rounds, victory conditions should be checked`);
    }
  }

  /**
   * Refresh command points for growing/temporary methods
   */
  private static async refreshCommandPointsFromBattle(
    battleState: OPRBattleState, 
    battleId: string
  ): Promise<void> {
    try {
      const battle = await prisma.battle.findUnique({
        where: { id: battleId },
        include: {
          mission: {
            include: {
              campaign: true
            }
          }
        }
      });

      if (battle?.mission?.campaign) {
        const settings = battle.mission.campaign.settings as Record<string, any> || {};
        const commandPointMethod = settings.commandPointMethod || 'fixed';
        
        // Use the same logic as in OPRBattleService
        const methodConfig = this.getCommandPointMethodConfig(commandPointMethod);
        
        if (methodConfig.isGrowing) {
          for (const army of battleState.armies) {
            const { CommandPointService } = require('./commandPointService');
            const result = CommandPointService.calculateCommandPoints(army.totalPoints, commandPointMethod);
            
            if (methodConfig.isTemporary) {
              army.currentCommandPoints = result.totalCommandPoints;
            } else {
              army.currentCommandPoints += result.totalCommandPoints;
            }
            
            army.maxCommandPoints = Math.max(army.maxCommandPoints, army.currentCommandPoints);
          }
        }
      }
    } catch (error) {
      logger.error('Error refreshing command points:', error);
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
}