import { Router } from 'express';
import authRoutes from './auth';
import { gamingGroupRoutes } from './gamingGroupRoutes';
import { campaignRoutes } from './campaignRoutes';
import { missionRoutes } from './missionRoutes';
import armyRoutes from './armyRoutes';
import battleRoutes from './battleRoutes';
import oprBattleRoutes from './oprBattleRoutes';
import damageHistoryRoutes from './damageHistoryRoutes';
import commandPointRoutes from './commandPointRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/groups', gamingGroupRoutes);
router.use('/', campaignRoutes);
router.use('/', missionRoutes);
router.use('/armies', armyRoutes);
router.use('/battles', battleRoutes);
router.use('/opr/battles', oprBattleRoutes);
router.use('/damage', damageHistoryRoutes);
router.use('/command-points', commandPointRoutes);

// Health check for API
router.get('/health', async (req, res) => {
  try {
    const { HealthService } = await import('../services/healthService');
    const health = await HealthService.getHealthCheck();
    
    // Set appropriate HTTP status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      ...health,
      service: 'BattleSync API',
      version: '0.1.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'BattleSync API',
      version: '0.1.0',
      components: {
        database: { status: 'unhealthy', details: 'Health check failed' },
        auth: { status: 'unhealthy', details: 'Health check failed' },
        websocket: { status: 'unhealthy', details: 'Health check failed' },
        armyforge: { status: 'unhealthy', details: 'Health check failed' },
        seeding: { status: 'unhealthy', details: 'Health check failed' }
      }
    });
  }
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