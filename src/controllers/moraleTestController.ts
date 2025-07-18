import { Request, Response } from 'express';
import { MoraleTestService, MoraleTestRequest, QualityTestRequest } from '../services/moraleTestService';
import { OPRBattleService } from '../services/oprBattleService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getWebSocketManager } from '../services/websocket';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MoraleTestController {
  
  /**
   * Perform a morale test for a unit
   * POST /api/battles/:battleId/morale-test
   */
  static async performMoraleTest(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { unitId, testType, modifier, reason, forcedRoll } = req.body;
      
      if (!unitId || !testType || !reason) {
        res.status(400).json({
          success: false,
          error: 'Unit ID, test type, and reason are required'
        });
        return;
      }
      
      // Get battle state
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
        return;
      }
      
      // Find the unit
      let targetUnit = null;
      for (const army of battleState.armies) {
        const unit = army.units.find(u => u.unitId === unitId);
        if (unit) {
          targetUnit = unit;
          break;
        }
      }
      
      if (!targetUnit) {
        res.status(404).json({
          success: false,
          error: 'Unit not found'
        });
        return;
      }
      
      // Check if unit can take morale tests
      if (targetUnit.currentSize === 0) {
        res.status(400).json({
          success: false,
          error: 'Destroyed units cannot take morale tests'
        });
        return;
      }
      
      // Perform the morale test
      const testRequest: MoraleTestRequest = {
        unit: targetUnit,
        testType,
        modifier,
        reason,
        forcedRoll
      };
      
      const result = MoraleTestService.performMoraleTest(testRequest);
      
      // Update battle state in database
      await prisma.battle.update({
        where: { id: battleId },
        data: { currentState: battleState as any }
      });
      
      // Broadcast morale test result to all players
      const wsManager = getWebSocketManager();
      if (wsManager && 'broadcast' in wsManager) {
        (wsManager as any).broadcastToBattleRoom?.(battleId, 'morale_test_result', {
          unitId,
          unitName: targetUnit.name,
          testType,
          result,
          testedBy: userId
        });
      }
      
      res.json({
        success: true,
        data: {
          result,
          unitState: {
            shaken: targetUnit.shaken,
            routed: targetUnit.routed,
            currentSize: targetUnit.currentSize
          }
        }
      });
      
    } catch (error) {
      logger.error('Morale test error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform morale test'
      });
    }
  }
  
  /**
   * Perform a quality test for a model
   * POST /api/battles/:battleId/quality-test
   */
  static async performQualityTest(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId } = req.params;
      const { unitId, modelId, testType, modifier, reason, forcedRoll } = req.body;
      
      if (!unitId || !modelId || !testType || !reason) {
        res.status(400).json({
          success: false,
          error: 'Unit ID, model ID, test type, and reason are required'
        });
        return;
      }
      
      // Get battle state
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
        return;
      }
      
      // Find the model
      let targetModel = null;
      let targetUnit = null;
      
      for (const army of battleState.armies) {
        const unit = army.units.find(u => u.unitId === unitId);
        if (unit) {
          targetUnit = unit;
          // Check regular models
          const model = unit.models.find(m => m.modelId === modelId);
          if (model) {
            targetModel = model;
            break;
          }
          // Check joined hero
          if (unit.joinedHero && unit.joinedHero.modelId === modelId) {
            targetModel = unit.joinedHero;
            break;
          }
        }
      }
      
      if (!targetModel || !targetUnit) {
        res.status(404).json({
          success: false,
          error: 'Model not found'
        });
        return;
      }
      
      // Check if model can take quality tests
      if (targetModel.isDestroyed) {
        res.status(400).json({
          success: false,
          error: 'Destroyed models cannot take quality tests'
        });
        return;
      }
      
      // Perform the quality test
      const testRequest: QualityTestRequest = {
        model: targetModel,
        testType,
        modifier,
        reason,
        forcedRoll
      };
      
      const result = MoraleTestService.performQualityTest(testRequest);
      
      // Broadcast quality test result to all players
      const wsManager = getWebSocketManager();
      if (wsManager && 'broadcast' in wsManager) {
        (wsManager as any).broadcastToBattleRoom?.(battleId, 'quality_test_result', {
          unitId,
          modelId,
          modelName: targetModel.name,
          testType,
          result,
          testedBy: userId
        });
      }
      
      res.json({
        success: true,
        data: {
          result,
          modelState: {
            quality: targetModel.quality,
            currentTough: targetModel.currentTough,
            isDestroyed: targetModel.isDestroyed
          }
        }
      });
      
    } catch (error) {
      logger.error('Quality test error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform quality test'
      });
    }
  }
  
  /**
   * Get morale test suggestions for a unit
   * GET /api/battles/:battleId/units/:unitId/morale-suggestions
   */
  static async getMoraleTestSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId, unitId } = req.params;
      
      // Get battle state
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
        return;
      }
      
      // Find the unit
      let targetUnit = null;
      for (const army of battleState.armies) {
        const unit = army.units.find(u => u.unitId === unitId);
        if (unit) {
          targetUnit = unit;
          break;
        }
      }
      
      if (!targetUnit) {
        res.status(404).json({
          success: false,
          error: 'Unit not found'
        });
        return;
      }
      
      const suggestions = [];
      
      // Check if unit needs morale test
      if (MoraleTestService.shouldTakeMoraleTest(targetUnit, 0)) {
        const modifier = MoraleTestService.getMoraleTestModifier(targetUnit);
        suggestions.push({
          testType: 'MORALE',
          reason: 'Unit took casualties',
          modifier,
          priority: 'high'
        });
      }
      
      // Check if unit needs rout recovery test
      if (MoraleTestService.shouldTakeRoutRecoveryTest(targetUnit)) {
        const modifier = MoraleTestService.getMoraleTestModifier(targetUnit);
        suggestions.push({
          testType: 'ROUT_RECOVERY',
          reason: 'Attempt to recover from rout',
          modifier,
          priority: 'medium'
        });
      }
      
      // Get unit morale state
      const moraleState = MoraleTestService.getUnitMoraleState(targetUnit);
      const actionPenalties = MoraleTestService.getMoraleActionPenalties(targetUnit);
      
      res.json({
        success: true,
        data: {
          suggestions,
          currentMoraleState: moraleState,
          actionPenalties,
          unitInfo: {
            name: targetUnit.name,
            currentSize: targetUnit.currentSize,
            originalSize: targetUnit.originalSize,
            shaken: targetUnit.shaken,
            routed: targetUnit.routed
          }
        }
      });
      
    } catch (error) {
      logger.error('Morale suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get morale suggestions'
      });
    }
  }
  
  /**
   * Get quality test info for a model
   * GET /api/battles/:battleId/units/:unitId/models/:modelId/quality-info
   */
  static async getQualityTestInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { battleId, unitId, modelId } = req.params;
      
      // Get battle state
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
        return;
      }
      
      // Find the model
      let targetModel = null;
      let targetUnit = null;
      
      for (const army of battleState.armies) {
        const unit = army.units.find(u => u.unitId === unitId);
        if (unit) {
          targetUnit = unit;
          // Check regular models
          const model = unit.models.find(m => m.modelId === modelId);
          if (model) {
            targetModel = model;
            break;
          }
          // Check joined hero
          if (unit.joinedHero && unit.joinedHero.modelId === modelId) {
            targetModel = unit.joinedHero;
            break;
          }
        }
      }
      
      if (!targetModel || !targetUnit) {
        res.status(404).json({
          success: false,
          error: 'Model not found'
        });
        return;
      }
      
      const qualityTestTypes = [
        {
          testType: 'ACTIVATION',
          description: 'Test to activate special abilities',
          modifier: 0
        },
        {
          testType: 'SPECIAL_ABILITY',
          description: 'Test to use special rules',
          modifier: 0
        },
        {
          testType: 'INSTANT_KILL',
          description: 'Test to resist instant kill effects',
          modifier: 0
        },
        {
          testType: 'SPELL_RESIST',
          description: 'Test to resist spell effects',
          modifier: 0
        }
      ];
      
      res.json({
        success: true,
        data: {
          modelInfo: {
            name: targetModel.name,
            quality: targetModel.quality,
            currentTough: targetModel.currentTough,
            maxTough: targetModel.maxTough,
            isDestroyed: targetModel.isDestroyed,
            isHero: targetModel.isHero,
            specialRules: targetModel.specialRules
          },
          availableTests: qualityTestTypes
        }
      });
      
    } catch (error) {
      logger.error('Quality test info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get quality test info'
      });
    }
  }
}