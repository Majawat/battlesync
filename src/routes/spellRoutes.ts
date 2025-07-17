import { Router } from 'express';
import { SpellController } from '../controllers/spellController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Request cooperative casting from other players
router.post('/request-cooperation', authenticate, (req, res) => SpellController.requestCooperativeCasting(req as any, res));

// Respond to cooperative casting request
router.post('/respond-cooperation', authenticate, (req, res) => SpellController.respondToCooperativeCasting(req as any, res));

// Cast a spell in battle
router.post('/cast', authenticate, (req, res) => SpellController.castSpell(req as any, res));

// Get spells by armyId (preferred method)
router.get('/army/:armyId', authenticate, SpellController.getSpellsForArmyId);

// Get spells for a faction (legacy)
router.get('/faction/:factionName', authenticate, SpellController.getSpellsForFaction);

// Get specific spell by ID
router.get('/:spellId', authenticate, SpellController.getSpellById);

export { router as spellRoutes };