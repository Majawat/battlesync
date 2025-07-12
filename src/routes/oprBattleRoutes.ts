import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { OPRBattleController } from '../controllers/oprBattleController';
import { authenticate } from '../middleware/auth';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createBattleSchema = Joi.object({
  missionId: Joi.string().required(),
  participants: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      armyId: Joi.string().required()
    })
  ).min(2).max(8).required()
});

const phaseTransitionSchema = Joi.object({
  phase: Joi.string().valid('GAME_SETUP', 'DEPLOYMENT', 'BATTLE_ROUNDS', 'GAME_END').required()
});

const applyDamageSchema = Joi.object({
  targetUnitId: Joi.string().required(),
  targetModelId: Joi.string().optional(),
  damage: Joi.number().integer().min(1).max(20).required(),
  sourceUnitId: Joi.string().optional(),
  sourceDescription: Joi.string().optional(),
  ignoreTough: Joi.boolean().optional()
});

const quickDamageSchema = Joi.object({
  unitId: Joi.string().required(),
  modelId: Joi.string().optional(),
  quickDamage: Joi.number().integer().min(1).max(5).optional(),
  customDamage: Joi.number().integer().min(1).max(20).optional()
}).or('quickDamage', 'customDamage');

const joinHeroSchema = Joi.object({
  heroUnitId: Joi.string().required(),
  targetUnitId: Joi.string().required()
});

const completeBattleSchema = Joi.object({
  winnerId: Joi.string().optional()
});

const unitActionSchema = Joi.object({
  unitId: Joi.string().required(),
  action: Joi.string().valid('hold', 'advance', 'rush', 'charge', null).required()
});

const unitStatusSchema = Joi.object({
  unitId: Joi.string().required(),
  status: Joi.string().valid('shaken', 'fatigued').required(),
  value: Joi.boolean().required()
});

// Generic validation middleware factory
function validateSchema(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    next();
  };
}

// Routes

/**
 * Create a new OPR battle
 * POST /api/opr/battles
 */
router.post(
  '/',
  authenticate,
  validateSchema(createBattleSchema),
  OPRBattleController.createBattle
);

/**
 * Get OPR battle state
 * GET /api/opr/battles/:battleId
 */
router.get(
  '/:battleId',
  authenticate,
  OPRBattleController.getBattleState
);

/**
 * Transition battle phase
 * POST /api/opr/battles/:battleId/phase
 */
router.post(
  '/:battleId/phase',
  authenticate,
  validateSchema(phaseTransitionSchema),
  OPRBattleController.transitionPhase
);

/**
 * Apply damage to unit/model
 * POST /api/opr/battles/:battleId/damage
 */
router.post(
  '/:battleId/damage',
  authenticate,
  validateSchema(applyDamageSchema),
  OPRBattleController.applyDamage
);

/**
 * Quick damage for touch interface
 * POST /api/opr/battles/:battleId/quick-damage
 */
router.post(
  '/:battleId/quick-damage',
  authenticate,
  validateSchema(quickDamageSchema),
  OPRBattleController.applyQuickDamage
);

/**
 * Join hero to unit
 * POST /api/opr/battles/:battleId/join-hero
 */
router.post(
  '/:battleId/join-hero',
  authenticate,
  validateSchema(joinHeroSchema),
  OPRBattleController.joinHeroToUnit
);

/**
 * Complete battle
 * POST /api/opr/battles/:battleId/complete
 */
router.post(
  '/:battleId/complete',
  authenticate,
  validateSchema(completeBattleSchema),
  OPRBattleController.completeBattle
);

/**
 * Set unit action
 * POST /api/opr/battles/:battleId/unit-action
 */
router.post(
  '/:battleId/unit-action',
  authenticate,
  validateSchema(unitActionSchema),
  OPRBattleController.setUnitAction
);

/**
 * Toggle unit status
 * POST /api/opr/battles/:battleId/unit-status
 */
router.post(
  '/:battleId/unit-status',
  authenticate,
  validateSchema(unitStatusSchema),
  OPRBattleController.toggleUnitStatus
);

export default router;