// Simplified API client without complex axios types
import axios from 'axios';
import { LoginRequest, RegisterRequest } from '../types/auth';
import { CreateGamingGroupRequest, JoinGroupRequest } from '../types/gamingGroup';
import { CreateCampaignRequest } from '../types/campaign';
import { CreateMissionRequest, UpdateMissionRequest } from '../types/mission';
import { 
  ArmyImportRequest, 
  ArmySyncRequest,
  UpdateArmyCustomizationsRequest,
  BattleHonor,
  VeteranUpgrade
} from '../types/army';

class ApiClient {
  private client: any;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config: any) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await this.refreshToken(refreshToken);
              const { accessToken } = response.data.data || {};
              if (accessToken) {
                localStorage.setItem('accessToken', accessToken);
              }
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            } catch (refreshError) {
              // Refresh failed, redirect to login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<any> {
    return this.client.post('/auth/register', data);
  }

  async login(data: LoginRequest): Promise<any> {
    return this.client.post('/auth/login', data);
  }

  async refreshToken(refreshToken: string): Promise<any> {
    return this.client.post('/auth/refresh', { refreshToken });
  }

  async logout(): Promise<any> {
    return this.client.post('/auth/logout');
  }

  async getProfile(): Promise<any> {
    return this.client.get('/auth/profile');
  }

  async updateProfile(data: { email?: string; armyForgeToken?: string }): Promise<any> {
    return this.client.put('/auth/profile', data);
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<any> {
    return this.client.post('/auth/change-password', data);
  }

  async deleteAccount(): Promise<any> {
    return this.client.delete('/auth/account');
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.client.get('/health');
  }

  // Gaming Groups endpoints
  async createGamingGroup(data: CreateGamingGroupRequest): Promise<any> {
    return this.client.post('/groups', data);
  }

  async joinGamingGroup(data: JoinGroupRequest): Promise<any> {
    return this.client.post('/groups/join', data);
  }

  async getUserGamingGroups(): Promise<any> {
    return this.client.get('/groups');
  }

  async getGamingGroup(groupId: string): Promise<any> {
    return this.client.get(`/groups/${groupId}`);
  }

  async updateGamingGroup(groupId: string, data: Partial<CreateGamingGroupRequest>): Promise<any> {
    return this.client.put(`/groups/${groupId}`, data);
  }

  async leaveGamingGroup(groupId: string): Promise<any> {
    return this.client.post(`/groups/${groupId}/leave`);
  }

  async deleteGamingGroup(groupId: string): Promise<any> {
    return this.client.delete(`/groups/${groupId}`);
  }

  async regenerateInviteCode(groupId: string): Promise<any> {
    return this.client.post(`/groups/${groupId}/regenerate-invite`);
  }

  // Campaign endpoints
  async getUserCampaigns(): Promise<any> {
    return this.client.get('/campaigns');
  }

  async createCampaign(groupId: string, data: CreateCampaignRequest): Promise<any> {
    return this.client.post(`/groups/${groupId}/campaigns`, data);
  }

  async getGroupCampaigns(groupId: string): Promise<any> {
    return this.client.get(`/groups/${groupId}/campaigns`);
  }

  async getCampaign(campaignId: string): Promise<any> {
    return this.client.get(`/campaigns/${campaignId}`);
  }

  async updateCampaign(campaignId: string, data: Partial<CreateCampaignRequest>): Promise<any> {
    return this.client.put(`/campaigns/${campaignId}`, data);
  }

  async joinCampaign(campaignId: string, data?: { primaryArmyId?: string }): Promise<any> {
    return this.client.post(`/campaigns/${campaignId}/join`, data || {});
  }

  async leaveCampaign(campaignId: string): Promise<any> {
    return this.client.post(`/campaigns/${campaignId}/leave`);
  }

  async deleteCampaign(campaignId: string): Promise<any> {
    return this.client.delete(`/campaigns/${campaignId}`);
  }

  // Mission endpoints
  async createMission(campaignId: string, data: CreateMissionRequest): Promise<any> {
    return this.client.post(`/campaigns/${campaignId}/missions`, data);
  }

  async getCampaignMissions(campaignId: string): Promise<any> {
    return this.client.get(`/campaigns/${campaignId}/missions`);
  }

  async getMissionById(missionId: string): Promise<any> {
    return this.client.get(`/missions/${missionId}`);
  }

  async updateMission(missionId: string, data: UpdateMissionRequest): Promise<any> {
    return this.client.put(`/missions/${missionId}`, data);
  }

  async deleteMission(missionId: string): Promise<any> {
    return this.client.delete(`/missions/${missionId}`);
  }

  // Army endpoints
  async importArmy(data: ArmyImportRequest): Promise<any> {
    return this.client.post('/armies/import', data);
  }

  async getUserArmies(params?: {
    campaignId?: string;
    faction?: string;
    gameSystem?: string;
    includeArmyForgeData?: boolean;
    includeCustomizations?: boolean;
    sortBy?: 'name' | 'faction' | 'points' | 'lastModified';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<any> {
    return this.client.get('/armies', { params });
  }

  async getArmy(armyId: string): Promise<any> {
    return this.client.get(`/armies/${armyId}`);
  }

  async syncArmy(armyId: string, data: ArmySyncRequest = {}): Promise<any> {
    return this.client.put(`/armies/${armyId}/sync`, data);
  }

  async updateArmyCustomizations(armyId: string, data: UpdateArmyCustomizationsRequest): Promise<any> {
    return this.client.put(`/armies/${armyId}/customizations`, data);
  }

  async deleteArmy(armyId: string, force: boolean = false): Promise<any> {
    const params = force ? { force: 'true' } : {};
    return this.client.delete(`/armies/${armyId}`, { params });
  }

  async addBattleHonor(armyId: string, battleHonor: Omit<BattleHonor, 'id' | 'dateEarned'>): Promise<any> {
    return this.client.post(`/armies/${armyId}/battle-honors`, battleHonor);
  }

  async addVeteranUpgrade(armyId: string, veteranUpgrade: Omit<VeteranUpgrade, 'id' | 'dateAcquired'>): Promise<any> {
    return this.client.post(`/armies/${armyId}/veteran-upgrades`, veteranUpgrade);
  }

  async getArmyStatistics(): Promise<any> {
    return this.client.get('/armies/statistics');
  }

  async validateArmy(armyId: string): Promise<any> {
    return this.client.get(`/armies/${armyId}/validate`);
  }

  async getArmyForgeStatus(): Promise<any> {
    return this.client.get('/armies/armyforge/status');
  }

  async clearArmyForgeCache(armyId?: string): Promise<any> {
    const params = armyId ? { armyId } : {};
    return this.client.delete('/armies/armyforge/cache', { params });
  }

  async updateArmyCampaignAssociation(armyId: string, campaignId: string | null): Promise<any> {
    return this.client.put(`/armies/${armyId}/campaign`, { campaignId });
  }

  // ============= CAMPAIGN MEMBERSHIP =============

  async getCampaignMembers(campaignId: string): Promise<any> {
    return this.client.get(`/campaigns/${campaignId}/members`);
  }

  async inviteMemberToCampaign(campaignId: string, data: { username: string; role?: 'ADMIN' | 'MEMBER' }): Promise<any> {
    return this.client.post(`/campaigns/${campaignId}/members/invite`, data);
  }

  async acceptCampaignInvitation(campaignId: string): Promise<any> {
    return this.client.post(`/campaigns/${campaignId}/accept-invitation`);
  }

  async updateCampaignMember(campaignId: string, membershipId: string, data: { role?: 'ADMIN' | 'MEMBER'; status?: 'ACTIVE' | 'INACTIVE' }): Promise<any> {
    return this.client.put(`/campaigns/${campaignId}/members/${membershipId}`, data);
  }

  async removeCampaignMember(campaignId: string, membershipId: string): Promise<any> {
    return this.client.delete(`/campaigns/${campaignId}/members/${membershipId}`);
  }

  // ============= GROUP MEMBERSHIP =============

  async getGroupMembers(groupId: string): Promise<any> {
    return this.client.get(`/groups/${groupId}/members`);
  }

  async inviteMemberToGroup(groupId: string, data: { username: string; role?: 'ADMIN' | 'MEMBER' }): Promise<any> {
    return this.client.post(`/groups/${groupId}/members/invite`, data);
  }

  async acceptGroupInvitation(groupId: string): Promise<any> {
    return this.client.post(`/groups/${groupId}/accept-invitation`);
  }

  async declineGroupInvitation(groupId: string): Promise<any> {
    return this.client.post(`/groups/${groupId}/decline-invitation`);
  }

  async updateGroupMember(groupId: string, membershipId: string, data: { role?: 'ADMIN' | 'MEMBER'; status?: 'ACTIVE' | 'INACTIVE' }): Promise<any> {
    return this.client.put(`/groups/${groupId}/members/${membershipId}`, data);
  }

  async removeGroupMember(groupId: string, membershipId: string): Promise<any> {
    return this.client.delete(`/groups/${groupId}/members/${membershipId}`);
  }

  async getPendingGroupInvitations(): Promise<any> {
    return this.client.get('/groups/invitations/pending');
  }
}

export const apiClient = new ApiClient();