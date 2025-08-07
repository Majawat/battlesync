# Intelligent OPR Data Caching Strategy

Smart caching system with HEAD request validation and on-demand updates for OPR reference data.

## Core Principles

1. **HEAD-First Approach**: Always check if data has changed before fetching full content
2. **Version-Driven Updates**: Update cache when army lists reference newer versions
3. **Storage Efficiency**: Use SQLite for structured data with JSON columns for flexibility
4. **Multi-Game Support**: Design for all OPR games + future non-OPR systems

## Caching Flow

### Smart Fetch Process
```
1. Request for OPR data (game system, army book, etc.)
2. Check local cache for existing data + version
3. Send HEAD request to OPR API with If-None-Match header
4. If 304 Not Modified → Use cached data
5. If 200 OK → Fetch full data and update cache
6. Return data to caller
```

### Version Mismatch Handling
```
Army Import Process:
1. User imports army list (version X)
2. Army references game system version Y
3. If Y > cached version:
   a. Fetch updated game system data
   b. Update cache with version Y
   c. Process army with latest rules
4. If Y < cached version:
   a. Use cached data (backwards compatible)
   b. Log version difference for admin awareness
```

## Database Schema

### Cache Tables (extend existing schema)
```sql
-- Reference data cache with versioning
CREATE TABLE IF NOT EXISTS opr_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,        -- e.g., "game_system:gf", "army_book:7oi8zeiq"
    data_type TEXT NOT NULL,               -- 'game_system', 'army_book', 'common_rules'
    game_system_slug TEXT,                 -- 'grimdark-future', null for cross-game data
    version TEXT NOT NULL,                 -- Version from OPR API response
    etag TEXT,                            -- HTTP ETag for HEAD requests
    last_modified TEXT,                    -- HTTP Last-Modified header
    data TEXT NOT NULL,                    -- JSON data from API
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Historical versions (keep for compatibility)
CREATE TABLE IF NOT EXISTS opr_cache_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL,
    version TEXT NOT NULL,
    data TEXT NOT NULL,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(cache_key, version)
);

-- Cache management metadata
CREATE TABLE IF NOT EXISTS opr_cache_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_opr_cache_key ON opr_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_opr_cache_game_system ON opr_cache(game_system_slug);
CREATE INDEX IF NOT EXISTS idx_opr_cache_type ON opr_cache(data_type);
CREATE INDEX IF NOT EXISTS idx_opr_history_key_version ON opr_cache_history(cache_key, version);
```

## Cache Key Patterns

```typescript
// Consistent cache key generation
const CacheKeys = {
  gameSystem: (slug: string) => `game_system:${slug}`,
  armyBook: (bookId: string) => `army_book:${bookId}`,
  armyBooksList: (gameSystemSlug: string, filter: string) => 
    `army_books_list:${gameSystemSlug}:${filter}`,
  commonRules: (gameSystemSlug: string) => `common_rules:${gameSystemSlug}`,
  partners: (gameSystemId: number) => `partners:${gameSystemId}`,
};
```

## Implementation Classes

### OPRCacheService
```typescript
class OPRCacheService {
  // Smart fetch with HEAD validation
  async fetchWithCache<T>(
    url: string, 
    cacheKey: string, 
    dataType: string,
    gameSystemSlug?: string
  ): Promise<T>

  // Get cached data or fetch fresh
  async getGameSystem(slug: string): Promise<GameSystemData>
  async getArmyBook(bookId: string, gameSystemId: number): Promise<ArmyBookData>
  async getArmyBooksList(gameSystemSlug: string, filter: string): Promise<ArmyBookSummary[]>

  // Version management
  async ensureVersion(cacheKey: string, requiredVersion: string): Promise<boolean>
  async archiveVersion(cacheKey: string, version: string): Promise<void>
  
  // Admin utilities
  async refreshAllCache(): Promise<CacheRefreshReport>
  async getCacheStats(): Promise<CacheStats>
  async clearCache(pattern?: string): Promise<void>
}
```

