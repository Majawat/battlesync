import { OPRBattleState, OPRBattleArmy, OPRBattleEvent } from '../types/oprBattle';
import { logger } from '../utils/logger';

export interface CommandPointSpendRequest {
  battleId: string;
  userId: string;
  armyId: string;
  commandPointsToSpend: number;
  purpose: string; // e.g., "Activation", "Stratagem: Smoke Screen", "Re-roll failed test"
  targetUnitId?: string;
  additionalData?: Record<string, any>;
}

export interface CommandPointSpendResult {
  success: boolean;
  newCommandPointTotal: number;
  event?: OPRBattleEvent;
  error?: string;
}

export interface CommandPointCalculation {
  baseCommandPoints: number;
  bonusCommandPoints: number;
  totalCommandPoints: number;
  calculation: string[];
  requiresD3Roll?: boolean; // For random methods that need user dice roll
}

export class CommandPointService {
  /**
   * Calculate command points based on method (for non-random methods)
   */
  static calculateCommandPoints(
    armyPoints: number, 
    method: 'fixed' | 'growing' | 'temporary' | 'fixed-random' | 'growing-random' | 'temporary-random' = 'fixed',
    bonusCP: number = 0,
    d3Roll?: number // User-provided D3 roll for random methods
  ): CommandPointCalculation {
    const methodConfig = this.getCommandPointMethodConfig(method);
    
    // Calculate base CP using floor() as per OPR rules
    let baseCommandPoints = Math.floor(armyPoints / 1000) * methodConfig.basePerThousand;
    
    // Special handling for 0.5 basePerThousand methods (round up the total)
    if (methodConfig.basePerThousand === 0.5) {
      baseCommandPoints = Math.ceil(Math.floor(armyPoints / 1000) * methodConfig.basePerThousand);
    }
    
    const calculation = [
      `Army Points: ${armyPoints}`,
      `Method: ${method}`,
      `Base CP: floor(${armyPoints}/1000) × ${methodConfig.basePerThousand} = ${Math.floor(armyPoints / 1000)} × ${methodConfig.basePerThousand} = ${baseCommandPoints}`,
    ];
    
    // Apply user-provided D3 roll for random methods
    if (methodConfig.isRandom) {
      if (d3Roll && d3Roll >= 1 && d3Roll <= 3) {
        baseCommandPoints *= d3Roll;
        calculation.push(`D3 Roll: ${d3Roll} (multiplier applied)`);
      } else {
        calculation.push(`❗ Random method requires D3 roll (1-3)`);
        // Return base calculation without random multiplier for UI to handle
      }
    }
    
    const totalCommandPoints = baseCommandPoints + bonusCP;
    
    if (bonusCP > 0) {
      calculation.push(`Bonus CP: +${bonusCP}`);
    }
    
    calculation.push(`Total CP: ${totalCommandPoints}`);
    
    return {
      baseCommandPoints,
      bonusCommandPoints: bonusCP,
      totalCommandPoints,
      calculation,
      requiresD3Roll: methodConfig.isRandom && !d3Roll
    };
  }

  /**
   * Get the base CP calculation without random multiplier (for UI display)
   */
  static getBaseCommandPointsForMethod(
    armyPoints: number,
    method: 'fixed' | 'growing' | 'temporary' | 'fixed-random' | 'growing-random' | 'temporary-random'
  ): { baseCP: number; formula: string; requiresD3: boolean } {
    const methodConfig = this.getCommandPointMethodConfig(method);
    let baseCP = Math.floor(armyPoints / 1000) * methodConfig.basePerThousand;
    
    if (methodConfig.basePerThousand === 0.5) {
      baseCP = Math.ceil(Math.floor(armyPoints / 1000) * methodConfig.basePerThousand);
    }
    
    const formula = methodConfig.isRandom 
      ? `${baseCP} × D3 (roll 1-3)`
      : `${baseCP}`;
    
    return {
      baseCP,
      formula,
      requiresD3: methodConfig.isRandom
    };
  }

