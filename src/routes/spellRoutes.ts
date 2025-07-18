import { Router } from 'express';
import { SpellController } from '../controllers/spellController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Poker-style cooperative casting endpoints (new system)
router.post('/initiate-cooperative-casting', authenticate, (req, res) => SpellController.initiateCooperativeCasting(req as any, res));
router.post('/submit-cooperative-contribution', authenticate, (req, res) => SpellController.submitCooperativeContribution(req as any, res));
router.post('/submit-result', authenticate, (req, res) => SpellController.submitSpellResult(req as any, res));

// Legacy cooperative casting endpoints (old system - keep for backwards compatibility)
router.post('/request-cooperation', authenticate, (req, res) => SpellController.requestCooperativeCasting(req as any, res));
router.post('/respond-cooperation', authenticate, (req, res) => SpellController.respondToCooperativeCasting(req as any, res));
router.post('/cast', authenticate, (req, res) => SpellController.castSpell(req as any, res));

// Get spells by armyId (preferred method)
router.get('/army/:armyId', authenticate, SpellController.getSpellsForArmyId);

// Get spells for a faction (legacy)
router.get('/faction/:factionName', authenticate, SpellController.getSpellsForFaction);

// Get specific spell by ID
router.get('/:spellId', authenticate, SpellController.getSpellById);

export { router as spellRoutes };