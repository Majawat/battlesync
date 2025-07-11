# Data Models ✅ IMPLEMENTED

## User Management ✅

### User ✅ IMPLEMENTED
```typescript
interface User {
  id: string;              // ✅ UUID primary key
  username: string;        // ✅ Unique username
  email: string;           // ✅ User email address
  passwordHash: string;    // ✅ bcrypt hashed password
  role: UserRole;          // ✅ SERVER_OWNER | USER
  isActive: boolean;       // ✅ Account status
  createdAt: Date;         // ✅ Account creation timestamp
  updatedAt: Date;         // ✅ Last update timestamp
  
  // Relationships ✅
  groupMemberships: GroupMembership[];  // ✅ Gaming groups user belongs to
  campaignMemberships: CampaignMembership[]; // ✅ Campaigns user joined
  armies: Army[];                       // ✅ User's imported armies
  createdGroups: GamingGroup[];         // ✅ Groups owned by user
}

enum UserRole {
  SERVER_OWNER = 'SERVER_OWNER',  // ✅ Full system access
  USER = 'USER'                   // ✅ Standard user access
}
```

### Gaming Group
```typescript
interface GamingGroup {
  id: string;
  name: string;
  description?: string;
  ownerId: string; // User.id
  inviteCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  owner: User;
  memberships: GroupMembership[];
  campaigns: Campaign[];
}
```

### Group Membership
```typescript
interface GroupMembership {
  id: string;
  userId: string;
  groupId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  
  // Relationships
  user: User;
  group: GamingGroup;
}
```

## Campaign Management

### Campaign
```typescript
interface Campaign {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  narrative?: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  settings: CampaignSettings;
  createdBy: string; // User.id
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  group: GamingGroup;
  creator: User;
  memberships: CampaignMembership[];
  battles: Battle[];
  missions: Mission[];
}
```

### Campaign Settings
```typescript
interface CampaignSettings {
  pointLimit: number;
  underdogBonus: boolean;
  commandPointsRule: 'standard' | 'custom';
  customRules?: string[];
  allowArmyModifications: boolean;
  experienceMultiplier: number;
  battleRounds: {
    minimum: number;
    recommended: number;
  };
}
```

### Campaign Membership
```typescript
interface CampaignMembership {
  id: string;
  userId: string;
  campaignId: string;
  primaryArmyId?: string;
  joinedAt: Date;
  totalExperience: number;
  battlesWon: number;
  battlesLost: number;
  
  // Relationships
  user: User;
  campaign: Campaign;
  armies: Army[];
}
```

## Army Management

### Army
```typescript
interface Army {
  id: string;
  userId: string;
  campaignId?: string;
  armyForgeId: string;
  name: string;
  faction: string;
  points: number;
  armyData: ArmyForgeData; // JSONB storage
  customizations?: ArmyCustomizations;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  user: User;
  campaign?: Campaign;
  battleParticipations: BattleParticipant[];
}
```

### ArmyForge Data (imported JSON)
```typescript
interface ArmyForgeData {
  id: string;
  name: string;
  faction: string;
  gameSystem: number;
  points: number;
  units: ArmyForgeUnit[];
  upgrades: ArmyForgeUpgrade[];
  meta: {
    version: string;
    lastModified: string;
  };
}

interface ArmyForgeUnit {
  id: string;
  name: string;
  size: number;
  quality: number;
  defense: number;
  tough?: number;
  equipment: ArmyForgeWeapon[];
  specialRules: string[];
  cost: number;
  models: ArmyForgeModel[];
}

interface ArmyForgeModel {
  id: string;
  name: string;
  quality: number;
  defense: number;
  tough?: number;
  equipment: string[];
  specialRules: string[];
  maxHp: number; // calculated from tough value
}
```

### Army Customizations
```typescript
interface ArmyCustomizations {
  unitNicknames: { [unitId: string]: string };
  modelNames: { [modelId: string]: string };
  notes: string;
  battleHonors: BattleHonor[];
}

interface BattleHonor {
  id: string;
  name: string;
  description: string;
  earnedInBattle: string; // Battle.id
  appliedToUnit?: string; // Unit.id
}
```

## Battle System

### Battle
```typescript
interface Battle {
  id: string;
  campaignId: string;
  missionId: string;
  status: 'setup' | 'active' | 'completed' | 'cancelled';
  participants: BattleParticipant[];
  currentState: BattleState;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  campaign: Campaign;
  mission: Mission;
  events: BattleEvent[];
}
```

### Battle Participant
```typescript
interface BattleParticipant {
  id: string;
  battleId: string;
  userId: string;
  armyId: string;
  faction: string;
  startingPoints: number;
  finalExperience: number;
  kills: number;
  unitsLost: number;
  isWinner: boolean;
  
  // Relationships
  battle: Battle;
  user: User;
  army: Army;
}
```

