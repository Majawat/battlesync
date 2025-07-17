import { Request, Response } from 'express';
import { BattleActionHistoryService, BattleActionType } from '../services/battleActionHistoryService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class BattleActionHistoryController {

  /**
   * Get battle action history
   * GET /api/battles/:battleId/action-history
   */
  static async getBattleActionHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { 
        limit = 50, 
        includeUndone = 'true', 
        actionTypes 
      } = req.query;

      const options: any = {
        limit: parseInt(limit as string),
        includeUndone: includeUndone === 'true'
      };

      if (actionTypes) {
        const typesArray = (actionTypes as string).split(',') as BattleActionType[];
        options.actionTypes = typesArray;
      }

      const history = await BattleActionHistoryService.getBattleActionHistory(
        battleId,
        userId,
        options
      );

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      logger.error('Get battle action history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get battle action history'
      });
    }
  }

  /**
   * Get recent undoable actions
   * GET /api/battles/:battleId/action-history/recent
   */
  static async getRecentUndoableActions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { limit = 10 } = req.query;

      const recentActions = await BattleActionHistoryService.getBattleActionHistory(
        battleId,
        userId,
        {
          limit: parseInt(limit as string),
          includeUndone: false
        }
      );

      // Filter to only undoable actions
      const undoableActions = recentActions.filter(action => 
        action.canUndo && !action.undoneAt
      );

      res.json({
        success: true,
        data: undoableActions
      });

    } catch (error) {
      logger.error('Get recent undoable actions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recent undoable actions'
      });
    }
  }

  /**
   * Undo the last action or a specific action
   * POST /api/battles/:battleId/action-history/undo
   */
  static async undoAction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { actionId } = req.body; // Optional - if not provided, undoes last action

      const result = await BattleActionHistoryService.undoAction(
        battleId,
        userId,
        actionId
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            undoneAction: result.undoneEntry,
            message: 'Action undone successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Undo action error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to undo action'
      });
    }
  }

  /**
   * Undo multiple actions in sequence (cascade undo)
   * POST /api/battles/:battleId/action-history/undo-cascade
   */
  static async undoCascade(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { actionIds } = req.body; // Array of action IDs to undo in reverse order

      if (!Array.isArray(actionIds) || actionIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'actionIds must be a non-empty array'
        });
        return;
      }

      const results = [];
      let lastError = null;

      // Undo actions in reverse order (most recent first)
      for (const actionId of actionIds.reverse()) {
        const result = await BattleActionHistoryService.undoAction(
          battleId,
          userId,
          actionId
        );

        results.push({
          actionId,
          success: result.success,
          error: result.error
        });

        if (!result.success) {
          lastError = result.error;
          break; // Stop on first error
        }
      }

      if (lastError) {
        res.status(400).json({
          success: false,
          error: `Cascade undo failed: ${lastError}`,
          partialResults: results
        });
      } else {
        res.json({
          success: true,
          data: {
            undoneActions: results.length,
            results
          }
        });
      }

    } catch (error) {
      logger.error('Cascade undo error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform cascade undo'
      });
    }
  }

  /**
   * Get undo suggestions based on recent actions
   * GET /api/battles/:battleId/action-history/undo-suggestions
   */
  static async getUndoSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;

      const recentActions = await BattleActionHistoryService.getBattleActionHistory(
        battleId,
        userId,
        {
          limit: 20,
          includeUndone: false
        }
      );

      const suggestions = [];

      // Last action (if undoable)
      if (recentActions.length > 0 && recentActions[0].canUndo) {
        suggestions.push({
          type: 'last-action',
          title: 'Undo Last Action',
          description: recentActions[0].actionData.description,
          actionId: recentActions[0].id,
          complexity: recentActions[0].undoComplexity
        });
      }

      // Last turn (if in active phase)
      const turnActions = recentActions.filter(action => 
        action.actionType === 'UNIT_ACTION_SET' && action.canUndo
      );
      
      if (turnActions.length > 0) {
        suggestions.push({
          type: 'last-turn',
          title: 'Undo Last Turn',
          description: `Undo ${turnActions.length} unit actions`,
          actionIds: turnActions.map(a => a.id),
          complexity: 'complex'
        });
      }

      // Last phase change
      const phaseActions = recentActions.filter(action => 
        action.actionType === 'PHASE_CHANGED' && action.canUndo
      );
      
      if (phaseActions.length > 0) {
        suggestions.push({
          type: 'last-phase',
          title: 'Undo Phase Change',
          description: `Return to ${phaseActions[0].actionData.previousPhase}`,
          actionId: phaseActions[0].id,
          complexity: 'cascade'
        });
      }

      res.json({
        success: true,
        data: suggestions
      });

    } catch (error) {
      logger.error('Get undo suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get undo suggestions'
      });
    }
  }

  /**
   * Export action history for battle reports
   * GET /api/battles/:battleId/action-history/export
   */
  static async exportActionHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { format = 'json' } = req.query;

      const fullHistory = await BattleActionHistoryService.getBattleActionHistory(
        battleId,
        userId,
        {
          limit: 1000, // Get comprehensive history
          includeUndone: true
        }
      );

      if (format === 'json') {
        res.json({
          success: true,
          data: {
            battleId,
            exportedAt: new Date().toISOString(),
            totalActions: fullHistory.length,
            actions: fullHistory
          }
        });
      } else if (format === 'csv') {
        // Generate CSV format for spreadsheet analysis
        const csvHeader = 'Timestamp,Action Type,User,Description,Can Undo,Undone At\n';
        const csvRows = fullHistory.map(action => 
          `"${action.timestamp}","${action.actionType}","${action.userId}","${action.actionData.description}","${action.canUndo}","${action.undoneAt || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="battle-${battleId}-history.csv"`);
        res.send(csvHeader + csvRows);
      } else {
        res.status(400).json({
          success: false,
          error: 'Unsupported format. Use json or csv.'
        });
      }

    } catch (error) {
      logger.error('Export action history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export action history'
      });
    }
  }
}