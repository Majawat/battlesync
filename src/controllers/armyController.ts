import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { armyService } from '../services/armyService';
import { ApiError } from '../utils/apiError';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { 
  ArmyImportRequest, 
  ArmySyncRequest, 
  UpdateArmyCustomizationsRequest,
  GetArmiesQuery,
  BattleHonor,
  VeteranUpgrade
} from '../types/army';

export class ArmyController {
  /**
   * Import army from ArmyForge
   * POST /api/armies/import
   */
  static async importArmy(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const importRequest: ArmyImportRequest = req.body;

      // Validate request
      if (!importRequest.armyForgeId) {
        res.status(400).json(errorResponse('ArmyForge ID is required'));
        return;
      }

      const result = await armyService.importArmyFromArmyForge(userId, importRequest);
      
      res.status(201).json(successResponse(result, 'Army imported successfully'));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to import army'));
      }
    }
  }

  /**
   * Get user's armies
   * GET /api/armies
   */
  static async getUserArmies(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const query: GetArmiesQuery = {
        campaignId: req.query.campaignId as string,
        faction: req.query.faction as string,
        gameSystem: req.query.gameSystem as string,
        includeArmyForgeData: req.query.includeArmyForgeData === 'true',
        includeCustomizations: req.query.includeCustomizations === 'true',
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const armies = await armyService.getUserArmies(userId, query);
      
      res.json(successResponse(armies));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to get armies'));
      }
    }
  }

  /**
   * Get specific army
   * GET /api/armies/:id
   */
  static async getArmy(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const armyId = req.params.id;

      if (!armyId) {
        res.status(400).json(errorResponse('Army ID is required'));
        return;
      }

      const army = await armyService.getArmyById(armyId, userId);
      
      res.json(successResponse(army));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to get army'));
      }
    }
  }

  /**
   * Sync army with ArmyForge
   * PUT /api/armies/:id/sync
   */
  static async syncArmy(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const armyId = req.params.id;
      const syncRequest: ArmySyncRequest = req.body;

      if (!armyId) {
        res.status(400).json(errorResponse('Army ID is required'));
        return;
      }

      const result = await armyService.syncArmyWithArmyForge(armyId, userId, syncRequest);
      
      res.json(successResponse(result, 'Army synced successfully'));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to sync army'));
      }
    }
  }

  /**
   * Update army customizations
   * PUT /api/armies/:id/customizations
   */
  static async updateCustomizations(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const armyId = req.params.id;
      const updateRequest: UpdateArmyCustomizationsRequest = req.body;

      if (!armyId) {
        res.status(400).json(errorResponse('Army ID is required'));
        return;
      }

      const army = await armyService.updateArmyCustomizations(armyId, userId, updateRequest);
      
      res.json(successResponse(army, 'Army customizations updated successfully'));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to update army customizations'));
      }
    }
  }

  /**
   * Delete army
   * DELETE /api/armies/:id
   */
  static async deleteArmy(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const armyId = req.params.id;

      if (!armyId) {
        res.status(400).json(errorResponse('Army ID is required'));
        return;
      }

      await armyService.deleteArmy(armyId, userId);
      
      res.json(successResponse(null, 'Army deleted successfully'));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to delete army'));
      }
    }
  }

  /**
   * Add battle honor to army
   * POST /api/armies/:id/battle-honors
   */
  static async addBattleHonor(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const armyId = req.params.id;
      const battleHonor: Omit<BattleHonor, 'id' | 'dateEarned'> = req.body;

      if (!armyId) {
        res.status(400).json(errorResponse('Army ID is required'));
        return;
      }

      if (!battleHonor.name || !battleHonor.description || !battleHonor.effect) {
        res.status(400).json(errorResponse('Battle honor name, description, and effect are required'));
        return;
      }

      const army = await armyService.addBattleHonor(armyId, userId, battleHonor);
      
      res.status(201).json(successResponse(army, 'Battle honor added successfully'));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to add battle honor'));
      }
    }
  }

  /**
   * Add veteran upgrade to army
   * POST /api/armies/:id/veteran-upgrades
   */
  static async addVeteranUpgrade(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const armyId = req.params.id;
      const veteranUpgrade: Omit<VeteranUpgrade, 'id' | 'dateAcquired'> = req.body;

      if (!armyId) {
        res.status(400).json(errorResponse('Army ID is required'));
        return;
      }

      if (!veteranUpgrade.unitId || !veteranUpgrade.unitName || !veteranUpgrade.upgradeName) {
        res.status(400).json(errorResponse('Unit ID, unit name, and upgrade name are required'));
        return;
      }

      const army = await armyService.addVeteranUpgrade(armyId, userId, veteranUpgrade);
      
      res.status(201).json(successResponse(army, 'Veteran upgrade added successfully'));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to add veteran upgrade'));
      }
    }
  }

  /**
   * Get army statistics
   * GET /api/armies/statistics
   */
  static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;

      const statistics = await armyService.getArmyStatistics(userId);
      
      res.json(successResponse(statistics));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to get army statistics'));
      }
    }
  }

  /**
   * Get army validation
   * GET /api/armies/:id/validate
   */
  static async validateArmy(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const armyId = req.params.id;

      if (!armyId) {
        res.status(400).json(errorResponse('Army ID is required'));
        return;
      }

      const army = await armyService.getArmyById(armyId, userId);
      
      if (!army.armyData) {
        res.status(400).json(errorResponse('Army has no data to validate'));
        return;
      }

      // Import validation function
      const { validateArmyData } = await import('../utils/armyValidation');
      const validation = await validateArmyData(army.armyData);
      
      res.json(successResponse(validation));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to validate army'));
      }
    }
  }

  /**
   * Get ArmyForge integration status
   * GET /api/armies/armyforge/status
   */
  static async getArmyForgeStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      
      // Import userService
      const { UserService } = await import('../services/userService');
      const { armyForgeClient } = await import('../services/armyForgeClient');
      
      const token = await UserService.getUserArmyForgeToken(userId);
      
      if (!token) {
        res.json(successResponse({
          connected: false,
          message: 'ArmyForge account not linked',
        }));
        return;
      }

      const validation = await armyForgeClient.validateToken(token);
      const healthCheck = await armyForgeClient.healthCheck();
      
      res.json(successResponse({
        connected: validation.valid,
        username: validation.username,
        expiresAt: validation.expiresAt,
        apiStatus: healthCheck.status,
        apiResponseTime: healthCheck.responseTime,
      }));
    } catch (error) {
      res.status(500).json(errorResponse('Failed to check ArmyForge status'));
    }
  }

  /**
   * Clear ArmyForge cache
   * DELETE /api/armies/armyforge/cache
   */
  static async clearArmyForgeCache(req: Request, res: Response): Promise<void> {
    try {
      const armyId = req.query.armyId as string;
      
      const { armyForgeClient } = await import('../services/armyForgeClient');
      await armyForgeClient.clearCache(armyId);
      
      res.json(successResponse(null, 'ArmyForge cache cleared successfully'));
    } catch (error) {
      res.status(500).json(errorResponse('Failed to clear ArmyForge cache'));
    }
  }
}

// Export static class, no need for instance