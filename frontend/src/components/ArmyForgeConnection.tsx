import React, { useState } from 'react';
import { ArmyForgeStatus } from '../types/army';
import { apiClient } from '../services/api';

interface ArmyForgeConnectionProps {
  currentStatus: ArmyForgeStatus | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const ArmyForgeConnection: React.FC<ArmyForgeConnectionProps> = ({
  currentStatus,
  onClose,
  onUpdate,
}) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Update user profile with new ArmyForge token
      const response = await apiClient.updateProfile({ armyForgeToken: token });
      
      if (response.data.status === 'success') {
        onUpdate();
      } else {
        throw new Error(response.data.message || 'Failed to save token');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Failed to save token');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!token.trim()) {
      setError('Please enter a token first');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      // Save token temporarily and test
      await apiClient.updateProfile({ armyForgeToken: token });
      const response = await apiClient.getArmyForgeStatus();
      
      if (response.data.status === 'success' && response.data.data?.connected) {
        setError(null);
        // Show success message or automatically save
      } else {
        throw new Error('Token is invalid or expired');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from ArmyForge? You will lose sync capabilities.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.updateProfile({ armyForgeToken: '' });
      onUpdate();
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      await apiClient.clearArmyForgeCache();
      setError(null);
      // TODO: Show success toast
    } catch (error: any) {
      setError('Failed to clear cache');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">ArmyForge Integration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Current Status */}
        {currentStatus && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Current Status</h3>
            <div className={`p-3 rounded ${
              currentStatus.connected
                ? 'bg-green-900 border border-green-600'
                : 'bg-red-900 border border-red-600'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${
                    currentStatus.connected ? 'text-green-200' : 'text-red-200'
                  }`}>
                    {currentStatus.connected ? 'Connected' : 'Not Connected'}
                  </div>
                  {currentStatus.username && (
                    <div className="text-sm text-green-300">
                      Logged in as: {currentStatus.username}
                    </div>
                  )}
                  {currentStatus.expiresAt && (
                    <div className="text-xs text-green-400">
                      Expires: {new Date(currentStatus.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {currentStatus.apiStatus && (
                  <div className={`px-2 py-1 rounded text-xs ${
                    currentStatus.apiStatus === 'healthy' ? 'bg-green-800 text-green-200' :
                    currentStatus.apiStatus === 'degraded' ? 'bg-yellow-800 text-yellow-200' :
                    'bg-red-800 text-red-200'
                  }`}>
                    API: {currentStatus.apiStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-900 border border-red-600 text-red-200 p-3 rounded">
            {error}
          </div>
        )}

        {!currentStatus?.connected && (
          <form onSubmit={handleSaveToken}>
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="token">
                ArmyForge API Token *
              </label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter your ArmyForge API token"
                required
                disabled={loading || testing}
              />
              <div className="text-xs text-gray-400 mt-1">
                Get your API token from your ArmyForge account settings
              </div>
            </div>

            <div className="flex justify-end space-x-4 mb-4">
              <button
                type="button"
                onClick={handleTestConnection}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                disabled={loading || testing || !token.trim()}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || testing || !token.trim()}
              >
                {loading ? 'Saving...' : 'Save & Connect'}
              </button>
            </div>
          </form>
        )}

        {currentStatus?.connected && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <button
                onClick={clearCache}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear Cache
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 bg-gray-700 p-4 rounded">
          <h3 className="text-sm font-medium text-gray-300 mb-2">How to get your ArmyForge token:</h3>
          <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            <li>Log in to your ArmyForge account</li>
            <li>Go to Account Settings → API Access</li>
            <li>Generate a new API token</li>
            <li>Copy the token and paste it above</li>
          </ol>
          <div className="mt-2 text-xs text-gray-500">
            Your token is stored securely and encrypted in our database.
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-700"
            disabled={loading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};