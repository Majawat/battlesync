import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { BattleUnitCard } from './BattleUnitCard';
import { BattleActionHistoryPanel } from './BattleActionHistoryPanel';
import { CommandPointPanel } from './CommandPointPanel';
import { CooperativeCastingNotification } from './CooperativeCastingNotification';
import { 
  OPRBattleState, 
  OPRBattlePhase,
  BattleUIState,
  DamageResult,
  BattleWebSocketMessage
} from '../types/oprBattle';

interface BattleDashboardProps {
  battleId: string;
  onExit?: () => void;
}

export const BattleDashboard: React.FC<BattleDashboardProps> = ({ battleId, onExit }) => {
  const { user } = useAuth();
  const [battleState, setBattleState] = useState<OPRBattleState | null>(null);
  const [uiState, setUIState] = useState<BattleUIState>({
    selectedUnit: undefined,
    selectedModel: undefined,
    damageMode: false,
    showDetails: false,
    compactMode: false
  });
  const [selectedArmyId, setSelectedArmyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setWsConnection] = useState<WebSocket | null>(null);
  const [showActionHistory, setShowActionHistory] = useState(false);
  const [cooperativeCastingHandler, setCooperativeCastingHandler] = useState<((request: any) => void) | null>(null);

  // Fetch initial battle state
  const fetchBattleState = useCallback(async () => {
    try {
      const response = await fetch(`/api/opr/battles/${battleId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch battle state');
      }

      const data = await response.json();
      console.log('Battle state response:', data); // Debug log
      if (data.success && data.data) {
        setBattleState(data.data);
      } else {
        throw new Error(data.error || 'Invalid battle state response');
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [battleId]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onopen = () => {
      console.log('WebSocket connected, authenticating...');
      // First authenticate with token
      ws.send(JSON.stringify({
        type: 'auth',
        data: { token }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: BattleWebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        switch (message.type) {
          case 'welcome':
            console.log('WebSocket welcome message received:', message.data);
            break;
          case 'auth':
            if (message.data.success) {
              console.log('WebSocket authenticated successfully, joining battle room:', `battles:${battleId}`);
              // Now join the battle room
              ws.send(JSON.stringify({
                type: 'join_room',
                data: { 
                  roomId: `battles:${battleId}`,
                  roomType: 'battle'
                }
              }));
            } else {
              console.error('WebSocket authentication failed:', message.data);
            }
            break;
          case 'join_room':
            if (message.data.success) {
              console.log('Successfully joined battle room:', message.data.roomId);
            } else {
              console.error('Failed to join battle room:', message.data);
            }
            break;
          case 'error':
            console.error('WebSocket error:', message.data || message.error);
            break;
          case 'damage_applied':
            // Refresh battle state when damage is applied
            console.log('Damage applied, refreshing battle state');
            fetchBattleState();
            break;
          case 'phase_changed':
            // Update phase in real-time
            console.log('Phase changed:', message.data);
            setBattleState(prev => prev ? {
              ...prev,
              phase: message.data.phase,
              currentRound: message.data.round,
              status: message.data.status
            } : null);
            break;
          case 'unit_action':
            // Handle unit action updates
            console.log('Unit action WebSocket message:', message.data);
            fetchBattleState();
            break;
          case 'spell_cast':
            // Handle spell casting updates
            console.log('Spell cast WebSocket message:', message.data);
            fetchBattleState();
            break;
          case 'round_advanced':
            // Handle round advancement updates
            console.log('Round advanced WebSocket message:', message.data);
            fetchBattleState();
            break;
          case 'battle_completed':
            // Handle battle completion
            console.log('Battle completed, refreshing battle state');
            fetchBattleState();
            break;
          case 'cooperative_casting_request':
            // Handle cooperative casting request
            console.log('Cooperative casting request:', message.data);
            if (cooperativeCastingHandler) {
              cooperativeCastingHandler(message.data);
            }
            break;
          case 'cooperative_casting_response':
            // Handle cooperative casting response
            console.log('Cooperative casting response:', message.data);
            // You might want to show a notification about who responded
            break;
          case 'spell_cast_complete':
            // Handle spell cast completion
            console.log('Spell cast complete:', message.data);
            fetchBattleState();
            break;
          default:
            console.log('Unhandled WebSocket message type:', message.type);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWsConnection(ws);

    return () => {
      ws.close();
    };
  }, [battleId, fetchBattleState]);

  // Load initial data
  useEffect(() => {
    fetchBattleState();
  }, [fetchBattleState]);

  // Phase transition handler
  const handlePhaseTransition = async (newPhase: OPRBattlePhase) => {
    try {
      console.log('Attempting phase transition to:', newPhase);
      const response = await fetch(`/api/opr/battles/${battleId}/phase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ phase: newPhase })
      });

      console.log('Phase transition response:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Phase transition error:', errorData);
        throw new Error(errorData.error || 'Failed to transition phase');
      }

      // Immediately update local state to prevent race condition
      setBattleState(prev => prev ? {
        ...prev,
        phase: newPhase,
        status: newPhase === 'BATTLE_ROUNDS' ? 'ACTIVE' : prev.status,
        currentRound: newPhase === 'BATTLE_ROUNDS' ? 1 : prev.currentRound
      } : null);

      // State will also be updated via WebSocket
    } catch (err) {
      console.error('Phase transition error:', err);
      setError(err instanceof Error ? err.message : 'Failed to transition phase');
    }
  };

  // Quick damage application
  const handleQuickDamage = async (unitId: string, damage: number, modelId?: string) => {
    try {
      const response = await fetch(`/api/opr/battles/${battleId}/quick-damage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          unitId,
          modelId,
          quickDamage: damage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply damage');
      }

      const result: DamageResult = await response.json();
      
      // Show damage result notification
      if (result.unitDestroyed) {
        // Could show toast notification here
        console.log('Unit destroyed!');
      }

      // State will be updated via WebSocket
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply damage');
    }
  };

  // Command point spending handler
  const handleSpendCommandPoints = async (armyId: string, amount: number, purpose: string, targetUnitId?: string) => {
    try {
      const response = await fetch(`/api/command-points/battles/${battleId}/command-points/spend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          armyId,
          commandPointsToSpend: amount,
          purpose,
          targetUnitId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to spend command points');
      }

      // State will be updated via WebSocket
      console.log(`Spent ${amount} CP for: ${purpose}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spend command points');
    }
  };

  // Unit action handler
  const handleUnitAction = async (unitId: string, action: 'hold' | 'advance' | 'rush' | 'charge', targetId?: string) => {
    try {
      const response = await fetch(`/api/opr/battles/${battleId}/unit-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          unitId,
          action,
          targetId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to perform action');
      }

      // State will be updated via WebSocket
      console.log(`Unit ${unitId} performed action: ${action}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform unit action');
    }
  };

  // Spell casting handler
  const handleCastSpell = async (unitId: string, spellId: string, cooperatingCasters: any[] = []) => {
    try {
      const spellCastAttempt = {
        spellId,
        casterUnitId: unitId,
        tokensCost: 1, // This should come from the spell data, but defaulting to 1
        cooperatingCasters,
        targetUnitIds: [] // This should be selected in the modal
      };

      const response = await fetch('/api/spells/cast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          battleId,
          spellCastAttempt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cast spell');
      }

      const result = await response.json();
      console.log(`Spell cast result:`, result);
      
      // Battle state will be updated via WebSocket
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cast spell');
    }
  };

  // Get armies and current view
  const userArmy = battleState?.armies.find(army => army.userId === user?.id);
  const allArmies = battleState?.armies || [];
  
  // Determine which army to display (default to user's army)
  const displayedArmy = selectedArmyId 
    ? allArmies.find(army => army.userId === selectedArmyId) 
    : userArmy;
  
  // Auto-select user army on load
  useEffect(() => {
    if (userArmy && !selectedArmyId) {
      setSelectedArmyId(userArmy.userId);
    }
  }, [userArmy, selectedArmyId]);

  // Debug logging
  useEffect(() => {
    if (battleState && user && displayedArmy) {
      console.log('Battle Debug:', {
        phase: battleState.phase,
        isMyArmy: displayedArmy.userId === user.id,
        canAct: displayedArmy.userId === user.id && battleState.phase === 'BATTLE_ROUNDS',
        userId: user.id,
        armyUserId: displayedArmy.userId
      });
    }
  }, [battleState, user, displayedArmy]);

  // Phase progression logic
  const getNextPhase = (currentPhase: OPRBattlePhase): OPRBattlePhase | null => {
    switch (currentPhase) {
      case 'GAME_SETUP': return 'DEPLOYMENT';
      case 'DEPLOYMENT': return 'BATTLE_ROUNDS';
      case 'BATTLE_ROUNDS': return 'GAME_END';
      default: return null;
    }
  };

  const canAdvancePhase = (phase: OPRBattlePhase): boolean => {
    return getNextPhase(phase) !== null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Loading battle...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error: {error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!battleState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Battle not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Enhanced Header */}
      <div className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-600/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {onExit && (
                <button
                  onClick={onExit}
                  className="flex items-center px-3 py-2 bg-gray-700/80 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Exit Battle
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  OPR Battle Tracker
                </h1>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-200 border border-blue-700/50">
                    {battleState.phase.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-300">
                    Round {battleState.currentRound}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Phase Controls */}
              {canAdvancePhase(battleState.phase) && (
                <button
                  onClick={() => {
                    const nextPhase = getNextPhase(battleState.phase);
                    console.log('Current phase:', battleState.phase, 'Next phase:', nextPhase);
                    if (nextPhase) handlePhaseTransition(nextPhase);
                  }}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Next Phase
                </button>
              )}
              
              {/* UI Mode Toggles */}
              <button
                onClick={() => setUIState(prev => ({ ...prev, compactMode: !prev.compactMode }))}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                  uiState.compactMode 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Compact
              </button>
              
              <button
                onClick={() => setUIState(prev => ({ ...prev, damageMode: !prev.damageMode }))}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                  uiState.damageMode 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Damage Mode
              </button>
              
              <button
                onClick={() => setShowActionHistory(true)}
                className="flex items-center px-3 py-2 bg-yellow-600/80 hover:bg-yellow-600 rounded-lg text-xs font-medium transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Undo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Army Selector */}
      <div className="bg-gray-800/50 border-b border-gray-600/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <span className="text-sm font-medium text-gray-400 whitespace-nowrap">View Army:</span>
            {allArmies.map(army => {
              const isUserArmy = army.userId === user?.id;
              const isSelected = selectedArmyId === army.userId;
              
              return (
                <button
                  key={army.userId}
                  onClick={() => setSelectedArmyId(army.userId)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isSelected
                      ? isUserArmy
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
                      : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/80'
                  }`}
                >
                  {isUserArmy && (
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  )}
                  {army.armyName}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Army View */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {displayedArmy ? (
          <div>
            {/* Army Header */}
            <div className="mb-6 p-6 bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl border border-gray-600/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-2xl font-bold ${
                  displayedArmy.userId === user?.id 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {displayedArmy.userId === user?.id ? '👤 Your Army' : '⚔️ Enemy Army'}: {displayedArmy.armyName}
                </h2>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Battle Performance</div>
                  <div className="text-lg font-semibold text-white">
                    {displayedArmy.killCount} Kills
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/40 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Faction</div>
                  <div className="text-lg font-medium text-white">{displayedArmy.faction}</div>
                </div>
                <div className="bg-gray-900/40 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Points Value</div>
                  <div className="text-lg font-medium text-white">{displayedArmy.totalPoints} pts</div>
                </div>
                <div className="bg-gray-900/40 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Unit Count</div>
                  <div className="text-lg font-medium text-white">{displayedArmy.units.length} units</div>
                </div>
              </div>
            </div>
            
            {/* Command Points Panel - Only show for user's own army */}
            {displayedArmy.userId === user?.id && (
              <div className="mb-6">
                <CommandPointPanel
                  army={displayedArmy}
                  onSpendCommandPoints={handleSpendCommandPoints}
                  canSpend={battleState.phase === 'BATTLE_ROUNDS'}
                />
              </div>
            )}
            
            {/* Units Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {displayedArmy.units.map(unit => (
                <BattleUnitCard
                  key={unit.unitId}
                  unit={unit}
                  isOwned={displayedArmy.userId === user?.id}
                  isSelected={uiState.selectedUnit === unit.unitId}
                  damageMode={uiState.damageMode}
                  compactMode={uiState.compactMode}
                  canAct={displayedArmy.userId === user?.id}
                  onSelect={() => setUIState(prev => ({ 
                    ...prev, 
                    selectedUnit: prev.selectedUnit === unit.unitId ? undefined : unit.unitId 
                  }))}
                  onQuickDamage={(damage, modelId) => handleQuickDamage(unit.unitId, damage, modelId)}
                  onAction={(action, targetId) => handleUnitAction(unit.unitId, action, targetId)}
                  onCastSpell={(spellId, cooperatingCasters) => handleCastSpell(unit.unitId, spellId, cooperatingCasters)}
                  allArmies={allArmies}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">No army selected</div>
          </div>
        )}
      </div>

      {/* Battle Action History Panel */}
      <BattleActionHistoryPanel
        battleId={battleId}
        isVisible={showActionHistory}
        onClose={() => setShowActionHistory(false)}
        onActionUndone={() => {
          fetchBattleState();
          setShowActionHistory(false);
        }}
      />

      {/* Cooperative Casting Notification */}
      <CooperativeCastingNotification
        battleId={battleId}
        onCooperativeCastingRequest={(handler) => setCooperativeCastingHandler(() => handler)}
      />
    </div>
  );
};