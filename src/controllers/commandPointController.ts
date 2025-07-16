import { Request, Response } from 'express';
import { CommandPointService, CommandPointSpendRequest } from '../services/commandPointService';
import { OPRBattleService } from '../services/oprBattleService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CommandPointController {
  /**
   * Spend command points
   */
  static async spendCommandPoints(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { battleId } = req.params;
      const { 
        armyId, 
        commandPointsToSpend, 
        purpose, 
        targetUnitId, 
        additionalData 
      } = req.body;

      if (!armyId || !commandPointsToSpend || !purpose) {
        res.status(400).json({
          status: 'error',
          message: 'Missing required fields: armyId, commandPointsToSpend, purpose'
        });
        return;
      }

      if (commandPointsToSpend <= 0) {
        res.status(400).json({
          status: 'error',
          message: 'Command points to spend must be positive'
        });
        return;
      }

      // Get current battle state
      const battleState = await OPRBattleService.getOPRBattleState(battleId, req.user!.id);
      if (!battleState) {
        res.status(404).json({
          status: 'error',
          message: 'Battle not found'
        });
        return;
      }

      // Check if user has access to this army
      const userArmy = battleState.armies.find(army => 
        army.userId === req.user!.id && army.armyId === armyId
      );

      if (!userArmy) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have access to this army'
        });
        return;
      }

      const request: CommandPointSpendRequest = {
        battleId,
        userId: req.user!.id,
        armyId,
        commandPointsToSpend,
        purpose,
        targetUnitId,
        additionalData
      };

      // Spend command points
      const result = await CommandPointService.spendCommandPoints(battleState, request);

      if (!result.success) {
        res.status(400).json({
          status: 'error',
          message: result.error
        });
        return;
      }

      // Update battle state in database
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // Broadcast to WebSocket room
      if (result.event) {
        // TODO: Implement WebSocket broadcast
        // wsManager.broadcastToBattleRoom(battleId, 'command_points_spent', result.event);
      }

      res.json({
        status: 'success',
        data: {
          newCommandPointTotal: result.newCommandPointTotal,
          event: result.event
        },
        message: `Successfully spent ${commandPointsToSpend} command points`
      });

    } catch (error) {
      logger.error('Error in spendCommandPoints:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get command point history for an army
   */
  static async getCommandPointHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { battleId } = req.params;
      const { armyId } = req.query;

      if (!armyId) {
        res.status(400).json({
          status: 'error',
          message: 'armyId query parameter is required'
        });
        return;
      }

      const battleState = await OPRBattleService.getOPRBattleState(battleId, req.user!.id);
      if (!battleState) {
        res.status(404).json({
          status: 'error',
          message: 'Battle not found'
        });
        return;
      }

      // Check if user has access to this army
      const userArmy = battleState.armies.find(army => 
        army.userId === req.user!.id && army.armyId === armyId as string
      );

      if (!userArmy) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have access to this army'
        });
        return;
      }

      const history = CommandPointService.getCommandPointHistory(
        battleState,
        req.user!.id,
        armyId as string
      );

      res.json({
        status: 'success',
        data: {
          currentCommandPoints: userArmy.currentCommandPoints,
          maxCommandPoints: userArmy.maxCommandPoints,
          history
        }
      });

    } catch (error) {
      logger.error('Error in getCommandPointHistory:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Calculate command points for an army
   */
  static async calculateCommandPoints(req: Request, res: Response): Promise<void> {
    try {
      const { armyPoints, bonusCP = 0 } = req.body;

      if (!armyPoints || armyPoints <= 0) {
        res.status(400).json({
          status: 'error',
          message: 'Valid armyPoints is required'
        });
        return;
      }

      const calculation = CommandPointService.calculateCommandPoints(armyPoints, 'fixed', bonusCP);

      res.json({
        status: 'success',
        data: calculation
      });

    } catch (error) {
      logger.error('Error in calculateCommandPoints:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Reset command points for all armies (admin only)
   */
  static async resetCommandPoints(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { battleId } = req.params;

      const battleState = await OPRBattleService.getOPRBattleState(battleId, req.user!.id);
      if (!battleState) {
        res.status(404).json({
          status: 'error',
          message: 'Battle not found'
        });
        return;
      }

      // Check if user is battle creator or admin
      // TODO: Implement proper authorization check

      CommandPointService.resetCommandPoints(battleState);
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });

      // TODO: Broadcast to WebSocket room
      // wsManager.broadcastToBattleRoom(battleId, 'command_points_reset', null);

      res.json({
        status: 'success',
        message: 'Command points reset for all armies'
      });

    } catch (error) {
      logger.error('Error in resetCommandPoints:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}