### Battle State (real-time)
```typescript
interface BattleState {
  round: number;
  phase: 'deployment' | 'battle' | 'cleanup';
  units: { [unitId: string]: BattleUnit };
  participants: { [userId: string]: ParticipantState };
  lastUpdated: Date;
  version: number; // for conflict resolution
}

interface BattleUnit {
  id: string;
  armyForgeUnitId: string;
  ownerId: string; // User.id
  name: string;
  models: { [modelId: string]: BattleModel };
  status: 'active' | 'shaken' | 'routed' | 'destroyed';
  kills: number;
  lastModified: Date;
  modifiedBy: string; // User.id
}

interface BattleModel {
  id: string;
  armyForgeModelId: string;
  name?: string;
  maxHp: number;
  currentHp: number;
  status: 'alive' | 'wounded' | 'dead';
  lastModified: Date;
}

interface ParticipantState {
  userId: string;
  commandPoints: number;
  maxCommandPoints: number;
  spellTokens: number;
  underdogPoints: number;
  connected: boolean;
  lastSeen: Date;
}
```

### Battle Event (audit log)
```typescript
interface BattleEvent {
  id: string;
  battleId: string;
  userId: string;
  eventType: BattleEventType;
  timestamp: Date;
  data: any; // JSONB for flexible event data
  
  // Relationships
  battle: Battle;
  user: User;
}

type BattleEventType = 
  | 'battle_started'
  | 'battle_ended'
  | 'player_joined'
  | 'player_left'
  | 'unit_damaged'
  | 'unit_killed'
  | 'unit_status_changed'
  | 'spell_cast'
  | 'command_used'
  | 'admin_override';
```

## Mission System

### Mission
```typescript
interface Mission {
  id: string;
  campaignId: string;
  number: number;
  title: string;
  description: string;
  points: number;
  status: 'upcoming' | 'active' | 'completed';
  scheduledDate?: Date;
  objectives: MissionObjective[];
  specialRules: MissionRule[];
  terrainSuggestions: TerrainFeature[];
  battleReportFile?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  campaign: Campaign;
  battles: Battle[];
}
```

### Mission Objective
```typescript
interface MissionObjective {
  id: string;
  type: 'primary' | 'secondary';
  name: string;
  description: string;
  points: number;
  conditions: string;
}
```

### Mission Rule
```typescript
interface MissionRule {
  id: string;
  name: string;
  description: string;
  phase: 'deployment' | 'all_game' | 'end_game';
}
```

### Terrain Feature
```typescript
interface TerrainFeature {
  id: string;
  name: string;
  description: string;
  rules: string;
  suggested: boolean;
}
```

## Static Game Data (JSON Files)

### Doctrines
```typescript
interface DoctrinesData {
  doctrines: Doctrine[];
  lastUpdated: string;
}

interface Doctrine {
  name: string;
  faction: string;
  description: string;
  rules: string[];
  cost: number;
}
```

### Definitions (Rules/Traits)
```typescript
interface DefinitionsData {
  rules: Definition[];
  traits: Definition[];
  lastUpdated: string;
}

interface Definition {
  name: string;
  description: string;
  category: 'Rules' | 'Traits';
  source: 'Common' | 'Custom' | string; // faction name
}
```

### Random Events
```typescript
interface RandomEventsData {
  events: RandomEvent[];
  lastUpdated: string;
}

interface RandomEvent {
  id: number;
  name: string;
  description: string;
  effect: string;
  phase: 'pre_battle' | 'during_battle' | 'post_battle';
}
```

## Database Relationships Summary

```
Users
├── GamingGroups (owner)
├── GroupMemberships
├── CampaignMemberships
├── Armies
└── BattleEvents

GamingGroups
├── GroupMemberships
├── Campaigns
└── Users (via memberships)

Campaigns
├── CampaignMemberships
├── Battles
├── Missions
└── Armies (via memberships)

Armies
├── BattleParticipants
└── Campaign (optional)

Battles
├── BattleParticipants
├── BattleEvents
└── Mission

Missions
└── Battles
```

## Data Migration Strategy

### From Current JSON Structure
1. Import existing campaign data as seed campaigns
2. Convert army state data to new battle state format
3. Preserve mission definitions and rules
4. Maintain backward compatibility for exports

### ArmyForge Integration
1. Store raw ArmyForge response in `armyData` JSONB field
2. Extract calculated fields (points, unit count) for queries
3. Maintain sync timestamps for cache invalidation
4. Handle API errors gracefully with cached data fallbacks