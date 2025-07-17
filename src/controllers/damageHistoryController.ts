import { Request, Response, RequestHandler } from 'express';
import { DamageHistoryService } from '../services/damageHistoryService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';

export class DamageHistoryController {

  /**
   * Apply damage with history tracking
   */
  static applyDamageWithHistory: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { battleId } = req.params;
      const { targetUnitId, targetModelId, damage, sourceDescription, sourceUnitId, ignoreTough } = req.body;

      if (!battleId || !targetUnitId || damage === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: battleId, targetUnitId, damage'
        });
        return;
      }

      if (damage < 1 || damage > 20) {
        res.status(400).json({
          success: false,
          error: 'Damage must be between 1 and 20'
        });
        return;
      }

      const result = await DamageHistoryService.applyDamageWithHistory({
        battleId,
        userId: (req as AuthenticatedRequest).user!.id,
        targetUnitId,
        targetModelId,
        damage,
        sourceDescription,
        sourceUnitId,
        ignoreTough: ignoreTough || false
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error applying damage with history:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to apply damage'
        });
      }
    }
  };

  /**
   * Undo damage action
   */
  static undoDamage: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { battleId } = req.params;
      const { historyId } = req.body;

      if (!battleId) {
        res.status(400).json({
          success: false,
          error: 'Missing battleId'
        });
        return;
      }

      const result = await DamageHistoryService.undoLastDamage(
        battleId,
        (req as AuthenticatedRequest).user!.id,
        historyId
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        data: result.undoneEntry
      });

    } catch (error) {
      logger.error('Error undoing damage:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to undo damage'
        });
      }
    }
  };

  /**
   * Get battle damage history
   */
  static getBattleDamageHistory: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { battleId } = req.params;
      const { 
        limit = '50', 
        includeUndone = 'true', 
        unitId 
      } = req.query as { limit?: string; includeUndone?: string; unitId?: string };

      if (!battleId) {
        res.status(400).json({
          success: false,
          error: 'Missing battleId'
        });
        return;
      }

      const history = await DamageHistoryService.getBattleDamageHistory(
        battleId,
        (req as AuthenticatedRequest).user!.id,
        {
          limit: parseInt(limit, 10),
          includeUndone: includeUndone === 'true',
          unitId
        }
      );

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      logger.error('Error getting damage history:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get damage history'
        });
      }
    }
  };

  /**
   * Check if damage can be undone
   */
  static checkUndoCapability: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { historyId } = req.params;

      if (!historyId) {
        res.status(400).json({
          success: false,
          error: 'Missing historyId'
        });
        return;
      }

      const canUndo = await DamageHistoryService.canUndoDamage(historyId);

      res.json({
        success: true,
        data: { canUndo }
      });

    } catch (error) {
      logger.error('Error checking undo capability:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to check undo capability'
        });
      }
    }
  };

  /**
   * Get recent damage actions for quick undo
   */
  static getRecentDamageActions: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { battleId } = req.params;
      const { limit = '5' } = req.query as { limit?: string };

      if (!battleId) {
        res.status(400).json({
          success: false,
          error: 'Missing battleId'
        });
        return;
      }

      const recentActions = await DamageHistoryService.getBattleDamageHistory(
        battleId,
        (req as AuthenticatedRequest).user!.id,
        {
          limit: parseInt(limit, 10),
          includeUndone: false // Only show undoable actions
        }
      );

      res.json({
        success: true,
        data: recentActions
      });

    } catch (error) {
      logger.error('Error getting recent damage actions:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get recent damage actions'
        });
      }
    }
  };
}