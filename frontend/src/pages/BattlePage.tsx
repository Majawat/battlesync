import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { battleApi } from '../api/client';
import type { Battle, UnitBattleState } from '../types/api';

export default function BattlePage() {
  const { id } = useParams<{ id: string }>();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [unitStates, setUnitStates] = useState<UnitBattleState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchBattleData = async () => {
      try {
        const [battleResponse, unitStatesResponse] = await Promise.all([
          battleApi.getBattle(id),
          battleApi.getUnitStates(id).catch(() => ({ success: true, unit_states: [] }))
        ]) as [any, any];

        if (battleResponse.success) {
          setBattle(battleResponse.battle);
        } else {
          throw new Error(battleResponse.error || 'Failed to fetch battle');
        }

        if (unitStatesResponse.success) {
          setUnitStates(unitStatesResponse.unit_states || []);
        }

      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch battle data');
      } finally {
        setLoading(false);
      }
    };

    fetchBattleData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="card text-center">
          <p className="text-gray-500">Loading battle...</p>
        </div>
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="space-y-8">
        <div className="card">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error Loading Battle</p>
            <p className="text-sm">{error || 'Battle not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: Battle['status']) => {
    switch (status) {
      case 'setup': return 'bg-blue-100 text-blue-800';
      case 'deployment': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'finished': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Battle Header */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {battle.name}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(battle.status)}`}>
                {battle.status}
              </span>
            </div>

            {battle.description && (
              <p className="text-gray-600 mb-3">
                {battle.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>Mission: {battle.mission_type}</span>
              <span>•</span>
              <span>Points: {battle.points_limit}</span>
              <span>•</span>
              <span>Round: {battle.current_round}</span>
              {battle.has_command_points && (
                <>
                  <span>•</span>
                  <span>Command Points: {battle.command_point_mode}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right text-xs text-gray-500">
            <p>Created: {new Date(battle.created_at).toLocaleDateString()}</p>
            <p>Updated: {new Date(battle.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Battle Setup Phase */}
      {battle.status === 'setup' && (
        <BattleSetupPhase battle={battle} />
      )}

      {/* Unit States (for active battles) */}
      {unitStates.length > 0 && (
        <UnitStatesDisplay unitStates={unitStates} />
      )}

      {/* Battle in Progress */}
      {battle.status === 'deployment' || battle.status === 'active' ? (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Battle in Progress</h2>
          <p className="text-gray-600">
            Battle tracking interface coming soon. Use the API endpoints to manage unit states for now.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// Battle Setup Component
function BattleSetupPhase({ battle }: { battle: Battle }) {
  return (
    <div className="space-y-6">
      {/* Participants */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Battle Participants</h2>
        {battle.participants && battle.participants.length > 0 ? (
          <div className="space-y-3">
            {battle.participants.map((participant) => (
              <div key={participant.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{participant.player_name}</span>
                  {participant.doctrine && (
                    <span className="text-gray-600 ml-2">({participant.doctrine})</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Army ID: {participant.army_id}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">No participants added yet</p>
            <p className="text-sm text-gray-500">
              Add armies as battle participants to start the battle.
            </p>
          </div>
        )}
      </div>

      {/* Setup Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Battle Setup</h2>
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Battle setup interface coming soon. Current participants: {battle.participants?.length || 0}
          </p>
          
          {battle.participants && battle.participants.length >= 2 && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <p className="font-medium">Ready to Start!</p>
              <p className="text-sm">This battle has enough participants and can be started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Unit States Display Component
function UnitStatesDisplay({ unitStates }: { unitStates: UnitBattleState[] }) {
  const getHealthPercentage = (current: number, max: number) => {
    return Math.max(0, Math.min(100, (current / max) * 100));
  };

  const getHealthBarClass = (percentage: number) => {
    if (percentage > 66) return 'health-bar-fill';
    if (percentage > 33) return 'health-bar-fill health-bar-damaged';
    return 'health-bar-fill health-bar-critical';
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'normal': return 'unit-status-normal';
      case 'shaken': return 'unit-status-shaken';
      case 'routed': return 'unit-status-routed';
      default: return '';
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Unit Status ({unitStates.length} units)</h2>
      <div className="space-y-3">
        {unitStates.map((unitState) => {
          const healthPercentage = getHealthPercentage(unitState.current_health, unitState.max_health);
          
          return (
            <div key={unitState.id} className={`unit-card ${getStatusClass(unitState.status)}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Unit {unitState.unit_path} 
                    <span className="text-sm text-gray-600 ml-2">(Army {unitState.army_id})</span>
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span>Status: {unitState.status}</span>
                    {unitState.is_fatigued && <span className="text-yellow-600">Fatigued</span>}
                    {unitState.spell_tokens > 0 && <span>Tokens: {unitState.spell_tokens}</span>}
                    {unitState.activated_this_round && <span className="text-blue-600">Activated</span>}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <span className="font-medium">
                    {unitState.current_health}/{unitState.max_health} HP
                  </span>
                </div>
              </div>

              {/* Health Bar */}
              <div className="health-bar">
                <div 
                  className={getHealthBarClass(healthPercentage)}
                  style={{ width: `${healthPercentage}%` }}
                />
              </div>

              {/* Additional Info */}
              <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                <div className="flex space-x-3">
                  <span>Deploy: {unitState.deployment_status}</span>
                  {unitState.current_action && <span>Action: {unitState.current_action}</span>}
                </div>
                <span>Updated: {new Date(unitState.updated_at).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}