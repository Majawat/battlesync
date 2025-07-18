import express from 'express';
import { MoraleTestController } from '../controllers/moraleTestController';
import { authenticate } from '../middleware/auth';
import Joi from 'joi';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const moraleTestSchema = Joi.object({
  unitId: Joi.string().required(),
  testType: Joi.string().valid('MORALE', 'QUALITY', 'ROUT_RECOVERY', 'ACTIVATION').required(),
  modifier: Joi.number().integer().min(-10).max(10).optional(),
  reason: Joi.string().min(1).max(200).required(),
  forcedRoll: Joi.number().integer().min(1).max(6).optional()
});

const qualityTestSchema = Joi.object({
  unitId: Joi.string().required(),
  modelId: Joi.string().required(),
  testType: Joi.string().valid('ACTIVATION', 'SPECIAL_ABILITY', 'INSTANT_KILL', 'SPELL_RESIST').required(),
  modifier: Joi.number().integer().min(-10).max(10).optional(),
  reason: Joi.string().min(1).max(200).required(),
  forcedRoll: Joi.number().integer().min(1).max(6).optional()
});

// Validation middleware
const validateMoraleTest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { error } = moraleTestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  next();
};

const validateQualityTest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { error } = qualityTestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  next();
};

// Routes

/**
 * @route POST /api/battles/:battleId/morale-test
 * @desc Perform a morale test for a unit
 * @access Private
 */
router.post('/:battleId/morale-test', 
  validateMoraleTest, 
  MoraleTestController.performMoraleTest
);

/**
 * @route POST /api/battles/:battleId/quality-test
 * @desc Perform a quality test for a model
 * @access Private
 */
router.post('/:battleId/quality-test', 
  validateQualityTest, 
  MoraleTestController.performQualityTest
);

/**
 * @route GET /api/battles/:battleId/units/:unitId/morale-suggestions
 * @desc Get morale test suggestions for a unit
 * @access Private
 */
router.get('/:battleId/units/:unitId/morale-suggestions', 
  MoraleTestController.getMoraleTestSuggestions
);

/**
 * @route GET /api/battles/:battleId/units/:unitId/models/:modelId/quality-info
 * @desc Get quality test info for a model
 * @access Private
 */
router.get('/:battleId/units/:unitId/models/:modelId/quality-info', 
  MoraleTestController.getQualityTestInfo
);

export default router;