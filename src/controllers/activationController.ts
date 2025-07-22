import { Request, Response } from 'express';
import { ActivationService } from '../services/activationService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getWebSocketManager } from '../services/websocket';

export class ActivationController {

  /**
   * Start a new round of activations
   * POST /api/battles/:battleId/activation/start-round
   */
  static async startNewRound(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;

      const result = await ActivationService.startNewRound(battleId, userId);

      if (result.success) {
        // Broadcast round start to all battle participants
        const wsManager = getWebSocketManager();
        if (wsManager && 'broadcast' in wsManager) {
          (wsManager as any).broadcastToBattleRoom?.(battleId, 'round_started', {
            roundNumber: result.newActivationState.currentTurn,
            activationOrder: result.newActivationState.activationOrder,
            nextActivatingPlayer: result.nextActivatingPlayer
          });
        }

        res.json({
          success: true,
          data: {
            activationState: result.newActivationState,
            nextActivatingPlayer: result.nextActivatingPlayer,
            message: 'New round started successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Start new round error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start new round'
      });
    }
  }

  /**
   * Activate a specific unit
   * POST /api/battles/:battleId/activation/activate-unit
   */
  static async activateUnit(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { unitId, actions } = req.body;

      if (!unitId) {
        res.status(400).json({
          success: false,
          error: 'Unit ID is required'
        });
        return;
      }

      const result = await ActivationService.activateUnit({
        battleId,
        userId,
        unitId,
        actions: actions || []
      });

      if (result.success) {
        // Broadcast activation to all battle participants
        const wsManager = getWebSocketManager();
        if (wsManager && 'broadcast' in wsManager) {
          (wsManager as any).broadcastToBattleRoom?.(battleId, 'unit_activated', {
            unitId,
            activatedBy: userId,
            unitName: result.unitActivated?.name,
            nextActivatingPlayer: result.nextActivatingPlayer,
            roundComplete: result.roundComplete,
            activationState: result.newActivationState
          });
        }

        res.json({
          success: true,
          data: {
            activationState: result.newActivationState,
            unitActivated: result.unitActivated,
            nextActivatingPlayer: result.nextActivatingPlayer,
            roundComplete: result.roundComplete,
            message: 'Unit activated successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Activate unit error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to activate unit'
      });
    }
  }

  /**
   * Pass activation (skip turn)
   * POST /api/battles/:battleId/activation/pass
   */
  static async passActivation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { reason } = req.body;

      const result = await ActivationService.passActivation({
        battleId,
        userId,
        reason
      });

      if (result.success) {
        // Broadcast pass to all battle participants
        const wsManager = getWebSocketManager();
        if (wsManager && 'broadcast' in wsManager) {
          (wsManager as any).broadcastToBattleRoom?.(battleId, 'activation_passed', {
            passedBy: userId,
            reason,
            nextActivatingPlayer: result.nextActivatingPlayer,
            roundComplete: result.roundComplete,
            activationState: result.newActivationState
          });
        }

        res.json({
          success: true,
          data: {
            activationState: result.newActivationState,
            nextActivatingPlayer: result.nextActivatingPlayer,
            roundComplete: result.roundComplete,
            message: 'Activation passed successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Pass activation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pass activation'
      });
    }
  }

  /**
   * Get current activation status
   * GET /api/battles/:battleId/activation/status
   */
  static async getActivationStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;

      const status = await ActivationService.getActivationStatus(battleId, userId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Get activation status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get activation status'
      });
    }
  }

  /**
   * Get available units for activation
   * GET /api/battles/:battleId/activation/available-units
   */
  static async getAvailableUnits(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;

      const result = await ActivationService.getAvailableUnitsForActivation(battleId, userId);

      res.json({
        success: true,
        data: {
          units: result.units,
          canActivate: result.canActivate
        }
      });

    } catch (error) {
      logger.error('Get available units error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available units'
      });
    }
  }

  /**
   * Get activation order for current round
   * GET /api/battles/:battleId/activation/order
   */
  static async getActivationOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;

      const status = await ActivationService.getActivationStatus(battleId, userId);

      res.json({
        success: true,
        data: {
          activationOrder: status.activationState.activationOrder,
          currentTurn: status.activationState.currentTurn,
          maxTurns: status.activationState.maxTurns,
          roundComplete: status.activationState.roundComplete
        }
      });

    } catch (error) {
      logger.error('Get activation order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get activation order'
      });
    }
  }

  /**
   * Force end current round (admin/debug function)
   * POST /api/battles/:battleId/activation/end-round
   */
  static async endCurrentRound(req: Request, res: Response): Promise<void> {
    try {
      // const userId = (req as AuthenticatedRequest).user!.id;
      // const { battleId } = req.params;

      // For now, this is a simple admin function
      // In production, you'd want proper authorization checks
      
      // Mark round as complete (this is a simple implementation)
      // In a full implementation, you'd update the battle state properly
      
      res.json({
        success: true,
        data: {
          message: 'Round ended',
          canStartNewRound: true
        }
      });

    } catch (error) {
      logger.error('End current round error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to end current round'
      });
    }
  }
}