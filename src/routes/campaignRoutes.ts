import { Router } from 'express';
import { CampaignController } from '../controllers/campaignController';
import { BattleController } from '../controllers/battleController';
import { authenticate } from '../middleware/auth';
import { validateCreateCampaign, validateJoinCampaign, validateUpdateCampaign } from '../middleware/validation';

const router = Router();

// All campaign routes require authentication
router.use(authenticate);

// Get all campaigns for the authenticated user
router.get('/campaigns', CampaignController.getUserCampaigns);

// Create a new campaign in a gaming group
router.post('/groups/:groupId/campaigns', validateCreateCampaign, CampaignController.createCampaign);

// Get all campaigns for a gaming group
router.get('/groups/:groupId/campaigns', CampaignController.getGroupCampaigns);

// Get a specific campaign by ID
router.get('/campaigns/:campaignId', CampaignController.getCampaignById);

// Update a campaign
router.put('/campaigns/:campaignId', validateUpdateCampaign, CampaignController.updateCampaign);

// Join a campaign
router.post('/campaigns/:campaignId/join', validateJoinCampaign, CampaignController.joinCampaign);

// Accept campaign invitation
router.post('/campaigns/:campaignId/accept-invitation', CampaignController.acceptCampaignInvitation);

// Decline campaign invitation
router.post('/campaigns/:campaignId/decline-invitation', CampaignController.declineCampaignInvitation);

// Get pending campaign invitations
router.get('/campaigns/invitations/pending', CampaignController.getPendingCampaignInvitations);

// Leave a campaign
router.post('/campaigns/:campaignId/leave', CampaignController.leaveCampaign);

// Delete a campaign
router.delete('/campaigns/:campaignId', CampaignController.deleteCampaign);

// Get battles for a campaign
router.get('/campaigns/:campaignId/battles', BattleController.getCampaignBattles);

// ============= CAMPAIGN MEMBERSHIP COMPATIBILITY LAYER =============
// These endpoints provide frontend compatibility while using group-based architecture

// Get campaign members
router.get('/campaigns/:campaignId/members', CampaignController.getCampaignMembers);

// Get available group members who can be added to campaign
router.get('/campaigns/:campaignId/available-members', CampaignController.getAvailableGroupMembers);

// Add existing group member to campaign
router.post('/campaigns/:campaignId/members/add', CampaignController.addMemberToCampaign);

// Invite member to campaign
router.post('/campaigns/:campaignId/members/invite', CampaignController.inviteMemberToCampaign);

// Update member role/status
router.put('/campaigns/:campaignId/members/:membershipId', CampaignController.updateCampaignMember);

// Remove member from campaign
router.delete('/campaigns/:campaignId/members/:membershipId', CampaignController.removeCampaignMember);

export { router as campaignRoutes };