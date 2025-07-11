import { Router } from 'express';
import { ArmyController } from '../controllers/armyController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All army routes require authentication
router.use(authenticate);

// Routes

/**
 * @route POST /api/armies/import
 * @desc Import army from ArmyForge
 * @access Private
 */
router.post('/import', ArmyController.importArmy);

/**
 * @route GET /api/armies
 * @desc Get user's armies
 * @access Private
 */
router.get('/', ArmyController.getUserArmies);

/**
 * @route GET /api/armies/statistics
 * @desc Get army statistics for user
 * @access Private
 */
router.get('/statistics', ArmyController.getStatistics);

/**
 * @route GET /api/armies/armyforge/status
 * @desc Get ArmyForge integration status
 * @access Private
 */
router.get('/armyforge/status', ArmyController.getArmyForgeStatus);

/**
 * @route DELETE /api/armies/armyforge/cache
 * @desc Clear ArmyForge cache
 * @access Private
 */
router.delete('/armyforge/cache', ArmyController.clearArmyForgeCache);

/**
 * @route GET /api/armies/:id
 * @desc Get specific army
 * @access Private
 */
router.get('/:id', ArmyController.getArmy);

/**
 * @route PUT /api/armies/:id/sync
 * @desc Sync army with ArmyForge
 * @access Private
 */
router.put('/:id/sync', ArmyController.syncArmy);

/**
 * @route PUT /api/armies/:id/customizations
 * @desc Update army customizations
 * @access Private
 */
router.put('/:id/customizations', ArmyController.updateCustomizations);

/**
 * @route DELETE /api/armies/:id
 * @desc Delete army
 * @access Private
 */
router.delete('/:id', ArmyController.deleteArmy);

/**
 * @route POST /api/armies/:id/battle-honors
 * @desc Add battle honor to army
 * @access Private
 */
router.post('/:id/battle-honors', ArmyController.addBattleHonor);

/**
 * @route POST /api/armies/:id/veteran-upgrades
 * @desc Add veteran upgrade to army
 * @access Private
 */
router.post('/:id/veteran-upgrades', ArmyController.addVeteranUpgrade);

/**
 * @route GET /api/armies/:id/validate
 * @desc Validate army data
 * @access Private
 */
router.get('/:id/validate', ArmyController.validateArmy);

export default router;