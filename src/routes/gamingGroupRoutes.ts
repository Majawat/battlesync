import { Router } from 'express';
import { GamingGroupController } from '../controllers/gamingGroupController';
import { GroupController } from '../controllers/groupController';
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

// ============= GROUP MEMBERSHIP MANAGEMENT =============

// Get all members of a group
router.get('/:groupId/members', GroupController.getGroupMembers);

// Invite a user to the group by username
router.post('/:groupId/members/invite', GroupController.inviteUserToGroup);

// Accept a group invitation
router.post('/:groupId/accept-invitation', GroupController.acceptGroupInvitation);

// Decline a group invitation  
router.post('/:groupId/decline-invitation', GroupController.declineGroupInvitation);

// Update a group member's role or status
router.put('/:groupId/members/:membershipId', GroupController.updateGroupMember);

// Remove a member from the group
router.delete('/:groupId/members/:membershipId', GroupController.removeGroupMember);

// Get pending group invitations for current user
router.get('/invitations/pending', GroupController.getPendingInvitations);

export { router as gamingGroupRoutes };