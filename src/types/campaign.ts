export interface CampaignData {
  id: string;
  groupId: string;
  name: string;
  description: string | null;
  narrative: string | null;
  status: CampaignStatus;
  settings: CampaignSettings;
  creator: {
    id: string;
    username: string;
    email: string | null;
  };
  members: CampaignMember[];
  battles: BattleSummary[];
  missions: MissionSummary[];
  memberCount: number;
  battleCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMember {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string | null;
  };
  primaryArmyId: string | null;
  totalExperience: number;
  battlesWon: number;
  battlesLost: number;
  joinedAt: Date;
}

export interface BattleSummary {
  id: string;
  missionId: string;
  status: BattleStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  participants: string[]; // usernames
}

export interface MissionSummary {
  id: string;
  number: number;
  title: string;
  points: number;
  status: MissionStatus;
  scheduledDate: Date | null;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  narrative?: string;
  settings: CampaignSettings;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  narrative?: string;
  settings?: Partial<CampaignSettings>;
  status?: CampaignStatus;
}

export interface CampaignSettings {
  pointsLimit: number;
  gameSystem: string; // 'grimdark-future', 'age-of-fantasy', etc.
  experiencePerWin: number;
  experiencePerLoss: number;
  experiencePerKill: number;
  allowMultipleArmies: boolean;
  requireArmyForgeIntegration: boolean;
  customRules: CustomRule[];
  commandPointMethod: CommandPointMethod;
}

export type CommandPointMethod = 'fixed' | 'growing' | 'temporary' | 'fixed-random' | 'growing-random' | 'temporary-random';

export interface CommandPointCalculation {
  method: CommandPointMethod;
  basePerThousand: number; // CP per 1000 points
  isRandom?: boolean; // Whether to use D3 multiplier
  isTemporary?: boolean; // Whether CP are discarded at end of round
  isGrowing?: boolean; // Whether CP are gained each round
}

export interface CustomRule {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
}

export interface JoinCampaignRequest {
  primaryArmyId?: string;
}

export type CampaignStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'PAUSED';
export type BattleStatus = 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type MissionStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  memberCount: number;
  battleCount: number;
  completedBattles: number;
  createdAt: Date;
  userRole?: 'CREATOR' | 'ORGANIZER' | 'PARTICIPANT';
}