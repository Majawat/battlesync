import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { Army } from '../types/army';
import { OPRBattleUnit } from '../types/oprBattle';
import { BattleUnitCard } from './BattleUnitCard';

export const ArmyDetailView: React.FC = () => {
  const { armyId } = useParams<{ armyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [army, setArmy] = useState<Army | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showBattleView, setShowBattleView] = useState(false);
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
        console.log('=== ARMY DATA DEBUG ===');
        console.log('Full army object:', armyData);
        console.log('Army data field:', armyData.armyData);
        console.log('Army data type:', typeof armyData.armyData);
        console.log('Army data keys:', armyData.armyData ? Object.keys(armyData.armyData) : 'null');
        console.log('======================');
        
        setArmy(armyData);
        // Convert to battle units if needed
        if (showBattleView) {
          await convertArmyToBattleUnits(armyData);
        }
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
      console.log('=== BATTLE CONVERSION DEBUG ===');
      console.log('Army data for battle conversion:', armyDataObj);
      console.log('Has convertedBattleData?', !!armyDataObj?.convertedBattleData);
      console.log('===============================');
      
      if (armyDataObj?.convertedBattleData?.units) {
        // Use stored converted data
        console.log('Using stored converted battle data');
        setBattleUnits(armyDataObj.convertedBattleData.units);
        return;
      }
      
      // Fallback to API conversion
      console.log('Falling back to API conversion');
      const response = await fetch(`/api/armies/${armyData.id}/convert`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('API conversion result:', result);
        if (result.status === 'success' && result.data && result.data.units) {
          setBattleUnits(result.data.units);
        } else {
          console.error('Army conversion failed:', result);
          setBattleUnits([]);
        }
      } else {
        const errorText = await response.text();
        console.error('Army conversion request failed:', response.status, errorText);
        setBattleUnits([]);
      }
    } catch (error) {
      console.error('Could not convert army to battle format:', error);
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
                  {(() => {
                    // Use resolved factions from metadata if available, otherwise fall back to faction field
                    const armyData = army.armyData as any;
                    const gameSystemName = armyData?.metadata?.gameSystemName || formatGameSystem(armyData?.gameSystem || '');
                    
                    // Fallback: check if faction looks like a description
                    const faction = armyData.metadata.description;
                    
                    return `${faction} • ${gameSystemName}`;
                  })()}
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
                <button
                  onClick={async () => {
                    const newShowBattleView = !showBattleView;
                    setShowBattleView(newShowBattleView);
                    if (newShowBattleView && army) {
                      await convertArmyToBattleUnits(army);
                    }
                  }}
                  className={`px-4 py-2 rounded ${showBattleView 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {showBattleView ? 'Show Raw Data' : 'Show Battle View'}
                </button>
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
                  {showBattleView}
                </div>
                {army.armyData ? (
                  <div className="space-y-4">
                    {showBattleView ? (
                      battleUnits.length > 0 ? (
                        <div className="space-y-3">
                          {battleUnits.map((unit: OPRBattleUnit, index: number) => (
                            <BattleUnitCard 
                              key={`battle-unit-${unit.unitId}-${index}`} 
                              unit={unit}
                              isOwned={true}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-gray-400 mb-4">
                            {converting ? 'Converting army to battle format...' : 'No battle units available'}
                          </div>
                          <div className="text-gray-300">
                            This army may not have valid units for battle conversion.
                          </div>
                        </div>
                      )
                    ) : (
                      (() => {
                        // Check if this is converted OPRBattleArmy format or raw ArmyForge format
                        const armyData = army.armyData as any;
                        console.log('Army data structure:', armyData); // Debug log
                        
                        if (armyData.convertedBattleData) {
                          // New format: show the original ArmyForge units (not converted data)
                          const originalUnits = armyData.units || [];
                          return originalUnits.map((unit: any, index: number) => (
                            <div key={`armyforge-unit-${unit.id || index}`} className="bg-gray-700 p-4 rounded border-l-4 border-blue-500">
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
                                  <h5 className="text-sm font-medium text-gray-300 mb-2">Weapons:</h5>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-gray-600">
                                          <th className="text-left text-gray-300 font-medium py-1 pr-4">Weapon</th>
                                          <th className="text-left text-gray-300 font-medium py-1 pr-4">RNG</th>
                                          <th className="text-left text-gray-300 font-medium py-1 pr-4">ATK</th>
                                          <th className="text-left text-gray-300 font-medium py-1 pr-4">AP</th>
                                          <th className="text-left text-gray-300 font-medium py-1">Special</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {unit.weapons.map((weapon: any, weaponIndex: number) => {
                                          // Extract AP value from special rules
                                          const apRule = weapon.specialRules?.find((rule: any) => rule.name === 'AP');
                                          const apValue = apRule ? apRule.rating || apRule.label?.match(/\((\d+)\)/)?.[1] : null;
                                          
                                          // Get other special rules (excluding AP)
                                          const otherRules = weapon.specialRules?.filter((rule: any) => rule.name !== 'AP') || [];
                                          const specialText = otherRules.length > 0 
                                            ? otherRules.map((rule: any) => rule.label || rule.name).join(', ')
                                            : '-';
                                          
                                          return (
                                            <tr key={`weapon-${unit.id}-${weapon.id || weaponIndex}`} className="border-b border-gray-700/50">
                                              <td className="text-white py-2 pr-4">{weapon.name}</td>
                                              <td className="text-gray-300 py-2 pr-4">{weapon.range ? `${weapon.range}"` : '-'}</td>
                                              <td className="text-gray-300 py-2 pr-4">A{weapon.attacks || '1'}</td>
                                              <td className="text-gray-300 py-2 pr-4">{apValue || '-'}</td>
                                              <td className="text-gray-300 py-2">{specialText}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Special Rules */}
                              {unit.rules && unit.rules.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium text-gray-300 mb-1">Special Rules:</h5>
                                  <div className="flex flex-wrap gap-1">
                                    {unit.rules.map((rule: any, ruleIndex: number) => (
                                      <span 
                                        key={`rule-${unit.id}-${rule.id || ruleIndex}`}
                                        className="inline-block bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded"
                                      >
                                        {rule.label || rule.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ));
                        } else if (armyData.units && Array.isArray(armyData.units)) {
                          // Legacy: converted OPRBattleArmy format - display the units
                          return armyData.units.map((unit: any, index: number) => (
                            <div key={`converted-unit-${unit.unitId || index}`} className="bg-gray-700 p-4 rounded border-l-4 border-green-500">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="text-lg font-semibold text-white">
                                  {unit.name}
                                </h4>
                                <div className="text-right">
                                  <div className="text-white font-medium">{unit.points} pts</div>
                                  <div className="text-gray-400 text-sm">Models: {unit.models?.length || 0}</div>
                                </div>
                              </div>
                              
                              {/* Show models */}
                              {unit.models && unit.models.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-sm font-medium text-gray-300 mb-1">Models:</h5>
                                  <div className="grid grid-cols-1 gap-2">
                                    {unit.models.map((model: any, modelIndex: number) => (
                                      <div key={`model-${modelIndex}`} className="bg-gray-800 p-2 rounded text-sm">
                                        <div className="text-white font-medium">{model.name}</div>
                                        <div className="text-gray-400">
                                          Quality: {model.quality}+ | Defense: {model.defense}+ | Tough: {model.tough}
                                        </div>
                                        {model.weapons && model.weapons.length > 0 && (
                                          <div className="text-gray-300 text-xs mt-1">
                                            Weapons: {model.weapons.map((w: any) => w.name).join(', ')}
                                          </div>
                                        )}
                                        {model.specialRules && model.specialRules.length > 0 && (
                                          <div className="text-blue-300 text-xs mt-1">
                                            Rules: {model.specialRules.map((r: any) => r.name).join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ));
                        } else if (armyData.length && Array.isArray(armyData)) {
                          // This might be raw ArmyForge units array
                          return armyData.map((unit: any, index: number) => (
                            <div key={`raw-unit-${unit.id || index}`} className="bg-gray-700 p-4 rounded border-l-4 border-blue-500">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="text-lg font-semibold text-white">
                                  {unit.customName || unit.name}
                                </h4>
                                <div className="text-right">
                                  <div className="text-white font-medium">{unit.cost} pts</div>
                                  <div className="text-gray-400 text-sm">Size: {unit.size}</div>
                                </div>
                              </div>
                              
                              {/* Unit Stats for raw ArmyForge data */}
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

                              {/* Weapons for raw ArmyForge data */}
                              {unit.weapons && unit.weapons.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-sm font-medium text-gray-300 mb-2">Weapons:</h5>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-gray-600">
                                          <th className="text-left text-gray-300 font-medium py-1 pr-4">Weapon</th>
                                          <th className="text-left text-gray-300 font-medium py-1 pr-4">RNG</th>
                                          <th className="text-left text-gray-300 font-medium py-1 pr-4">ATK</th>
                                          <th className="text-left text-gray-300 font-medium py-1 pr-4">AP</th>
                                          <th className="text-left text-gray-300 font-medium py-1">Special</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {unit.weapons.map((weapon: any, weaponIndex: number) => {
                                          // Extract AP value from special rules
                                          const apRule = weapon.specialRules?.find((rule: any) => rule.name === 'AP');
                                          const apValue = apRule ? apRule.rating || apRule.label?.match(/\((\d+)\)/)?.[1] : null;
                                          
                                          // Get other special rules (excluding AP)
                                          const otherRules = weapon.specialRules?.filter((rule: any) => rule.name !== 'AP') || [];
                                          const specialText = otherRules.length > 0 
                                            ? otherRules.map((rule: any) => rule.label || rule.name).join(', ')
                                            : '-';
                                          
                                          return (
                                            <tr key={`weapon-${unit.id}-${weapon.id || weaponIndex}`} className="border-b border-gray-700/50">
                                              <td className="text-white py-2 pr-4">{weapon.name}</td>
                                              <td className="text-gray-300 py-2 pr-4">{weapon.range ? `${weapon.range}"` : '-'}</td>
                                              <td className="text-gray-300 py-2 pr-4">A{weapon.attacks || '1'}</td>
                                              <td className="text-gray-300 py-2 pr-4">{apValue || '-'}</td>
                                              <td className="text-gray-300 py-2">{specialText}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Special Rules for raw ArmyForge data */}
                              {unit.rules && unit.rules.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium text-gray-300 mb-1">Special Rules:</h5>
                                  <div className="flex flex-wrap gap-1">
                                    {unit.rules.map((rule: any, ruleIndex: number) => (
                                      <span 
                                        key={`rule-${unit.id}-${rule.id || ruleIndex}`}
                                        className="inline-block bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded"
                                      >
                                        {rule.label || rule.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ));
                        } else {
                          // Unknown data format
                          return (
                            <div className="text-center py-8">
                              <div className="text-yellow-400 mb-2">Unknown army data format</div>
                              <div className="text-gray-400 text-sm">
                                Data structure: {JSON.stringify(Object.keys(armyData), null, 2)}
                              </div>
                            </div>
                          );
                        }
                      })()
                    )}
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
                    <div className="text-gray-400 text-sm">Faction(s)</div>
                    <div className="text-white">
                      {(() => {
                        // Use resolved factions from metadata if available
                        const armyData = army.armyData as any;
                        const resolvedFactions = armyData?.metadata?.resolvedFactions;
                        
                        if (resolvedFactions && resolvedFactions.length > 0) {
                          return resolvedFactions.join(', ');
                        }
                        
                        // Fallback: check if faction looks like a description
                        const faction = army.faction;
                        if (faction && (faction.length > 25 || faction.includes("'s ") || faction.toLowerCase().includes('army'))) {
                          return armyData?.metadata?.gameSystemName || formatGameSystem(armyData?.gameSystem || '');
                        }
                        
                        return faction;
                      })()}
                    </div>
                  </div>
                  {(() => {
                    // Show description if available and different from faction
                    const armyData = army.armyData as any;
                    const description = armyData?.metadata?.description;
                    const resolvedFactions = armyData?.metadata?.resolvedFactions;
                    
                    if (description && description.trim() && resolvedFactions && resolvedFactions.length > 0) {
                      return (
                        <div>
                          <div className="text-gray-400 text-sm">Description</div>
                          <div className="text-white text-sm">{description}</div>
                        </div>
                      );
                    }
                    return null;
                  })()}
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