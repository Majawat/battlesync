import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { Army, ArmyForgeUnit } from '../types/army';

export const ArmyDetailView: React.FC = () => {
  const { armyId } = useParams<{ armyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [army, setArmy] = useState<Army | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!armyId) {
      navigate('/armies');
      return;
    }
    loadArmy();
  }, [armyId]);

  const loadArmy = async () => {
    if (!armyId) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getArmy(armyId);
      if (response.data.status === 'success' && response.data.data) {
        setArmy(response.data.data);
      } else {
        setError('Failed to load army details');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load army details');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!army || !army.armyForgeId) return;
    
    try {
      setSyncing(true);
      const response = await apiClient.syncArmy(army.id);
      if (response.data.status === 'success') {
        await loadArmy(); // Reload army data
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to sync army');
    } finally {
      setSyncing(false);
    }
  };

  const formatGameSystem = (gameSystem: string) => {
    const systems: Record<string, string> = {
      'gf': 'Grimdark Future',
      'aof': 'Age of Fantasy',
      'ff': 'Firefight',
      'wftl': 'Warfleets FTL'
    };
    return systems[gameSystem] || gameSystem;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading army details...</p>
        </div>
      </div>
    );
  }

  if (error || !army) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Army</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/armies')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Back to Armies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <nav className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/armies')}
                className="text-gray-400 hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-white">BattleSync</h1>
              <span className="text-gray-400">•</span>
              <span className="text-gray-300">Army Details</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.username}!</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Army Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-white">{army.name}</h2>
                <p className="text-gray-400 mt-2">
                  {army.faction} • {formatGameSystem(army.armyData?.gameSystem || '')}
                </p>
              </div>
              <div className="flex space-x-4">
                {army.armyForgeId && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Sync with ArmyForge'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Army Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-3xl font-bold text-white">{army.points}</div>
              <div className="text-gray-400">Points</div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-3xl font-bold text-white">{army.armyData?.units?.length || 0}</div>
              <div className="text-gray-400">Units</div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-3xl font-bold text-white">{army.customizations.experience?.experiencePoints || 0}</div>
              <div className="text-gray-400">Experience</div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-3xl font-bold text-white">{army.customizations.experience?.totalBattles || 0}</div>
              <div className="text-gray-400">Battles</div>
            </div>
          </div>

          {/* Army Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Units List */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-6">Army Units</h3>
                {army.armyData?.units && army.armyData.units.length > 0 ? (
                  <div className="space-y-4">
                    {army.armyData.units.map((unit: ArmyForgeUnit, index: number) => (
                      <div key={unit.id || index} className="bg-gray-700 p-4 rounded border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-semibold text-white">
                            {unit.customName || unit.name}
                          </h4>
                          <div className="text-right">
                            <div className="text-white font-medium">{unit.cost} pts</div>
                            <div className="text-gray-400 text-sm">Size: {unit.size}</div>
                          </div>
                        </div>
                        
                        {/* Unit Stats */}
                        {(unit.quality || unit.defense) && (
                          <div className="mb-3">
                            <div className="flex space-x-4 text-sm">
                              {unit.quality && (
                                <span className="text-gray-300">Quality: <span className="text-white">{unit.quality}+</span></span>
                              )}
                              {unit.defense && (
                                <span className="text-gray-300">Defense: <span className="text-white">{unit.defense}+</span></span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Weapons */}
                        {unit.weapons && unit.weapons.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-gray-300 mb-1">Weapons:</h5>
                            <div className="space-y-1">
                              {unit.weapons.map((weapon, weaponIndex) => (
                                <div key={weapon.id || weaponIndex} className="text-sm text-gray-400">
                                  <span className="text-white">{weapon.name}</span>
                                  {weapon.label && <span className="ml-2">({weapon.label})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Special Rules */}
                        {unit.rules && unit.rules.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-300 mb-1">Special Rules:</h5>
                            <div className="flex flex-wrap gap-1">
                              {unit.rules.map((rule, ruleIndex) => (
                                <span 
                                  key={rule.id || ruleIndex}
                                  className="inline-block bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded"
                                >
                                  {rule.label || rule.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No unit data available
                  </div>
                )}
              </div>
            </div>

            {/* Army Info & Customizations */}
            <div className="space-y-6">
              {/* Army Information */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Army Information</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-gray-400 text-sm">Faction</div>
                    <div className="text-white">{army.faction}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Game System</div>
                    <div className="text-white">{formatGameSystem(army.armyData?.gameSystem || '')}</div>
                  </div>
                  {army.armyForgeId && (
                    <div>
                      <div className="text-gray-400 text-sm">ArmyForge ID</div>
                      <div className="text-white font-mono text-sm">{army.armyForgeId}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-gray-400 text-sm">Last Synced</div>
                    <div className="text-white">{formatDate(army.lastSyncedAt)}</div>
                  </div>
                </div>
              </div>

              {/* Battle Experience */}
              {army.customizations.experience && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Battle Experience</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm">Victories</div>
                        <div className="text-white">{army.customizations.experience.victories}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Defeats</div>
                        <div className="text-white">{army.customizations.experience.defeats}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Battle Honors */}
              {army.customizations.battleHonors && army.customizations.battleHonors.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Battle Honors</h3>
                  <div className="space-y-2">
                    {army.customizations.battleHonors.map((honor, index) => (
                      <div key={honor.id || index} className="bg-yellow-900 border border-yellow-600 p-3 rounded">
                        <div className="font-medium text-yellow-200">{honor.name}</div>
                        <div className="text-yellow-300 text-sm">{honor.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};