  /**
   * Get configuration for command point calculation method
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
   * Spend command points for an army
   */
  static async spendCommandPoints(
    battleState: OPRBattleState,
    request: CommandPointSpendRequest
  ): Promise<CommandPointSpendResult> {
    try {
      // Find the army
      const army = battleState.armies.find(a => 
        a.armyId === request.armyId && a.userId === request.userId
      );

      if (!army) {
        return {
          success: false,
          newCommandPointTotal: 0,
          error: 'Army not found in battle'
        };
      }

      // Check if army has enough command points
      if (army.currentCommandPoints < request.commandPointsToSpend) {
        return {
          success: false,
          newCommandPointTotal: army.currentCommandPoints,
          error: `Insufficient command points. Available: ${army.currentCommandPoints}, Required: ${request.commandPointsToSpend}`
        };
      }

      // Spend the command points
      army.currentCommandPoints -= request.commandPointsToSpend;

      // Create battle event
      const event: OPRBattleEvent = {
        id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        round: battleState.currentRound,
        phase: battleState.phase,
        userId: request.userId,
        eventType: 'COMMAND_POINTS_SPENT',
        data: {
          description: `Spent ${request.commandPointsToSpend} CP for: ${request.purpose}`,
          unitId: request.targetUnitId,
          commandPointsSpent: request.commandPointsToSpend,
          additionalData: {
            purpose: request.purpose,
            remainingCP: army.currentCommandPoints,
            ...request.additionalData
          }
        }
      };

      // Add event to battle state
      battleState.events.push(event);

      logger.info(`Command points spent: ${request.commandPointsToSpend} for ${request.purpose}`, {
        battleId: request.battleId,
        userId: request.userId,
        remainingCP: army.currentCommandPoints
      });

      return {
        success: true,
        newCommandPointTotal: army.currentCommandPoints,
        event
      };

    } catch (error) {
      logger.error('Error spending command points:', error);
      return {
        success: false,
        newCommandPointTotal: 0,
        error: 'Failed to spend command points'
      };
    }
  }

  /**
   * Refund command points (for undo operations)
   */
  static async refundCommandPoints(
    battleState: OPRBattleState,
    userId: string,
    armyId: string,
    commandPointsToRefund: number,
    reason: string
  ): Promise<CommandPointSpendResult> {
    try {
      const army = battleState.armies.find(a => 
        a.armyId === armyId && a.userId === userId
      );

      if (!army) {
        return {
          success: false,
          newCommandPointTotal: 0,
          error: 'Army not found in battle'
        };
      }

      // Don't exceed maximum command points
      const newTotal = Math.min(
        army.currentCommandPoints + commandPointsToRefund,
        army.maxCommandPoints
      );
      
      const actualRefund = newTotal - army.currentCommandPoints;
      army.currentCommandPoints = newTotal;

      // Create refund event
      const event: OPRBattleEvent = {
        id: `cp_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        round: battleState.currentRound,
        phase: battleState.phase,
        userId,
        eventType: 'COMMAND_POINTS_SPENT', // Negative spending
        data: {
          description: `Refunded ${actualRefund} CP: ${reason}`,
          commandPointsSpent: -actualRefund,
          additionalData: {
            reason,
            newTotal: army.currentCommandPoints,
            isRefund: true
          }
        }
      };

      battleState.events.push(event);

      logger.info(`Command points refunded: ${actualRefund}`, {
        userId,
        armyId,
        newTotal: army.currentCommandPoints,
        reason
      });

      return {
        success: true,
        newCommandPointTotal: army.currentCommandPoints,
        event
      };

    } catch (error) {
      logger.error('Error refunding command points:', error);
      return {
        success: false,
        newCommandPointTotal: 0,
        error: 'Failed to refund command points'
      };
    }
  }

  /**
   * Get command point usage history for an army
   */
  static getCommandPointHistory(
    battleState: OPRBattleState,
    userId: string,
    armyId: string
  ): OPRBattleEvent[] {
    return battleState.events.filter(event => 
      event.eventType === 'COMMAND_POINTS_SPENT' &&
      event.userId === userId &&
      (event.data.additionalData?.armyId === armyId || 
       battleState.armies.find(a => a.userId === userId && a.armyId === armyId))
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Reset command points for a new round (if rules allow)
   */
  static resetCommandPoints(battleState: OPRBattleState): void {
    battleState.armies.forEach(army => {
      army.currentCommandPoints = army.maxCommandPoints;
    });

    // Add reset event
    const event: OPRBattleEvent = {
      id: `cp_reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      round: battleState.currentRound,
      phase: battleState.phase,
      userId: 'system',
      eventType: 'PHASE_CHANGED',
      data: {
        description: 'Command points reset for new round',
        additionalData: {
          action: 'command_points_reset'
        }
      }
    };

    battleState.events.push(event);
    
    logger.info('Command points reset for all armies');
  }
}