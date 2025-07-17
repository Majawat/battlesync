import { PrismaClient } from '@prisma/client';
import { OPRBattleService } from './oprBattleService';
import { 
  OPRBattleState, 
  OPRBattleUnit, 
  OPRBattleModel,
  ApplyDamageRequest,
  DamageResult 
} from '../types/oprBattle';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface DamageHistoryEntry {
  id: string;
  battleId: string;
  userId: string;
  timestamp: Date;
  actionType: 'DAMAGE_APPLIED' | 'DAMAGE_UNDONE';
  
  // Damage details
  targetUnitId: string;
  targetModelId?: string;
  damage: number;
  sourceDescription?: string;
  
  // Pre-damage state (for undo)
  beforeState: {
    unitState: OPRBattleUnit;
    targetModelState?: OPRBattleModel;
  };
  
  // Post-damage state
  afterState: {
    unitState: OPRBattleUnit;
    targetModelState?: OPRBattleModel;
    modelsDestroyed: number;
    unitDestroyed: boolean;
  };
  
  // Undo information
  canUndo: boolean;
  undoneAt?: Date;
  undoneBy?: string;
}

export class DamageHistoryService {
  
  /**
   * Apply damage with full history tracking
   */
  static async applyDamageWithHistory(request: ApplyDamageRequest): Promise<DamageResult & { historyId: string }> {
    try {
      // Get current battle state
      const battleState = await OPRBattleService.getOPRBattleState(request.battleId, request.userId);
      if (!battleState) {
        throw new Error('Battle not found');
      }

      // Find target unit and model
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

      let targetModel: OPRBattleModel | undefined;
      if (request.targetModelId) {
        targetModel = targetUnit.models.find(m => m.modelId === request.targetModelId);
        if (!targetModel || targetModel.isDestroyed) {
          throw new Error('Invalid target model');
        }
      }

      // Store pre-damage state for undo
      const beforeState = {
        unitState: JSON.parse(JSON.stringify(targetUnit)) as OPRBattleUnit,
        targetModelState: targetModel ? JSON.parse(JSON.stringify(targetModel)) as OPRBattleModel : undefined
      };

      // Apply damage using existing service
      const damageResult = await OPRBattleService.applyDamage(request);

      // Get updated state
      const updatedBattleState = await OPRBattleService.getOPRBattleState(request.battleId, request.userId);
      const updatedUnit = updatedBattleState?.armies
        .find(a => a.units.some(u => u.unitId === request.targetUnitId))
        ?.units.find(u => u.unitId === request.targetUnitId);
      
      const updatedModel = request.targetModelId && updatedUnit 
        ? updatedUnit.models.find(m => m.modelId === request.targetModelId)
        : undefined;

      const afterState = {
        unitState: updatedUnit!,
        targetModelState: updatedModel,
        modelsDestroyed: damageResult.modelsDestroyed,
        unitDestroyed: damageResult.unitDestroyed
      };

      // Create history entry
      const historyEntry = await prisma.damageHistory.create({
        data: {
          battleId: request.battleId,
          userId: request.userId,
          actionType: 'DAMAGE_APPLIED',
          targetUnitId: request.targetUnitId,
          targetModelId: request.targetModelId,
          damage: request.damage,
          sourceDescription: request.sourceDescription,
          beforeState: beforeState as any,
          afterState: afterState as any,
          canUndo: true
        }
      });

      logger.info(`Damage applied with history tracking: ${historyEntry.id}`);

      return {
        ...damageResult,
        historyId: historyEntry.id
      };

    } catch (error) {
      logger.error('Error applying damage with history:', error);
      throw error;
    }
  }

