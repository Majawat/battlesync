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
}) => {
  const [error, setError] = useState<string | null>(null);


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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">ArmyForge Integration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
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

        {/* Current Integration Status */}
        <div className="mb-6 bg-blue-900 border border-blue-600 p-4 rounded">
          <h3 className="text-blue-200 font-medium mb-2">🔗 ArmyForge Integration Active</h3>
          <div className="text-blue-300 text-sm space-y-1">
            <div>✅ Connected to ArmyForge public API</div>
            <div>✅ Can import public armies using Army IDs</div>
            <div>✅ Real-time army data synchronization</div>
            <div>✅ Full unit and weapon details</div>
          </div>
        </div>

        <div className="mb-6 bg-gray-700 p-4 rounded">
          <h3 className="text-gray-300 font-medium mb-2">How to Import Armies:</h3>
          <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
            <li>Find any public army on ArmyForge (army-forge.onepagerules.com)</li>
            <li>Copy the Army ID from the URL (e.g., IJ1JM_m-jmka)</li>
            <li>Use the "Import Army" button on the main page</li>
            <li>Paste the Army ID and customize the name if desired</li>
          </ol>
        </div>

        <div className="mb-6 bg-yellow-900 border border-yellow-600 p-4 rounded">
          <h3 className="text-yellow-200 font-medium mb-2">🚧 Coming Soon: Private Army Support</h3>
          <div className="text-yellow-300 text-sm space-y-1">
            <div>🔐 Personal ArmyForge account integration</div>
            <div>📂 Access to your private armies</div>
            <div>🔄 Automatic sync with your army updates</div>
            <div>👤 Personalized army management</div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mb-6">
          <button
            onClick={clearCache}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear ArmyForge Cache
          </button>
          <div className="text-xs text-gray-400 mt-1 text-center">
            Clear cached army data to force fresh downloads
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Tips for Army Import:</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Works with any public army from ArmyForge</li>
            <li>• Army ID is the random string in the URL</li>
            <li>• Imported armies include full unit details and weapons</li>
            <li>• You can customize names and add battle experience</li>
            <li>• Sync feature keeps your armies up to date</li>
          </ul>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};