### Intelligent HTTP Client
```typescript
class SmartHTTPClient {
  async headCheck(url: string, etag?: string, lastModified?: string): Promise<{
    needsUpdate: boolean;
    newETag?: string;
    newLastModified?: string;
  }>

  async fetchIfChanged(url: string, existingETag?: string): Promise<{
    data?: any;
    wasModified: boolean;
    etag?: string;
    lastModified?: string;
  }>
}
```

## Storage Strategy

### Why SQLite + JSON Columns
1. **Structured Metadata**: Version tracking, cache keys, timestamps in relational format
2. **Flexible Data**: OPR JSON responses stored as-is for future compatibility
3. **Query Performance**: Indexes on metadata, full JSON when needed
4. **Historical Versions**: Easy to store multiple versions of same data
5. **Single Database**: No file system complexity, consistent with existing architecture

### Data Organization
```
opr_cache table:
├── Metadata (relational): cache_key, version, etag, timestamps
├── Raw Data (JSON): Complete API response for flexibility
└── Indexes: Fast lookups by key, game system, type

opr_cache_history table:
├── Archive old versions when updated
├── Allow fallback to older versions if needed
└── Keep for army list compatibility
```

## Admin Interface (Future)

### Cache Management Endpoints
```typescript
// Check cache status
GET /admin/cache/status
{
  "total_entries": 45,
  "game_systems": 8,
  "army_books": 32,
  "last_refresh": "2025-08-07T12:00:00Z",
  "stale_entries": 2
}

// Refresh specific cache
POST /admin/cache/refresh
{
  "type": "game_system", // or "army_book", "all"
  "slug": "grimdark-future" // optional
}

// Clear cache
DELETE /admin/cache/clear?pattern=game_system:*
```

## Integration Points

### Army Import Enhancement
```typescript
// In ArmyProcessor.processArmy()
async processArmy(armyForgeData: ArmyForgeArmy): Promise<ProcessedArmy> {
  // Ensure we have latest game system data
  const gameSystem = await cacheService.getGameSystem(armyForgeData.gameSystemSlug);
  
  // Check if army book data is needed for validation
  if (armyForgeData.armyBookId) {
    const armyBook = await cacheService.getArmyBook(
      armyForgeData.armyBookId, 
      armyForgeData.gameSystem
    );
  }
  
  // Process army with latest reference data
  return this.processWithReferenceData(armyForgeData, gameSystem, armyBook);
}
```

### Version Conflict Resolution
```typescript
// Handle version mismatches gracefully
if (armyListVersion > cachedVersion) {
  console.log(`Updating ${cacheKey} from v${cachedVersion} to v${armyListVersion}`);
  await cacheService.ensureVersion(cacheKey, armyListVersion);
}
```

## Performance Considerations

### HEAD Request Optimization
- Batch HEAD requests where possible
- Cache HEAD responses for short periods (5 minutes)
- Use conditional requests (If-None-Match, If-Modified-Since)
- Fail gracefully when OPR API is unavailable

### Database Performance
- Index on frequently queried fields (cache_key, game_system_slug)
- JSON column for flexibility without schema changes
- Regular VACUUM to maintain performance
- Consider partitioning history table by date

## Future Extensibility

### Multi-Game System Support
```typescript
interface GameSystemProvider {
  fetchArmyList(listId: string): Promise<any>;
  fetchGameSystemData(): Promise<any>;
  fetchFactionData(factionId: string): Promise<any>;
}

// OPR implementation
class OPRProvider implements GameSystemProvider { ... }

// Future: Warhammer 40K implementation
class GW40KProvider implements GameSystemProvider { ... }

// Future: Trench Crusade implementation  
class TrenchCrusadeProvider implements GameSystemProvider { ... }
```

### Cache Key Namespacing
```typescript
// Multi-provider cache keys
const cacheKey = `${provider}:${dataType}:${identifier}`;
// Examples:
// "opr:game_system:grimdark-future"
// "gw:codex:space_marines_10th"
// "tc:faction:heretic_legions"
```

---

*This intelligent caching system provides efficient, version-aware data management that scales from OPR-only to multi-game system support while maintaining performance and data consistency.*