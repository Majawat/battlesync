// ===== BATTLESYNC SIMPLIFIED DATA STRUCTURES =====
// New unified army/battle format that replaces complex OPR conversion

export interface BattleSyncArmy {
  userId: string;
  armyId: string;
  armyName: string;
  factions: BattleSyncFaction[];
  totalPoints: number;
  maxCommandPoints: number;
  currentCommandPoints: number;
  maxUnderdogPoints: number;
  currentUnderdogPoints: number;
  selectedDoctrine?: BattleSyncDoctrine;
  units: BattleSyncUnit[];
  killCount: number;
  stratagemActivations: BattleSyncStratagemActivation[];
}

export interface BattleSyncFaction {
  armyId: string;
  factionName: string;
  factionCustomName?: string;
  gameSystem: string;
}

export interface BattleSyncUnit {
  battleSyncUnitId: string;
  isJoined: boolean; // Easy check for joined units
  name: string; // Combined name for joined units
  originalSize: number;
  currentSize: number;
  originalToughTotal: number;
  currentToughTotal: number;
  
  // Battle state
  action: 'hold' | 'advance' | 'rush' | 'charge' | null;
  fatigued: boolean;
  shaken: boolean;
  routed: boolean;
  casualty: boolean;
  
  // Deployment state
  deploymentState: BattleSyncDeploymentState;
  
  // Combat tracking
  kills: BattleSyncKill[];
  killedBy?: BattleSyncKilledBy;
  
  // UI convenience data
  weaponSummary: BattleSyncWeapon[]; // Combined from all subunits
  activationState: BattleSyncActivationState;
  
  // The actual unit data
  subunits: BattleSyncSubunit[];
  
  // Optional metadata
  metadata?: {
    sourceUnits: any[]; // Original ArmyForge data for rebuilding
  };
}

export interface BattleSyncSubunit {
  armyForgeUnitId: string;
  name: string;
  customName?: string;
  isHero: boolean;
  isCombined: boolean;
  quality: number;
  defense: number;
  factionId: string;
  
  models: BattleSyncModel[];
  weapons: BattleSyncWeapon[];
  specialRules: string[];
  
  // Optional metadata for tracking combined units
  metadata?: {
    combinedFromUnits?: string[];
  };
}

export interface BattleSyncModel {
  modelId: string;
  name: string;
  customName?: string;
  currentTough: number;
  maxTough: number;
  isDestroyed: boolean;
  
  // Caster data
  isCaster: boolean;
  casterTokens: number;
  
  // Hero data
  isHero: boolean;
}

export interface BattleSyncWeapon {
  name: string;
  quantity: number;
  melee: boolean;
  range: number;
  attacks: number | string; // Can be "D6" etc.
  ap: number;
  rules: BattleSyncWeaponRule[];
}

export interface BattleSyncWeaponRule {
  name: string;
  value?: number | string; // For rules like "Blast(3)"
}

export interface BattleSyncDeploymentState {
  status: 'PENDING' | 'DEPLOYED' | 'RESERVES' | 'EMBARKED';
  deploymentMethod: 'STANDARD' | 'AMBUSH' | 'SCOUT' | 'TRANSPORT';
  deployedInTurn?: number;
  canDeployThisRound?: boolean;
  originalDeploymentZone?: 'PLAYER1' | 'PLAYER2';
  transportId?: string;
  deployedFromTransport?: boolean;
}

export interface BattleSyncActivationState {
  canActivate: boolean;
  hasActivated: boolean;
  activatedInRound: number;
  activatedInTurn: number;
  isSelected: boolean;
  actionPoints: number;
  actionsUsed: BattleSyncUnitAction[];
}

export interface BattleSyncUnitAction {
  actionType: 'MOVE' | 'SHOOT' | 'FIGHT' | 'CAST_SPELL' | 'SPECIAL' | 'HOLD';
  actionCost: number;
  timestamp: Date;
  description: string;
  targetUnitIds?: string[];
  additionalData?: Record<string, any>;
}

export interface BattleSyncKill {
  targetUnitId: string;
  targetArmyId: string;
  round: number;
  turn: number;
  wasJoinedUnit: boolean;
  wasHero: boolean;
  experienceValue: number; // 1 for regular, 1 for lone hero, 2 for joined
}

export interface BattleSyncKilledBy {
  unitId: string;
  armyId: string;
  round: number;
  turn: number;
}

// Doctrine types
export type BattleSyncDoctrine = 
  | 'strategic' 
  | 'defensive' 
  | 'shock' 
  | 'hunting' 
  | 'valorous' 
  | 'tactical';

export interface BattleSyncStratagemActivation {
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

// Battle state that includes armies
export interface BattleSyncBattleState {
  battleId: string;
  status: 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  phase: BattleSyncBattlePhase;
  currentRound: number;
  currentPlayer?: string;
  armies: BattleSyncArmy[];
  events: BattleSyncBattleEvent[];
  gameSettings: BattleSyncGameSettings;
  activationState: BattleSyncBattleActivationState;
}

export type BattleSyncBattlePhase = 'GAME_SETUP' | 'DEPLOYMENT' | 'BATTLE_ROUNDS' | 'GAME_END';

export interface BattleSyncGameSettings {
  gameSystem: string;
  pointsLimit: number;
  timeLimit?: number;
  allowUnderdog: boolean;
  customRules: string[];
}

export interface BattleSyncBattleActivationState {
  currentTurn: number;
  maxTurns: number;
  activatingPlayerId?: string;
  activationOrder: BattleSyncActivationSlot[];
  unitsActivatedThisRound: string[];
  isAwaitingActivation: boolean;
  canPassTurn: boolean;
  passedPlayers: string[];
  roundComplete: boolean;
  deploymentRollOff?: BattleSyncDeploymentRollOff;
  firstPlayerThisRound?: string;
  lastRoundFinishOrder: string[];
  deploymentState?: BattleSyncBattleDeploymentState;
}

export interface BattleSyncActivationSlot {
  playerId: string;
  armyId: string;
  turnNumber: number;
  isPassed: boolean;
  activatedUnitId?: string;
  timestamp?: Date;
}

export interface BattleSyncDeploymentRollOff {
  status: 'PENDING' | 'ROLLING' | 'COMPLETED';
  rolls: Record<string, number>;
  winner?: string;
  timestamp?: Date;
  tiebreakRolls?: Record<string, number>[];
}

export interface BattleSyncBattleDeploymentState {
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

export interface BattleSyncBattleEvent {
  id: string;
  timestamp: Date;
  round: number;
  phase: BattleSyncBattlePhase;
  userId: string;
  eventType: BattleSyncBattleEventType;
  data: BattleSyncBattleEventData;
}

export type BattleSyncBattleEventType = 
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

export interface BattleSyncBattleEventData {
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

// Conversion result
export interface BattleSyncConversionResult {
  success: boolean;
  army?: BattleSyncArmy;
  warnings: string[];
  errors: string[];
}

export interface BattleSyncConversionOptions {
  allowCombined: boolean;
  allowJoined: boolean;
  preserveCustomNames: boolean;
  factionName?: string;
}