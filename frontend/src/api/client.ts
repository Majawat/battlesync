import axios from 'axios';
import type {
  ImportArmyRequest,
  CreateBattleRequest,
  AddParticipantRequest,
  UpdateUnitStateRequest,
  ReassignUpgradeResponse,
  RenameModelResponse,
  ArmyResponse,
  ArmyListResponse,
  BasicResponse,
  BattleResponse,
  BattleListResponse,
  UnitStatesResponse,
  UnitStateResponse,
  HealthResponse,
} from '../types/api';

// In production, use same origin. In development, use localhost:4019
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:4019');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Army API
export const armyApi = {
  importArmy: async (data: ImportArmyRequest): Promise<ArmyResponse> => {
    const response = await api.post('/api/armies/import', data);
    return response.data as ArmyResponse;
  },

  listArmies: async (): Promise<ArmyListResponse> => {
    const response = await api.get('/api/armies');
    return response.data as ArmyListResponse;
  },

  getArmy: async (id: string): Promise<ArmyResponse> => {
    const response = await api.get(`/api/armies/${id}`);
    return response.data as ArmyResponse;
  },

  deleteArmy: async (id: string): Promise<BasicResponse> => {
    const response = await api.delete(`/api/armies/${id}`);
    return response.data as BasicResponse;
  },

  reassignUpgrade: async (armyId: string, data: {
    sourceModelId: string;
    targetModelId: string;
    upgradeIndex: number;
    subUnitId: string;
  }): Promise<ReassignUpgradeResponse> => {
    const response = await api.patch(`/api/armies/${armyId}/reassign-upgrade`, data);
    return response.data as ReassignUpgradeResponse;
  },

  renameModel: async (armyId: string, data: {
    modelId: string;
    customName: string;
  }): Promise<RenameModelResponse> => {
    const response = await api.patch(`/api/armies/${armyId}/rename-model`, data);
    return response.data as RenameModelResponse;
  },
};

// Battle API
export const battleApi = {
  createBattle: async (data: CreateBattleRequest): Promise<BattleResponse> => {
    const response = await api.post('/api/battles', data);
    return response.data as BattleResponse;
  },

  listBattles: async (): Promise<BattleListResponse> => {
    const response = await api.get('/api/battles');
    return response.data as BattleListResponse;
  },

  getBattle: async (id: string): Promise<BattleResponse> => {
    const response = await api.get(`/api/battles/${id}`);
    return response.data as BattleResponse;
  },

  addParticipant: async (battleId: string, data: AddParticipantRequest): Promise<BattleResponse> => {
    const response = await api.post(`/api/battles/${battleId}/participants`, data);
    return response.data as BattleResponse;
  },

  startBattle: async (battleId: string): Promise<BattleResponse> => {
    const response = await api.post(`/api/battles/${battleId}/start`, {});
    return response.data as BattleResponse;
  },

  getUnitStates: async (battleId: string): Promise<UnitStatesResponse> => {
    const response = await api.get(`/api/battles/${battleId}/units`);
    return response.data as UnitStatesResponse;
  },

  updateUnitState: async (battleId: string, unitStateId: string, data: UpdateUnitStateRequest): Promise<UnitStateResponse> => {
    const response = await api.patch(`/api/battles/${battleId}/units/${unitStateId}`, data);
    return response.data as UnitStateResponse;
  },
};

// Health check
export const healthApi = {
  getHealth: async (): Promise<HealthResponse> => {
    const response = await api.get('/health');
    return response.data as HealthResponse;
  },

  getInfo: async (): Promise<unknown> => {
    const response = await api.get('/');
    return response.data;
  },
};

export default api;