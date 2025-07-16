import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { setupWebSocket } from './services/websocket';
import apiRoutes from './routes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Setup WebSocket
const wsManager = setupWebSocket(wss);

// Register WebSocket manager with health service
import('./services/healthService').then(({ HealthService }) => {
  HealthService.setWebSocketManager(wsManager);
});

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
app.use(rateLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { HealthService } = await import('./services/healthService');
    const health = await HealthService.getHealthCheck();
    
    // Set appropriate HTTP status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
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

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`🚀 BattleSync server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info('🔌 WebSocket server ready');
});