import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { ArmySummary, ArmyForgeStatus } from '../types/army';
import { ArmyList } from './ArmyList';
import { ArmyImportModal } from './ArmyImportModal';
import { ArmyForgeConnection } from './ArmyForgeConnection';

export const ArmyManagement: React.FC = () => {
  const { user, logout } = useAuth();
  const [armies, setArmies] = useState<ArmySummary[]>([]);
  const [armyForgeStatus, setArmyForgeStatus] = useState<ArmyForgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  useEffect(() => {
    loadArmies();
    loadArmyForgeStatus();
  }, []);

  const loadArmies = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUserArmies();
      if (response.data.status === 'success' && response.data.data) {
        setArmies(response.data.data);
      } else {
        setError('Failed to load armies');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load armies');
    } finally {
      setLoading(false);
    }
  };

  const loadArmyForgeStatus = async () => {
    try {
      const response = await apiClient.getArmyForgeStatus();
      if (response.data.status === 'success' && response.data.data) {
        setArmyForgeStatus(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to load ArmyForge status:', error);
    }
  };

  const handleArmyImported = (newArmy: any) => {
    setArmies(prev => [...prev, newArmy.army]);
    setShowImportModal(false);
    loadArmies(); // Refresh to get the latest data
  };

  const handleArmyDeleted = (armyId: string) => {
    setArmies(prev => prev.filter(army => army.id !== armyId));
  };

  const handleConnectionUpdate = () => {
    setShowConnectionModal(false);
    loadArmyForgeStatus();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading armies...</p>
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
              <h1 className="text-xl font-semibold text-white">BattleSync</h1>
              <span className="text-gray-400">•</span>
              <span className="text-gray-300">Army Management</span>
            </div>
            <div className="flex items-center space-x-4">
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
                <h2 className="text-3xl font-bold text-white">Your Armies</h2>
                <p className="text-gray-400 mt-2">
                  Manage your armies and ArmyForge integration
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowConnectionModal(true)}
                  className={`px-4 py-2 rounded font-medium ${
                    armyForgeStatus?.connected
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  {armyForgeStatus?.connected ? 'ArmyForge Connected' : 'Connect ArmyForge'}
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={!armyForgeStatus?.connected}
                >
                  Import Army
                </button>
              </div>
            </div>
          </div>

          {/* ArmyForge Status */}
          {armyForgeStatus && (
            <div className="mb-6">
              <div className={`p-4 rounded-lg ${
                armyForgeStatus.connected
                  ? 'bg-green-900 border border-green-600'
                  : 'bg-yellow-900 border border-yellow-600'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-medium ${
                      armyForgeStatus.connected ? 'text-green-200' : 'text-yellow-200'
                    }`}>
                      ArmyForge Integration
                    </h3>
                    <p className={`text-sm mt-1 ${
                      armyForgeStatus.connected ? 'text-green-300' : 'text-yellow-300'
                    }`}>
                      {armyForgeStatus.connected
                        ? `Connected as ${armyForgeStatus.username}`
                        : armyForgeStatus.message || 'Not connected'
                      }
                    </p>
                  </div>
                  {armyForgeStatus.apiStatus && (
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        armyForgeStatus.apiStatus === 'healthy' ? 'bg-green-400' :
                        armyForgeStatus.apiStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></div>
                      <span className="text-xs text-gray-400">
                        API: {armyForgeStatus.apiStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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

          {/* Army List */}
          <ArmyList
            armies={armies}
            onArmyDeleted={handleArmyDeleted}
            onRefresh={loadArmies}
          />
        </div>
      </main>

      {/* Modals */}
      {showImportModal && (
        <ArmyImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleArmyImported}
        />
      )}

      {showConnectionModal && (
        <ArmyForgeConnection
          currentStatus={armyForgeStatus}
          onClose={() => setShowConnectionModal(false)}
          onUpdate={handleConnectionUpdate}
        />
      )}
    </div>
  );
};