import { ArmyForgeUnit } from './army';

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
  
  // Turn-based activation system
  activationState: OPRActivationState;
}

export interface OPRGameSettings {
  gameSystem: string; // 'grimdark-future', 'age-of-fantasy', etc.
  pointsLimit: number;
  timeLimit?: number; // minutes
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
}

export interface OPRActivationSlot {
  playerId: string;
  armyId: string;
  turnNumber: number;
  isPassed: boolean; // Player passed on this slot
  activatedUnitId?: string; // Which unit was activated (if any)
  timestamp?: Date; // When this activation occurred
}

// OPR Deployment Roll-off System
export interface OPRDeploymentRollOff {
  status: 'PENDING' | 'ROLLING' | 'COMPLETED';
  rolls: Record<string, number>; // playerId -> dice roll (1-6)
  winner?: string; // Player who won the roll-off
  timestamp?: Date;
  tiebreakRolls?: Record<string, number>[]; // Array of tie-breaking rolls if needed
}

// Individual unit activation tracking
export interface OPRUnitActivationState {
  canActivate: boolean; // Can this unit be activated this round?
  hasActivated: boolean; // Has this unit activated this round?
  activatedInRound: number; // Which round this unit last activated
  activatedInTurn: number; // Which turn within the round
  isSelected: boolean; // Currently selected for activation
  actionPoints: number; // Available action points (usually 1, 2 for fast units)
  actionsUsed: OPRUnitAction[]; // Actions taken this activation
}

// Unit actions during activation
export interface OPRUnitAction {
  actionType: 'MOVE' | 'SHOOT' | 'FIGHT' | 'CAST_SPELL' | 'SPECIAL' | 'HOLD';
  actionCost: number; // Action points consumed
  timestamp: Date;
  description: string;
  targetUnitIds?: string[];
  additionalData?: Record<string, any>;
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
  selectedDoctrine?: OPRDoctrine; // Changed to use proper type
  units: OPRBattleUnit[];
  killCount: number; // Total kills made by this army
  stratagemActivations: StratagemActivation[]; // Track stratagem usage
}

export interface OPRBattleUnit {
  unitId: string;
  name: string;
  customName?: string;
  type: OPRUnitType;
  originalSize: number; // Starting model count
  currentSize: number; // Current model count
  faction: string; // For spell casting system
  
  // Unit-level state
  action: 'hold' | 'advance' | 'rush' | 'charge' | null;
  fatigued: boolean;
  shaken: boolean;
  routed: boolean;
  
  // Activation tracking
  activationState: OPRUnitActivationState;
  
  // Combat tracking
  kills: number; // Kills made by this unit
  killedBy?: string; // Unit ID that destroyed this unit
  
  // Model composition
  models: OPRBattleModel[];
  
  // Weapon summary for unit
  weaponSummary: OPRWeaponSummary[];
  
  // Unit special rules (base rules + upgrades/traits)
  specialRules: string[];
  
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
  eventType: OPRBattleEventType;
  data: OPRBattleEventData;
}

export type OPRBattleEventType = 
  | 'BATTLE_STARTED'
  | 'PHASE_CHANGED'
  | 'ROUND_STARTED'
  | 'TURN_STARTED'
  | 'UNIT_ACTIVATED'
  | 'UNIT_ACTION'
  | 'ACTIVATION_PASSED'
  | 'ACTIVATION_ORDER_DETERMINED'
  | 'SPELL_CAST'
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
  | 'EXPERIENCE_AWARDED'
  | 'RANDOM_EVENT';

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
  army?: OPRBattleArmy; // Optional for error cases
  warnings: string[];
  errors: string[];
}

export interface UnitConversionOptions {
  allowCombined: boolean;
  allowJoined: boolean;
  preserveCustomNames: boolean;
  factionName?: string; // For spell casting system
}

// Damage Application
export type DamageType = 'NORMAL' | 'INSTANT_KILL' | 'MULTI_DAMAGE' | 'PIERCE' | 'AREA_EFFECT';

export interface ApplyDamageRequest {
  battleId: string;
  userId: string;
  targetUnitId: string;
  targetModelId?: string; // If targeting specific model
  damage: number;
  sourceUnitId?: string;
  sourceDescription?: string;
  ignoreTough?: boolean; // For special rules
  damageType?: DamageType; // Advanced damage types
  pierceValue?: number; // For PIERCE damage (ignores X points of tough)
  multiTargets?: string[]; // For MULTI_DAMAGE/AREA_EFFECT (model IDs)
  instantKillRoll?: number; // For INSTANT_KILL (quality roll result)
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
  modifiers?: SpellModifier[]; // Buffs/debuffs applied
}

export interface SpellModifier {
  type: 'buff' | 'debuff';
  stat: 'quality' | 'defense' | 'tough' | 'range' | 'attacks';
  value: number; // +/- modifier
  condition: string; // When it applies, e.g., "next time they fight in melee"
}

export interface SpellCastAttempt {
  spellId: string;
  casterUnitId: string;
  casterModelId?: string;
  targetUnitIds: string[];
  tokensCost: number;
  cooperatingCasters?: CooperatingCaster[]; // Other casters contributing tokens
  rollRequired: number; // Target number for success roll
  rollModifier: number; // +/- from cooperating casters
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

// Command Point System
export interface CommandPointAction {
  type: 'ACTIVATION' | 'REROLL' | 'SPECIAL_ABILITY';
  cost: number;
  unitId?: string;
  description: string;
  effect?: string;
}

// Stratagems and Doctrines
export type OPRDoctrine = 
  | 'strategic' 
  | 'defensive' 
  | 'shock' 
  | 'hunting' 
  | 'valorous' 
  | 'tactical';

export interface OPRStratagem {
  id: string;
  name: string;
  doctrine: 'universal' | OPRDoctrine;
  cost: number; // 1-3 CP
  description: string;
  timing: 'any' | 'activation' | 'movement' | 'shooting' | 'melee' | 'morale' | 'deployment' | 'round-end';
  usageLimit: 'once-per-activation' | 'once-per-round' | 'once-per-battle';
  targetType: 'friendly-unit' | 'enemy-unit' | 'any-unit' | 'self-army' | 'objective' | 'none';
  canBeCountered: boolean; // Can opponents spend CP to negate?
}

export interface StratagemActivation {
  stratagemId: string;
  activatingUserId: string;
  activatingArmyId: string;
  targetUnitId?: string;
  cpCost: number;
  timestamp: Date;
  battleRound: number;
  description: string;
  wasCountered?: boolean;
  counteredBy?: string;
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

// Turn-based activation requests
export interface ActivateUnitRequest {
  battleId: string;
  userId: string;
  unitId: string;
  actions?: OPRUnitAction[]; // Actions to perform during activation
}

export interface PassActivationRequest {
  battleId: string;
  userId: string;
  reason?: string; // Optional reason for passing
}

export interface StartNewRoundRequest {
  battleId: string;
  userId: string;
}

export interface ActivationResult {
  success: boolean;
  newActivationState: OPRActivationState;
  unitActivated?: OPRBattleUnit;
  nextActivatingPlayer?: string;
  roundComplete?: boolean;
  error?: string;
}

