import { ArmyForgeData, ArmyForgeUnit } from './army';

// OPR-Specific Battle Phases
export type OPRBattlePhase = 'GAME_SETUP' | 'DEPLOYMENT' | 'BATTLE_ROUNDS' | 'GAME_END';

// OPR Unit Types
export type OPRUnitType = 'STANDARD' | 'JOINED' | 'COMBINED';

// Extended Battle State for OPR Games
export interface OPRBattleState {
  battleId: string;
  status: 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  phase: OPRBattlePhase;
  currentRound: number;
  currentPlayer?: string; // Player whose turn it is
  armies: OPRBattleArmy[];
  events: OPRBattleEvent[];
  gameSettings: OPRGameSettings;
}

export interface OPRGameSettings {
  gameSystem: string; // 'grimdark-future', 'age-of-fantasy', etc.
  pointsLimit: number;
  timeLimit?: number; // minutes
  allowUnderdog: boolean;
  customRules: string[];
}

export interface OPRBattleArmy {
  userId: string;
  armyId: string;
  armyName: string;
  faction: string;
  totalPoints: number;
  maxCommandPoints: number;
  currentCommandPoints: number;
  maxUnderdogPoints: number;
  currentUnderdogPoints: number;
  selectedDoctrine?: string;
  units: OPRBattleUnit[];
  killCount: number; // Total kills made by this army
}

export interface OPRBattleUnit {
  unitId: string;
  name: string;
  customName?: string;
  type: OPRUnitType;
  originalSize: number; // Starting model count
  currentSize: number; // Current model count
  
  // Unit-level state
  action: 'hold' | 'advance' | 'rush' | 'charge' | null;
  fatigued: boolean;
  shaken: boolean;
  routed: boolean;
  
  // Combat tracking
  kills: number; // Kills made by this unit
  killedBy?: string; // Unit ID that destroyed this unit
  
  // Model composition
  models: OPRBattleModel[];
  
  // Weapon summary for unit
  weaponSummary: OPRWeaponSummary[];
  
  // Hero joining logic
  joinedHero?: OPRBattleModel; // If this is a JOINED unit
  
  // Combined unit tracking
  isCombined: boolean;
  combinedFrom?: string[]; // Original unit IDs if combined
  
  // Original ArmyForge data reference
  sourceUnit: ArmyForgeUnit;
}

export interface OPRWeaponSummary {
  name: string;
  count: number;
  range?: number | string;
  attacks?: number | string;
  specialRules: string[];
  label: string;
}

export interface OPRBattleModel {
  modelId: string;
  name: string;
  customName?: string;
  isHero: boolean;
  
  // Health tracking
  maxTough: number;
  currentTough: number;
  
  // Stats from ArmyForge
  quality: number;
  defense: number;
  
  // Model state
  casterTokens: number;
  isDestroyed: boolean;
  
  // Equipment and rules
  weapons: string[];
  specialRules: string[];
}

export interface OPRBattleEvent {
  id: string;
  timestamp: Date;
  round: number;
  phase: OPRBattlePhase;
  userId: string;
  eventType: OPRBattleEventType;
  data: OPRBattleEventData;
}

export type OPRBattleEventType = 
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

export interface OPRBattleEventData {
  unitId?: string;
  modelId?: string;
  targetUnitId?: string;
  targetModelId?: string;
  damage?: number;
  killCount?: number;
  commandPointsSpent?: number;
  underdogPointsGained?: number;
  description: string;
  additionalData?: Record<string, any>;
}

// Army Conversion Types
export interface ArmyConversionResult {
  success: boolean;
  army: OPRBattleArmy;
  warnings: string[];
  errors: string[];
}

export interface UnitConversionOptions {
  allowCombined: boolean;
  allowJoined: boolean;
  preserveCustomNames: boolean;
}

// Damage Application
export interface ApplyDamageRequest {
  battleId: string;
  userId: string;
  targetUnitId: string;
  targetModelId?: string; // If targeting specific model
  damage: number;
  sourceUnitId?: string;
  sourceDescription?: string;
  ignoreTough?: boolean; // For special rules
}

export interface DamageResult {
  success: boolean;
  modelsDestroyed: number;
  unitDestroyed: boolean;
  unitShaken: boolean;
  unitRouted: boolean;
  moraleTestRequired: boolean;
  experienceGained: number;
  events: OPRBattleEvent[];
}

// Phase Management
export interface PhaseTransition {
  from: OPRBattlePhase;
  to: OPRBattlePhase;
  triggeredBy: string; // User ID
  timestamp: Date;
  data?: Record<string, any>;
}

// Battle Completion
export interface BattleResult {
  battleId: string;
  winner?: string; // User ID of winner, undefined if draw
  finalScores: Record<string, number>; // Kill counts by user
  experienceAwarded: Record<string, number>; // XP by user
  duration: number; // Battle duration in minutes
  totalRounds: number;
  finalState: OPRBattleState;
}

// Command Point System
export interface CommandPointAction {
  type: 'ACTIVATION' | 'REROLL' | 'SPECIAL_ABILITY';
  cost: number;
  unitId?: string;
  description: string;
  effect?: string;
}

// Underdog Point System
export interface UnderdogPointGain {
  reason: 'UNIT_DESTROYED' | 'HERO_KILLED' | 'OBJECTIVE_LOST';
  points: number;
  description: string;
}

// Battle Statistics
export interface BattleStatistics {
  totalDamageDealt: Record<string, number>; // By user ID
  totalModelsKilled: Record<string, number>; // By user ID
  unitsLost: Record<string, number>; // By user ID
  commandPointsUsed: Record<string, number>; // By user ID
  underdogPointsGained: Record<string, number>; // By user ID
  averageDamagePerRound: number;
  longestUnitSurvival: string; // Unit ID
  firstBlood?: string; // User ID who got first kill
}

// Mobile/Tablet Optimized UI Types
export interface TouchDamageInput {
  unitId: string;
  modelId?: string;
  quickDamage: 1 | 2 | 3 | 4 | 5; // Quick damage buttons
  customDamage?: number;
}

export interface BattleUIState {
  selectedUnit?: string;
  selectedModel?: string;
  damageMode: boolean;
  showDetails: boolean;
  compactMode: boolean; // For mobile
}