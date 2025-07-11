import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { GamingGroup, CreateGamingGroupRequest, JoinGroupRequest } from '../types/gamingGroup';
import { CreateGroupModal } from './CreateGroupModal';
import { JoinGroupModal } from './JoinGroupModal';
import { GroupCard } from './GroupCard';

export const GamingGroups: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<GamingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUserGamingGroups();
      if (response.data.status === 'success' && response.data.data) {
        setGroups(response.data.data);
      } else {
        setError('Failed to load gaming groups');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load gaming groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (data: CreateGamingGroupRequest) => {
    try {
      const response = await apiClient.createGamingGroup(data);
      if (response.data.status === 'success' && response.data.data) {
        setGroups(prev => [...prev, response.data.data!]);
        setShowCreateModal(false);
      } else {
        throw new Error(response.data.message || 'Failed to create group');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create group');
    }
  };

  const handleJoinGroup = async (data: JoinGroupRequest) => {
    try {
      const response = await apiClient.joinGamingGroup(data);
      if (response.data.status === 'success' && response.data.data) {
        setGroups(prev => [...prev, response.data.data!]);
        setShowJoinModal(false);
      } else {
        throw new Error(response.data.message || 'Failed to join group');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to join group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this gaming group? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.deleteGamingGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to leave this gaming group?')) {
      return;
    }

    try {
      await apiClient.leaveGamingGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to leave group');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading gaming groups...</p>
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
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">BattleSync</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/armies')}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
              >
                My Armies
              </button>
              <span className="text-gray-300">Welcome, {user?.username}!</span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
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
                <h2 className="text-3xl font-bold text-white">Gaming Groups</h2>
                <p className="text-gray-400 mt-2">Manage your tabletop gaming communities</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Join Group
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create Group
                </button>
              </div>
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

          {/* Groups Grid */}
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-600 mb-4">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Gaming Groups</h3>
              <p className="text-gray-500 mb-6">Get started by creating a new group or joining an existing one</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create Your First Group
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Join Existing Group
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  currentUserId={user?.id || ''}
                  onDelete={() => handleDeleteGroup(group.id)}
                  onLeave={() => handleLeaveGroup(group.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
        />
      )}

      {showJoinModal && (
        <JoinGroupModal
          onClose={() => setShowJoinModal(false)}
          onSubmit={handleJoinGroup}
        />
      )}
    </div>
  );
};