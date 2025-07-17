import { PrismaClient } from '@prisma/client';
import { OPRBattleService } from './oprBattleService';
import { DamageHistoryService } from './damageHistoryService';
import { 
  OPRBattleState, 
  OPRBattleUnit, 
  OPRBattleModel,
  OPRBattlePhase
} from '../types/oprBattle';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export type BattleActionType = 
  | 'DAMAGE_APPLIED'
  | 'SPELL_CAST'
  | 'UNIT_ACTION_SET'
  | 'UNIT_STATUS_CHANGED'
  | 'HERO_JOINED'
  | 'PHASE_CHANGED'
  | 'ROUND_ADVANCED'
  | 'COMMAND_POINTS_SPENT';

export interface BattleActionHistoryEntry {
  id: string;
  battleId: string;
  userId: string;
  timestamp: Date;
  actionType: BattleActionType;
  
  // Action-specific data
  actionData: {
    // For all actions
    description: string;
    
    // Specific fields based on action type
    unitId?: string;
    modelId?: string;
    spellId?: string;
    targetUnitIds?: string[];
    damage?: number;
    statusType?: 'shaken' | 'fatigued';
    statusValue?: boolean;
    actionValue?: 'hold' | 'advance' | 'rush' | 'charge';
    previousPhase?: OPRBattlePhase;
    newPhase?: OPRBattlePhase;
    roundNumber?: number;
    commandPointsSpent?: number;
    heroId?: string;
    targetUnitId?: string;
  };
  
  // State snapshots for undo
  beforeState: {
    battleState: OPRBattleState;
    affectedUnits: OPRBattleUnit[];
    affectedModels?: OPRBattleModel[];
  };
  
  afterState: {
    battleState: OPRBattleState;
    affectedUnits: OPRBattleUnit[];
    affectedModels?: OPRBattleModel[];
  };
  
  // Undo capability
  canUndo: boolean;
  undoneAt?: Date;
  undoneBy?: string;
  undoComplexity: 'simple' | 'complex' | 'cascade';
}

export class BattleActionHistoryService {

  /**
   * Record a battle action with full state tracking
   */
  static async recordAction(
    battleId: string,
    userId: string,
    actionType: BattleActionType,
    actionData: any,
    beforeState: OPRBattleState,
    afterState: OPRBattleState,
    options: {
      canUndo?: boolean;
      undoComplexity?: 'simple' | 'complex' | 'cascade';
      affectedUnitIds?: string[];
      affectedModelIds?: string[];
    } = {}
  ): Promise<BattleActionHistoryEntry> {
    try {
      const {
        canUndo = true,
        undoComplexity = 'simple',
        affectedUnitIds = [],
        affectedModelIds = []
      } = options;

      // Extract affected units and models for faster undo operations
      const affectedUnits = this.extractAffectedUnits(beforeState, affectedUnitIds);
      const affectedModels = this.extractAffectedModels(beforeState, affectedModelIds);
      
      const afterAffectedUnits = this.extractAffectedUnits(afterState, affectedUnitIds);
      const afterAffectedModels = this.extractAffectedModels(afterState, affectedModelIds);

      const entry = await prisma.battleActionHistory.create({
        data: {
          battleId,
          userId,
          actionType,
          actionData: actionData as any,
          beforeState: {
            battleState: beforeState,
            affectedUnits,
            affectedModels
          } as any,
          afterState: {
            battleState: afterState,
            affectedUnits: afterAffectedUnits,
            affectedModels: afterAffectedModels
          } as any,
          canUndo,
          undoComplexity
        }
      });

      logger.info(`Battle action recorded: ${actionType} in battle ${battleId} by user ${userId}`);

      return this.convertPrismaEntryToHistoryEntry(entry);

    } catch (error) {
      logger.error('Error recording battle action:', error);
      throw error;
    }
  }

