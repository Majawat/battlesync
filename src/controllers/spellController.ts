import { Request, Response } from 'express';
import { SpellDataService } from '../services/spellDataService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class SpellController {
  /**
   * Get spells by armyId
   * GET /api/spells/army/:armyId
   */
  static async getSpellsForArmyId(req: Request, res: Response): Promise<void> {
    try {
      const { armyId } = req.params;
      const gameSystem = parseInt(req.query.gameSystem as string) || 2;

      if (!armyId) {
        res.status(400).json({
          success: false,
          error: 'Army ID is required'
        });
        return;
      }

      const spells = await SpellDataService.getSpellsForArmyId(armyId, gameSystem);

      res.json({
        success: true,
        data: {
          armyId,
          gameSystem,
          spells,
          count: spells.length
        }
      });

    } catch (error) {
      logger.error('Get spells for armyId error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get spells for armyId'
      });
    }
  }

  /**
   * Get spells for a faction (legacy)
   * GET /api/spells/faction/:factionName
   */
  static async getSpellsForFaction(req: Request, res: Response): Promise<void> {
    try {
      const { factionName } = req.params;
      const gameSystem = parseInt(req.query.gameSystem as string) || 2;

      if (!factionName) {
        res.status(400).json({
          success: false,
          error: 'Faction name is required'
        });
        return;
      }

      const spells = await SpellDataService.getSpellsForFaction(factionName, gameSystem);

      res.json({
        success: true,
        data: {
          faction: factionName,
          gameSystem,
          spells,
          count: spells.length
        }
      });

    } catch (error) {
      logger.error('Get spells for faction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get spells for faction'
      });
    }
  }

  /**
   * Get specific spell by ID
   * GET /api/spells/:spellId
   */
  static async getSpellById(req: Request, res: Response): Promise<void> {
    try {
      const { spellId } = req.params;
      const { factionName } = req.query;

      if (!spellId) {
        res.status(400).json({
          success: false,
          error: 'Spell ID is required'
        });
        return;
      }

      const spell = await SpellDataService.getSpellById(spellId, factionName as string);

      if (!spell) {
        res.status(404).json({
          success: false,
          error: 'Spell not found'
        });
        return;
      }

      res.json({
        success: true,
        data: spell
      });

    } catch (error) {
      logger.error('Get spell by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get spell'
      });
    }
  }
}