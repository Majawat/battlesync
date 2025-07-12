export interface Mission {
  id: string;
  campaignId: string;
  number: number;
  missionNumber: number; // Alias for number - some components expect this
  title: string;
  name: string; // Alias for title - some components expect this  
  description: string;
  points: number;
  status: MissionStatus;
  missionType?: string; // Added for component compatibility
  scheduledDate: string | null;
  objectives: MissionObjective[];
  specialRules: MissionRule[];
  terrainSuggestions: TerrainFeature[];
  battleReportFile: string | null;
  battles: BattleSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface MissionObjective {
  id: string;
  title: string;
  description: string;
  points: number;
  type: ObjectiveType;
  isRequired: boolean;
}

export interface MissionRule {
  id: string;
  title: string;
  description: string;
  phase: GamePhase;
  isActive: boolean;
}

export interface TerrainFeature {
  id: string;
  name: string;
  description: string;
  size: TerrainSize;
  category: TerrainCategory;
  isRequired: boolean;
}

export interface BattleSummary {
  id: string;
  status: BattleStatus;
  startedAt: string | null;
  completedAt: string | null;
  participantCount: number;
  winner: string | null;
}

export interface CreateMissionRequest {
  title: string;
  description: string;
  points: number;
  scheduledDate?: string;
  objectives: Omit<MissionObjective, 'id'>[];
  specialRules: Omit<MissionRule, 'id'>[];
  terrainSuggestions: Omit<TerrainFeature, 'id'>[];
}

export interface UpdateMissionRequest {
  name?: string;
  description?: string;
  missionType?: string;
  status?: MissionStatus;
  scheduledDate?: string;
  objectives?: string[];
  specialRules?: string[];
  terrainSuggestions?: string[];
}

export type MissionStatus = 'UPCOMING' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type BattleStatus = 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type ObjectiveType = 
  | 'CAPTURE_POINT' 
  | 'DESTROY_UNIT' 
  | 'HOLD_POSITION' 
  | 'ELIMINATE_ENEMY' 
  | 'CUSTOM';

export type GamePhase = 
  | 'DEPLOYMENT' 
  | 'MOVEMENT' 
  | 'SHOOTING' 
  | 'COMBAT' 
  | 'MORALE' 
  | 'END_TURN' 
  | 'GAME_END';

export type TerrainSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'MASSIVE';

export type TerrainCategory = 
  | 'BUILDING' 
  | 'FOREST' 
  | 'HILL' 
  | 'RUINS' 
  | 'WATER' 
  | 'INDUSTRIAL' 
  | 'OBSTACLE' 
  | 'DECORATION';

export interface MissionSummary {
  id: string;
  campaignId: string;
  number: number;
  title: string;
  points: number;
  status: MissionStatus;
  scheduledDate: string | null;
  battleCount: number;
  completedBattles: number;
  objectiveCount: number;
}

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  gameSystem: string;
  objectives: Omit<MissionObjective, 'id'>[];
  specialRules: Omit<MissionRule, 'id'>[];
  terrainSuggestions: Omit<TerrainFeature, 'id'>[];
  suggestedPoints: number[];
}