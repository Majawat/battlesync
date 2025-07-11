import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { Campaign, CreateCampaignRequest } from '../types/campaign';
import { CreateCampaignModal } from './CreateCampaignModal';
import { CampaignCard } from './CampaignCard';

export const Campaigns: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState<string>('');

  useEffect(() => {
    if (!groupId) {
      navigate('/groups');
      return;
    }
    loadCampaigns();
    loadGroupInfo();
  }, [groupId]);

  const loadCampaigns = async () => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getGroupCampaigns(groupId);
      if (response.data.status === 'success' && response.data.data) {
        setCampaigns(response.data.data);
      } else {
        setError('Failed to load campaigns');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupInfo = async () => {
    if (!groupId) return;
    
    try {
      const response = await apiClient.getGamingGroup(groupId);
      if (response.data.status === 'success' && response.data.data) {
        setGroupName(response.data.data.name);
      }
    } catch (error: any) {
      console.error('Failed to load group info:', error);
    }
  };

  const handleCreateCampaign = async (data: CreateCampaignRequest) => {
    if (!groupId) return;
    
    try {
      const response = await apiClient.createCampaign(groupId, data);
      if (response.data.status === 'success' && response.data.data) {
        setCampaigns(prev => [...prev, response.data.data!]);
        setShowCreateModal(false);
      } else {
        throw new Error(response.data.message || 'Failed to create campaign');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.deleteCampaign(campaignId);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete campaign');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading campaigns...</p>
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
                onClick={() => navigate('/groups')}
                className="text-gray-400 hover:text-white"
              >
                ← Back to Groups
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
                <h2 className="text-3xl font-bold text-white">Campaigns</h2>
                <p className="text-gray-400 mt-2">
                  Manage campaigns for {groupName}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Campaign
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

          {/* Campaigns Grid */}
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-600 mb-4">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Campaigns</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first campaign</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  currentUserId={user?.id || ''}
                  onDelete={() => handleDeleteCampaign(campaign.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showCreateModal && groupId && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCampaign}
        />
      )}
    </div>
  );
};