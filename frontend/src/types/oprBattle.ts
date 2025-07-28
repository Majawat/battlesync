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
  
  // Turn-based activation system
  activationState: OPRActivationState;
}

export interface OPRGameSettings {
  gameSystem: string;
  pointsLimit: number;
  timeLimit?: number;
  allowUnderdog: boolean;
  customRules: string[];
}

// Turn-based activation system
export interface OPRActivationState {
  currentTurn: number; // Turn within current round (1, 2, 3...)
  maxTurns: number; // Total turns in this round (based on unit count)
  activatingPlayerId?: string; // Player who must activate next
  activationOrder: OPRActivationSlot[]; // Pre-determined order for this round
  unitsActivatedThisRound: string[]; // Unit IDs already activated
  isAwaitingActivation: boolean; // Waiting for player to choose unit
  canPassTurn: boolean; // Whether current player can pass their turn
  passedPlayers: string[]; // Players who have passed this round
  roundComplete: boolean; // All activations done for this round
  
  // OPR turn order tracking
  deploymentRollOff?: OPRDeploymentRollOff;
  firstPlayerThisRound?: string; // Player who goes first this round
  lastRoundFinishOrder: string[]; // Order players finished previous round (first = [0])
  
  // Deployment phase tracking
  deploymentState?: OPRDeploymentState;
}

// OPR Deployment Roll-off System
export interface OPRDeploymentRollOff {
  status: 'PENDING' | 'ROLLING' | 'COMPLETED';
  rolls: Record<string, number>; // playerId -> dice roll (1-6)
  winner?: string; // Player who won the roll-off
  timestamp?: Date;
  tiebreakRolls?: Record<string, number>[]; // Array of tie-breaking rolls if needed
}

export interface OPRActivationSlot {
  playerId: string;
  armyId: string;
  turnNumber: number;
  isPassed: boolean; // Player passed on this slot
  activatedUnitId?: string; // Which unit was activated (if any)
  timestamp?: Date; // When this activation occurred
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
  
  // Unit special rules (base rules + upgrades/traits)
  specialRules: string[];
  
  joinedHero?: OPRBattleModel;
  
  // Combined unit tracking
  isCombined: boolean;
  combinedFrom?: string[];
  
  // Deployment state (not position - players handle tabletop positioning)
  deploymentState: OPRUnitDeploymentState;
  
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
  type: 'welcome' | 'auth' | 'join_room' | 'error' | 'round_advanced' | 'battle_created' | 'phase_changed' | 'damage_applied' | 'hero_joined' | 'battle_completed' | 'unit_action' | 'spell_cast' | 'cooperative_casting_request' | 'cooperative_casting_response' | 'cooperative_contribution_request' | 'cooperative_contributions_complete' | 'spell_cast_complete' | 'morale_test_result' | 'quality_test_result' | 'deployment_roll_off_updated';
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

// ===== DEPLOYMENT SYSTEM =====
// BattleSync handles deployment STATUS only - not positioning
// Physical model positions are managed by players on their tabletop

export type OPRUnitDeploymentStatus = 
  | 'PENDING'      // Not yet deployed
  | 'DEPLOYED'     // Placed on battlefield
  | 'RESERVES'     // In reserves (Ambush, Scout, etc.)
  | 'EMBARKED';    // Inside a transport

export interface OPRUnitDeploymentState {
  status: OPRUnitDeploymentStatus;
  deployedInTurn?: number;
  deploymentMethod: 'STANDARD' | 'AMBUSH' | 'SCOUT' | 'TRANSPORT';
  canDeployThisRound?: boolean;
  originalDeploymentZone?: 'PLAYER1' | 'PLAYER2';
  transportId?: string;
  deployedFromTransport?: boolean;
}

export interface OPRDeploymentState {
  phase: 'ROLL_OFF' | 'DEPLOYMENT' | 'SCOUT' | 'RESERVES' | 'COMPLETED';
  currentDeployingPlayer?: string;
  deploymentTurn: number;
  firstDeployingPlayer?: string;
  deploymentOrder: string[];
  unitsToDeploy: Record<string, string[]>;
  unitsDeployed: Record<string, string[]>;
  ambushUnits: string[];
  scoutUnits: string[];
  allUnitsDeployed: boolean;
  readyForBattle: boolean;
}