  /**
   * Undo the last damage action
   */
  static async undoLastDamage(
    battleId: string, 
    userId: string,
    historyId?: string
  ): Promise<{ success: boolean; error?: string; undoneEntry?: DamageHistoryEntry }> {
    try {
      // Find the damage entry to undo
      let damageEntry;
      
      if (historyId) {
        // Undo specific damage entry
        damageEntry = await prisma.damageHistory.findFirst({
          where: {
            id: historyId,
            battleId,
            canUndo: true,
            undoneAt: null
          }
        });
      } else {
        // Undo the most recent damage entry
        damageEntry = await prisma.damageHistory.findFirst({
          where: {
            battleId,
            actionType: 'DAMAGE_APPLIED',
            canUndo: true,
            undoneAt: null
          },
          orderBy: { timestamp: 'desc' }
        });
      }

      if (!damageEntry) {
        return { success: false, error: 'No undoable damage found' };
      }

      // Get current battle state
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        return { success: false, error: 'Battle not found' };
      }

      // Restore the unit to its pre-damage state
      const beforeState = damageEntry.beforeState as any;
      const targetArmy = battleState.armies.find(a => 
        a.units.some(u => u.unitId === damageEntry.targetUnitId)
      );
      
      if (!targetArmy) {
        return { success: false, error: 'Target unit not found' };
      }

      const unitIndex = targetArmy.units.findIndex(u => u.unitId === damageEntry.targetUnitId);
      if (unitIndex === -1) {
        return { success: false, error: 'Target unit not found in army' };
      }

      // Restore unit state
      targetArmy.units[unitIndex] = beforeState.unitState;

      // Save updated battle state
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // Mark damage entry as undone
      await prisma.damageHistory.update({
        where: { id: damageEntry.id },
        data: {
          undoneAt: new Date(),
          undoneBy: userId,
          canUndo: false
        }
      });

      // Create undo event in battle history
      await prisma.battleEvent.create({
        data: {
          battleId,
          userId,
          eventType: 'DAMAGE_APPLIED' as any, // We'll extend this with DAMAGE_UNDONE later
          data: {
            description: `Undid damage: ${damageEntry.sourceDescription || 'Unknown damage'}`,
            originalDamageId: damageEntry.id,
            targetUnitId: damageEntry.targetUnitId,
            damage: damageEntry.damage
          }
        }
      });

      // Broadcast undo to WebSocket room
      // Note: We'll need to implement this in the OPRBattleService
      
      logger.info(`Damage undone: ${damageEntry.id} by user ${userId}`);

      return { 
        success: true, 
        undoneEntry: this.convertPrismaEntryToHistoryEntry(damageEntry)
      };

    } catch (error) {
      logger.error('Error undoing damage:', error);
      return { success: false, error: 'Failed to undo damage' };
    }
  }

  /**
   * Get damage history for a battle
   */
  static async getBattleDamageHistory(
    battleId: string,
    userId: string,
    options: {
      limit?: number;
      includeUndone?: boolean;
      unitId?: string;
    } = {}
  ): Promise<DamageHistoryEntry[]> {
    try {
      const { limit = 50, includeUndone = true, unitId } = options;

      const whereClause: any = {
        battleId
      };

      if (!includeUndone) {
        whereClause.undoneAt = null;
      }

      if (unitId) {
        whereClause.targetUnitId = unitId;
      }

      const entries = await prisma.damageHistory.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return entries.map(entry => this.convertPrismaEntryToHistoryEntry(entry));

    } catch (error) {
      logger.error('Error getting damage history:', error);
      return [];
    }
  }

  /**
   * Check if a damage action can be undone
   */
  static async canUndoDamage(historyId: string): Promise<boolean> {
    try {
      const entry = await prisma.damageHistory.findUnique({
        where: { id: historyId }
      });

      return entry?.canUndo === true && entry.undoneAt === null;
    } catch (error) {
      logger.error('Error checking undo capability:', error);
      return false;
    }
  }

  /**
   * Clear old damage history (cleanup utility)
   */
  static async clearOldHistory(daysToKeep: number = 30): Promise<{ deletedCount: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.damageHistory.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`Cleared ${result.count} old damage history entries`);
      return { deletedCount: result.count };

    } catch (error) {
      logger.error('Error clearing old damage history:', error);
      return { deletedCount: 0 };
    }
  }

  /**
   * Convert Prisma entry to typed history entry
   */
  private static convertPrismaEntryToHistoryEntry(entry: any): DamageHistoryEntry {
    return {
      id: entry.id,
      battleId: entry.battleId,
      userId: entry.userId,
      timestamp: entry.timestamp,
      actionType: entry.actionType,
      targetUnitId: entry.targetUnitId,
      targetModelId: entry.targetModelId,
      damage: entry.damage,
      sourceDescription: entry.sourceDescription,
      beforeState: entry.beforeState as {
        unitState: OPRBattleUnit;
        targetModelState?: OPRBattleModel;
      },
      afterState: entry.afterState as {
        unitState: OPRBattleUnit;
        targetModelState?: OPRBattleModel;
        modelsDestroyed: number;
        unitDestroyed: boolean;
      },
      canUndo: entry.canUndo,
      undoneAt: entry.undoneAt,
      undoneBy: entry.undoneBy
    };
  }
}