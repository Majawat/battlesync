import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { Mission, CreateMissionRequest, UpdateMissionRequest, MissionStatus } from '../types/mission';
import { CreateMissionModal } from './CreateMissionModal';
import { MissionCard } from './MissionCard';

export const Missions: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignName, setCampaignName] = useState<string>('');

  useEffect(() => {
    if (!campaignId) {
      navigate('/groups');
      return;
    }
    loadMissions();
    loadCampaignInfo();
  }, [campaignId]);

  const loadMissions = async () => {
    if (!campaignId) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getCampaignMissions(campaignId);
      if (response.data.status === 'success' && response.data.data) {
        setMissions(response.data.data);
      } else {
        setError('Failed to load missions');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignInfo = async () => {
    if (!campaignId) return;
    
    try {
      const response = await apiClient.getCampaign(campaignId);
      if (response.data.status === 'success' && response.data.data) {
        setCampaignName(response.data.data.name);
      }
    } catch (error: any) {
      console.error('Failed to load campaign info:', error);
    }
  };

  const handleCreateMission = async (data: CreateMissionRequest) => {
    if (!campaignId) return;
    
    try {
      const response = await apiClient.createMission(campaignId, data);
      if (response.data.status === 'success' && response.data.data) {
        setMissions(prev => [...prev, response.data.data!]);
        setShowCreateModal(false);
      } else {
        throw new Error(response.data.message || 'Failed to create mission');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create mission');
    }
  };

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm('Are you sure you want to delete this mission? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.deleteMission(missionId);
      setMissions(prev => prev.filter(m => m.id !== missionId));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete mission');
    }
  };

  const handleUpdateMissionStatus = async (missionId: string, status: MissionStatus) => {
    try {
      const statusUpdate: UpdateMissionRequest = { status };
      const response = await apiClient.updateMission(missionId, statusUpdate);
      if (response.data.status === 'success') {
        setMissions(prev => prev.map(m => 
          m.id === missionId ? { ...m, status } : m
        ));
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update mission status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading missions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <nav className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-white">BattleSync</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.username}!</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white">Missions</h2>
                <p className="text-gray-400 mt-2">
                  Manage missions for {campaignName}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Mission
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded">
              {error}
              <button
                onClick={() => setError(null)}
                className="float-right text-red-200 hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          {/* Missions Grid */}
          {missions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-600 mb-4">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Missions</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first mission</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Your First Mission
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {missions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onDelete={() => handleDeleteMission(mission.id)}
                  onUpdateStatus={(status) => handleUpdateMissionStatus(mission.id, status)}
                  onBattleCreated={(battleId) => navigate(`/battles/${battleId}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showCreateModal && campaignId && (
        <CreateMissionModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateMission}
        />
      )}
    </div>
  );
};