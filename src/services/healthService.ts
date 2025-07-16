import { PrismaClient } from '@prisma/client';
import { armyForgeClient } from './armyForgeClient';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: string;
  details?: string;
  error?: string;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: {
    database: ComponentHealth;
    auth: ComponentHealth;
    websocket: ComponentHealth;
    armyforge: ComponentHealth;
    seeding: ComponentHealth;
  };
}

export class HealthService {
  private static seedingStatus: 'complete' | 'in_progress' | 'failed' = 'complete';
  private static websocketManager: any = null;

  /**
   * Set seeding status (called by seeding scripts)
   */
  static setSeedingStatus(status: 'complete' | 'in_progress' | 'failed') {
    this.seedingStatus = status;
  }

  /**
   * Set WebSocket manager reference
   */
  static setWebSocketManager(manager: any) {
    this.websocketManager = manager;
  }

  /**
   * Check database health
   */
  static async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = `${Date.now() - startTime}ms`;
      return {
        status: 'healthy',
        responseTime,
        details: 'Connected to PostgreSQL'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check authentication service health
   */
  static async checkAuth(): Promise<ComponentHealth> {
    try {
      // Check if we can access user table (basic auth functionality)
      const userCount = await prisma.user.count();
      return {
        status: 'healthy',
        details: `Authentication service ready (${userCount} users)`
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: 'Authentication service unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check WebSocket server health
   */
  static async checkWebSocket(): Promise<ComponentHealth> {
    try {
      if (!this.websocketManager) {
        return {
          status: 'degraded',
          details: 'WebSocket manager not initialized'
        };
      }

      // Check if WebSocket server is running
      const connectionCount = this.websocketManager.getConnectionCount?.() || 0;
      return {
        status: 'healthy',
        details: `WebSocket server running (${connectionCount} connections)`
      };
    } catch (error) {
      return {
        status: 'degraded',
        details: 'WebSocket server status unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check ArmyForge API health
   */
  static async checkArmyForge(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      const validation = await armyForgeClient.validateToken('public');
      const responseTime = `${Date.now() - startTime}ms`;
      
      if (validation.valid) {
        return {
          status: 'healthy',
          responseTime,
          details: 'ArmyForge API accessible'
        };
      } else {
        return {
          status: 'degraded',
          responseTime,
          details: 'ArmyForge API responding but validation failed'
        };
      }
    } catch (error) {
      return {
        status: 'degraded',
        details: 'ArmyForge API unavailable (non-critical)',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check seeding status
   */
  static async checkSeeding(): Promise<ComponentHealth> {
    try {
      switch (this.seedingStatus) {
        case 'complete':
          return {
            status: 'healthy',
            details: 'Database seeded successfully'
          };
        case 'in_progress':
          return {
            status: 'unhealthy',
            details: 'Database seeding in progress'
          };
        case 'failed':
          return {
            status: 'unhealthy',
            details: 'Database seeding failed'
          };
        default:
          return {
            status: 'healthy',
            details: 'Seeding status unknown (assuming complete)'
          };
      }
    } catch (error) {
      return {
        status: 'degraded',
        details: 'Unable to determine seeding status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get comprehensive health check
   */
  static async getHealthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Run all health checks in parallel
      const [database, auth, websocket, armyforge, seeding] = await Promise.all([
        this.checkDatabase(),
        this.checkAuth(),
        this.checkWebSocket(),
        this.checkArmyForge(),
        this.checkSeeding()
      ]);

      // Determine overall status
      const criticalComponents = [database, auth, seeding];
      const allComponents = [database, auth, websocket, armyforge, seeding];
      
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      
      if (criticalComponents.some(c => c.status === 'unhealthy')) {
        overallStatus = 'unhealthy';
      } else if (allComponents.some(c => c.status === 'degraded' || c.status === 'unhealthy')) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      const totalTime = Date.now() - startTime;
      logger.debug(`Health check completed in ${totalTime}ms`);

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        components: {
          database,
          auth,
          websocket,
          armyforge,
          seeding
        }
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        components: {
          database: { status: 'unhealthy', details: 'Health check failed' },
          auth: { status: 'unhealthy', details: 'Health check failed' },
          websocket: { status: 'unhealthy', details: 'Health check failed' },
          armyforge: { status: 'unhealthy', details: 'Health check failed' },
          seeding: { status: 'unhealthy', details: 'Health check failed' }
        }
      };
    }
  }

  /**
   * Get simple health status (for quick checks)
   */
  static async getSimpleHealth(): Promise<{ status: string; ready: boolean }> {
    const health = await this.getHealthCheck();
    const ready = health.components.database.status === 'healthy' && 
                  health.components.auth.status === 'healthy' &&
                  health.components.seeding.status === 'healthy';
    
    return {
      status: health.status,
      ready
    };
  }
}