  /**
   * Undo the last battle action or a specific action
   */
  static async undoAction(
    battleId: string,
    userId: string,
    actionId?: string
  ): Promise<{ success: boolean; error?: string; undoneEntry?: BattleActionHistoryEntry }> {
    try {
      // Find the action to undo
      let actionEntry;
      
      if (actionId) {
        actionEntry = await prisma.battleActionHistory.findFirst({
          where: {
            id: actionId,
            battleId,
            canUndo: true,
            undoneAt: null
          }
        });
      } else {
        // Find the most recent undoable action
        actionEntry = await prisma.battleActionHistory.findFirst({
          where: {
            battleId,
            canUndo: true,
            undoneAt: null
          },
          orderBy: { timestamp: 'desc' }
        });
      }

      if (!actionEntry) {
        return { success: false, error: 'No undoable action found' };
      }

      // Check undo complexity and handle accordingly
      const undoResult = await this.performUndo(actionEntry, userId);
      
      if (!undoResult.success) {
        return { success: false, error: undoResult.error };
      }

      // Mark action as undone
      await prisma.battleActionHistory.update({
        where: { id: actionEntry.id },
        data: {
          undoneAt: new Date(),
          undoneBy: userId,
          canUndo: false
        }
      });

      // Create an undo event
      await this.recordAction(
        battleId,
        userId,
        'DAMAGE_APPLIED' as any, // We'll extend this enum
        {
          description: `Undid action: ${(actionEntry.actionData as any)?.description || 'Unknown action'}`,
          originalActionId: actionEntry.id,
          originalActionType: actionEntry.actionType
        },
        undoResult.currentState!,
        undoResult.restoredState!,
        { canUndo: false, undoComplexity: 'simple' }
      );

      logger.info(`Battle action undone: ${actionEntry.id} by user ${userId}`);

      return { 
        success: true, 
        undoneEntry: this.convertPrismaEntryToHistoryEntry(actionEntry)
      };

    } catch (error) {
      logger.error('Error undoing battle action:', error);
      return { success: false, error: 'Failed to undo action' };
    }
  }

