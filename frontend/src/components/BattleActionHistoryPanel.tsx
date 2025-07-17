import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface BattleActionHistoryEntry {
  id: string;
  battleId: string;
  userId: string;
  timestamp: string;
  actionType: 'DAMAGE_APPLIED' | 'SPELL_CAST' | 'UNIT_ACTION_SET' | 'UNIT_STATUS_CHANGED' | 'HERO_JOINED' | 'PHASE_CHANGED' | 'ROUND_ADVANCED' | 'COMMAND_POINTS_SPENT';
  actionData: {
    description: string;
    [key: string]: any;
  };
  canUndo: boolean;
  undoneAt?: string;
  undoneBy?: string;
  undoComplexity: 'simple' | 'complex' | 'cascade';
}

interface UndoSuggestion {
  type: 'last-action' | 'last-turn' | 'last-phase';
  title: string;
  description: string;
  actionId?: string;
  actionIds?: string[];
  complexity: 'simple' | 'complex' | 'cascade';
}

interface BattleActionHistoryPanelProps {
  battleId: string;
  isVisible: boolean;
  onClose: () => void;
  onActionUndone: () => void; // Callback to refresh battle state
}

export const BattleActionHistoryPanel: React.FC<BattleActionHistoryPanelProps> = ({
  battleId,
  isVisible,
  onClose,
  onActionUndone
}) => {
  const [actionHistory, setActionHistory] = useState<BattleActionHistoryEntry[]>([]);
  const [recentActions, setRecentActions] = useState<BattleActionHistoryEntry[]>([]);
  const [undoSuggestions, setUndoSuggestions] = useState<UndoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'recent' | 'all'>('suggestions');

  // Load action history and suggestions
  const loadActionHistory = async () => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [historyResponse, recentResponse, suggestionsResponse] = await Promise.all([
        apiClient.getBattleActionHistory(battleId, { limit: 100 }),
        apiClient.getRecentUndoableActions(battleId, 10),
        apiClient.getUndoSuggestions(battleId)
      ]);

      setActionHistory(historyResponse.data.data || []);
      setRecentActions(recentResponse.data.data || []);
      setUndoSuggestions(suggestionsResponse.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load action history');
      console.error('Error loading action history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Undo a specific action
  const undoAction = async (actionId: string) => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.undoBattleAction(battleId, { actionId });

      // Refresh history and notify parent
      await loadActionHistory();
      onActionUndone();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to undo action');
      console.error('Error undoing action:', err);
    } finally {
      setLoading(false);
    }
  };

  // Undo the last action
  const undoLastAction = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.undoBattleAction(battleId);

      // Refresh history and notify parent
      await loadActionHistory();
      onActionUndone();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to undo last action');
      console.error('Error undoing last action:', err);
    } finally {
      setLoading(false);
    }
  };

  // Execute undo suggestion
  const executeUndoSuggestion = async (suggestion: UndoSuggestion) => {
    setLoading(true);
    setError(null);

    try {
      if (suggestion.actionIds && suggestion.actionIds.length > 1) {
        // Cascade undo
        await apiClient.undoBattleActionCascade(battleId, { actionIds: suggestion.actionIds });
      } else {
        // Single action undo
        const actionId = suggestion.actionId || suggestion.actionIds?.[0];
        if (actionId) {
          await apiClient.undoBattleAction(battleId, { actionId });
        } else {
          await apiClient.undoBattleAction(battleId);
        }
      }

      // Refresh history and notify parent
      await loadActionHistory();
      onActionUndone();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to execute undo suggestion');
      console.error('Error executing undo suggestion:', err);
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

  // Get action type color
  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'DAMAGE_APPLIED': return 'bg-red-600';
      case 'SPELL_CAST': return 'bg-purple-600';
      case 'UNIT_ACTION_SET': return 'bg-blue-600';
      case 'UNIT_STATUS_CHANGED': return 'bg-yellow-600';
      case 'HERO_JOINED': return 'bg-green-600';
      case 'PHASE_CHANGED': return 'bg-indigo-600';
      case 'ROUND_ADVANCED': return 'bg-pink-600';
      case 'COMMAND_POINTS_SPENT': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  // Get complexity color
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'text-green-400';
      case 'complex': return 'text-yellow-400';
      case 'cascade': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Load data when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      loadActionHistory();
    }
  }, [isVisible, battleId]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-xl font-bold">Battle Action History & Undo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
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
            onClick={() => setActiveTab('suggestions')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'suggestions'
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Quick Undo ({undoSuggestions.length})
          </button>
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
            Full History ({actionHistory.length})
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

          {!loading && activeTab === 'suggestions' && (
            <div className="space-y-4">
              {undoSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No undo suggestions available</p>
                </div>
              ) : (
                undoSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-4 rounded border border-gray-600 bg-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">{suggestion.title}</h3>
                        <p className="text-sm text-gray-300 mb-2">{suggestion.description}</p>
                        <span className={`text-xs font-medium ${getComplexityColor(suggestion.complexity)}`}>
                          {suggestion.complexity.toUpperCase()} UNDO
                        </span>
                      </div>
                      <button
                        onClick={() => executeUndoSuggestion(suggestion)}
                        disabled={loading}
                        className="ml-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                ))
              )}

              {recentActions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-600">
                  <button
                    onClick={undoLastAction}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
                  >
                    Emergency Undo Last Action
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Last: {recentActions[0]?.actionData.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {!loading && (activeTab === 'recent' || activeTab === 'all') && (
            <div className="space-y-2">
              {(activeTab === 'recent' ? recentActions : actionHistory).map((entry) => (
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
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="text-sm font-medium">
                          {formatTime(entry.timestamp)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs text-white ${getActionTypeColor(entry.actionType)}`}
                        >
                          {entry.actionType.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-medium ${getComplexityColor(entry.undoComplexity)}`}>
                          {entry.undoComplexity}
                        </span>
                        {entry.undoneAt && (
                          <span className="px-2 py-1 rounded text-xs bg-gray-600 text-gray-300">
                            UNDONE
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-300">
                        {entry.actionData.description}
                      </div>
                    </div>

                    {/* Undo Button */}
                    {entry.canUndo && !entry.undoneAt && (
                      <button
                        onClick={() => undoAction(entry.id)}
                        disabled={loading}
                        className="ml-3 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {(activeTab === 'recent' ? recentActions : actionHistory).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No action history found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600 bg-gray-750">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {activeTab === 'suggestions' 
                ? `${undoSuggestions.length} suggestions available`
                : activeTab === 'recent' 
                ? `${recentActions.filter(a => a.canUndo && !a.undoneAt).length} undoable actions`
                : `${actionHistory.length} total entries`
              }
            </span>
            <button
              onClick={loadActionHistory}
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