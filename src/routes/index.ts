import { Router } from 'express';
import authRoutes from './auth';
import { gamingGroupRoutes } from './gamingGroupRoutes';
// import { campaignRoutes } from './campaignRoutes';
// import { missionRoutes } from './missionRoutes';
// import armyRoutes from './armyRoutes';
// import battleRoutes from './battleRoutes';
import oprBattleRoutes from './oprBattleRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/groups', gamingGroupRoutes);
// router.use('/', campaignRoutes);
// router.use('/', missionRoutes);
// router.use('/armies', armyRoutes);
// router.use('/battles', battleRoutes);
router.use('/opr/battles', oprBattleRoutes);

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'BattleSync API',
    version: '0.1.0'
  });
});

// Fallback route
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `API endpoint ${req.originalUrl} not found`,
    availableEndpoints: {
      auth: '/api/auth/*',
      groups: '/api/groups/*',
      campaigns: '/api/groups/:groupId/campaigns, /api/campaigns/*',
      missions: '/api/campaigns/:campaignId/missions, /api/missions/*, /api/templates',
      armies: '/api/armies/*',
      battles: '/api/battles/*, /api/campaigns/:campaignId/battles',
      oprBattles: '/api/opr/battles/*',
      health: '/api/health'
    }
  });
});

export default router;