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
  validation_errors?: string[]; // Army-level validation issues from ArmyForge
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

// Battle system types
export type UnitAction = 'hold' | 'advance' | 'rush' | 'charge';
export type DeploymentStatus = 'standard' | 'ambush' | 'scout' | 'embarked';
export type BattleStatus = 'setup' | 'deployment' | 'active' | 'completed' | 'abandoned';
export type UnitStatus = 'normal' | 'shaken' | 'routed';
export type ParticipantStatus = 'active' | 'conceded' | 'eliminated';
export type CommandPointMode = 'fixed' | 'growing' | 'temporary' | 'fixed_random' | 'growing_random' | 'temporary_random';

export interface Battle {
  id: number;
  name: string;
  description?: string;
  mission_type: string;
  game_system: string;
  points_limit?: number;
  has_command_points: boolean;
  command_point_mode: CommandPointMode;
  has_underdog_bonus: boolean;
  is_campaign_battle: boolean;
  status: BattleStatus;
  current_round: number;
  current_player_turn?: number;
  turn_sequence?: number[]; // Array of participant IDs
  mission_data?: Record<string, any>; // JSON: objectives, deployment zones, special rules
  command_points?: Record<number, CommandPointState>; // Keyed by participant ID
  created_at: string;
  updated_at: string;
  ended_at?: string;
}

export interface CommandPointState {
  current: number;
  spent: number;
  total_earned: number;
}

export interface BattleParticipant {
  id: number;
  battle_id: number;
  army_id: number;
  player_name: string;
  deployment_zone?: Record<string, any>; // JSON coordinates or zone identifier
  doctrine?: string; // Selected command point doctrine
  turn_order?: number;
  underdog_points: number;
  victory_points: number;
  status: ParticipantStatus;
  created_at: string;
}

export interface UnitBattleState {
  id: number;
  battle_id: number;
  army_id: number;
  unit_path: string; // JSON path to unit in army data
  current_health: number;
  max_health: number;
  status: UnitStatus;
  is_fatigued: boolean;
  spell_tokens: number;
  activated_this_round: boolean;
  participated_in_melee: boolean;
  position_data?: Record<string, any>; // JSON position/facing
  deployment_status: DeploymentStatus;
  current_action?: UnitAction;
  status_effects?: string[]; // JSON array of temporary effects
  kills_data?: any[]; // JSON array of kills made
  updated_at: string;
}

export interface BattleEvent {
  id: number;
  battle_id: number;
  round_number: number;
  sequence_number: number;
  event_type: 'unit_action' | 'state_change' | 'phase_change' | 'morale_test' | 'spell_cast';
  actor_unit_id?: string; // Unit path reference
  target_unit_id?: string; // Unit path reference  
  event_data: Record<string, any>; // JSON payload specific to event type
  created_at: string;
}

export interface CreateBattleRequest {
  name: string;
  description?: string;
  mission_type?: string;
  game_system?: string;
  points_limit?: number;
  has_command_points?: boolean;
  command_point_mode?: CommandPointMode;
  has_underdog_bonus?: boolean;
  is_campaign_battle?: boolean;
}

export interface AddParticipantRequest {
  army_id: number;
  player_name: string;
  doctrine?: string;
}