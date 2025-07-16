import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface DamageHistoryEntry {
  id: string;
  battleId: string;
  userId: string;
  timestamp: string;
  actionType: 'DAMAGE_APPLIED' | 'DAMAGE_UNDONE';
  targetUnitId: string;
  targetModelId?: string;
  damage: number;
  sourceDescription?: string;
  canUndo: boolean;
  undoneAt?: string;
  undoneBy?: string;
}

interface DamageHistoryPanelProps {
  battleId: string;
  isVisible: boolean;
  onClose: () => void;
  onDamageUndone: () => void; // Callback to refresh battle state
}

export const DamageHistoryPanel: React.FC<DamageHistoryPanelProps> = ({
  battleId,
  isVisible,
  onClose,
  onDamageUndone
}) => {
  const [damageHistory, setDamageHistory] = useState<DamageHistoryEntry[]>([]);
  const [recentActions, setRecentActions] = useState<DamageHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('recent');

  // Load damage history
  const loadDamageHistory = async () => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [historyResponse, recentResponse] = await Promise.all([
        apiClient.getBattleDamageHistory(battleId, { limit: 50 }),
        apiClient.getRecentDamageActions(battleId, 10)
      ]);

      setDamageHistory(historyResponse.data.data || []);
      setRecentActions(recentResponse.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load damage history');
      console.error('Error loading damage history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Undo damage action
  const undoDamage = async (historyId: string) => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.undoDamage(battleId, historyId);

      // Refresh history and notify parent
      await loadDamageHistory();
      onDamageUndone();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to undo damage');
      console.error('Error undoing damage:', err);
    } finally {
      setLoading(false);
    }
  };

  // Undo most recent damage
  const undoLastDamage = async () => {
    if (recentActions.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      await apiClient.undoDamage(battleId);

      // Refresh history and notify parent
      await loadDamageHistory();
      onDamageUndone();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to undo last damage');
      console.error('Error undoing last damage:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Load data when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      loadDamageHistory();
    }
  }, [isVisible, battleId]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-xl font-bold">Damage History & Undo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Quick Undo Button */}
        <div className="p-4 border-b border-gray-600 bg-gray-750">
          <button
            onClick={undoLastDamage}
            disabled={loading || recentActions.length === 0}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded font-medium transition-colors"
          >
            {loading ? 'Undoing...' : 'Undo Last Damage'}
          </button>
          {recentActions.length > 0 && (
            <span className="ml-3 text-sm text-gray-400">
              Last: {recentActions[0].sourceDescription || 'Unknown damage'} 
              ({recentActions[0].damage} damage)
            </span>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-800 border-b border-gray-600">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-600">
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'recent'
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Recent Actions ({recentActions.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'all'
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Full History ({damageHistory.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading...</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-2">
              {(activeTab === 'recent' ? recentActions : damageHistory).map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded border ${
                    entry.undoneAt
                      ? 'bg-gray-750 border-gray-600 opacity-60'
                      : 'bg-gray-700 border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">
                          {formatTime(entry.timestamp)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            entry.actionType === 'DAMAGE_APPLIED'
                              ? 'bg-red-600 text-white'
                              : 'bg-green-600 text-white'
                          }`}
                        >
                          {entry.actionType === 'DAMAGE_APPLIED' ? 'DAMAGE' : 'UNDONE'}
                        </span>
                        {entry.undoneAt && (
                          <span className="px-2 py-1 rounded text-xs bg-gray-600 text-gray-300">
                            UNDONE
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-300">
                        <span className="font-medium">{entry.damage} damage</span>
                        {entry.sourceDescription && (
                          <span className="ml-2">• {entry.sourceDescription}</span>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-gray-400">
                        Target: {entry.targetUnitId}
                        {entry.targetModelId && ` → ${entry.targetModelId}`}
                      </div>
                    </div>

                    {/* Undo Button */}
                    {entry.canUndo && !entry.undoneAt && entry.actionType === 'DAMAGE_APPLIED' && (
                      <button
                        onClick={() => undoDamage(entry.id)}
                        disabled={loading}
                        className="ml-3 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {(activeTab === 'recent' ? recentActions : damageHistory).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No damage history found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600 bg-gray-750">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {activeTab === 'recent' 
                ? `${recentActions.filter(a => a.canUndo && !a.undoneAt).length} undoable actions`
                : `${damageHistory.length} total entries`
              }
            </span>
            <button
              onClick={loadDamageHistory}
              disabled={loading}
              className="text-blue-400 hover:text-blue-300 disabled:text-gray-500"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};