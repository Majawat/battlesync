// Internal BattleSync data types (processed from ArmyForge)

export interface ProcessedWeapon {
  id: string;
  name: string;
  count: number;
  range: number;
  attacks: number | string;
  ap: number;
  special_rules: ProcessedRule[];
}

export interface ProcessedRule {
  name: string;
  type: 'ability' | 'weapon_modifier' | 'passive' | 'upgrade';
  rating?: number | string;
  description?: string;
  current_value?: number; // For trackable rules like Caster tokens
  has_ability?: boolean;
}

export interface ProcessedModelUpgrade {
  name: string;
  description: string;
  rules: ProcessedRule[];
  reassignable: boolean; // Can be moved to another model by user
  source: 'weapon-team' | 'choose-model' | 'unit-wide';
}

export interface ProcessedModel {
  model_id: string;
  name: string;
  custom_name?: string;
  max_tough: number;
  current_tough: number;
  is_hero: boolean;
  special_rules: ProcessedRule[];
  weapons: ProcessedWeapon[]; // Individual model weapons
  upgrades: ProcessedModelUpgrade[]; // Model-specific upgrades
}

export interface ProcessedSubUnit {
  id: string;
  armyforge_unit_id: string;
  name: string;
  custom_name?: string;
  
  // Original ArmyForge stats
  quality: number;
  defense: number;
  size: number;
  cost: number;
  
  // Unit classification
  is_hero: boolean;
  is_caster: boolean;
  caster_rating?: number;
  
  // Campaign data
  xp: number;
  traits: string[];
  
  // Equipment and abilities
  base_sizes: {
    round?: string;
    square?: string;
  };
  weapons: ProcessedWeapon[];
  rules: ProcessedRule[];
  items: ProcessedRule[]; // Items are essentially rules
  
  // Individual models for wound tracking
  models: ProcessedModel[];
  
  notes?: string;
}

export interface ProcessedUnit {
  id: string;
  army_id: string;
  armyforge_unit_ids: string[]; // Source units from ArmyForge
  name: string;
  custom_name?: string;
  
  // Calculated battle stats
  quality: number; // From hero if joined
  defense: number; // From regular unit if joined
  total_cost: number;
  model_count: number;
  
  // Unit type flags
  is_combined: boolean;
  is_joined: boolean;
  has_hero: boolean;
  has_caster: boolean;
  
  // Component sub-units
  sub_units: ProcessedSubUnit[];
  
  notes?: string;
}

export interface ProcessedArmy {
  id: string;
  armyforge_id: string;
  name: string;
  description?: string;
  points_limit: number;
  list_points: number;
  model_count: number;
  activation_count: number;
  game_system: string;
  campaign_mode: boolean;
  
  // Processed units ready for battle
  units: ProcessedUnit[];
  
  // Preserve original data
  raw_armyforge_data: string;
}

// Battle-specific types
export type UnitAction = 'hold' | 'advance' | 'rush' | 'charge';
export type DeploymentStatus = 'standard' | 'ambush' | 'scout' | 'embarked';
export type BattleStatus = 'setup' | 'deployment' | 'active' | 'ended';

export interface KillRecord {
  army_id: string;
  unit_id: string;
  round: number;
  turn: number;
  models_killed?: number;
}

export interface BattleUnitState {
  id: string;
  battle_id: string;
  source_unit_id: string;
  
  // Current state flags
  is_routed: boolean;
  is_shaken: boolean;
  is_fatigued: boolean;
  
  // Current action
  current_action?: UnitAction;
  deployment_status: DeploymentStatus;
  
  // Combat tracking
  activated_this_round: boolean;
  participated_in_melee: boolean;
  
  // Kill/death tracking
  kills: KillRecord[];
  killed_by?: KillRecord;
}

export interface BattleModelState {
  id: string;
  source_model_id: string;
  current_tough: number;
  is_alive: boolean;
  caster_tokens_remaining?: number;
}

export interface BattleEvent {
  id: string;
  battle_id: string;
  round_number: number;
  turn_number: number;
  event_order: number;
  event_type: 'activation' | 'damage' | 'morale' | 'spell' | 'deployment';
  unit_id?: string;
  event_data: Record<string, any>;
  created_at: string;
}