import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArmySummary } from '../types/army';
import { apiClient } from '../services/api';

interface ArmyCardProps {
  army: ArmySummary;
  onDelete: () => void;
  onRefresh: () => void;
}

export const ArmyCard: React.FC<ArmyCardProps> = ({
  army,
  onDelete,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSync = async () => {
    if (!army.lastSyncedAt) return; // Can't sync non-ArmyForge armies
    
    try {
      setSyncing(true);
      const response = await apiClient.syncArmy(army.id);
      if (response.data.status === 'success') {
        onRefresh(); // Refresh the army list
      }
    } catch (error: any) {
      console.error('Failed to sync army:', error);
      // TODO: Show error toast
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${army.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      await apiClient.deleteArmy(army.id);
      onDelete();
    } catch (error: any) {
      console.error('Failed to delete army:', error);
      // TODO: Show error toast
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getSyncStatus = () => {
    if (!army.lastSyncedAt) {
      return { color: 'text-gray-400', text: 'Custom Army' };
    }
    
    const lastSync = new Date(army.lastSyncedAt);
    const daysSinceSync = Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceSync === 0) {
      return { color: 'text-green-400', text: 'Synced today' };
    } else if (daysSinceSync <= 7) {
      return { color: 'text-yellow-400', text: `Synced ${daysSinceSync}d ago` };
    } else {
      return { color: 'text-red-400', text: `Synced ${daysSinceSync}d ago` };
    }
  };

  const syncStatus = getSyncStatus();

  return (
    <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white truncate">{army.name}</h3>
          <div className="flex items-center space-x-2">
            {army.hasCustomizations && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-900 text-purple-200">
                Custom
              </span>
            )}
            <span className={`text-xs ${syncStatus.color}`}>
              {syncStatus.text}
            </span>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-1">{army.faction}</p>
      </div>

      {/* Card Body */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{army.points}</div>
            <div className="text-xs text-gray-400">Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{army.unitCount}</div>
            <div className="text-xs text-gray-400">Units</div>
          </div>
        </div>

        {/* Experience & Battles */}
        {(army.experiencePoints > 0 || army.battlesPlayed > 0) && (
          <div className="mb-4 p-3 bg-gray-700 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Experience:</span>
                <span className="text-white ml-2">{army.experiencePoints}</span>
              </div>
              <div>
                <span className="text-gray-400">Battles:</span>
                <span className="text-white ml-2">{army.battlesPlayed}</span>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Info */}
        {army.campaignId && (
          <div className="mb-4">
            <div className="text-xs text-gray-400">Campaign</div>
            <div className="text-sm text-white truncate">Campaign {army.campaignId}</div>
          </div>
        )}

        {/* Last Synced */}
        <div className="text-xs text-gray-500">
          Last synced: {formatDate(army.lastSyncedAt)}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-gray-900 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/armies/${army.id}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded"
          >
            View Details
          </button>
          
          <div className="flex space-x-2">
            {army.lastSyncedAt && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-green-400 hover:text-green-300 text-sm disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};