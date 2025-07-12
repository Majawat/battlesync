export interface MissionData {
  id: string;
  campaignId: string;
  number: number;
  title: string;
  description: string;
  points: number;
  status: MissionStatus;
  scheduledDate: Date | null;
  objectives: MissionObjective[];
  specialRules: MissionRule[];
  terrainSuggestions: TerrainFeature[];
  battleReportFile: string | null;
  battles: BattleSummary[];
  createdAt: Date;
  updatedAt: Date;
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
  startedAt: Date | null;
  completedAt: Date | null;
  participantCount: number;
  winner: string | null;
}

export interface CreateMissionRequest {
  title: string;
  description: string;
  points: number;
  scheduledDate?: string; // ISO date string
  objectives: Omit<MissionObjective, 'id'>[];
  specialRules: Omit<MissionRule, 'id'>[];
  terrainSuggestions: Omit<TerrainFeature, 'id'>[];
}

export interface UpdateMissionRequest {
  title?: string;
  description?: string;
  points?: number;
  status?: MissionStatus;
  scheduledDate?: string | null;
  objectives?: Omit<MissionObjective, 'id'>[];
  specialRules?: Omit<MissionRule, 'id'>[];
  terrainSuggestions?: Omit<TerrainFeature, 'id'>[];
}

export type MissionStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
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
  scheduledDate: Date | null;
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