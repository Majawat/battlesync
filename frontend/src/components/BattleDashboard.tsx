import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  OPRBattleState, 
  OPRBattleUnit,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setWsConnection] = useState<WebSocket | null>(null);

  // Fetch initial battle state
  const fetchBattleState = useCallback(async () => {
    try {
      const response = await fetch(`/api/opr/battles/${battleId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch battle state');
      }

      const data = await response.json();
      setBattleState(data.battle);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [battleId]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3001?token=${token}`);
    
    ws.onopen = () => {
      // Join battle room
      ws.send(JSON.stringify({
        type: 'join_room',
        data: { room: `battles:${battleId}` }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: BattleWebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'damage_applied':
            // Refresh battle state when damage is applied
            fetchBattleState();
            break;
          case 'phase_changed':
            // Update phase in real-time
            setBattleState(prev => prev ? {
              ...prev,
              phase: message.data.phase,
              currentRound: message.data.round,
              status: message.data.status
            } : null);
            break;
          case 'battle_completed':
            // Handle battle completion
            fetchBattleState();
            break;
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
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
      const response = await fetch(`/api/opr/battles/${battleId}/phase`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phase: newPhase })
      });

      if (!response.ok) {
        throw new Error('Failed to transition phase');
      }

      // State will be updated via WebSocket
    } catch (err) {
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  // Get current user's army
  const userArmy = battleState?.armies.find(army => army.userId === user?.id);
  const enemyArmies = battleState?.armies.filter(army => army.userId !== user?.id) || [];

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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onExit && (
              <button
                onClick={onExit}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                ← Exit
              </button>
            )}
            <h1 className="text-xl font-bold">OPR Battle</h1>
            <span className="text-sm text-gray-400">
              {battleState.phase.replace('_', ' ')} • Round {battleState.currentRound}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Phase Controls */}
            {canAdvancePhase(battleState.phase) && (
              <button
                onClick={() => {
                  const nextPhase = getNextPhase(battleState.phase);
                  if (nextPhase) handlePhaseTransition(nextPhase);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
              >
                Next Phase
              </button>
            )}
            
            {/* UI Mode Toggles */}
            <button
              onClick={() => setUIState(prev => ({ ...prev, compactMode: !prev.compactMode }))}
              className={`px-3 py-1 rounded text-xs ${
                uiState.compactMode ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              Compact
            </button>
            
            <button
              onClick={() => setUIState(prev => ({ ...prev, damageMode: !prev.damageMode }))}
              className={`px-3 py-1 rounded text-xs ${
                uiState.damageMode ? 'bg-red-600' : 'bg-gray-700'
              }`}
            >
              Damage Mode
            </button>
          </div>
        </div>
      </div>

      {/* Main Battle View */}
      <div className="flex flex-col lg:flex-row h-screen">
        {/* User Army Panel */}
        {userArmy && (
          <div className="lg:w-1/2 border-r border-gray-700 p-4">
            <h2 className="text-lg font-semibold mb-3 text-green-400">
              Your Army: {userArmy.armyName}
            </h2>
            <div className="text-sm text-gray-300 mb-4">
              {userArmy.faction} • {userArmy.totalPoints} pts • {userArmy.killCount} kills
            </div>
            
            <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {userArmy.units.map(unit => (
                <UnitCard
                  key={unit.unitId}
                  unit={unit}
                  isOwned={true}
                  isSelected={uiState.selectedUnit === unit.unitId}
                  damageMode={uiState.damageMode}
                  compactMode={uiState.compactMode}
                  onSelect={() => setUIState(prev => ({ 
                    ...prev, 
                    selectedUnit: prev.selectedUnit === unit.unitId ? undefined : unit.unitId 
                  }))}
                  onQuickDamage={(damage, modelId) => handleQuickDamage(unit.unitId, damage, modelId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Enemy Armies Panel */}
        <div className="lg:w-1/2 p-4">
          {enemyArmies.map(army => (
            <div key={army.userId} className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-red-400">
                Enemy: {army.armyName}
              </h2>
              <div className="text-sm text-gray-300 mb-4">
                {army.faction} • {army.totalPoints} pts • {army.killCount} kills
              </div>
              
              <div className="space-y-3">
                {army.units.map(unit => (
                  <UnitCard
                    key={unit.unitId}
                    unit={unit}
                    isOwned={false}
                    isSelected={uiState.selectedUnit === unit.unitId}
                    damageMode={uiState.damageMode}
                    compactMode={uiState.compactMode}
                    onSelect={() => setUIState(prev => ({ 
                      ...prev, 
                      selectedUnit: prev.selectedUnit === unit.unitId ? undefined : unit.unitId 
                    }))}
                    onQuickDamage={(damage, modelId) => handleQuickDamage(unit.unitId, damage, modelId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Unit Card Component
interface UnitCardProps {
  unit: OPRBattleUnit;
  isOwned: boolean;
  isSelected: boolean;
  damageMode: boolean;
  compactMode: boolean;
  onSelect: () => void;
  onQuickDamage: (damage: number, modelId?: string) => void;
}

const UnitCard: React.FC<UnitCardProps> = ({
  unit,
  isOwned,
  isSelected,
  damageMode,
  compactMode,
  onSelect,
  onQuickDamage
}) => {
  const isDestroyed = unit.currentSize === 0;
  const isShaken = unit.shaken;
  const isRouted = unit.routed;
  
  const statusColor = isDestroyed ? 'border-red-600' : 
                     isRouted ? 'border-red-400' :
                     isShaken ? 'border-yellow-400' : 
                     'border-gray-600';

  const bgColor = isOwned ? 'bg-gray-800' : 'bg-gray-750';

  return (
    <div 
      className={`border-2 ${statusColor} ${bgColor} rounded-lg p-3 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isDestroyed ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-medium text-sm">
            {unit.customName || unit.name}
          </h3>
          <div className="text-xs text-gray-400">
            {unit.type} • {unit.currentSize}/{unit.originalSize} models
            {unit.kills > 0 && ` • ${unit.kills} kills`}
          </div>
        </div>
        
        {/* Quick Damage Buttons (Touch Optimized) */}
        {damageMode && !isDestroyed && (
          <div className="flex space-x-1">
            {[1, 2, 3, 5].map(damage => (
              <button
                key={damage}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickDamage(damage);
                }}
                className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded text-xs font-bold touch-manipulation"
              >
                {damage}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unit Status Indicators */}
      <div className="flex items-center space-x-2 text-xs">
        {isRouted && <span className="px-2 py-1 bg-red-600 rounded">ROUTED</span>}
        {isShaken && !isRouted && <span className="px-2 py-1 bg-yellow-600 rounded">SHAKEN</span>}
        {unit.fatigued && <span className="px-2 py-1 bg-orange-600 rounded">FATIGUED</span>}
        {unit.action && <span className="px-2 py-1 bg-blue-600 rounded">{unit.action.toUpperCase()}</span>}
      </div>

      {/* Model Details (Expanded) */}
      {isSelected && !compactMode && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-xs space-y-1">
            {unit.models.filter(m => !m.isDestroyed).map(model => (
              <div key={model.modelId} className="flex items-center justify-between">
                <span className={model.isHero ? 'text-yellow-400 font-medium' : ''}>
                  {model.customName || model.name}
                  {model.isHero && ' (Hero)'}
                </span>
                <span className="text-gray-400">
                  {model.currentTough}/{model.maxTough} Tough
                </span>
                {damageMode && (
                  <div className="flex space-x-1">
                    {[1, 2, 3].map(damage => (
                      <button
                        key={damage}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickDamage(damage, model.modelId);
                        }}
                        className="w-6 h-6 bg-red-600 hover:bg-red-700 rounded text-xs touch-manipulation"
                      >
                        {damage}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};