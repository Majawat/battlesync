// Frontend OPR Battle Types (mirrors backend types)

export type OPRBattlePhase = 'GAME_SETUP' | 'DEPLOYMENT' | 'BATTLE_ROUNDS' | 'GAME_END';
export type OPRUnitType = 'STANDARD' | 'JOINED' | 'COMBINED';
export type BattleStatus = 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface OPRBattleState {
  battleId: string;
  status: BattleStatus;
  phase: OPRBattlePhase;
  currentRound: number;
  currentPlayer?: string;
  armies: OPRBattleArmy[];
  events: OPRBattleEvent[];
  gameSettings: OPRGameSettings;
}

export interface OPRGameSettings {
  gameSystem: string;
  pointsLimit: number;
  timeLimit?: number;
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
  killCount: number;
}

export interface OPRBattleUnit {
  unitId: string;
  name: string;
  customName?: string;
  type: OPRUnitType;
  originalSize: number;
  currentSize: number;
  faction: string; // Added for spell fetching
  userId?: string; // Owner of the unit for spell targeting
  
  // Unit state
  action: 'hold' | 'advance' | 'rush' | 'charge' | null;
  fatigued: boolean;
  shaken: boolean;
  routed: boolean;
  
  // Combat tracking
  kills: number;
  killedBy?: string;
  
  // Model composition
  models: OPRBattleModel[];
  
  // Weapon summary for unit
  weaponSummary: OPRWeaponSummary[];
  
  joinedHero?: OPRBattleModel;
  
  // Combined unit tracking
  isCombined: boolean;
  combinedFrom?: string[];
  
  // Source data
  sourceUnit: any; // ArmyForge unit data
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
  
  // Stats
  quality: number;
  defense: number;
  
  // Model state
  casterTokens: number;
  isDestroyed: boolean;
  
  // Equipment
  weapons: string[];
  specialRules: string[];
  
  // Faction data for heroes
  originalFaction?: string; // For joined heroes from different factions
  armyId?: string; // ArmyForge army book ID
}

export interface OPRBattleEvent {
  id: string;
  timestamp: Date;
  round: number;
  phase: OPRBattlePhase;
  userId: string;
  eventType: string;
  data: {
    description: string;
    [key: string]: any;
  };
}

// API Request/Response Types
export interface CreateBattleRequest {
  missionId: string;
  participants: Array<{
    userId: string;
    armyId: string;
  }>;
}

export interface CreateBattleResponse {
  success: boolean;
  data?: {
    battleId: string;
    battle: OPRBattleState;
  };
  error?: string;
}

export interface ApplyDamageRequest {
  unitId: string;
  modelId?: string;
  quickDamage?: 1 | 2 | 3 | 4 | 5;
  customDamage?: number;
}

export interface DamageResult {
  success: boolean;
  modelsDestroyed: number;
  unitDestroyed: boolean;
  unitShaken: boolean;
  unitRouted: boolean;
  moraleTestRequired: boolean;
  experienceGained: number;
}

export interface PhaseTransitionRequest {
  phase: OPRBattlePhase;
}

// UI-specific types
export interface BattleUIState {
  selectedUnit?: string;
  selectedModel?: string;
  damageMode: boolean;
  showDetails: boolean;
  compactMode: boolean;
}

// Morale and Quality Test Types
export interface MoraleTestRequest {
  unitId: string;
  testType: 'MORALE' | 'QUALITY' | 'ROUT_RECOVERY' | 'ACTIVATION';
  modifier?: number;
  reason: string;
  forcedRoll?: number;
}

export interface MoraleTestResult {
  success: boolean;
  rollResult: number;
  targetNumber: number;
  finalResult: number;
  modifier: number;
  unitShaken: boolean;
  unitRouted: boolean;
  unitRecovered: boolean;
  unitDestroyed: boolean;
  description: string;
}

export interface QualityTestRequest {
  unitId: string;
  modelId: string;
  testType: 'ACTIVATION' | 'SPECIAL_ABILITY' | 'INSTANT_KILL' | 'SPELL_RESIST';
  modifier?: number;
  reason: string;
  forcedRoll?: number;
}

export interface QualityTestResult {
  success: boolean;
  rollResult: number;
  targetNumber: number;
  finalResult: number;
  modifier: number;
  description: string;
}

export interface MoraleTestSuggestion {
  testType: string;
  reason: string;
  modifier: number;
  priority: 'high' | 'medium' | 'low';
}

export interface ActionPenalties {
  shootingPenalty: number;
  fightingPenalty: number;
  movementPenalty: number;
}

export interface TouchDamageProps {
  unitId: string;
  modelId?: string;
  onDamageApplied: (result: DamageResult) => void;
  disabled?: boolean;
}

// WebSocket message types
export interface BattleWebSocketMessage {
  type: 'welcome' | 'auth' | 'join_room' | 'error' | 'round_advanced' | 'battle_created' | 'phase_changed' | 'damage_applied' | 'hero_joined' | 'battle_completed' | 'unit_action' | 'spell_cast' | 'cooperative_casting_request' | 'cooperative_casting_response' | 'cooperative_contribution_request' | 'cooperative_contributions_complete' | 'spell_cast_complete' | 'morale_test_result' | 'quality_test_result';
  data: any;
  error?: string;
  timestamp: string;
}

// Spell System Types
export interface OPRSpell {
  id: string;
  name: string;
  cost: number; // Token cost
  range: string; // e.g., "12\"", "18\"", "Touch"
  targets: string; // e.g., "1 enemy unit", "2 friendly units"
  effect: string; // Description of what the spell does
  duration: 'instant' | 'next-action' | 'end-of-round' | 'permanent';
  damage?: number; // For damage spells
  hits?: number; // Number of hits dealt
  armorPiercing?: number; // AP value for damage spells
  special?: string; // Special rules or conditions
  modifiers?: SpellModifier[]; // Buffs/debuffs applied
}

export interface SpellModifier {
  type: 'buff' | 'debuff';
  stat: string; // e.g., 'defense', 'attacks', 'range'
  value: number;
  condition?: string; // When the modifier applies
}

export interface SpellCastAttempt {
  spellId: string;
  casterUnitId: string;
  casterModelId?: string;
  targetUnitIds: string[];
  tokensCost: number;
  cooperatingCasters?: CooperatingCaster[];
  rollRequired: number; // 4+ for OPR
  rollModifier: number; // From cooperating casters
}

export interface SpellCastResult {
  success: boolean;
  roll: number;
  rollModifier: number;
  finalResult: number;
  spellApplied: boolean;
  tokensConsumed: number;
  description: string;
  effects?: SpellEffect[];
}

export interface CooperatingCaster {
  unitId: string;
  modelId?: string;
  tokensContributed: number;
  modifier: number; // +1 or -1 per token
}

export interface SpellEffect {
  targetUnitId: string;
  effectType: 'damage' | 'buff' | 'debuff' | 'special';
  value?: number;
  duration: 'instant' | 'next-action' | 'end-of-round' | 'permanent';
  description: string;
}

