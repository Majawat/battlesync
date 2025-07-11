import { Router } from 'express';
import { armyController } from '../controllers/armyController';
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
router.post('/import', armyController.importArmy);

/**
 * @route GET /api/armies
 * @desc Get user's armies
 * @access Private
 */
router.get('/', armyController.getUserArmies);

/**
 * @route GET /api/armies/statistics
 * @desc Get army statistics for user
 * @access Private
 */
router.get('/statistics', armyController.getStatistics);

/**
 * @route GET /api/armies/armyforge/status
 * @desc Get ArmyForge integration status
 * @access Private
 */
router.get('/armyforge/status', armyController.getArmyForgeStatus);

/**
 * @route DELETE /api/armies/armyforge/cache
 * @desc Clear ArmyForge cache
 * @access Private
 */
router.delete('/armyforge/cache', armyController.clearArmyForgeCache);

/**
 * @route GET /api/armies/:id
 * @desc Get specific army
 * @access Private
 */
router.get('/:id', armyController.getArmy);

/**
 * @route PUT /api/armies/:id/sync
 * @desc Sync army with ArmyForge
 * @access Private
 */
router.put('/:id/sync', armyController.syncArmy);

/**
 * @route PUT /api/armies/:id/customizations
 * @desc Update army customizations
 * @access Private
 */
router.put('/:id/customizations', armyController.updateCustomizations);

/**
 * @route DELETE /api/armies/:id
 * @desc Delete army
 * @access Private
 */
router.delete('/:id', armyController.deleteArmy);

/**
 * @route POST /api/armies/:id/battle-honors
 * @desc Add battle honor to army
 * @access Private
 */
router.post('/:id/battle-honors', armyController.addBattleHonor);

/**
 * @route POST /api/armies/:id/veteran-upgrades
 * @desc Add veteran upgrade to army
 * @access Private
 */
router.post('/:id/veteran-upgrades', armyController.addVeteranUpgrade);

/**
 * @route GET /api/armies/:id/validate
 * @desc Validate army data
 * @access Private
 */
router.get('/:id/validate', armyController.validateArmy);

export default router;