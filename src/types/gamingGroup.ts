export interface GamingGroupData {
  id: string;
  name: string;
  description: string | null;
  owner: {
    id: string;
    username: string;
    email: string | null;
  };
  inviteCode: string;
  members: GamingGroupMember[];
  campaignCount: number;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GamingGroupMember {
  id: string;
  username: string;
  email: string | null;
  role: GroupRole;
  joinedAt: Date;
}

export interface CreateGamingGroupRequest {
  name: string;
  description?: string;
}

export interface JoinGroupRequest {
  inviteCode: string;
}

export interface UpdateGamingGroupRequest {
  name?: string;
  description?: string;
}

export type GroupRole = 'ADMIN' | 'MEMBER';

export interface GamingGroupSummary {
  id: string;
  name: string;
  memberCount: number;
  campaignCount: number;
  role: 'OWNER' | GroupRole;
}