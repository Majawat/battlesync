import { Router } from 'express';
import { GamingGroupController } from '../controllers/gamingGroupController';
import { authenticate } from '../middleware/auth';
import { validateCreateGamingGroup, validateJoinGroup } from '../middleware/validation';

const router = Router();

// All gaming group routes require authentication
router.use(authenticate);

// Create a new gaming group
router.post('/', validateCreateGamingGroup, GamingGroupController.createGroup);

// Join an existing gaming group
router.post('/join', validateJoinGroup, GamingGroupController.joinGroup);

// Get all gaming groups for the current user
router.get('/', GamingGroupController.getUserGroups);

// Get a specific gaming group by ID
router.get('/:id', GamingGroupController.getGroupById);

// Update a gaming group (owner only)
router.put('/:id', validateCreateGamingGroup, GamingGroupController.updateGroup);

// Leave a gaming group
router.post('/:id/leave', GamingGroupController.leaveGroup);

// Delete a gaming group (owner only)
router.delete('/:id', GamingGroupController.deleteGroup);

// Regenerate invite code (owner only)
router.post('/:id/regenerate-invite', GamingGroupController.regenerateInviteCode);

export { router as gamingGroupRoutes };