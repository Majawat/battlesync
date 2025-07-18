import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface OPRActivationSlot {
  playerId: string;
  armyId: string;
  turnNumber: number;
  isPassed: boolean;
  activatedUnitId?: string;
  timestamp?: string;
}

interface OPRActivationState {
  currentTurn: number;
  maxTurns: number;
  activatingPlayerId?: string;
  activationOrder: OPRActivationSlot[];
  unitsActivatedThisRound: string[];
  isAwaitingActivation: boolean;
  canPassTurn: boolean;
  passedPlayers: string[];
  roundComplete: boolean;
}

interface OPRBattleUnit {
  unitId: string;
  name: string;
  customName?: string;
  currentSize: number;
  routed: boolean;
  activationState: {
    canActivate: boolean;
    hasActivated: boolean;
    activatedInRound: number;
    activatedInTurn: number;
    isSelected: boolean;
    actionPoints: number;
  };
}

interface ActivationStatus {
  activationState: OPRActivationState;
  isYourTurn: boolean;
  availableUnits: OPRBattleUnit[];
  canStartNewRound: boolean;
}

interface ActivationPanelProps {
  battleId: string;
  userId: string;
  isVisible: boolean;
  onClose: () => void;
  onActivationComplete: () => void;
}

export const ActivationPanel: React.FC<ActivationPanelProps> = ({
  battleId,
  userId,
  isVisible,
  onClose,
  onActivationComplete
}) => {
  const [activationStatus, setActivationStatus] = useState<ActivationStatus | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load activation status
  const loadActivationStatus = async () => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getActivationStatus(battleId);
      setActivationStatus(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load activation status');
      console.error('Error loading activation status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Start new round
  const startNewRound = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.startNewRound(battleId);
      await loadActivationStatus();
      onActivationComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start new round');
      console.error('Error starting new round:', err);
    } finally {
      setLoading(false);
    }
  };

  // Activate selected unit
  const activateUnit = async () => {
    if (!selectedUnitId) return;

    setLoading(true);
    setError(null);

    try {
      await apiClient.activateUnit(battleId, { 
        unitId: selectedUnitId,
        actions: [] // For now, no specific actions
      });

      setSelectedUnitId(null);
      await loadActivationStatus();
      onActivationComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate unit');
      console.error('Error activating unit:', err);
    } finally {
      setLoading(false);
    }
  };

  // Pass activation
  const passActivation = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.passActivation(battleId, { 
        reason: 'No units to activate' 
      });

      await loadActivationStatus();
      onActivationComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to pass activation');
      console.error('Error passing activation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      loadActivationStatus();
    }
  }, [isVisible, battleId]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-xl font-bold">Turn-Based Activation</h2>
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

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading...</p>
            </div>
          )}

          {!loading && activationStatus && (
            <div className="space-y-6">
              {/* Round Status */}
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-2">Round Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Current Turn:</span> 
                    <span className="ml-2 font-medium">{activationStatus.activationState.currentTurn} / {activationStatus.activationState.maxTurns}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Round Complete:</span> 
                    <span className={`ml-2 font-medium ${activationStatus.activationState.roundComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                      {activationStatus.activationState.roundComplete ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Round Button */}
              {activationStatus.canStartNewRound && (
                <div className="bg-blue-700 p-4 rounded">
                  <h3 className="text-lg font-medium mb-2">Start New Round</h3>
                  <p className="text-sm text-gray-300 mb-3">
                    The current round is complete. Start the next round to continue the battle.
                  </p>
                  <button
                    onClick={startNewRound}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium transition-colors"
                  >
                    Start New Round
                  </button>
                </div>
              )}

              {/* Current Turn */}
              {activationStatus.isYourTurn && !activationStatus.activationState.roundComplete && (
                <div className="bg-green-700 p-4 rounded">
                  <h3 className="text-lg font-medium mb-2">Your Turn to Activate</h3>
                  
                  {activationStatus.availableUnits.length === 0 ? (
                    <div>
                      <p className="text-sm text-gray-300 mb-3">
                        You have no units available to activate. You can pass this turn.
                      </p>
                      <button
                        onClick={passActivation}
                        disabled={loading}
                        className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium transition-colors"
                      >
                        Pass Turn
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-300 mb-3">
                        Select a unit to activate:
                      </p>
                      
                      {/* Unit Selection */}
                      <div className="space-y-2 mb-4">
                        {activationStatus.availableUnits.map(unit => (
                          <label
                            key={unit.unitId}
                            className={`flex items-center p-3 rounded cursor-pointer transition-colors ${
                              selectedUnitId === unit.unitId
                                ? 'bg-blue-600'
                                : 'bg-gray-600 hover:bg-gray-500'
                            }`}
                          >
                            <input
                              type="radio"
                              name="selectedUnit"
                              value={unit.unitId}
                              checked={selectedUnitId === unit.unitId}
                              onChange={(e) => setSelectedUnitId(e.target.value)}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-medium">
                                {unit.customName || unit.name}
                              </div>
                              <div className="text-xs text-gray-300">
                                {unit.currentSize} models • {unit.activationState.actionPoints} action points
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <button
                          onClick={activateUnit}
                          disabled={!selectedUnitId || loading}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium transition-colors"
                        >
                          Activate Unit
                        </button>
                        <button
                          onClick={passActivation}
                          disabled={loading}
                          className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium transition-colors"
                        >
                          Pass Turn
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Waiting for other player */}
              {!activationStatus.isYourTurn && !activationStatus.activationState.roundComplete && (
                <div className="bg-gray-700 p-4 rounded">
                  <h3 className="text-lg font-medium mb-2">Waiting for Activation</h3>
                  <p className="text-sm text-gray-300">
                    {activationStatus.activationState.activatingPlayerId === userId 
                      ? "It's your turn!" 
                      : "Waiting for another player to activate..."
                    }
                  </p>
                </div>
              )}

              {/* Activation Order */}
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-3">Activation Order</h3>
                <div className="space-y-2">
                  {activationStatus.activationState.activationOrder.map((slot, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        index < activationStatus.activationState.currentTurn - 1
                          ? 'bg-gray-600 opacity-60' // Past turns
                          : index === activationStatus.activationState.currentTurn - 1
                          ? 'bg-blue-600' // Current turn
                          : 'bg-gray-500' // Future turns
                      }`}
                    >
                      <span>Turn {slot.turnNumber}</span>
                      <span>Player: {slot.playerId}</span>
                      <span>
                        {slot.isPassed ? 'PASSED' : 
                         slot.activatedUnitId ? 'ACTIVATED' : 
                         index === activationStatus.activationState.currentTurn - 1 ? 'CURRENT' : 'PENDING'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600 bg-gray-750">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {activationStatus ? 
                `Turn ${activationStatus.activationState.currentTurn} of ${activationStatus.activationState.maxTurns}` : 
                'Loading activation status...'
              }
            </span>
            <button
              onClick={loadActivationStatus}
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