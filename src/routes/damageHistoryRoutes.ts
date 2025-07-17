import { Router } from 'express';
import { DamageHistoryController } from '../controllers/damageHistoryController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Apply damage with history tracking
router.post('/battles/:battleId/damage', DamageHistoryController.applyDamageWithHistory);

// Undo damage action
router.post('/battles/:battleId/undo', DamageHistoryController.undoDamage);

// Get battle damage history
router.get('/battles/:battleId/history', DamageHistoryController.getBattleDamageHistory);

// Get recent damage actions for quick undo
router.get('/battles/:battleId/recent', DamageHistoryController.getRecentDamageActions);

// Check if specific damage can be undone
router.get('/damage/:historyId/can-undo', DamageHistoryController.checkUndoCapability);

export default router;