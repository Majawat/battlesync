import { Request, Response } from 'express';
import { BattleService, CreateBattleRequest, ApplyDamageRequest } from '../services/battleService';

interface AuthenticatedRequest extends Request {
  user?: { id: string; username: string; role: string };
}

export class BattleController {
  
  /**
   * Create a new battle session
   * POST /api/battles
   */
  static async createBattle(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const data: CreateBattleRequest = req.body;
      const battle = await BattleService.createBattle(data, userId);

      res.status(201).json({
        status: 'success',
        data: battle,
        message: 'Battle created successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to create battle'
      });
    }
  }

  /**
   * Get battle details
   * GET /api/battles/:id
   */
  static async getBattle(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const battleId = req.params.id;
      const battle = await BattleService.getBattle(battleId, userId);

      res.json({
        status: 'success',
        data: battle
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to get battle'
      });
    }
  }

  /**
   * Get battles for a campaign
   * GET /api/campaigns/:campaignId/battles
   */
  static async getCampaignBattles(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const campaignId = req.params.campaignId;
      const battles = await BattleService.getCampaignBattles(campaignId, userId);

      res.json({
        status: 'success',
        data: battles
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to get campaign battles'
      });
    }
  }

  /**
   * Start a battle
   * POST /api/battles/:id/start
   */
  static async startBattle(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const battleId = req.params.id;
      const result = await BattleService.startBattle(battleId, userId);

      res.json({
        status: 'success',
        data: result,
        message: 'Battle started successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to start battle'
      });
    }
  }

  /**
   * Apply damage to a unit
   * POST /api/battles/:id/damage
   */
  static async applyDamage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const battleId = req.params.id;
      const damageData: Omit<ApplyDamageRequest, 'battleId' | 'userId'> = req.body;
      
      const data: ApplyDamageRequest = {
        ...damageData,
        battleId,
        userId
      };

      const result = await BattleService.applyDamage(data);

      res.json({
        status: 'success',
        data: result,
        message: 'Damage applied successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to apply damage'
      });
    }
  }

  /**
   * Complete a battle
   * POST /api/battles/:id/complete
   */
  static async completeBattle(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const battleId = req.params.id;
      const { winnerId } = req.body;
      
      const result = await BattleService.completeBattle(battleId, userId, winnerId);

      res.json({
        status: 'success',
        data: result,
        message: 'Battle completed successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to complete battle'
      });
    }
  }
}