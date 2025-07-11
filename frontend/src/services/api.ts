import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth';
import { GamingGroup, CreateGamingGroupRequest, JoinGroupRequest } from '../types/gamingGroup';
import { Campaign, CreateCampaignRequest } from '../types/campaign';
import { Mission, CreateMissionRequest, UpdateMissionRequest } from '../types/mission';
import { 
  Army, 
  ArmySummary, 
  ArmyImportRequest, 
  ArmyImportResponse,
  ArmySyncRequest,
  ArmySyncResult,
  UpdateArmyCustomizationsRequest,
  ArmyStatistics,
  ArmyValidationResult,
  ArmyForgeStatus,
  BattleHonor,
  VeteranUpgrade
} from '../types/army';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
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
  async register(data: RegisterRequest): Promise<AxiosResponse<ApiResponse<AuthResponse>>> {
    return this.client.post('/auth/register', data);
  }

  async login(data: LoginRequest): Promise<AxiosResponse<ApiResponse<AuthResponse>>> {
    return this.client.post('/auth/login', data);
  }

  async refreshToken(refreshToken: string): Promise<AxiosResponse<ApiResponse<{ accessToken: string }>>> {
    return this.client.post('/auth/refresh', { refreshToken });
  }

  async logout(): Promise<AxiosResponse<ApiResponse>> {
    return this.client.post('/auth/logout');
  }

  async getProfile(): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.client.get('/auth/profile');
  }

  async updateProfile(data: { email?: string; armyForgeToken?: string }): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.client.put('/auth/profile', data);
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<AxiosResponse<ApiResponse>> {
    return this.client.post('/auth/change-password', data);
  }

  async deleteAccount(): Promise<AxiosResponse<ApiResponse>> {
    return this.client.delete('/auth/account');
  }

  // Health check
  async healthCheck(): Promise<AxiosResponse<any>> {
    return this.client.get('/health');
  }

  // Gaming Groups endpoints
  async createGamingGroup(data: CreateGamingGroupRequest): Promise<AxiosResponse<ApiResponse<GamingGroup>>> {
    return this.client.post('/groups', data);
  }

  async joinGamingGroup(data: JoinGroupRequest): Promise<AxiosResponse<ApiResponse<GamingGroup>>> {
    return this.client.post('/groups/join', data);
  }

  async getUserGamingGroups(): Promise<AxiosResponse<ApiResponse<GamingGroup[]>>> {
    return this.client.get('/groups');
  }

  async getGamingGroup(groupId: string): Promise<AxiosResponse<ApiResponse<GamingGroup>>> {
    return this.client.get(`/groups/${groupId}`);
  }

  async updateGamingGroup(groupId: string, data: Partial<CreateGamingGroupRequest>): Promise<AxiosResponse<ApiResponse<GamingGroup>>> {
    return this.client.put(`/groups/${groupId}`, data);
  }

  async leaveGamingGroup(groupId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.client.post(`/groups/${groupId}/leave`);
  }

  async deleteGamingGroup(groupId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.client.delete(`/groups/${groupId}`);
  }

  async regenerateInviteCode(groupId: string): Promise<AxiosResponse<ApiResponse<{ inviteCode: string }>>> {
    return this.client.post(`/groups/${groupId}/regenerate-invite`);
  }

  // Campaign endpoints
  async createCampaign(groupId: string, data: CreateCampaignRequest): Promise<AxiosResponse<ApiResponse<Campaign>>> {
    return this.client.post(`/groups/${groupId}/campaigns`, data);
  }

  async getGroupCampaigns(groupId: string): Promise<AxiosResponse<ApiResponse<Campaign[]>>> {
    return this.client.get(`/groups/${groupId}/campaigns`);
  }

  async getCampaign(campaignId: string): Promise<AxiosResponse<ApiResponse<Campaign>>> {
    return this.client.get(`/campaigns/${campaignId}`);
  }

  async updateCampaign(campaignId: string, data: Partial<CreateCampaignRequest>): Promise<AxiosResponse<ApiResponse<Campaign>>> {
    return this.client.put(`/campaigns/${campaignId}`, data);
  }

  async joinCampaign(campaignId: string, data?: { primaryArmyId?: string }): Promise<AxiosResponse<ApiResponse<Campaign>>> {
    return this.client.post(`/campaigns/${campaignId}/join`, data || {});
  }

  async leaveCampaign(campaignId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.client.post(`/campaigns/${campaignId}/leave`);
  }

  async deleteCampaign(campaignId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.client.delete(`/campaigns/${campaignId}`);
  }

  // Mission endpoints

  async createMission(campaignId: string, data: CreateMissionRequest): Promise<AxiosResponse<ApiResponse<Mission>>> {
    return this.client.post(`/campaigns/${campaignId}/missions`, data);
  }

  async getCampaignMissions(campaignId: string): Promise<AxiosResponse<ApiResponse<Mission[]>>> {
    return this.client.get(`/campaigns/${campaignId}/missions`);
  }

  async getMissionById(missionId: string): Promise<AxiosResponse<ApiResponse<Mission>>> {
    return this.client.get(`/missions/${missionId}`);
  }

  async updateMission(missionId: string, data: UpdateMissionRequest): Promise<AxiosResponse<ApiResponse<Mission>>> {
    return this.client.put(`/missions/${missionId}`, data);
  }

  async deleteMission(missionId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.client.delete(`/missions/${missionId}`);
  }

  // Army endpoints
  async importArmy(data: ArmyImportRequest): Promise<AxiosResponse<ApiResponse<ArmyImportResponse>>> {
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
  }): Promise<AxiosResponse<ApiResponse<ArmySummary[]>>> {
    return this.client.get('/armies', { params });
  }

  async getArmy(armyId: string): Promise<AxiosResponse<ApiResponse<Army>>> {
    return this.client.get(`/armies/${armyId}`);
  }

  async syncArmy(armyId: string, data: ArmySyncRequest = {}): Promise<AxiosResponse<ApiResponse<ArmySyncResult>>> {
    return this.client.put(`/armies/${armyId}/sync`, data);
  }

  async updateArmyCustomizations(armyId: string, data: UpdateArmyCustomizationsRequest): Promise<AxiosResponse<ApiResponse<Army>>> {
    return this.client.put(`/armies/${armyId}/customizations`, data);
  }

  async deleteArmy(armyId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.client.delete(`/armies/${armyId}`);
  }

  async addBattleHonor(armyId: string, battleHonor: Omit<BattleHonor, 'id' | 'dateEarned'>): Promise<AxiosResponse<ApiResponse<Army>>> {
    return this.client.post(`/armies/${armyId}/battle-honors`, battleHonor);
  }

  async addVeteranUpgrade(armyId: string, veteranUpgrade: Omit<VeteranUpgrade, 'id' | 'dateAcquired'>): Promise<AxiosResponse<ApiResponse<Army>>> {
    return this.client.post(`/armies/${armyId}/veteran-upgrades`, veteranUpgrade);
  }

  async getArmyStatistics(): Promise<AxiosResponse<ApiResponse<ArmyStatistics>>> {
    return this.client.get('/armies/statistics');
  }

  async validateArmy(armyId: string): Promise<AxiosResponse<ApiResponse<ArmyValidationResult>>> {
    return this.client.get(`/armies/${armyId}/validate`);
  }

  async getArmyForgeStatus(): Promise<AxiosResponse<ApiResponse<ArmyForgeStatus>>> {
    return this.client.get('/armies/armyforge/status');
  }

  async clearArmyForgeCache(armyId?: string): Promise<AxiosResponse<ApiResponse>> {
    const params = armyId ? { armyId } : {};
    return this.client.delete('/armies/armyforge/cache', { params });
  }
}

export const apiClient = new ApiClient();