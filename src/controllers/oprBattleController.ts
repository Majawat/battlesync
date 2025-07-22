import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OPRBattleService } from '../services/oprBattleService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  OPRBattlePhase, 
  ApplyDamageRequest, 
  TouchDamageInput 
} from '../types/oprBattle';

const prisma = new PrismaClient();

export class OPRBattleController {

  /**
   * Create a new OPR battle
   * POST /api/opr/battles
   */
  static async createBattle(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { missionId, participants } = req.body;

      if (!missionId || !participants || !Array.isArray(participants)) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: missionId, participants'
        });
        return;
      }

      if (participants.length < 1 || participants.length > 8) {
        res.status(400).json({
          success: false,
          error: 'Battle must have 1-8 participants'
        });
        return;
      }

      const result = await OPRBattleService.createOPRBattle(
        missionId,
        participants,
        userId
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            battleId: result.battleId,
            battle: result.battle
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Create OPR battle error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create battle'
      });
    }
  }

  /**
   * Setup a new OPR battle (for CampaignCreator)
   * POST /api/opr/battles/setup
   */
  static async setupBattle(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { missionId, participants } = req.body;

      if (!missionId || !participants || !Array.isArray(participants)) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: missionId, participants'
        });
        return;
      }

      if (participants.length < 2 || participants.length > 8) {
        res.status(400).json({
          success: false,
          error: 'Battle must have 2-8 participants'
        });
        return;
      }

      // Verify user is campaign creator
      const mission = await prisma.mission.findFirst({
        where: {
          id: missionId,
          campaign: {
            createdBy: userId
          }
        }
      });

      if (!mission) {
        res.status(403).json({
          success: false,
          error: 'Only campaign creators can setup battles'
        });
        return;
      }

      // Check if battle already exists for this mission
      const existingBattle = await prisma.battle.findFirst({
        where: { missionId }
      });

      if (existingBattle) {
        res.status(409).json({
          success: false,
          error: 'Battle already exists for this mission'
        });
        return;
      }

      const result = await OPRBattleService.createOPRBattle(
        missionId,
        participants,
        userId
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            battleId: result.battleId,
            battle: result.battle
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Setup OPR battle error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to setup battle'
      });
    }
  }

  /**
   * Get OPR battle state
   * GET /api/opr/battles/:battleId
   */
  static async getBattleState(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;

      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);

      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found or access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: battleState
      });

    } catch (error) {
      logger.error('Get OPR battle state error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get battle state'
      });
    }
  }

  /**
   * Join an existing battle
   * POST /api/opr/battles/:battleId/join
   */
  static async joinBattle(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { armyId } = req.body;

      if (!armyId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: armyId'
        });
        return;
      }

      const result = await OPRBattleService.joinBattle(battleId, userId, armyId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: {
          battleState: result.battleState
        },
        message: 'Successfully joined battle'
      });

    } catch (error) {
      logger.error('Error in joinBattle controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get available battles for a campaign
   * GET /api/opr/campaigns/:campaignId/available-battles
   */
  static async getAvailableBattles(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { campaignId } = req.params;

      const battles = await OPRBattleService.getAvailableBattles(campaignId, userId);

      res.json({
        success: true,
        data: battles,
        message: `Found ${battles.length} available battles`
      });

    } catch (error) {
      logger.error('Error in getAvailableBattles controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Transition battle phase
   * POST /api/opr/battles/:battleId/phase
   */
  static async transitionPhase(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { phase } = req.body;

      if (!phase) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: phase'
        });
        return;
      }

      const validPhases: OPRBattlePhase[] = ['GAME_SETUP', 'DEPLOYMENT', 'BATTLE_ROUNDS', 'GAME_END'];
      if (!validPhases.includes(phase)) {
        res.status(400).json({
          success: false,
          error: 'Invalid phase'
        });
        return;
      }

      const result = await OPRBattleService.transitionPhase(battleId, userId, phase);

      if (result.success) {
        res.json({
          success: true,
          data: { phase }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Transition phase error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to transition phase'
      });
    }
  }

  /**
   * Start deployment roll-off
   * POST /api/opr/battles/:battleId/deployment/start-rolloff
   */
  static async startDeploymentRollOff(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;

      const result = await OPRBattleService.startDeploymentRollOff(battleId, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Start deployment roll-off error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start deployment roll-off'
      });
    }
  }

  /**
   * Submit deployment dice roll
   * POST /api/opr/battles/:battleId/deployment/roll
   */
  static async submitDeploymentRoll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { roll } = req.body;

      if (!roll || roll < 1 || roll > 6) {
        res.status(400).json({
          success: false,
          error: 'Roll must be a number between 1 and 6'
        });
        return;
      }

      const result = await OPRBattleService.submitDeploymentRoll(battleId, userId, parseInt(roll));

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Submit deployment roll error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit deployment roll'
      });
    }
  }

  /**
   * Get deployment roll-off status
   * GET /api/opr/battles/:battleId/deployment/status
   */
  static async getDeploymentRollOffStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;

      const result = await OPRBattleService.getDeploymentRollOffStatus(battleId, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Get deployment status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get deployment status'
      });
    }
  }

  /**
   * Deploy unit to battlefield
   * POST /api/opr/battles/:battleId/deployment/deploy-unit
   */
  static async deployUnit(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { unitId } = req.body;

      if (!unitId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: unitId'
        });
        return;
      }

      const result = await OPRBattleService.deployUnit(battleId, userId, unitId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Deploy unit error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deploy unit'
      });
    }
  }

  /**
   * Set unit to ambush reserves
   * POST /api/opr/battles/:battleId/deployment/ambush-unit
   */
  static async ambushUnit(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { unitId } = req.body;

      if (!unitId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: unitId'
        });
        return;
      }

      const result = await OPRBattleService.ambushUnit(battleId, userId, unitId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Ambush unit error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set unit to ambush'
      });
    }
  }

  /**
   * Apply damage to unit/model
   * POST /api/opr/battles/:battleId/damage
   */
  static async applyDamage(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { 
        targetUnitId, 
        targetModelId, 
        damage, 
        sourceUnitId, 
        sourceDescription,
        ignoreTough 
      } = req.body;

      if (!targetUnitId || damage === undefined || damage < 1) {
        res.status(400).json({
          success: false,
          error: 'Missing or invalid required fields: targetUnitId, damage'
        });
        return;
      }

      const damageRequest: ApplyDamageRequest = {
        battleId,
        userId,
        targetUnitId,
        targetModelId,
        damage: parseInt(damage),
        sourceUnitId,
        sourceDescription,
        ignoreTough: Boolean(ignoreTough)
      };

      const result = await OPRBattleService.applyDamage(damageRequest);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Apply damage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply damage'
      });
    }
  }

  /**
   * Quick damage for touch interface
   * POST /api/opr/battles/:battleId/quick-damage
   */
  static async applyQuickDamage(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { unitId, modelId, quickDamage, customDamage } = req.body;

      if (!unitId || (!quickDamage && !customDamage)) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: unitId and (quickDamage or customDamage)'
        });
        return;
      }

      const input: TouchDamageInput = {
        unitId,
        modelId,
        quickDamage: quickDamage as 1 | 2 | 3 | 4 | 5,
        customDamage
      };

      const result = await OPRBattleService.applyQuickDamage(battleId, userId, input);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Apply quick damage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply quick damage'
      });
    }
  }

  /**
   * Join hero to unit
   * POST /api/opr/battles/:battleId/join-hero
   */
  static async joinHeroToUnit(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { heroUnitId, targetUnitId } = req.body;

      if (!heroUnitId || !targetUnitId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: heroUnitId, targetUnitId'
        });
        return;
      }

      const result = await OPRBattleService.joinHeroToUnit(
        battleId,
        userId,
        heroUnitId,
        targetUnitId
      );

      if (result.success) {
        res.json({
          success: true,
          data: { message: 'Hero joined successfully' }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Join hero error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join hero to unit'
      });
    }
  }

  /**
   * Complete battle
   * POST /api/opr/battles/:battleId/complete
   */
  static async completeBattle(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { winnerId } = req.body;

      const result = await OPRBattleService.completeBattle(battleId, userId, winnerId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Complete battle error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete battle'
      });
    }
  }

  /**
   * Set unit action (for OPR activation tracking)
   * POST /api/opr/battles/:battleId/unit-action
   */
  static async setUnitAction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { unitId, action } = req.body;

      const validActions = ['hold', 'advance', 'rush', 'charge', null];
      if (!unitId || !validActions.includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid unitId or action'
        });
        return;
      }

      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
        return;
      }

      // Find and update unit
      const userArmy = battleState.armies.find(a => a.userId === userId);
      if (!userArmy) {
        res.status(403).json({
          success: false,
          error: 'Not your army'
        });
        return;
      }

      const unit = userArmy.units.find(u => u.unitId === unitId);
      if (!unit) {
        res.status(404).json({
          success: false,
          error: 'Unit not found'
        });
        return;
      }

      unit.action = action;

      // Apply fatigue for charge actions
      if (action === 'charge') {
        unit.fatigued = true;
      }

      // Save updated state to database
      await prisma.battle.update({
        where: { id: battleId },
        data: { 
          currentState: battleState as any
        }
      });

      // Record battle event
      await OPRBattleService.recordBattleEvent(
        battleId,
        userId,
        'UNIT_ACTION',
        {
          unitId,
          action,
          description: `Unit ${unit.name} performed ${action} action${action === 'charge' ? ' (now fatigued)' : ''}`
        }
      );

      // Broadcast to WebSocket room
      try {
        const { getWebSocketManager } = await import('../services/websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcastToRoomPublic(`battles:${battleId}`, {
            type: 'unit_action',
            data: { unitId, action, unitName: unit.name },
            timestamp: new Date().toISOString()
          });
        }
      } catch (wsError) {
        logger.warn('Failed to broadcast unit action to WebSocket:', wsError);
      }

      res.json({
        success: true,
        data: { unitId, action }
      });

    } catch (error) {
      logger.error('Set unit action error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set unit action'
      });
    }
  }

  /**
   * Toggle unit status (shaken, fatigued)
   * POST /api/opr/battles/:battleId/unit-status
   */
  static async toggleUnitStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { unitId, status, value } = req.body;

      const validStatuses = ['shaken', 'fatigued'];
      if (!unitId || !validStatuses.includes(status) || typeof value !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Invalid unitId, status, or value'
        });
        return;
      }

      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
        return;
      }

      // Find and update unit
      const userArmy = battleState.armies.find(a => a.userId === userId);
      if (!userArmy) {
        res.status(403).json({
          success: false,
          error: 'Not your army'
        });
        return;
      }

      const unit = userArmy.units.find(u => u.unitId === unitId);
      if (!unit) {
        res.status(404).json({
          success: false,
          error: 'Unit not found'
        });
        return;
      }

      if (status === 'shaken') {
        unit.shaken = value;
      } else if (status === 'fatigued') {
        unit.fatigued = value;
      }

      res.json({
        success: true,
        data: { unitId, status, value }
      });

    } catch (error) {
      logger.error('Toggle unit status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle unit status'
      });
    }
  }

  /**
   * Cast spell
   * POST /api/opr/battles/:battleId/cast-spell
   */
  static async castSpell(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { unitId, spellName, targetId } = req.body;

      if (!unitId || !spellName) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: unitId, spellName'
        });
        return;
      }

      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
        return;
      }

      // Find caster unit
      const userArmy = battleState.armies.find(a => a.userId === userId);
      if (!userArmy) {
        res.status(403).json({
          success: false,
          error: 'Not your army'
        });
        return;
      }

      const casterUnit = userArmy.units.find(u => u.unitId === unitId);
      if (!casterUnit) {
        res.status(404).json({
          success: false,
          error: 'Unit not found'
        });
        return;
      }

      // Check if unit has caster models (in unit models or joined hero)
      let casterModel = casterUnit.models.find(m => m.casterTokens > 0);
      if (!casterModel && casterUnit.joinedHero && casterUnit.joinedHero.casterTokens > 0) {
        casterModel = casterUnit.joinedHero;
      }
      
      if (!casterModel) {
        res.status(400).json({
          success: false,
          error: 'Unit has no caster models'
        });
        return;
      }

      // Basic spell casting mechanics
      if (casterModel.casterTokens <= 0) {
        res.status(400).json({
          success: false,
          error: 'No caster tokens available'
        });
        return;
      }

      // Spend caster token for spell attempt
      casterModel.casterTokens--;

      // TODO: Implement full spell system with:
      // - Spell cost validation
      // - Cooperative casting from nearby casters
      // - Spell success roll (4+ on d6)
      // - Spell effects and target resolution

      // Save updated battle state
      await prisma.battle.update({
        where: { id: battleId },
        data: { 
          currentState: battleState as any
        }
      });

      // Record battle event
      await OPRBattleService.recordBattleEvent(
        battleId,
        userId,
        'SPELL_CAST',
        {
          unitId,
          spellName,
          targetId,
          remainingTokens: casterModel.casterTokens
        }
      );

      // Broadcast to WebSocket room
      try {
        const { getWebSocketManager } = await import('../services/websocket');
        const wsManager = getWebSocketManager();
        if (wsManager) {
          wsManager.broadcastToRoomPublic(`battles:${battleId}`, {
            type: 'spell_cast',
            data: { unitId, spellName, targetId, remainingTokens: casterModel.casterTokens },
            timestamp: new Date().toISOString()
          });
        }
      } catch (wsError) {
        logger.warn('Failed to broadcast spell cast to WebSocket:', wsError);
      }

      // Log the spell casting event
      logger.info(`Spell cast: ${spellName} by unit ${unitId} in battle ${battleId}`);

      res.json({
        success: true,
        data: { 
          unitId, 
          spellName, 
          targetId,
          remainingTokens: casterModel.casterTokens
        }
      });

    } catch (error) {
      logger.error('Cast spell error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cast spell'
      });
    }
  }
}