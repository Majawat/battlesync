interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  hitRate: number;
  hits: number;
  misses: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = { size: 0, hitRate: 0, hits: 0, misses: 0 };
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize: number = 1000, cleanupIntervalMs: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    
    // Cleanup expired entries every 5 minutes by default
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  /**
   * Store data in cache with TTL (time to live) in seconds
   */
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);

    // If cache is at max size, remove least recently accessed item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      data,
      expiresAt,
      lastAccessed: now,
    });

    this.stats.size = this.cache.size;
  }

  /**
   * Retrieve data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update last accessed time
    entry.lastAccessed = now;
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.data as T;
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clear cache entries matching pattern
   */
  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear();
      this.stats.size = 0;
      return;
    }

    // Convert glob-like pattern to regex
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    
    this.stats.size = this.cache.size;
  }

  /**
   * Check if key exists in cache (without updating access time)
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all cache keys (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getSizeInBytes(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation of memory usage
      totalSize += key.length * 2; // String overhead
      totalSize += JSON.stringify(entry.data).length * 2; // Data size
      totalSize += 24; // Object overhead for entry
    }
    
    return totalSize;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Remove least recently used entry when cache is full
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}