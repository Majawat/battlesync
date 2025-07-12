import { Router } from 'express';
import { MissionController } from '../controllers/missionController';
import { authenticate } from '../middleware/auth';
import { validateCreateMission, validateUpdateMission } from '../middleware/validation';

const router = Router();

// All mission routes require authentication
router.use(authenticate);

// Get mission templates (public for authenticated users)
router.get('/templates', MissionController.getMissionTemplates);

// Create a new mission in a campaign
router.post('/campaigns/:campaignId/missions', validateCreateMission, MissionController.createMission);

// Get all missions for a campaign
router.get('/campaigns/:campaignId/missions', MissionController.getCampaignMissions);

// Get a specific mission by ID
router.get('/missions/:missionId', MissionController.getMissionById);

// Update a mission
router.put('/missions/:missionId', validateUpdateMission, MissionController.updateMission);

// Delete a mission
router.delete('/missions/:missionId', MissionController.deleteMission);

export { router as missionRoutes };