  /**
   * Perform the actual undo operation based on action type
   */
  private static async performUndo(
    actionEntry: any,
    userId: string
  ): Promise<{ success: boolean; error?: string; currentState?: OPRBattleState; restoredState?: OPRBattleState }> {
    try {
      const battleId = actionEntry.battleId;
      const actionType = actionEntry.actionType as BattleActionType;
      const beforeState = actionEntry.beforeState.battleState;
      
      // Get current battle state
      const currentState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!currentState) {
        return { success: false, error: 'Battle not found' };
      }

      switch (actionType) {
        case 'DAMAGE_APPLIED':
          // Delegate to existing damage undo system
          return await this.undoDamageAction(actionEntry, currentState);

        case 'SPELL_CAST':
          return await this.undoSpellCast(actionEntry, currentState);

        case 'UNIT_ACTION_SET':
          return await this.undoUnitAction(actionEntry, currentState);

        case 'UNIT_STATUS_CHANGED':
          return await this.undoStatusChange(actionEntry, currentState);

        case 'HERO_JOINED':
          return await this.undoHeroJoining(actionEntry, currentState);

        case 'PHASE_CHANGED':
          return await this.undoPhaseChange(actionEntry, currentState);

        case 'ROUND_ADVANCED':
          return await this.undoRoundAdvancement(actionEntry, currentState);

        case 'COMMAND_POINTS_SPENT':
          return await this.undoCommandPointSpending(actionEntry, currentState);

        default:
          return { success: false, error: `Undo not implemented for action type: ${actionType}` };
      }

    } catch (error) {
      logger.error('Error performing undo:', error);
      return { success: false, error: 'Failed to perform undo operation' };
    }
  }

  /**
   * Undo damage application
   */
  private static async undoDamageAction(
    actionEntry: any,
    currentState: OPRBattleState
  ): Promise<{ success: boolean; error?: string; currentState?: OPRBattleState; restoredState?: OPRBattleState }> {
    // Use existing damage undo system
    const damageUndoResult = await DamageHistoryService.undoLastDamage(
      actionEntry.battleId,
      actionEntry.userId,
      actionEntry.id
    );

    if (!damageUndoResult.success) {
      return { success: false, error: damageUndoResult.error };
    }

    // Get updated state after undo
    const restoredState = await OPRBattleService.getOPRBattleState(actionEntry.battleId, actionEntry.userId);
    
    return { 
      success: true, 
      currentState,
      restoredState: restoredState!
    };
  }

  /**
   * Undo spell casting
   */
  private static async undoSpellCast(
    actionEntry: any,
    currentState: OPRBattleState
  ): Promise<{ success: boolean; error?: string; currentState?: OPRBattleState; restoredState?: OPRBattleState }> {
    const actionData = actionEntry.actionData;
    const beforeState = actionEntry.beforeState.battleState;
    
    // Restore affected units (spell targets and caster)
    const casterArmyIndex = currentState.armies.findIndex(a => 
      a.units.some(u => u.unitId === actionData.unitId)
    );
    
    if (casterArmyIndex === -1) {
      return { success: false, error: 'Caster unit not found' };
    }

    const casterUnitIndex = currentState.armies[casterArmyIndex].units.findIndex(u => 
      u.unitId === actionData.unitId
    );

    if (casterUnitIndex === -1) {
      return { success: false, error: 'Caster unit not found in army' };
    }

    // Restore caster's tokens and state
    const beforeCasterArmy = beforeState.armies.find((a: any) => 
      a.units.some((u: any) => u.unitId === actionData.unitId)
    );
    const beforeCasterUnit = beforeCasterArmy?.units.find((u: any) => u.unitId === actionData.unitId);

    if (beforeCasterUnit) {
      currentState.armies[casterArmyIndex].units[casterUnitIndex] = beforeCasterUnit;
    }

    // Restore target units if they were affected by the spell
    if (actionData.targetUnitIds) {
      for (const targetUnitId of actionData.targetUnitIds) {
        const targetArmyIndex = currentState.armies.findIndex(a => 
          a.units.some(u => u.unitId === targetUnitId)
        );
        
        if (targetArmyIndex !== -1) {
          const targetUnitIndex = currentState.armies[targetArmyIndex].units.findIndex(u => 
            u.unitId === targetUnitId
          );
          
          if (targetUnitIndex !== -1) {
            const beforeTargetArmy = beforeState.armies.find((a: any) => 
              a.units.some((u: any) => u.unitId === targetUnitId)
            );
            const beforeTargetUnit = beforeTargetArmy?.units.find((u: any) => u.unitId === targetUnitId);
            
            if (beforeTargetUnit) {
              currentState.armies[targetArmyIndex].units[targetUnitIndex] = beforeTargetUnit;
            }
          }
        }
      }
    }

    // Save the restored state
    await prisma.battle.update({
      where: { id: actionEntry.battleId },
      data: { currentState: currentState as any }
    });

    return { 
      success: true, 
      currentState,
      restoredState: currentState
    };
  }

  /**
   * Undo unit action setting
   */
  private static async undoUnitAction(
    actionEntry: any,
    currentState: OPRBattleState
  ): Promise<{ success: boolean; error?: string; currentState?: OPRBattleState; restoredState?: OPRBattleState }> {
    const actionData = actionEntry.actionData;
    const beforeState = actionEntry.beforeState.battleState;
    
    // Find and restore the unit's action
    const army = currentState.armies.find(a => 
      a.units.some(u => u.unitId === actionData.unitId)
    );
    
    if (!army) {
      return { success: false, error: 'Unit not found' };
    }

    const unit = army.units.find(u => u.unitId === actionData.unitId);
    if (!unit) {
      return { success: false, error: 'Unit not found in army' };
    }

    // Restore unit state from before the action
    const beforeArmy = beforeState.armies.find((a: any) => 
      a.units.some((u: any) => u.unitId === actionData.unitId)
    );
    const beforeUnit = beforeArmy?.units.find((u: any) => u.unitId === actionData.unitId);

    if (beforeUnit) {
      Object.assign(unit, beforeUnit);
    }

    // Save the restored state
    await prisma.battle.update({
      where: { id: actionEntry.battleId },
      data: { currentState: currentState as any }
    });

    return { 
      success: true, 
      currentState,
      restoredState: currentState
    };
  }

  /**
   * Undo status changes (shaken, fatigued, etc.)
   */
  private static async undoStatusChange(
    actionEntry: any,
    currentState: OPRBattleState
  ): Promise<{ success: boolean; error?: string; currentState?: OPRBattleState; restoredState?: OPRBattleState }> {
    const actionData = actionEntry.actionData;
    
    // Find the unit and restore its status
    const army = currentState.armies.find(a => 
      a.units.some(u => u.unitId === actionData.unitId)
    );
    
    if (!army) {
      return { success: false, error: 'Unit not found' };
    }

    const unit = army.units.find(u => u.unitId === actionData.unitId);
    if (!unit) {
      return { success: false, error: 'Unit not found in army' };
    }

    // Restore the previous status value
    if (actionData.statusType === 'shaken') {
      unit.shaken = !actionData.statusValue; // Reverse the change
    } else if (actionData.statusType === 'fatigued') {
      unit.fatigued = !actionData.statusValue; // Reverse the change
    }

    // Save the restored state
    await prisma.battle.update({
      where: { id: actionEntry.battleId },
      data: { currentState: currentState as any }
    });

    return { 
      success: true, 
      currentState,
      restoredState: currentState
    };
  }

  /**
   * Undo hero joining
   */
  private static async undoHeroJoining(
    actionEntry: any,
    currentState: OPRBattleState
  ): Promise<{ success: boolean; error?: string; currentState?: OPRBattleState; restoredState?: OPRBattleState }> {
    // Restore the state before hero joined
    const beforeState = actionEntry.beforeState.battleState;
    
    // This is complex - need to restore both the hero and target unit to their previous states
    const actionData = actionEntry.actionData;
    
    // Find the armies and units involved
    const targetArmy = currentState.armies.find((a: any) => 
      a.units.some((u: any) => u.unitId === actionData.targetUnitId)
    );
    
    if (!targetArmy) {
      return { success: false, error: 'Target unit not found' };
    }

    // Restore from complete before state for complex operations like hero joining
    const beforeTargetArmy = beforeState.armies.find((a: any) => a.armyId === targetArmy.armyId);
    if (beforeTargetArmy) {
      Object.assign(targetArmy, beforeTargetArmy);
    }

    // Save the restored state
    await prisma.battle.update({
      where: { id: actionEntry.battleId },
      data: { currentState: currentState as any }
    });

    return { 
      success: true, 
      currentState,
      restoredState: currentState
    };
  }

  /**
   * Undo phase changes
   */
  private static async undoPhaseChange(
    actionEntry: any,
    currentState: OPRBattleState
  ): Promise<{ success: boolean; error?: string; currentState?: OPRBattleState; restoredState?: OPRBattleState }> {
    const actionData = actionEntry.actionData;
    
    // Restore the previous phase
    currentState.phase = actionData.previousPhase;
    
    // Save the restored state
    await prisma.battle.update({
      where: { id: actionEntry.battleId },
      data: { currentState: currentState as any }
    });

    return { 
      success: true, 
      currentState,
      restoredState: currentState
    };
  }

  /**
   * Undo round advancement
   */
  private static async undoRoundAdvancement(
    actionEntry: any,
    currentState: OPRBattleState
  ): Promise<{ success: boolean; error?: string; currentState?: OPRBattleState; restoredState?: OPRBattleState }> {
    const beforeState = actionEntry.beforeState.battleState;
    
    // Restore the entire previous state for round changes as they affect many things
    Object.assign(currentState, beforeState);
    
    // Save the restored state
    await prisma.battle.update({
      where: { id: actionEntry.battleId },
      data: { currentState: currentState as any }
    });

    return { 
      success: true, 
      currentState,
      restoredState: currentState
    };
  }

  /**
   * Undo command point spending
   */
  private static async undoCommandPointSpending(
    actionEntry: any,
    currentState: OPRBattleState
  ): Promise<{ success: boolean; error?: string; currentState?: OPRBattleState; restoredState?: OPRBattleState }> {
    const actionData = actionEntry.actionData;
    
    // Restore command points for the user
    const army = currentState.armies.find(a => a.userId === actionEntry.userId);
    if (!army) {
      return { success: false, error: 'User army not found' };
    }

    // Add back the spent command points
    army.currentCommandPoints += actionData.commandPointsSpent;
    
    // Save the restored state
    await prisma.battle.update({
      where: { id: actionEntry.battleId },
      data: { currentState: currentState as any }
    });

    return { 
      success: true, 
      currentState,
      restoredState: currentState
    };
  }

  /**
   * Get battle action history
   */
  static async getBattleActionHistory(
    battleId: string,
    userId: string,
    options: {
      limit?: number;
      includeUndone?: boolean;
      actionTypes?: BattleActionType[];
    } = {}
  ): Promise<BattleActionHistoryEntry[]> {
    try {
      const { limit = 50, includeUndone = true, actionTypes } = options;

      const whereClause: any = { battleId };

      if (!includeUndone) {
        whereClause.undoneAt = null;
      }

      if (actionTypes && actionTypes.length > 0) {
        whereClause.actionType = { in: actionTypes };
      }

      const entries = await prisma.battleActionHistory.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return entries.map(entry => this.convertPrismaEntryToHistoryEntry(entry));

    } catch (error) {
      logger.error('Error getting battle action history:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  private static extractAffectedUnits(battleState: OPRBattleState, unitIds: string[]): OPRBattleUnit[] {
    const units: OPRBattleUnit[] = [];
    
    for (const army of battleState.armies) {
      for (const unit of army.units) {
        if (unitIds.includes(unit.unitId)) {
          units.push(unit);
        }
      }
    }
    
    return units;
  }

  private static extractAffectedModels(battleState: OPRBattleState, modelIds: string[]): OPRBattleModel[] {
    const models: OPRBattleModel[] = [];
    
    for (const army of battleState.armies) {
      for (const unit of army.units) {
        for (const model of unit.models) {
          if (modelIds.includes(model.modelId)) {
            models.push(model);
          }
        }
        
        if (unit.joinedHero && modelIds.includes(unit.joinedHero.modelId)) {
          models.push(unit.joinedHero);
        }
      }
    }
    
    return models;
  }

  private static convertPrismaEntryToHistoryEntry(entry: any): BattleActionHistoryEntry {
    return {
      id: entry.id,
      battleId: entry.battleId,
      userId: entry.userId,
      timestamp: entry.timestamp,
      actionType: entry.actionType,
      actionData: entry.actionData,
      beforeState: entry.beforeState,
      afterState: entry.afterState,
      canUndo: entry.canUndo,
      undoneAt: entry.undoneAt,
      undoneBy: entry.undoneBy,
      undoComplexity: entry.undoComplexity || 'simple'
    };
  }
}