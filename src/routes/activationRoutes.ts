import { Router } from 'express';
import { ActivationController } from '../controllers/activationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Start a new round
router.post('/battles/:battleId/activation/start-round', ActivationController.startNewRound);

// Activate a specific unit
router.post('/battles/:battleId/activation/activate-unit', ActivationController.activateUnit);

// Pass activation (skip turn)
router.post('/battles/:battleId/activation/pass', ActivationController.passActivation);

// Get current activation status
router.get('/battles/:battleId/activation/status', ActivationController.getActivationStatus);

// Get available units for activation
router.get('/battles/:battleId/activation/available-units', ActivationController.getAvailableUnits);

// Get activation order for current round
router.get('/battles/:battleId/activation/order', ActivationController.getActivationOrder);

// Force end current round (admin/debug function)
router.post('/battles/:battleId/activation/end-round', ActivationController.endCurrentRound);

export { router as activationRoutes };