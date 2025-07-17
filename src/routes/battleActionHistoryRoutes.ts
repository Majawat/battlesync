import { Router } from 'express';
import { BattleActionHistoryController } from '../controllers/battleActionHistoryController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get battle action history
router.get('/battles/:battleId/action-history', BattleActionHistoryController.getBattleActionHistory);

// Get recent undoable actions
router.get('/battles/:battleId/action-history/recent', BattleActionHistoryController.getRecentUndoableActions);

// Undo an action
router.post('/battles/:battleId/action-history/undo', BattleActionHistoryController.undoAction);

// Cascade undo multiple actions
router.post('/battles/:battleId/action-history/undo-cascade', BattleActionHistoryController.undoCascade);

// Get undo suggestions
router.get('/battles/:battleId/action-history/undo-suggestions', BattleActionHistoryController.getUndoSuggestions);

// Export action history
router.get('/battles/:battleId/action-history/export', BattleActionHistoryController.exportActionHistory);

export { router as battleActionHistoryRoutes };