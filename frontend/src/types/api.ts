// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Army Types
export interface Army {
  id: string;
  armyforge_id: string;
  name: string;
  description: string;
  validation_errors: string[];
  points_limit: number;
  list_points: number;
  model_count: number;
  activation_count: number;
  game_system: string;
  campaign_mode: boolean;
  units: Unit[];
}

export interface Unit {
  id: string;
  army_id: string;
  armyforge_unit_ids: string[];
  name: string;
  custom_name?: string;
  quality: number;
  defense: number;
  total_cost: number;
  model_count: number;
  is_combined: boolean;
  is_joined: boolean;
  has_hero: boolean;
  has_caster: boolean;
  sub_units: SubUnit[];
  notes?: string;
}

export interface SubUnit {
  id: string;
  armyforge_unit_id: string;
  name: string;
  custom_name?: string;
  quality: number;
  defense: number;
  size: number;
  cost: number;
  is_hero: boolean;
  is_caster: boolean;
  caster_rating?: number;
  xp: number;
  traits: string[];
  base_sizes: {
    round: string;
    square: string;
  };
  weapons: Weapon[];
  rules: Rule[];
  items: Item[];
  models: Model[];
  notes?: string;
}

export interface Model {
  model_id: string;
  name: string;
  custom_name?: string;
  max_tough: number;
  current_tough: number;
  is_hero: boolean;
  special_rules: any[];
  weapons: Weapon[];
  upgrades: Upgrade[];
}

export interface Weapon {
  id: string;
  name: string;
  count: number;
  range: number;
  attacks: number | string;
  ap: number;
  special_rules: SpecialRule[];
}

export interface SpecialRule {
  name: string;
  value?: number;
}

export interface Rule {
  name: string;
  type: string;
  rating?: number;
  description: string;
}

export interface Item {
  name: string;
  type: string;
  description: string;
}

export interface Upgrade {
  name: string;
  description: string;
  rules: Rule[];
  reassignable: boolean;
  source: string;
}

// Battle Types
export interface Battle {
  id: number;
  name: string;
  description?: string;
  status: 'setup' | 'deployment' | 'active' | 'finished';
  mission_type: string;
  has_command_points: boolean;
  command_point_mode: 'fixed' | 'variable';
  points_limit: number;
  current_round: number;
  participants: BattleParticipant[];
  created_at: string;
  updated_at: string;
}

export interface BattleParticipant {
  id: number;
  battle_id: number;
  army_id: number;
  player_name: string;
  doctrine?: string;
  army?: Army;
}

// Unit Battle State Types
export type UnitStatus = 'normal' | 'shaken' | 'routed';
export type DeploymentStatus = 'standard' | 'ambush' | 'scout' | 'embarked';
export type UnitAction = 'hold' | 'advance' | 'rush' | 'charge';

export interface UnitBattleState {
  id: number;
  battle_id: number;
  army_id: number;
  unit_path: string;
  current_health: number;
  max_health: number;
  status: UnitStatus;
  is_fatigued: boolean;
  spell_tokens: number;
  activated_this_round: boolean;
  participated_in_melee: boolean;
  deployment_status: DeploymentStatus;
  current_action?: UnitAction;
  position_data?: Record<string, any>;
  status_effects?: string[];
  created_at: string;
  updated_at: string;
}

// API Request Types
export interface ImportArmyRequest {
  armyForgeId: string;
}

export interface CreateBattleRequest {
  name: string;
  description?: string;
  mission_type: string;
  has_command_points: boolean;
  command_point_mode: 'fixed' | 'variable';
  points_limit: number;
}

export interface AddParticipantRequest {
  army_id: number;
  player_name: string;
  doctrine?: string;
}

export interface UpdateUnitStateRequest {
  current_health?: number;
  status?: UnitStatus;
  is_fatigued?: boolean;
  spell_tokens?: number;
  activated_this_round?: boolean;
  participated_in_melee?: boolean;
  position_data?: Record<string, any>;
  deployment_status?: DeploymentStatus;
  current_action?: UnitAction;
  status_effects?: string[];
}