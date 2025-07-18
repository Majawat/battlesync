export interface Army {
  id: string;
  userId: string;
  campaignId: string | null;
  armyForgeId: string | null;
  name: string;
  faction: string;
  points: number;
  armyData: ArmyForgeData | null;
  customizations: ArmyCustomizations;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArmyForgeData {
  id: string;
  name: string;
  faction: string;
  gameSystem: string;
  points: number;
  units: ArmyForgeUnit[];
  specialRules: ArmyForgeRule[];
  metadata: {
    version: string;
    lastModified: string;
    createdBy: string;
  };
}

export interface ArmyForgeUnit {
  id: string;
  name: string;
  customName?: string;
  type?: 'HERO' | 'UNIT' | 'VEHICLE' | 'SUPPORT';
  size: number;
  quality?: number;
  defense?: number;
  models?: ArmyForgeModel[];
  weapons?: ArmyForgeWeapon[];
  rules?: ArmyForgeRule[];
  specialRules?: string[];
  cost: number;
  maxCount?: number;
  minCount?: number;
}

export interface ArmyForgeModel {
  id: string;
  name: string;
  count: number;
  stats: ModelStats;
  equipment: string[];
  cost: number;
}

export interface ModelStats {
  quality: number;
  defense: number;
  wounds?: number;
  move?: number;
  special?: string[];
}

export interface ArmyForgeWeapon {
  id: string;
  name: string;
  label?: string;
  range?: number | string;
  attacks?: number | string;
  special?: string[];
  cost?: number;
}

export interface ArmyForgeRule {
  id: string;
  name: string;
  label?: string;
  description?: string;
  type?: 'ARMY' | 'UNIT' | 'MODEL' | 'WEAPON';
}

export interface ArmyCustomizations {
  name?: string;
  notes?: string;
  battleHonors: BattleHonor[];
  experience: ArmyExperience;
  customRules: CustomRule[];
  tags: string[];
}

export interface BattleHonor {
  id: string;
  name: string;
  description: string;
  effect: string;
  dateEarned: string;
  battleId?: string;
  missionId?: string;
}

export interface ArmyExperience {
  totalBattles: number;
  victories: number;
  defeats: number;
  experiencePoints: number;
  veteranUpgrades: VeteranUpgrade[];
}

export interface VeteranUpgrade {
  id: string;
  unitId: string;
  unitName: string;
  upgradeName: string;
  upgradeEffect: string;
  cost: number;
  dateAcquired: string;
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  effect: string;
  type: 'HOUSE_RULE' | 'CAMPAIGN_RULE' | 'VETERAN_SKILL';
  isActive: boolean;
}

// Request Types
export interface ArmyImportRequest {
  armyForgeId: string;
  campaignId?: string;
  customName?: string;
}

export interface ArmyImportResponse {
  army: Army;
  warnings: string[];
  errors: string[];
}

export interface ArmySyncRequest {
  forceSync?: boolean;
  preserveCustomizations?: boolean;
}

export interface ArmySyncResult {
  success: boolean;
  changes: ArmyChange[];
  conflicts: ArmyConflict[];
  lastSyncedAt: string;
}

export interface ArmyChange {
  type: 'ADDED' | 'MODIFIED' | 'REMOVED';
  category: 'UNIT' | 'WEAPON' | 'RULE' | 'METADATA';
  itemId: string;
  itemName: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

export interface ArmyConflict {
  type: 'CUSTOMIZATION_CONFLICT' | 'POINTS_MISMATCH' | 'INVALID_UNIT';
  description: string;
  itemId: string;
  itemName: string;
  suggestedResolution: string;
}

export interface UpdateArmyCustomizationsRequest {
  name?: string;
  notes?: string;
  battleHonors?: BattleHonor[];
  experiencePoints?: number;
  veteranUpgrades?: VeteranUpgrade[];
  customRules?: CustomRule[];
  tags?: string[];
}

export interface ArmySummary {
  id: string;
  name: string;
  faction: string;
  points: number;
  unitCount: number;
  lastSyncedAt: string | null;
  hasCustomizations: boolean;
  campaignId: string | null;
  experiencePoints: number;
  battlesPlayed: number;
  userId?: string; // For battle setup
  username?: string; // For battle setup
}

export interface ArmyStatistics {
  totalArmies: number;
  armiesByCampaign: Record<string, number>;
  armiesByFaction: Record<string, number>;
  armiesByGameSystem: Record<string, number>;
  averagePoints: number;
  totalBattles: number;
  syncedArmies: number;
  customArmies: number;
}

export interface ArmyValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  pointsTotal: number;
  unitCounts: Record<string, number>;
}

export interface ValidationError {
  type: 'POINTS_EXCEEDED' | 'INVALID_UNIT' | 'MISSING_REQUIRED' | 'DUPLICATE_UNIQUE';
  message: string;
  unitId?: string;
  ruleId?: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationWarning {
  type: 'SUBOPTIMAL_LOADOUT' | 'UNSPENT_POINTS' | 'UNTESTED_COMBINATION';
  message: string;
  suggestion?: string;
  unitId?: string;
}

export interface ArmyForgeStatus {
  connected: boolean;
  username?: string;
  expiresAt?: string;
  apiStatus?: 'healthy' | 'degraded' | 'down';
  apiResponseTime?: number;
  message?: string;
}