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

// Leave a campaign
router.post('/campaigns/:campaignId/leave', CampaignController.leaveCampaign);

// Delete a campaign
router.delete('/campaigns/:campaignId', CampaignController.deleteCampaign);

// Get battles for a campaign
router.get('/campaigns/:campaignId/battles', BattleController.getCampaignBattles);

// Note: Campaign membership is now managed at the Group level
// Use Group membership management endpoints instead

export { router as campaignRoutes };