import { Request, Response } from 'express';
import { SpellDataService } from '../services/spellDataService';
import { OPRBattleService } from '../services/oprBattleService';
import { BattleActionHistoryService } from '../services/battleActionHistoryService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  SpellCastAttempt, 
  SpellCastResult, 
  CooperatingCaster,
  OPRSpell 
} from '../types/oprBattle';

// Type for cooperation session management
interface CooperationSession {
  cooperationRequestId: string;
  battleId: string;
  casterUserId: string;
  casterUnitId: string;
  casterName: string;
  spell: {
    id: string;
    name: string;
    cost: number;
    effect: string;
    targets: string;
  };
  targetUnitIds: string[];
  targetUnitNames: string[];
  timeoutSeconds: number;
  expiresAt: Date;
  contributions: Map<string, {
    userId: string;
    contributions: Array<{
      unitId: string;
      modelId: string;
      unitName: string;
      casterName: string;
      tokensContributed: number;
      modifier: number;
      maxTokens: number;
    }>;
    submittedAt: Date;
  }>;
  isComplete: boolean;
}

// Extend global type to include cooperation sessions
declare global {
  var cooperationSessions: Map<string, CooperationSession> | undefined;
}
import { getWebSocketManager } from '../services/websocket';

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

  /**
   * Request cooperative casting from other players
   * POST /api/spells/request-cooperation
   */
  static async requestCooperativeCasting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { battleId, spellCastAttempt, timeoutSeconds = 30 } = req.body;
      const userId = req.user!.id;

      if (!battleId || !spellCastAttempt) {
        res.status(400).json({
          success: false,
          error: 'Battle ID and spell cast attempt are required'
        });
        return;
      }

      // Get battle state to find potential cooperating casters
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found or access denied'
        });
        return;
      }

      // Find the main caster unit
      const userArmy = battleState.armies.find(army => army.userId === userId);
      if (!userArmy) {
        res.status(403).json({
          success: false,
          error: 'User is not participating in this battle'
        });
        return;
      }

      const casterUnit = userArmy.units.find(unit => unit.unitId === spellCastAttempt.casterUnitId);
      if (!casterUnit) {
        res.status(404).json({
          success: false,
          error: 'Caster unit not found'
        });
        return;
      }

      // Find potential cooperating casters within 18" (we'll assume all casters for now)
      const potentialCooperators: Array<{
        userId: string,
        unitId: string,
        modelId?: string,
        unitName: string,
        casterName: string,
        maxTokens: number
      }> = [];

      for (const army of battleState.armies) {
        if (army.userId === userId) continue; // Skip the main caster's army

        for (const unit of army.units) {
          // Check unit models for casters
          for (const model of unit.models) {
            if (model.casterTokens > 0) {
              potentialCooperators.push({
                userId: army.userId,
                unitId: unit.unitId,
                modelId: model.modelId,
                unitName: unit.name,
                casterName: model.name,
                maxTokens: model.casterTokens
              });
            }
          }
          
          // Check joined hero for caster tokens
          if (unit.joinedHero && unit.joinedHero.casterTokens > 0) {
            potentialCooperators.push({
              userId: army.userId,
              unitId: unit.unitId,
              modelId: unit.joinedHero.modelId,
              unitName: unit.name,
              casterName: unit.joinedHero.name,
              maxTokens: unit.joinedHero.casterTokens
            });
          }
        }
      }

      // Get spell information
      let spellData: OPRSpell | null = null;
      const casterModel = casterUnit.models.find(m => m.casterTokens > 0) || casterUnit.joinedHero;
      if (casterModel?.armyId) {
        const spells = await SpellDataService.getSpellsForArmyId(casterModel.armyId);
        spellData = spells.find(s => s.id === spellCastAttempt.spellId) || null;
      }

      if (!spellData) {
        res.status(404).json({
          success: false,
          error: 'Spell not found'
        });
        return;
      }

      // Create cooperation request ID
      const cooperationRequestId = `coop_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Broadcast cooperation request to all potential cooperators
      this.broadcastToBattleRoom(battleId, 'cooperative_casting_request', {
        cooperationRequestId,
        casterUserId: userId,
        casterUnitId: spellCastAttempt.casterUnitId,
        casterName: casterModel?.name || casterUnit.name,
        spell: {
          id: spellData.id,
          name: spellData.name,
          cost: spellData.cost,
          effect: spellData.effect,
          targets: spellCastAttempt.targetUnitIds || []
        },
        potentialCooperators,
        timeoutSeconds,
        expiresAt: new Date(Date.now() + timeoutSeconds * 1000).toISOString()
      });

      logger.info(`Cooperative casting request ${cooperationRequestId} sent for spell ${spellData.name} in battle ${battleId}`);

      res.json({
        success: true,
        data: {
          cooperationRequestId,
          potentialCooperators: potentialCooperators.length,
          expiresAt: new Date(Date.now() + timeoutSeconds * 1000).toISOString()
        }
      });

    } catch (error) {
      logger.error('Request cooperative casting error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to request cooperative casting'
      });
    }
  }

  /**
   * Respond to cooperative casting request
   * POST /api/spells/respond-cooperation
   */
  static async respondToCooperativeCasting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { battleId, cooperationRequestId, response } = req.body;
      const userId = req.user!.id;

      logger.info(`Cooperation response from user ${userId} for battle ${battleId}, request ${cooperationRequestId}:`, response);

      if (!battleId || !cooperationRequestId || !response) {
        res.status(400).json({
          success: false,
          error: 'Battle ID, cooperation request ID, and response are required'
        });
        return;
      }

      // Validate response structure
      if (!response.hasOwnProperty('accept')) {
        res.status(400).json({
          success: false,
          error: 'Invalid response format: missing accept field'
        });
        return;
      }
      
      if (response.accept && (!response.unitId || response.tokensContributed === undefined || response.modifier === undefined)) {
        const missing = [];
        if (!response.unitId) missing.push('unitId');
        if (response.tokensContributed === undefined) missing.push('tokensContributed');
        if (response.modifier === undefined) missing.push('modifier');
        
        res.status(400).json({
          success: false,
          error: `Invalid response format when accepting: missing ${missing.join(', ')}`
        });
        return;
      }

      // Get battle state to validate the response
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found or access denied'
        });
        return;
      }

      // Find the responding user's army
      const userArmy = battleState.armies.find(army => army.userId === userId);
      if (!userArmy) {
        res.status(403).json({
          success: false,
          error: 'User is not participating in this battle'
        });
        return;
      }

      let cooperatorInfo = null;
      
      if (response.accept) {
        logger.info(`Looking for cooperating unit ${response.unitId} for user ${userId}`);
        
        // Find the cooperating unit
        const cooperatingUnit = userArmy.units.find(unit => unit.unitId === response.unitId);
        if (!cooperatingUnit) {
          logger.error(`Cooperating unit ${response.unitId} not found in user's army`);
          res.status(404).json({
            success: false,
            error: 'Cooperating unit not found'
          });
          return;
        }

        logger.info(`Found cooperating unit: ${cooperatingUnit.name}, looking for model ${response.modelId}`);

        // Find the cooperating caster model
        let cooperatingModel = null;
        if (response.modelId) {
          cooperatingModel = cooperatingUnit.models.find(m => m.modelId === response.modelId) ||
                           (cooperatingUnit.joinedHero?.modelId === response.modelId ? cooperatingUnit.joinedHero : null);
        } else {
          cooperatingModel = cooperatingUnit.models.find(m => m.casterTokens > 0) || cooperatingUnit.joinedHero;
        }

        if (!cooperatingModel) {
          logger.error(`Cooperating model ${response.modelId} not found in unit ${response.unitId}`);
          res.status(400).json({
            success: false,
            error: 'Cooperating caster model not found'
          });
          return;
        }

        if (cooperatingModel.casterTokens < response.tokensContributed) {
          logger.error(`Insufficient tokens: model has ${cooperatingModel.casterTokens}, requested ${response.tokensContributed}`);
          res.status(400).json({
            success: false,
            error: `Insufficient caster tokens: has ${cooperatingModel.casterTokens}, requested ${response.tokensContributed}`
          });
          return;
        }

        logger.info(`Cooperating model found: ${cooperatingModel.name} with ${cooperatingModel.casterTokens} tokens`);

        cooperatorInfo = {
          userId,
          unitId: response.unitId,
          modelId: cooperatingModel.modelId,
          unitName: cooperatingUnit.name,
          casterName: cooperatingModel.name,
          tokensContributed: response.tokensContributed,
          modifier: response.modifier
        };
      }

      // Broadcast the response to all battle participants
      this.broadcastToBattleRoom(battleId, 'cooperative_casting_response', {
        cooperationRequestId,
        respondingUserId: userId,
        response: {
          accept: response.accept,
          cooperator: cooperatorInfo
        }
      });

      logger.info(`Cooperative casting response from user ${userId} for request ${cooperationRequestId}: ${response.accept ? 'ACCEPTED' : 'DECLINED'}`);

      res.json({
        success: true,
        data: {
          cooperationRequestId,
          accepted: response.accept,
          cooperator: cooperatorInfo
        }
      });

    } catch (error) {
      logger.error('Respond to cooperative casting error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to respond to cooperative casting'
      });
    }
  }

  /**
   * Cast a spell in battle
   * POST /api/spells/cast
   */
  static async castSpell(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { battleId, spellCastAttempt } = req.body;
      const userId = req.user!.id;

      if (!battleId || !spellCastAttempt) {
        res.status(400).json({
          success: false,
          error: 'Battle ID and spell cast attempt are required'
        });
        return;
      }

      // Validate spell cast attempt structure
      const attempt: SpellCastAttempt = spellCastAttempt;
      if (!attempt.spellId || !attempt.casterUnitId || !attempt.tokensCost) {
        res.status(400).json({
          success: false,
          error: 'Invalid spell cast attempt: missing required fields'
        });
        return;
      }

      // Get battle state to validate the spell cast
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found or access denied'
        });
        return;
      }

      // Store battle state before spell casting for undo functionality
      const beforeState = JSON.parse(JSON.stringify(battleState));

      // Find the caster unit and validate it belongs to the user
      const userArmy = battleState.armies.find(army => army.userId === userId);
      if (!userArmy) {
        res.status(403).json({
          success: false,
          error: 'User is not participating in this battle'
        });
        return;
      }

      const casterUnit = userArmy.units.find(unit => unit.unitId === attempt.casterUnitId);
      if (!casterUnit) {
        res.status(404).json({
          success: false,
          error: 'Caster unit not found'
        });
        return;
      }

      // Find the specific caster model
      let casterModel = null;
      if (attempt.casterModelId) {
        casterModel = casterUnit.models.find(m => m.modelId === attempt.casterModelId) ||
                     (casterUnit.joinedHero?.modelId === attempt.casterModelId ? casterUnit.joinedHero : null);
      } else {
        // Find first available caster
        casterModel = casterUnit.models.find(m => m.casterTokens > 0) || casterUnit.joinedHero;
      }

      if (!casterModel || casterModel.casterTokens < attempt.tokensCost) {
        res.status(400).json({
          success: false,
          error: 'Insufficient caster tokens or caster not found'
        });
        return;
      }

      // Get spell data to validate the cast
      let spellData: OPRSpell | null = null;
      if (casterModel.armyId) {
        const spells = await SpellDataService.getSpellsForArmyId(casterModel.armyId);
        spellData = spells.find(s => s.id === attempt.spellId) || null;
      }

      if (!spellData) {
        res.status(404).json({
          success: false,
          error: 'Spell not found for this caster'
        });
        return;
      }

      // Validate token cost matches spell cost
      if (spellData.cost !== attempt.tokensCost) {
        res.status(400).json({
          success: false,
          error: `Spell requires ${spellData.cost} tokens, but ${attempt.tokensCost} provided`
        });
        return;
      }

      // Process cooperative casting
      let totalTokensSpent = attempt.tokensCost;
      let rollModifier = 0;

      if (attempt.cooperatingCasters && attempt.cooperatingCasters.length > 0) {
        for (const cooperator of attempt.cooperatingCasters) {
          // Find cooperating caster unit
          const cooperatorArmy = battleState.armies.find(army => 
            army.units.some(unit => unit.unitId === cooperator.unitId)
          );
          
          if (!cooperatorArmy) continue;

          const cooperatorUnit = cooperatorArmy.units.find(unit => unit.unitId === cooperator.unitId);
          if (!cooperatorUnit) continue;

          let cooperatorModel = null;
          if (cooperator.modelId) {
            cooperatorModel = cooperatorUnit.models.find(m => m.modelId === cooperator.modelId) ||
                             (cooperatorUnit.joinedHero?.modelId === cooperator.modelId ? cooperatorUnit.joinedHero : null);
          } else {
            cooperatorModel = cooperatorUnit.models.find(m => m.casterTokens > 0) || cooperatorUnit.joinedHero;
          }

          if (cooperatorModel && cooperatorModel.casterTokens >= cooperator.tokensContributed) {
            totalTokensSpent += cooperator.tokensContributed;
            rollModifier += cooperator.modifier;
            
            // Consume cooperator tokens
            cooperatorModel.casterTokens -= cooperator.tokensContributed;
          }
        }
      }

      // Consume main caster tokens
      casterModel.casterTokens -= attempt.tokensCost;

      // Calculate final roll result (OPR spell casting: need 4+ on d6)
      const baseRoll = Math.floor(Math.random() * 6) + 1; // 1-6
      const finalResult = baseRoll + rollModifier;
      const spellSuccess = finalResult >= 4;

      // Calculate the effective target number (what they needed to roll on the die)
      // Base target is 4, but modifiers change what they need on the die
      // Positive modifiers make it easier (lower target), negative make it harder (higher target)
      const effectiveTarget = Math.max(1, Math.min(6, 4 - rollModifier));

      // Create spell cast result
      const castResult: SpellCastResult = {
        success: spellSuccess,
        roll: baseRoll,
        rollModifier: rollModifier,
        finalResult: finalResult,
        spellApplied: spellSuccess,
        tokensConsumed: totalTokensSpent,
        description: spellSuccess 
          ? `${spellData.name} cast successfully! (${baseRoll}${rollModifier !== 0 ? ` + ${rollModifier}` : ''} = ${finalResult}, needed ${effectiveTarget}+ on D6)`
          : `${spellData.name} failed to cast (${baseRoll}${rollModifier !== 0 ? ` + ${rollModifier}` : ''} = ${finalResult}, needed ${effectiveTarget}+ on D6)`,
        effects: spellSuccess ? this.generateSpellEffects(spellData, attempt.targetUnitIds) : []
      };

      // Update battle state with spell results
      if (spellSuccess) {
        // Apply spell effects (damage, buffs, debuffs)
        await this.applySpellEffects(battleState, spellData, attempt.targetUnitIds, userId);
      }

      // Save updated battle state to database
      await OPRBattleService.saveBattleState(battleId, battleState);

      // Record battle event
      await OPRBattleService.recordBattleEvent(
        battleId,
        userId,
        'SPELL_CAST',
        {
          description: castResult.description,
          spellId: attempt.spellId,
          spellName: spellData.name,
          casterUnitId: attempt.casterUnitId,
          targetUnitIds: attempt.targetUnitIds,
          tokensSpent: totalTokensSpent,
          rollResult: finalResult,
          success: spellSuccess
        }
      );

      // Record action in battle history for undo functionality
      const affectedUnitIds = [attempt.casterUnitId, ...(attempt.targetUnitIds || [])];
      if (attempt.cooperatingCasters) {
        affectedUnitIds.push(...attempt.cooperatingCasters.map(c => c.unitId));
      }

      await BattleActionHistoryService.recordAction(
        battleId,
        userId,
        'SPELL_CAST',
        {
          description: castResult.description,
          spellId: attempt.spellId,
          spellName: spellData.name,
          unitId: attempt.casterUnitId,
          targetUnitIds: attempt.targetUnitIds,
          tokensSpent: totalTokensSpent,
          rollResult: finalResult,
          success: spellSuccess,
          cooperatingCasters: attempt.cooperatingCasters
        },
        beforeState,
        battleState,
        {
          canUndo: true,
          undoComplexity: attempt.cooperatingCasters && attempt.cooperatingCasters.length > 0 ? 'complex' : 'simple',
          affectedUnitIds
        }
      );

      // Broadcast spell cast result to all battle participants
      this.broadcastToBattleRoom(battleId, 'spell_cast_complete', {
        casterUserId: userId,
        casterUnitId: attempt.casterUnitId,
        spellName: spellData.name,
        success: spellSuccess,
        tokensSpent: totalTokensSpent,
        rollResult: finalResult,
        effects: castResult.effects
      });

      res.json({
        success: true,
        data: {
          castResult,
          battleState: battleState
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

  /**
   * Generate spell effects based on spell data and targets
   */
  private static generateSpellEffects(spell: OPRSpell, targetUnitIds: string[]) {
    const effects = [];

    for (const targetUnitId of targetUnitIds) {
      if (spell.damage && spell.hits) {
        effects.push({
          targetUnitId,
          effectType: 'damage' as const,
          value: spell.damage * spell.hits,
          duration: spell.duration,
          description: `Deal ${spell.hits} hits with ${spell.damage} damage${spell.armorPiercing ? ` (AP ${spell.armorPiercing})` : ''}`
        });
      } else if (spell.modifiers && spell.modifiers.length > 0) {
        for (const modifier of spell.modifiers) {
          effects.push({
            targetUnitId,
            effectType: (modifier.type === 'buff' ? 'buff' : 'debuff') as 'buff' | 'debuff',
            value: modifier.value,
            duration: spell.duration,
            description: `${modifier.type === 'buff' ? 'Increase' : 'Decrease'} ${modifier.stat} by ${modifier.value}${modifier.condition ? ` (${modifier.condition})` : ''}`
          });
        }
      } else {
        effects.push({
          targetUnitId,
          effectType: 'special' as const,
          duration: spell.duration,
          description: spell.effect
        });
      }
    }

    return effects;
  }

  /**
   * Helper method to broadcast WebSocket messages to battle room
   */
  private static broadcastToBattleRoom(battleId: string, type: string, data: any): void {
    try {
      const wsManager = getWebSocketManager();
      if (wsManager) {
        const roomId = `battles:${battleId}`;
        const message = {
          type,
          data,
          timestamp: new Date().toISOString()
        };
        
        wsManager.broadcastToRoomPublic(roomId, message);
        logger.debug(`Broadcasting to battle room ${roomId}:`, { type, data });
      } else {
        logger.warn('WebSocket manager not available for spell cast broadcast');
      }
    } catch (error) {
      logger.error('Error broadcasting to battle room:', error);
    }
  }

  /**
   * Initiate poker-style cooperative casting (new system)
   * POST /api/spells/initiate-cooperative-casting
   */
  static async initiateCooperativeCasting(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { battleId, spellId, casterUnitId, targetUnitIds = [], timeoutSeconds = 15 } = req.body;
      const userId = req.user!.id;

      if (!battleId || !spellId || !casterUnitId) {
        res.status(400).json({
          success: false,
          error: 'Battle ID, spell ID, and caster unit ID are required'
        });
        return;
      }

      // Get battle state to validate the request
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found or access denied'
        });
        return;
      }

      // Find the main caster unit
      const userArmy = battleState.armies.find(army => army.userId === userId);
      if (!userArmy) {
        res.status(403).json({
          success: false,
          error: 'User is not participating in this battle'
        });
        return;
      }

      const casterUnit = userArmy.units.find(unit => unit.unitId === casterUnitId);
      if (!casterUnit) {
        res.status(404).json({
          success: false,
          error: 'Caster unit not found'
        });
        return;
      }

      // Find the caster model
      const casterModel = casterUnit.models.find(m => m.casterTokens > 0 && m.specialRules.some(rule => rule.includes('Caster('))) 
                         || casterUnit.joinedHero;

      if (!casterModel || casterModel.casterTokens <= 0) {
        res.status(400).json({
          success: false,
          error: 'No valid caster found or insufficient tokens'
        });
        return;
      }

      // Get spell data
      let spellData: OPRSpell | null = null;
      if (casterModel.armyId) {
        const spells = await SpellDataService.getSpellsForArmyId(casterModel.armyId);
        spellData = spells.find(s => s.id === spellId) || null;
      }

      if (!spellData) {
        res.status(404).json({
          success: false,
          error: 'Spell not found'
        });
        return;
      }

      // Check if caster has enough tokens for base cost
      if (casterModel.casterTokens < spellData.cost) {
        res.status(400).json({
          success: false,
          error: `Insufficient tokens: need ${spellData.cost}, have ${casterModel.casterTokens}`
        });
        return;
      }

      // Get target unit names for display
      const targetUnitNames: string[] = [];
      for (const targetId of targetUnitIds) {
        for (const army of battleState.armies) {
          const targetUnit = army.units.find(unit => unit.unitId === targetId);
          if (targetUnit) {
            targetUnitNames.push(targetUnit.name);
            break;
          }
        }
      }

      // Create cooperation request ID
      const cooperationRequestId = `coop_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Store cooperation session in memory (in production, use Redis or database)
      // For now, we'll use a simple in-memory store
      if (!global.cooperationSessions) {
        global.cooperationSessions = new Map<string, CooperationSession>();
      }

      const session = {
        cooperationRequestId,
        battleId,
        casterUserId: userId,
        casterUnitId,
        casterName: casterModel.name,
        spell: {
          id: spellData.id,
          name: spellData.name,
          cost: spellData.cost,
          effect: spellData.effect,
          targets: spellData.targets
        },
        targetUnitIds,
        targetUnitNames,
        timeoutSeconds,
        expiresAt: new Date(Date.now() + timeoutSeconds * 1000),
        contributions: new Map<string, {
          userId: string;
          contributions: Array<{
            unitId: string;
            modelId: string;
            unitName: string;
            casterName: string;
            tokensContributed: number;
            modifier: number;
            maxTokens: number;
          }>;
          submittedAt: Date;
        }>(), // userId -> contribution data
        isComplete: false
      };

      global.cooperationSessions.set(cooperationRequestId, session);

      // Set timeout to auto-complete session
      setTimeout(() => {
        this.completeCooperativeSession(cooperationRequestId);
      }, timeoutSeconds * 1000);

      // Broadcast cooperation request to all battle participants
      this.broadcastToBattleRoom(battleId, 'cooperative_contribution_request', {
        cooperationRequestId,
        casterUserId: userId,
        casterUnitId,
        casterName: casterModel.name,
        spell: {
          id: spellData.id,
          name: spellData.name,
          cost: spellData.cost,
          effect: spellData.effect,
          targets: spellData.targets
        },
        targetUnitIds,
        targetUnitNames,
        timeoutSeconds,
        expiresAt: session.expiresAt.toISOString()
      });

      logger.info(`Cooperative casting session ${cooperationRequestId} initiated for spell ${spellData.name} in battle ${battleId}`);

      res.json({
        success: true,
        data: {
          cooperationRequestId,
          expiresAt: session.expiresAt.toISOString()
        }
      });

    } catch (error) {
      logger.error('Initiate cooperative casting error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate cooperative casting'
      });
    }
  }

  /**
   * Submit cooperative contribution (poker-style)
   * POST /api/spells/submit-cooperative-contribution
   */
  static async submitCooperativeContribution(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { battleId, cooperationRequestId, contributions = [] } = req.body;
      const userId = req.user!.id;

      if (!battleId || !cooperationRequestId) {
        res.status(400).json({
          success: false,
          error: 'Battle ID and cooperation request ID are required'
        });
        return;
      }

      // Get cooperation session
      const session = global.cooperationSessions?.get(cooperationRequestId);
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Cooperation session not found or expired'
        });
        return;
      }

      if (session.isComplete) {
        res.status(400).json({
          success: false,
          error: 'Cooperation session already complete'
        });
        return;
      }

      // Validate battle access
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found or access denied'
        });
        return;
      }

      // Find user's army
      const userArmy = battleState.armies.find(army => army.userId === userId);
      if (!userArmy) {
        res.status(403).json({
          success: false,
          error: 'User is not participating in this battle'
        });
        return;
      }

      // Validate contributions
      const validatedContributions = [];
      for (const contribution of contributions) {
        const { unitId, modelId, tokensContributed, modifier } = contribution;

        if (tokensContributed <= 0) continue; // Skip zero contributions

        // Skip contributions for the casting unit (can't contribute to own spell)
        if (unitId === session.casterUnitId) continue;

        // Find contributing unit
        const contributingUnit = userArmy.units.find(unit => unit.unitId === unitId);
        if (!contributingUnit) continue;

        // Find contributing model
        let contributingModel = null;
        if (modelId) {
          contributingModel = contributingUnit.models.find(m => m.modelId === modelId) ||
                             (contributingUnit.joinedHero?.modelId === modelId ? contributingUnit.joinedHero : null);
        } else {
          contributingModel = contributingUnit.models.find(m => m.casterTokens > 0) || contributingUnit.joinedHero;
        }

        if (!contributingModel || contributingModel.casterTokens < tokensContributed) {
          continue; // Skip invalid contributions
        }

        validatedContributions.push({
          unitId,
          modelId: contributingModel.modelId,
          unitName: contributingUnit.name,
          casterName: contributingModel.name,
          tokensContributed,
          modifier,
          maxTokens: contributingModel.casterTokens
        });
      }

      // Store user's contribution
      session.contributions.set(userId, {
        userId,
        contributions: validatedContributions,
        submittedAt: new Date()
      });

      logger.info(`User ${userId} submitted ${validatedContributions.length} contributions for session ${cooperationRequestId}`);

      res.json({
        success: true,
        data: {
          contributionsAccepted: validatedContributions.length,
          sessionStatus: 'awaiting_others'
        }
      });

    } catch (error) {
      logger.error('Submit cooperative contribution error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit contribution'
      });
    }
  }

  /**
   * Submit spell result (by original caster)
   * POST /api/spells/submit-result
   */
  static async submitSpellResult(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { battleId, cooperationRequestId, success, finalModifier } = req.body;
      const userId = req.user!.id;

      if (!battleId || !cooperationRequestId || success === undefined) {
        res.status(400).json({
          success: false,
          error: 'Battle ID, cooperation request ID, and success are required'
        });
        return;
      }

      // Get cooperation session
      const session = global.cooperationSessions?.get(cooperationRequestId);
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Cooperation session not found or expired'
        });
        return;
      }

      // Verify user is the original caster
      if (session.casterUserId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Only the original caster can submit spell result'
        });
        return;
      }

      // Get battle state and apply spell effects
      const battleState = await OPRBattleService.getOPRBattleState(battleId, userId);
      if (!battleState) {
        res.status(404).json({
          success: false,
          error: 'Battle not found or access denied'
        });
        return;
      }

      // Store battle state before spell casting for undo functionality
      const beforeState = JSON.parse(JSON.stringify(battleState));

      // Find caster unit and model
      const userArmy = battleState.armies.find(army => army.userId === userId);
      const casterUnit = userArmy?.units.find(unit => unit.unitId === session.casterUnitId);
      const casterModel = casterUnit?.models.find(m => m.casterTokens > 0) || casterUnit?.joinedHero;

      if (!casterModel) {
        res.status(400).json({
          success: false,
          error: 'Caster not found'
        });
        return;
      }

      // Get spell data
      let spellData: OPRSpell | null = null;
      if (casterModel.armyId) {
        const spells = await SpellDataService.getSpellsForArmyId(casterModel.armyId);
        spellData = spells.find(s => s.id === session.spell.id) || null;
      }

      if (!spellData) {
        res.status(404).json({
          success: false,
          error: 'Spell data not found'
        });
        return;
      }

      // Calculate tokens spent and consume them
      let totalTokensSpent = spellData.cost;
      
      // Consume main caster tokens
      casterModel.casterTokens -= spellData.cost;

      // Consume cooperating caster tokens
      const cooperatingCasters = [];
      for (const [contributorUserId, contributorData] of session.contributions) {
        for (const contribution of contributorData.contributions) {
          // Find and consume tokens from cooperating casters
          for (const army of battleState.armies) {
            if (army.userId === contributorUserId) {
              const unit = army.units.find(u => u.unitId === contribution.unitId);
              if (unit) {
                const model = unit.models.find(m => m.modelId === contribution.modelId) ||
                             (unit.joinedHero?.modelId === contribution.modelId ? unit.joinedHero : null);
                if (model && model.casterTokens >= contribution.tokensContributed) {
                  model.casterTokens -= contribution.tokensContributed;
                  totalTokensSpent += contribution.tokensContributed;
                  
                  cooperatingCasters.push({
                    userId: contributorUserId,
                    unitId: contribution.unitId,
                    modelId: contribution.modelId,
                    unitName: contribution.unitName,
                    casterName: contribution.casterName,
                    tokensContributed: contribution.tokensContributed,
                    modifier: contribution.modifier
                  });
                }
              }
              break;
            }
          }
        }
      }

      // Apply spell effects if successful
      if (success) {
        await this.applySpellEffects(battleState, spellData, session.targetUnitIds, userId);
      }

      // Save updated battle state
      await OPRBattleService.saveBattleState(battleId, battleState);

      // Record battle event
      await OPRBattleService.recordBattleEvent(
        battleId,
        userId,
        'SPELL_CAST',
        {
          description: `${spellData.name} ${success ? 'cast successfully' : 'failed'}`,
          spellId: session.spell.id,
          spellName: spellData.name,
          casterUnitId: session.casterUnitId,
          targetUnitIds: session.targetUnitIds,
          tokensSpent: totalTokensSpent,
          finalModifier,
          success
        }
      );

      // Record action in battle history for undo functionality
      const affectedUnitIds = [session.casterUnitId, ...session.targetUnitIds, ...cooperatingCasters.map(c => c.unitId)];

      await BattleActionHistoryService.recordAction(
        battleId,
        userId,
        'SPELL_CAST',
        {
          description: `${spellData.name} ${success ? 'cast successfully' : 'failed'}`,
          spellId: session.spell.id,
          spellName: spellData.name,
          unitId: session.casterUnitId,
          targetUnitIds: session.targetUnitIds,
          tokensSpent: totalTokensSpent,
          finalModifier,
          success,
          cooperatingCasters
        },
        beforeState,
        battleState,
        {
          canUndo: true,
          undoComplexity: cooperatingCasters.length > 0 ? 'complex' : 'simple',
          affectedUnitIds
        }
      );

      // Mark session as complete
      session.isComplete = true;

      // Broadcast final result to all battle participants
      this.broadcastToBattleRoom(battleId, 'spell_cast_complete', {
        cooperationRequestId,
        casterUserId: userId,
        casterUnitId: session.casterUnitId,
        spellName: spellData.name,
        success,
        finalModifier,
        tokensSpent: totalTokensSpent,
        cooperatingCasters: cooperatingCasters.length
      });

      // Clean up session after a delay
      setTimeout(() => {
        global.cooperationSessions?.delete(cooperationRequestId);
      }, 60000); // Keep for 1 minute for any final notifications

      logger.info(`Spell result submitted for session ${cooperationRequestId}: ${success ? 'SUCCESS' : 'FAILURE'}`);

      res.json({
        success: true,
        data: {
          spellSuccess: success,
          tokensSpent: totalTokensSpent,
          cooperatingCasters: cooperatingCasters.length
        }
      });

    } catch (error) {
      logger.error('Submit spell result error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit spell result'
      });
    }
  }

  /**
   * Complete cooperative session (timeout handler)
   */
  private static async completeCooperativeSession(cooperationRequestId: string): Promise<void> {
    try {
      const session = global.cooperationSessions?.get(cooperationRequestId);
      if (!session || session.isComplete) return;

      // Calculate final modifier from all contributions
      let finalModifier = 0;
      const allContributions = [];

      for (const [userId, contributorData] of session.contributions) {
        for (const contribution of contributorData.contributions) {
          finalModifier += contribution.modifier;
          allContributions.push({
            userId,
            unitName: contribution.unitName,
            casterName: contribution.casterName,
            modifier: contribution.modifier
          });
        }
      }

      // Broadcast contributions complete to original caster
      this.broadcastToBattleRoom(session.battleId, 'cooperative_contributions_complete', {
        cooperationRequestId,
        casterUserId: session.casterUserId,
        spellName: session.spell.name,
        finalModifier,
        allContributions
      });

      logger.info(`Cooperative session ${cooperationRequestId} completed with final modifier: ${finalModifier}`);

    } catch (error) {
      logger.error('Error completing cooperative session:', error);
    }
  }

  /**
   * Apply spell effects to battle state
   */
  private static async applySpellEffects(battleState: any, spell: OPRSpell, targetUnitIds: string[], userId: string) {
    // For now, this is a placeholder for spell effect application
    // In a full implementation, this would modify unit stats, apply damage, etc.
    
    // Example: Apply damage if it's a damage spell
    if (spell.damage && spell.hits) {
      for (const targetUnitId of targetUnitIds) {
        // Find target unit in battle state
        for (const army of battleState.armies) {
          const targetUnit = army.units.find((unit: any) => unit.unitId === targetUnitId);
          if (targetUnit) {
            // Apply damage to first available model
            const availableModel = targetUnit.models.find((model: any) => !model.isDestroyed);
            if (availableModel) {
              const totalDamage = spell.damage * spell.hits;
              availableModel.currentTough -= totalDamage;
              if (availableModel.currentTough <= 0) {
                availableModel.isDestroyed = true;
                targetUnit.currentSize--;
              }
            }
            break;
          }
        }
      }
    }
    
    // TODO: Implement other spell effects (buffs, debuffs, special abilities)
  }
}