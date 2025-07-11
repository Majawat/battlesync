export interface Campaign {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  narrative?: string;
  status: CampaignStatus;
  settings?: CampaignSettings;
  createdBy: string;
  missionCount: number;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
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
  joinedAt: string;
}

export interface BattleSummary {
  id: string;
  missionId: string;
  status: BattleStatus;
  startedAt: string | null;
  completedAt: string | null;
  participants: string[];
}

export interface MissionSummary {
  id: string;
  number: number;
  title: string;
  points: number;
  status: MissionStatus;
  scheduledDate: string | null;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  narrative?: string;
  settings: CampaignSettings;
}

export interface CampaignSettings {
  pointsLimit: number;
  gameSystem: string; // 'grimdark-future', 'age-of-fantasy', 'firefight', 'warfleets-ftl'
  experiencePerWin: number;
  experiencePerLoss: number;
  experiencePerKill: number;
  allowMultipleArmies: boolean;
  requireArmyForgeIntegration: boolean;
  customRules: CustomRule[];
}

export interface CustomRule {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
}

export type CampaignStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
export type BattleStatus = 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type MissionStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  memberCount: number;
  battleCount: number;
  completedBattles: number;
  createdAt: string;
}