import { Router } from 'express';
import { BattleController } from '../controllers/battleController';
import { authenticate } from '../middleware/auth';
import { validateCreateBattle, validateApplyDamage, validateCompleteBattle } from '../middleware/validation';

const router = Router();

// All battle routes require authentication
router.use(authenticate);

/**
 * @route POST /api/battles
 * @desc Create a new battle session
 * @access Private
 */
router.post('/', validateCreateBattle, BattleController.createBattle);

/**
 * @route GET /api/battles/:id
 * @desc Get battle details
 * @access Private (participants only)
 */
router.get('/:id', BattleController.getBattle);

/**
 * @route POST /api/battles/:id/start
 * @desc Start a battle
 * @access Private (participants only)
 */
router.post('/:id/start', BattleController.startBattle);

/**
 * @route POST /api/battles/:id/damage
 * @desc Apply damage to a unit
 * @access Private (participants only)
 */
router.post('/:id/damage', validateApplyDamage, BattleController.applyDamage);

/**
 * @route POST /api/battles/:id/complete
 * @desc Complete a battle
 * @access Private (participants only)
 */
router.post('/:id/complete', validateCompleteBattle, BattleController.completeBattle);

export default router;