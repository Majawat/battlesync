# BattleSync Data Models Documentation

This document provides comprehensive documentation of all data models used in the BattleSync application, with special focus on the OPR Army Conversion system.

## Table of Contents
- [Overview](#overview)
- [Database Schema](#database-schema)
- [OPR Battle System](#opr-battle-system)
- [Army Conversion Process](#army-conversion-process)
- [Unit Type Examples](#unit-type-examples)
- [API Data Flow](#api-data-flow)

## Overview

BattleSync uses a hybrid data storage approach:
- **Structured data** in PostgreSQL for user accounts, groups, campaigns
- **Flexible JSON storage** for army data to handle complex OPR army structures
- **TypeScript interfaces** for type safety and development experience

## Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY,
  username        VARCHAR UNIQUE NOT NULL,
  email           VARCHAR UNIQUE,
  password_hash   VARCHAR NOT NULL,
  role            USER_ROLE DEFAULT 'USER',
  army_forge_token VARCHAR, -- Encrypted
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  last_login      TIMESTAMP
);
```

#### Gaming Groups
```sql
CREATE TABLE gaming_groups (
  id          UUID PRIMARY KEY,
  name        VARCHAR NOT NULL,
  description TEXT,
  owner_id    UUID REFERENCES users(id),
  invite_code VARCHAR UNIQUE NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

#### Campaigns
```sql
CREATE TABLE campaigns (
  id          UUID PRIMARY KEY,
  group_id    UUID REFERENCES gaming_groups(id),
  name        VARCHAR NOT NULL,
  description TEXT,
  narrative   TEXT,
  status      CAMPAIGN_STATUS DEFAULT 'PLANNING',
  settings    JSONB NOT NULL, -- CampaignSettings
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

#### Armies (Core Army Storage)
```sql
CREATE TABLE armies (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id),
  campaign_id    UUID REFERENCES campaigns(id),
  army_forge_id  VARCHAR NOT NULL,
  name           VARCHAR NOT NULL,
  faction        VARCHAR NOT NULL,
  points         INTEGER NOT NULL,
  army_data      JSONB NOT NULL, -- OPRBattleArmy (converted data)
  customizations JSONB,           -- ArmyCustomizations
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);
```

### Enums

```typescript
enum UserRole {
  SERVER_OWNER = "SERVER_OWNER",
  GROUP_ADMIN = "GROUP_ADMIN", 
  MEMBER = "MEMBER"
}

enum CampaignStatus {
  PLANNING = "PLANNING",
  ACTIVE = "ACTIVE", 
  COMPLETED = "COMPLETED",
  ON_HOLD = "ON_HOLD"
}

enum GroupMemberRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
}
```

## OPR Battle System

### Core Battle Types

#### OPRBattleArmy (Root Army Container)
```typescript
interface OPRBattleArmy {
  userId: string;                    // Owner of this army
  armyId: string;                    // Database army ID
  armyName: string;                  // Display name
  faction: string;                   // "Human Defense Force", etc.
  totalPoints: number;               // Army point value
  maxCommandPoints: number;          // 1 per 100 points
  currentCommandPoints: number;      // Spent during battle
  maxUnderdogPoints: number;         // Campaign setting
  currentUnderdogPoints: number;     // Gained during battle
  selectedDoctrine?: string;         // Army-wide special rule
  units: OPRBattleUnit[];           // ← All army units
  killCount: number;                // Total army kills
}
```

#### OPRBattleUnit (Individual Unit)
```typescript
interface OPRBattleUnit {
  unitId: string;                   // Unique unit identifier
  name: string;                     // "Infantry Squad", "Grinder Truck"
  customName?: string;              // User-assigned name
  type: OPRUnitType;               // STANDARD | JOINED | COMBINED
  originalSize: number;             // Starting model count
  currentSize: number;              // Current models alive
  
  // Battle State Tracking
  action: 'hold' | 'advance' | 'rush' | 'charge' | null;
  fatigued: boolean;                // Unit activated this turn
  shaken: boolean;                  // Failed morale test
  routed: boolean;                  // Unit fleeing
  kills: number;                    // Kills made by this unit
  killedBy?: string;                // Unit ID that destroyed this unit
  
  // Unit Composition
  models: OPRBattleModel[];         // ← Individual models
  weaponSummary: OPRWeaponSummary[]; // Unit-level weapon overview
  
  // Special Unit Types
  joinedHero?: OPRBattleModel;      // Hero model (JOINED units only)
  isCombined: boolean;              // True for COMBINED units
  combinedFrom?: string[];          // Original unit IDs if combined
  
  // Data Source
  sourceUnit: ArmyForgeUnit;        // Original ArmyForge data
}
```

#### OPRBattleModel (Individual Model/Figure)
```typescript
interface OPRBattleModel {
  modelId: string;                  // Unique model identifier
  name: string;                     // "Infantry Squad Model 1"
  customName?: string;              // User-assigned name
  isHero: boolean;                  // Hero character flag
  
  // Model Statistics
  maxTough: number;                 // Maximum wounds/health
  currentTough: number;             // Current wounds/health
  quality: number;                  // Skill level (3+ = veteran, 5+ = rookie)
  defense: number;                  // Armor save (3+ = heavy, 5+ = light)
  
  // Battle State
  casterTokens: number;             // Spell casting tokens
  isDestroyed: boolean;             // Model eliminated
  
  // Equipment & Abilities
  weapons: string[];                // Individual model weapons
  specialRules: string[];           // Model-specific special rules
}
```

#### OPRWeaponSummary (Unit Weapon Overview)
```typescript
interface OPRWeaponSummary {
  name: string;                     // Weapon name "Rifle"
  count: number;                    // Number of weapons "8"
  range?: number | string;          // Weapon range "24"
  attacks?: number | string;        // Number of attacks "1"
  specialRules: string[];           // ["AP(1)", "Reliable"]
  label: string;                    // Display format "8x Rifle (24\", A1)"
}
```

### Unit Types Explained

#### STANDARD Units
- Single unit from ArmyForge
- Models created from unit size and stats
- Most common unit type

#### COMBINED Units  
- Two identical units with different loadouts merged
- OPR rule: max 2 units of same profile can be combined
- Models maintain individual weapons and upgrades
- Weapon counts are summed in weaponSummary

#### JOINED Units
- Hero (Tough ≤ 6) joined to multi-model unit
- Hero stored separately in `joinedHero` field
- Hero weapons kept separate from unit weapons
- Unit size includes hero (+1 to originalSize)

## Army Conversion Process

### Input: ArmyForge Data
```typescript
interface ArmyForgeUnit {
  id: string;
  name: string;
  size: number;                     // Model count
  quality: number;                  // Base quality
  defense: number;                  // Base defense
  rules: ArmyForgeRule[];          // Base special rules
  weapons: ArmyForgeWeapon[];      // Base weapons
  loadout: ArmyForgeItem[];        // Final equipment after upgrades
  selectedUpgrades: UpgradeSelection[]; // Applied upgrades
  traits: string[];                // Campaign traits (XP bonuses)
  combined: boolean;               // Mark for combination
  joinToUnit: string;              // Hero joining target
  // ... other ArmyForge fields
}
```

### Conversion Steps

1. **Basic Conversion**: `convertUnitToBattle()`
   - Create base OPRBattleUnit structure
   - Generate individual models
   - Calculate effective stats (including upgrades)

2. **Weapon Distribution**: `distributeWeaponsToModel()`
   - Universal weapons → all models
   - Upgrade weapons → sequential distribution
   - Handles partial upgrades (5 plasma rifles for 10-model unit)

3. **Rule Processing**: `getEffectiveRules()`
   - Merge base rules + loadout rules + upgrade rules
   - Handle additive rules (Impact values combine)
   - Distribute counted rules to specific models

4. **Combined Unit Processing**: `processCombinedUnits()`
   - Group units by name
   - Merge models with unique IDs
   - Combine weapon summaries

5. **Hero Joining**: `processJoinedUnits()`
   - Validate hero join conditions
   - Create joinedHero model
   - Combine weapon summaries while keeping hero weapons separate

### Output: Battle-Ready Data
```typescript
interface ArmyConversionResult {
  success: boolean;
  army: OPRBattleArmy;             // Converted battle data
  warnings: string[];              // Non-critical issues
  errors: string[];                // Critical problems
}
```

## Unit Type Examples

### Example 1: STANDARD Unit (Grinder Truck)
```json
{
  "unitId": "q6fx4lG",
  "name": "Grinder Truck", 
  "customName": "Grindr Love Truck",
  "type": "STANDARD",
  "originalSize": 1,
  "currentSize": 1,
  "models": [
    {
      "modelId": "q6fx4lG_model_0",
      "name": "Grinder Truck Model 1",
      "isHero": false,
      "maxTough": 9,
      "currentTough": 9,
      "quality": 4,
      "defense": 2,
      "weapons": [
        "Heavy Machinegun (30\", A3, AP(1))",
        "Heavy Quake Cannon (24\", A2, Blast(3), Rending)"
      ],
      "specialRules": [
        "Fast", "Impact(8)", "Strider", "Tough(9)", "Transport(6)", "Agile"
      ]
    }
  ],
  "weaponSummary": [
    {
      "name": "Heavy Machinegun",
      "count": 1,
      "range": 30,
      "attacks": 3,
      "specialRules": ["AP(1)"],
      "label": "Heavy Machinegun (30\", A3, AP(1))"
    },
    {
      "name": "Heavy Quake Cannon", 
      "count": 1,
      "range": 24,
      "attacks": 2,
      "specialRules": ["Blast(3)", "Rending"],
      "label": "Heavy Quake Cannon (24\", A2, Blast(3), Rending)"
    }
  ],
  "isCombined": false
}
```

### Example 2: JOINED Unit (Minions + Mrs. Bitchtits)
```json
{
  "unitId": "t2ehUmj",
  "name": "Minions",
  "type": "JOINED", 
  "originalSize": 11,  // 10 minions + 1 hero
  "currentSize": 11,
  "models": [
    {
      "modelId": "t2ehUmj_model_0",
      "name": "Minions Model 1", 
      "isHero": false,
      "maxTough": 1,
      "currentTough": 1,
      "quality": 5,
      "defense": 5,
      "weapons": ["Rifle (24\", A1)", "CCW (A1)"],
      "specialRules": []
    },
    // ... 9 more minion models
  ],
  "joinedHero": {
    "modelId": "W-crN7f_model_0",
    "name": "Mrs. Bitchtits",
    "isHero": true,
    "maxTough": 6,  // 3 base + 3 from combat bike
    "currentTough": 6,
    "quality": 4,
    "defense": 4,
    "weapons": ["CCW (A2)", "Twin Heavy Rifle (24\", A2, AP(1))"],
    "specialRules": [
      "Celestial Veteran", "Devout", "Hero", "Tough(6)", 
      "Shield Wall", "Caster(2)", "Fast"
    ]
  },
  "weaponSummary": [
    // Regular unit weapons
    {"name": "Rifle", "count": 8, "label": "8x Rifle (24\", A1)"},
    {"name": "CCW", "count": 10, "label": "10x CCW (A1)"},
    {"name": "Flamer", "count": 1, "label": "Flamer (12\", A1, Blast(3), Reliable)"},
    {"name": "Drum Rifle", "count": 1, "label": "Drum Rifle (18\", A2, Rending)"},
    // Hero weapons (kept separate)
    {"name": "CCW", "count": 1, "label": "CCW (A2)"},
    {"name": "Twin Heavy Rifle", "count": 1, "label": "Twin Heavy Rifle (24\", A2, AP(1))"}
  ],
  "isCombined": false
}
```

### Example 3: COMBINED Unit (Infantry Squad)
```json
{
  "unitId": "combined__nbz3zj__nbz3zj",
  "name": "Infantry Squad",
  "type": "COMBINED",
  "originalSize": 20,  // 10 + 10 models combined
  "currentSize": 20,
  "models": [
    {
      "modelId": "combined__nbz3zj__nbz3zj_model_0",
      "name": "Infantry Squad Model 1",
      "isHero": false,
      "maxTough": 4,  // 1 base + 3 from Crew upgrade
      "currentTough": 4,
      "quality": 5,
      "defense": 5,
      "weapons": ["Rifle (24\", A1)", "CCW (A1)"],
      "specialRules": ["Tough(3)", "Field Radio", "Company Standard"]
    },
    {
      "modelId": "combined__nbz3zj__nbz3zj_model_1", 
      "name": "Infantry Squad Model 2",
      "isHero": false,
      "maxTough": 1,  // Base tough only
      "currentTough": 1,
      "quality": 5,
      "defense": 5,
      "weapons": ["Rifle (24\", A1)", "CCW (A1)"],
      "specialRules": ["Field Radio", "Company Standard"]
    },
    // ... 18 more models with varying tough and special rules
  ],
  "weaponSummary": [
    {
      "name": "Rifle",
      "count": 18,  // Combined count from both units
      "label": "18x Rifle (24\", A1)"
    },
    {
      "name": "CCW", 
      "count": 20,  // All models have CCW
      "label": "20x CCW (A1)"
    },
    {
      "name": "Plasma Rifle",
      "count": 2,   // 1 from each original unit
      "label": "2x Plasma Rifle (18\", A2, AP(1))"
    }
  ],
  "isCombined": true,
  "combinedFrom": ["_nbz3zj", "_nbz3zj"]  // Original unit IDs
}
```

## API Data Flow

### Import Flow
```
ArmyForge API → Raw ArmyForge Data → OPRArmyConverter → OPRBattleArmy → Database
```

### Sync Flow  
```
Database → Existing Army → ArmyForge API → New Data → OPRArmyConverter → Updated Army → Database
```

### Battle Flow
```
Database → OPRBattleArmy → Battle State → WebSocket Updates → Frontend
```

### Data Access Patterns

#### Army Import
```typescript
POST /api/armies/import
{
  "armyForgeId": "IJ1JM_m-jmka",
  "customName": "My Epic Army",
  "campaignId": "uuid"
}
```

#### Army Retrieval
```typescript
GET /api/armies/{armyId}
Response: {
  id: "uuid",
  name: "Army Name", 
  faction: "Human Defense Force",
  points: 2430,
  armyData: OPRBattleArmy, // ← Converted battle data
  customizations: {...}
}
```

#### Battle Creation
```typescript
POST /api/missions/{missionId}/battles
{
  "participantArmies": ["armyId1", "armyId2"]
}
```

## Key Design Decisions

### Why JSON Storage for Army Data?
- **Flexibility**: OPR army structures are complex and varied
- **Performance**: Single query retrieves complete army
- **Type Safety**: TypeScript interfaces provide compile-time checking
- **ArmyForge Compatibility**: Direct mapping from external API

### Why Individual Model Tracking?
- **Battle Accuracy**: Each model can take wounds independently  
- **Rule Application**: Some rules affect specific models
- **User Experience**: Visual representation of army state
- **Campaign Progression**: Individual model experience/upgrades

### Why Three Unit Types?
- **OPR Rules Compliance**: Reflects actual game mechanics
- **Data Integrity**: Clear distinction between unit configurations
- **Battle Logic**: Different types behave differently in combat
- **User Understanding**: Matches player mental model

## Storage Considerations

### Database Size
- Average army: ~50-100KB JSON
- Large armies (40+ units): ~200-500KB JSON
- PostgreSQL JSONB provides compression and indexing

### Query Performance
- Army retrieval: Single row lookup (fast)
- Army search: JSONB path queries on faction, points
- Battle updates: Atomic JSON updates

### Backup & Migration
- JSON data is portable across systems
- TypeScript interfaces ensure data structure consistency
- Conversion logic can be replayed for data migration

## Battle Events & Real-Time System

### Battle Events
```typescript
interface OPRBattleEvent {
  id: string;
  timestamp: Date;
  round: number;
  phase: OPRBattlePhase;
  userId: string;
  eventType: OPRBattleEventType;
  data: OPRBattleEventData;
}

type OPRBattleEventType = 
  | 'BATTLE_STARTED'
  | 'PHASE_CHANGED'
  | 'ROUND_STARTED'
  | 'UNIT_ACTIVATED'
  | 'DAMAGE_APPLIED'
  | 'MODEL_DESTROYED'
  | 'UNIT_DESTROYED'
  | 'UNIT_SHAKEN'
  | 'UNIT_ROUTED'
  | 'MORALE_TEST'
  | 'COMMAND_POINTS_SPENT'
  | 'UNDERDOG_POINTS_GAINED'
  | 'KILL_RECORDED'
  | 'BATTLE_ENDED'
  | 'EXPERIENCE_AWARDED';
```

### WebSocket Communication
```typescript
// WebSocket room structure
const rooms = {
  'groups:${groupId}': GroupRoom,
  'campaigns:${campaignId}': CampaignRoom,
  'battles:${battleId}': BattleRoom
};

// Battle room events
interface BattleRoomEvent {
  type: 'join-room' | 'leave-room' | 'battle-update' | 'notification';
  battleId: string;
  userId: string;
  data: any;
}
```

## Campaign Settings & Customizations

### Campaign Settings
```typescript
interface CampaignSettings {
  pointsLimit: number;              // 100-10,000
  gameSystem: string;               // "grimdark-future", "age-of-fantasy"
  experiencePerWin: number;         // XP for winning
  experiencePerLoss: number;        // XP for losing  
  experiencePerKill: number;        // XP per model killed
  allowMultipleArmies: boolean;     // Multiple armies per player
  requireArmyForgeIntegration: boolean;
  customRules: string[];            // Campaign-specific rules
}
```

### Army Customizations
```typescript
interface ArmyCustomizations {
  name?: string;                    // Custom army name
  notes: string;                    // Player notes
  battleHonors: BattleHonor[];      // Earned honors
  experience: {
    totalBattles: number;
    victories: number;
    defeats: number;
    experiencePoints: number;
    veteranUpgrades: VeteranUpgrade[];
  };
  customRules: string[];            // Army-specific rules
  tags: string[];                   // Organization tags
}
```

## Future Enhancements

### Planned Additions
- Real-time battle state synchronization
- Advanced weapon special rule processing  
- Campaign experience and veteran upgrades
- Army composition validation
- Battle replay system

### Extensibility
- Additional game systems (Age of Fantasy, etc.)
- Custom army builders integration
- Tournament management features
- Mobile app data synchronization

---

*This documentation reflects the current implementation as of the latest OPR Army Conversion system updates. For the most current API endpoints and data structures, refer to the TypeScript interface definitions in `/src/types/`.*