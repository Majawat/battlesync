import axios from 'axios';
import { CacheManager } from '../utils/cacheManager';
import { 
  ArmyForgeApiResponse, 
  ArmyForgeData, 
  ArmyForgeListResponse,
  ArmyForgeGameSystem,
  ArmyForgeFaction,
  ArmyForgeBook
} from '../types/army';

interface ArmyForgeConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimitPerMinute: number;
}

interface RateLimitState {
  requests: number[];
  windowStart: number;
}

class ArmyForgeClient {
  private client: any;
  private cache: CacheManager;
  private config: ArmyForgeConfig;
  private rateLimitStates: Map<string, RateLimitState> = new Map();

  constructor() {
    this.config = {
      baseUrl: process.env.ARMY_FORGE_API_URL || 'https://army-forge.onepagerules.com/api',
      timeout: parseInt(process.env.ARMY_FORGE_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.ARMY_FORGE_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.ARMY_FORGE_RETRY_DELAY || '1000'),
      rateLimitPerMinute: parseInt(process.env.ARMY_FORGE_RATE_LIMIT || '60'),
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BattleSync/1.0',
      },
    });

    this.cache = new CacheManager();
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting and auth
    this.client.interceptors.request.use(
      async (config: any) => {
        const token = config.headers.Authorization?.toString().replace('Bearer ', '');
        if (token) {
          await this.enforceRateLimit(token);
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Response interceptor for error handling and retries
    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const config = error.config;
        
        if (!config || config.__retryCount >= this.config.retryAttempts) {
          return Promise.reject(error);
        }

        config.__retryCount = (config.__retryCount || 0) + 1;

        // Retry on network errors or 5xx responses
        if (
          error.code === 'ECONNABORTED' ||
          error.code === 'ENOTFOUND' ||
          (error.response && error.response.status >= 500)
        ) {
          await this.delay(this.config.retryDelay * config.__retryCount);
          return this.client(config);
        }

        // Handle rate limiting
        if (error.response && error.response.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          await this.delay(retryAfter * 1000);
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  private async enforceRateLimit(token: string): Promise<void> {
    const now = Date.now();
    const windowDuration = 60 * 1000; // 1 minute in milliseconds
    
    let state = this.rateLimitStates.get(token);
    if (!state) {
      state = { requests: [], windowStart: now };
      this.rateLimitStates.set(token, state);
    }

    // Remove requests outside the current window
    state.requests = state.requests.filter(timestamp => timestamp > now - windowDuration);

    // Check if we're at the rate limit
    if (state.requests.length >= this.config.rateLimitPerMinute) {
      const oldestRequest = Math.min(...state.requests);
      const waitTime = windowDuration - (now - oldestRequest);
      await this.delay(waitTime);
      
      // Refresh the state after waiting
      state.requests = state.requests.filter(timestamp => timestamp > Date.now() - windowDuration);
    }

    // Add current request to the tracking
    state.requests.push(now);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `armyforge:${endpoint}:${paramString}`;
  }

  // Public API Methods

  /**
   * Get user's army list from ArmyForge
   */
  async getArmyList(
    token: string, 
    options: { 
      page?: number; 
      pageSize?: number; 
      gameSystem?: string; 
      faction?: string;
    } = {}
  ): Promise<ArmyForgeListResponse> {
    const cacheKey = this.getCacheKey('armies', { token: 'masked', ...options });
    
    // Try cache first (TTL: 5 minutes for army lists)
    const cached = await this.cache.get<ArmyForgeListResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const response: any = 
      await this.client.get('/armies', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: options.page || 1,
          pageSize: options.pageSize || 20,
          gameSystem: options.gameSystem,
          faction: options.faction,
        },
      });

    if (!response.data.success) {
      throw new Error(`ArmyForge API Error: ${response.data.message}`);
    }

    const result = response.data.data;
    await this.cache.set(cacheKey, result, 5 * 60); // 5 minutes TTL
    return result;
  }

  /**
   * Get specific army data from ArmyForge
   */
  async getArmy(token: string, armyId: string): Promise<ArmyForgeData> {
    const cacheKey = this.getCacheKey(`army:${armyId}`);
    
    // Try cache first (TTL: 10 minutes for individual armies)
    const cached = await this.cache.get<ArmyForgeData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use the actual ArmyForge API endpoint format
    const response: any = await this.client.get(`/tts?id=${armyId}`);

    // ArmyForge returns the army data directly, not wrapped in a success object
    const armyData = response.data;
    
    if (!armyData || !armyData.id) {
      throw new Error(`Army not found or invalid response for ID: ${armyId}`);
    }

    // Helper function to determine faction from army data
    const inferFactionFromArmy = (armyData: any): string => {
      // If there's a description, use it as faction info
      if (armyData.description) {
        return armyData.description;
      }
      
      // Fallback: Try to infer from unit names or use army name
      if (armyData.name && armyData.name !== 'Untitled Army') {
        return armyData.name;
      }
      
      // Last resort: Use game system with friendly name
      const gameSystemNames: Record<string, string> = {
        'gf': 'Grimdark Future',
        'aof': 'Age of Fantasy', 
        'ff': 'Firefight',
        'wftl': 'Warfleets FTL'
      };
      
      return gameSystemNames[armyData.gameSystem] || armyData.gameSystem;
    };

    // Transform the ArmyForge data to our expected format
    const result: ArmyForgeData = {
      id: armyData.id,
      name: armyData.name,
      faction: inferFactionFromArmy(armyData), // Use smarter faction detection
      gameSystem: armyData.gameSystem,
      points: armyData.listPoints || armyData.pointsLimit || 0,
      units: armyData.units || [],
      specialRules: [], // Extract from units if needed
      metadata: {
        version: '1.0',
        lastModified: armyData.modified || armyData.cloudModified || new Date().toISOString(),
        createdBy: 'ArmyForge'
      }
    };

    await this.cache.set(cacheKey, result, 10 * 60); // 10 minutes TTL
    return result;
  }

  /**
   * Get available game systems
   */
  async getGameSystems(): Promise<ArmyForgeGameSystem[]> {
    const cacheKey = this.getCacheKey('game-systems');
    
    // Try cache first (TTL: 1 hour for game systems)
    const cached = await this.cache.get<ArmyForgeGameSystem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response: any = 
      await this.client.get('/game-systems');

    if (!response.data.success) {
      throw new Error(`ArmyForge API Error: ${response.data.message}`);
    }

    const result = response.data.data;
    await this.cache.set(cacheKey, result, 60 * 60); // 1 hour TTL
    return result;
  }

  /**
   * Get factions for a specific game system
   */
  async getFactions(gameSystemId: string): Promise<ArmyForgeFaction[]> {
    const cacheKey = this.getCacheKey(`factions:${gameSystemId}`);
    
    // Try cache first (TTL: 30 minutes for factions)
    const cached = await this.cache.get<ArmyForgeFaction[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response: any = 
      await this.client.get(`/game-systems/${gameSystemId}/factions`);

    if (!response.data.success) {
      throw new Error(`ArmyForge API Error: ${response.data.message}`);
    }

    const result = response.data.data;
    await this.cache.set(cacheKey, result, 30 * 60); // 30 minutes TTL
    return result;
  }

  /**
   * Get army books for a faction
   */
  async getArmyBooks(gameSystemId: string, factionId: string): Promise<ArmyForgeBook[]> {
    const cacheKey = this.getCacheKey(`books:${gameSystemId}:${factionId}`);
    
    // Try cache first (TTL: 1 hour for army books)
    const cached = await this.cache.get<ArmyForgeBook[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response: any = 
      await this.client.get(`/game-systems/${gameSystemId}/factions/${factionId}/books`);

    if (!response.data.success) {
      throw new Error(`ArmyForge API Error: ${response.data.message}`);
    }

    const result = response.data.data;
    await this.cache.set(cacheKey, result, 60 * 60); // 1 hour TTL
    return result;
  }

  /**
   * Validate ArmyForge token/connection
   * For now, we'll just test if we can access the API
   */
  async validateToken(token: string): Promise<{ valid: boolean; username?: string; expiresAt?: Date }> {
    try {
      // For now, just test if we can access a known army to validate the connection
      // In a real implementation, this would validate the user's token/session
      const response = await this.client.get('/tts?id=vMzljLVC6ZGv');
      
      if (response.data && response.data.id) {
        return {
          valid: true,
          username: 'ArmyForge User', // Placeholder
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        };
      }
      
      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Check if an army has been updated on ArmyForge
   */
  async checkArmyUpdated(token: string, armyId: string, lastSyncedAt: Date): Promise<boolean> {
    try {
      const response: any = 
        await this.client.head(`/armies/${armyId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'If-Modified-Since': lastSyncedAt.toISOString(),
          },
        });

      // If we get 304 Not Modified, the army hasn't been updated
      return response.status !== 304;
    } catch (error: any) {
      if (error.response?.status === 304) {
        return false;
      }
      // On other errors, assume it needs updating
      return true;
    }
  }

  /**
   * Clear cache for a specific army or all armies
   */
  async clearCache(armyId?: string): Promise<void> {
    if (armyId) {
      await this.cache.delete(this.getCacheKey(`army:${armyId}`));
    } else {
      await this.cache.clear('armyforge:*');
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ size: number; hitRate: number }> {
    return this.cache.getStats();
  }

  /**
   * Health check for ArmyForge API
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      // Test with a simple army fetch to check API availability
      await this.client.get('/tts?id=vMzljLVC6ZGv', { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
      };
    }
  }
}

// Export singleton instance
export const armyForgeClient = new ArmyForgeClient();