# API Integrations

## ArmyForge API Integration

### Overview
ArmyForge is the primary external service for importing and managing OPR army lists. Users store their personal API tokens to access their private army lists.

### Authentication
- **User Token Storage**: Each user stores their personal ArmyForge API token
- **Token Security**: Encrypted storage in database, never logged or exposed
- **Token Validation**: Test token validity during user setup
- **Fallback Handling**: Graceful degradation when tokens are invalid/expired

### Current API Endpoints Used

#### 1. Army List Data
```
GET https://army-forge.onepagerules.com/api/tts?id={listId}
```
**Purpose**: Import complete army list with units, equipment, and calculations
**Headers**: 
- `Authorization: Bearer {userToken}`
**Response**: Complete army data structure (see existing JSON format)
**Usage**: 
- Initial army import
- Manual refresh/sync
- Validation of army changes

#### 2. Army Book Data  
```
GET https://army-forge.onepagerules.com/api/army-books/{factionId}?gameSystem={gameSystemId}
```
**Purpose**: Get faction rules, spells, and unit definitions
**Headers**: 
- `Authorization: Bearer {userToken}` (if needed)
**Response**: Faction-specific rules and unit catalog
**Usage**:
- Popover definitions
- Rule lookups
- Spell references

#### 3. Common Rules
```
GET https://army-forge.onepagerules.com/api/rules/common/{gameSystemId}
```
**Purpose**: Get universal game rules and traits
**Response**: Common rules definitions
**Usage**:
- Rule popover system
- Definition lookups
- Help system

### Integration Strategy

#### Caching Approach
```typescript
interface ArmyForgeCacheEntry {
  data: any;
  lastModified: string; // from Last-Modified header
  cachedAt: Date;
  expiresAt: Date;
}
```

**Cache Strategy**:
1. **Army Lists**: Cache with user-specific key, validate with HEAD requests
2. **Army Books**: Cache globally, check Last-Modified headers
3. **Common Rules**: Cache globally, long TTL (24 hours)
4. **Session Storage**: For immediate re-use, database for persistence

#### Sync Workflow
```typescript
interface ArmySyncResult {
  success: boolean;
  updated: boolean;
  lastSync: Date;
  errors?: string[];
  changes?: ArmyChange[];
}

interface ArmyChange {
  type: 'unit_added' | 'unit_removed' | 'unit_modified' | 'points_changed';
  unitId?: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}
```

**Sync Process**:
1. Compare local army data with ArmyForge response
2. Identify changes (units, points, equipment)
3. Notify user of significant changes
4. Update local army data
5. Preserve battle history and customizations

#### Error Handling

**API Error Types**:
- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: User doesn't own the army list
- **404 Not Found**: Army list deleted or moved
- **429 Rate Limited**: Too many requests
- **500 Server Error**: ArmyForge service issues

**Error Recovery**:
```typescript
interface ErrorRecoveryStrategy {
  retryCount: number;
  backoffMs: number;
  fallbackToCached: boolean;
  notifyUser: boolean;
  logError: boolean;
}

const ERROR_STRATEGIES = {
  401: { retryCount: 0, fallbackToCached: true, notifyUser: true },
  403: { retryCount: 0, fallbackToCached: true, notifyUser: true },
  404: { retryCount: 1, fallbackToCached: true, notifyUser: true },
  429: { retryCount: 3, backoffMs: 5000, fallbackToCached: true },
  500: { retryCount: 2, backoffMs: 2000, fallbackToCached: true }
};
```

### Rate Limiting & Performance

#### Request Patterns
- **Bulk Import**: When user first joins campaign (1-5 armies)
- **Periodic Sync**: Manual refresh by users (sporadic)
- **Background Sync**: Automated daily checks (optional)
- **Rules Lookup**: When viewing army details (cached heavily)

#### Rate Limiting Strategy
```typescript
interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstAllowance: number;
  perUserLimits: boolean;
}

const ARMYFORGE_LIMITS = {
  requestsPerMinute: 30,
  requestsPerHour: 500,
  burstAllowance: 10,
  perUserLimits: true
};
```

**Implementation**:
- Queue requests to respect rate limits
- Prioritize user-initiated requests over background syncs
- Batch multiple user requests when possible
- Implement exponential backoff for failures

### Data Transformation

#### Army List Processing
```typescript
interface ArmyForgeImport {
  rawData: ArmyForgeResponse;
  processedUnits: ProcessedUnit[];
  calculatedFields: {
    totalPoints: number;
    unitCount: number;
    modelCount: number;
    commandPoints: number;
  };
  metadata: {
    importedAt: Date;
    sourceVersion: string;
    gameSystem: number;
  };
}
```

**Processing Steps**:
1. Validate response structure
2. Extract unit and model data
3. Calculate HP values from Tough ratings
4. Generate unique IDs for battle tracking
5. Preserve original ArmyForge IDs for sync
6. Calculate command points and underdog values

#### Conflict Resolution
When ArmyForge data differs from local modifications:

```typescript
interface ConflictResolution {
  type: 'merge' | 'replace' | 'user_choice';
  preserveCustomizations: boolean;
  preserveBattleHistory: boolean;
  notifyUser: boolean;
}

const CONFLICT_RULES = {
  unitRemoved: { type: 'user_choice', preserveBattleHistory: true },
  pointsChanged: { type: 'replace', notifyUser: true },
  equipmentChanged: { type: 'merge', preserveCustomizations: true },
  modelCountChanged: { type: 'user_choice', preserveBattleHistory: true }
};
```

### Security Considerations

#### Token Management
- **Encryption**: AES-256 encryption for stored tokens
- **Access Control**: Tokens only accessible by token owner
- **Audit Logging**: Log token usage without exposing values
- **Rotation**: Support token refresh/replacement

#### Request Security
- **HTTPS Only**: All ArmyForge requests over TLS
- **Token Validation**: Verify token format before use
- **Input Sanitization**: Clean all imported data
- **Response Validation**: Schema validation for API responses

### Monitoring & Analytics

#### Success Metrics
- **Sync Success Rate**: Percentage of successful army syncs
- **API Response Times**: ArmyForge API performance tracking
- **Cache Hit Rate**: Effectiveness of caching strategy
- **User Adoption**: Percentage of users with valid tokens

#### Error Tracking
```typescript
interface APIErrorLog {
  timestamp: Date;
  userId: string;
  endpoint: string;
  errorCode: number;
  errorMessage: string;
  retryCount: number;
  resolution: 'cached' | 'retry' | 'failed';
}
```

**Alert Triggers**:
- Error rate > 10% over 15 minutes
- ArmyForge API unavailable for > 5 minutes
- Multiple users reporting same error
- Cache hit rate < 80%

### Future Considerations

#### Additional Endpoints
- **User Army Lists**: Get list of user's armies
- **Faction Browsing**: Public faction data for army building
- **Version History**: Track army list changes over time
- **Shared Lists**: Support for public army lists

#### Alternative Data Sources
- **Local Army Builder**: Offline army creation tools
- **CSV Import**: Basic unit data import
- **Manual Entry**: Simple unit creation interface
- **Third-party Tools**: Integration with other OPR tools

#### API Versioning
- **Version Detection**: Identify ArmyForge API version changes
- **Backward Compatibility**: Support multiple API versions
- **Migration Strategy**: Smooth transitions between versions
- **Feature Flags**: Enable/disable features based on API support