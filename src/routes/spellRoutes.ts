import { Router } from 'express';
import { SpellController } from '../controllers/spellController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get spells by armyId (preferred method)
router.get('/army/:armyId', authenticate, SpellController.getSpellsForArmyId);

// Get spells for a faction (legacy)
router.get('/faction/:factionName', authenticate, SpellController.getSpellsForFaction);

// Get specific spell by ID
router.get('/:spellId', authenticate, SpellController.getSpellById);

export { router as spellRoutes };