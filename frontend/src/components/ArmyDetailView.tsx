import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { Army } from '../types/army';
import { OPRBattleUnit } from '../types/oprBattle';
import { BattleUnitCard } from './BattleUnitCard';
import { BattleAuraSetup } from './BattleAuraSetup';

export const ArmyDetailView: React.FC = () => {
  const { armyId } = useParams<{ armyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [army, setArmy] = useState<Army | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [battleUnits, setBattleUnits] = useState<OPRBattleUnit[]>([]);
  const [converting, setConverting] = useState(false);

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
        const armyData = response.data.data;
        
        setArmy(armyData);
        // Always convert to battle units for display
        await convertArmyToBattleUnits(armyData);
      } else {
        setError('Failed to load army details');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load army details');
    } finally {
      setLoading(false);
    }
  };

  const convertArmyToBattleUnits = async (armyData: Army) => {
    try {
      setConverting(true);
      
      // Check if we have stored converted battle data
      const armyDataObj = armyData.armyData as any;
      
      if (armyDataObj?.convertedBattleData?.units) {
        // Use stored converted data
        setBattleUnits(armyDataObj.convertedBattleData.units);
        return;
      }
      
      // Fallback to API conversion
      const response = await fetch(`/api/armies/${armyData.id}/convert`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data && result.data.units) {
          setBattleUnits(result.data.units);
        } else {
          setBattleUnits([]);
        }
      } else {
        setBattleUnits([]);
      }
    } catch (error) {
      setBattleUnits([]);
    } finally {
      setConverting(false);
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
                  {(() => {
                    // Use resolved factions from metadata if available, otherwise fall back to faction field
                    const armyData = army.armyData as any;
                    const gameSystemName = armyData?.metadata?.gameSystemName || formatGameSystem(armyData?.gameSystem || '');
                    const resolvedFactions = armyData?.metadata?.resolvedFactions;
                    const faction = resolvedFactions?.join(', ') || army.faction;
                    
                    return `${faction} • ${gameSystemName}`;
                  })()}
                </p>
                {/* Army Description */}
                {(() => {
                  const armyData = army.armyData as any;
                  const description = armyData?.metadata?.description;
                  if (description && description.trim()) {
                    return (
                      <div className="mt-3 p-3 bg-gray-800 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-gray-300 italic">
                          {description}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
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
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">Army Units</h3>
                </div>
                {army.armyData ? (
                  <div className="space-y-4">
                    {battleUnits.length > 0 ? (
                      <>
                        <div className="space-y-3">
                          {battleUnits.map((unit: OPRBattleUnit, index: number) => (
                            <BattleUnitCard 
                              key={`battle-unit-${unit.unitId}-${index}`} 
                              unit={unit}
                              battlePhase="BATTLE_ROUNDS"
                              isOwned={true}
                            />
                          ))}
                        </div>
                        
                        {/* BattleAura ESP32 Integration */}
                        <BattleAuraSetup 
                          battleUnits={battleUnits}
                          onDeviceAssignment={(deviceId, unitId) => {
                            console.log(`Device ${deviceId} assigned to unit ${unitId}`);
                            // Optionally update local state or trigger refresh
                          }}
                        />
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                          {converting ? 'Converting army to battle format...' : 'No battle units available'}
                        </div>
                        <div className="text-gray-300">
                          This army may not have valid units for battle conversion.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">No army data available</div>
                    <div className="text-gray-300">Unable to display army information.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Experience and Customizations */}
            <div className="space-y-6">
              {/* Experience Section */}
              {army.customizations.experience && army.customizations.experience.experiencePoints > 0 && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Experience</h3>
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    {army.customizations.experience.experiencePoints} XP
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

