import { Router } from 'express';
import { CommandPointController } from '../controllers/commandPointController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Calculate command points (utility endpoint - no auth required)
router.post('/calculate', CommandPointController.calculateCommandPoints);

// All other routes require authentication
router.use(authenticate);

// Spend command points
router.post('/battles/:battleId/command-points/spend', (req, res) => CommandPointController.spendCommandPoints(req as any, res));

// Get command point history for an army
router.get('/battles/:battleId/command-points/history', (req, res) => CommandPointController.getCommandPointHistory(req as any, res));

// Reset command points for all armies (admin)
router.post('/battles/:battleId/command-points/reset', (req, res) => CommandPointController.resetCommandPoints(req as any, res));

export default router;