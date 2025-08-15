import axios from 'axios';
import type { 
  ImportArmyRequest,
  CreateBattleRequest,
  AddParticipantRequest,
  UpdateUnitStateRequest
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
  importArmy: async (data: ImportArmyRequest) => {
    const response = await api.post('/api/armies/import', data);
    return response.data;
  },

  listArmies: async () => {
    const response = await api.get('/api/armies');
    return response.data;
  },

  getArmy: async (id: string) => {
    const response = await api.get(`/api/armies/${id}`);
    return response.data;
  },

  deleteArmy: async (id: string) => {
    const response = await api.delete(`/api/armies/${id}`);
    return response.data;
  },
};

// Battle API
export const battleApi = {
  createBattle: async (data: CreateBattleRequest) => {
    const response = await api.post('/api/battles', data);
    return response.data;
  },

  listBattles: async () => {
    const response = await api.get('/api/battles');
    return response.data;
  },

  getBattle: async (id: string) => {
    const response = await api.get(`/api/battles/${id}`);
    return response.data;
  },

  addParticipant: async (battleId: string, data: AddParticipantRequest) => {
    const response = await api.post(`/api/battles/${battleId}/participants`, data);
    return response.data;
  },

  startBattle: async (battleId: string) => {
    const response = await api.post(`/api/battles/${battleId}/start`, {});
    return response.data;
  },

  getUnitStates: async (battleId: string) => {
    const response = await api.get(`/api/battles/${battleId}/units`);
    return response.data;
  },

  updateUnitState: async (battleId: string, unitStateId: string, data: UpdateUnitStateRequest) => {
    const response = await api.patch(`/api/battles/${battleId}/units/${unitStateId}`, data);
    return response.data;
  },
};

// Health check
export const healthApi = {
  getHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  getInfo: async () => {
    const response = await api.get('/');
    return response.data;
  },
};

export default api;