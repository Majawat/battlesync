import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [profile] = useState(user);

  useEffect(() => {
    // Test API connectivity
    const checkHealth = async () => {
      try {
        const response = await apiClient.healthCheck();
        setHealth(response.data);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    checkHealth();
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">BattleSync</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.username}!</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-600 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Info Card */}
              <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-white mb-4">
                    User Information
                  </h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-400">Username</dt>
                      <dd className="mt-1 text-sm text-gray-200">{profile?.username}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-400">Role</dt>
                      <dd className="mt-1 text-sm text-gray-200">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          profile?.role === 'SERVER_OWNER' 
                            ? 'bg-purple-900 text-purple-200' 
                            : 'bg-blue-900 text-blue-200'
                        }`}>
                          {profile?.role}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-400">Email</dt>
                      <dd className="mt-1 text-sm text-gray-200">{profile?.email || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-400">Status</dt>
                      <dd className="mt-1 text-sm text-gray-200">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-200">
                          Active
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* System Status Card */}
              <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-white mb-4">
                    System Status
                  </h3>
                  {health ? (
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                      <div>
                        <dt className="text-sm font-medium text-gray-400">API Status</dt>
                        <dd className="mt-1 text-sm text-gray-200">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-200">
                            Online
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-400">Service</dt>
                        <dd className="mt-1 text-sm text-gray-200">{health.service}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-400">Version</dt>
                        <dd className="mt-1 text-sm text-gray-200">{health.version}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-400">Environment</dt>
                        <dd className="mt-1 text-sm text-gray-200">{health.environment}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-400">Loading system status...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Features Coming Soon */}
            <div className="mt-8 bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-white mb-4">
                  🚀 Coming Soon
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-white">Gaming Groups</h4>
                    <p className="text-sm text-gray-400 mt-1">Create and manage gaming groups</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-white">Campaigns</h4>
                    <p className="text-sm text-gray-400 mt-1">Track multiple OPR campaigns</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-white">Battle Tracking</h4>
                    <p className="text-sm text-gray-400 mt-1">Real-time battle management</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};