import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { armyApi } from '../api/client';
import type { Army, ReassignUpgradeResponse, RenameModelResponse } from '../types/api';
import { formatGameSystem } from '../utils/gameSystem';

export default function ArmyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [army, setArmy] = useState<Army | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reassignState, setReassignState] = useState<{
    modelId: string;
    upgradeIndex: number;
    subUnitId: string;
    isReassigning: boolean;
  } | null>(null);
  const [renameState, setRenameState] = useState<{
    modelId: string;
    currentName: string;
    isRenaming: boolean;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchArmy = async () => {
      try {
        const response = await armyApi.getArmy(id) as any;
        if (response.success) {
          setArmy(response.army);
        } else {
          throw new Error(response.error || 'Failed to fetch army');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch army');
      } finally {
        setLoading(false);
      }
    };

    fetchArmy();
  }, [id]);

  const handleReassignUpgrade = async (targetModelId: string) => {
    if (!reassignState || !army || !id) return;
    
    setReassignState(prev => prev ? { ...prev, isReassigning: true } : null);
    
    try {
      const response: ReassignUpgradeResponse = await armyApi.reassignUpgrade(id, {
        sourceModelId: reassignState.modelId,
        targetModelId,
        upgradeIndex: reassignState.upgradeIndex,
        subUnitId: reassignState.subUnitId
      });
      
      if (response.success && response.army) {
        setArmy(response.army);
        setReassignState(null);
      } else {
        setError(response.error || 'Failed to reassign upgrade');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to reassign upgrade');
    }
  };

  const getAvailableTargetModels = (subUnitId: string, excludeModelId: string) => {
    if (!army) return [];
    
    for (const unit of army.units) {
      for (const subUnit of unit.sub_units || []) {
        if (subUnit.id === subUnitId) {
          return subUnit.models?.filter(model => 
            model.model_id !== excludeModelId
          ) || [];
        }
      }
    }
    return [];
  };

  const handleRenameModel = async (newName: string) => {
    if (!renameState || !army || !id) return;
    
    setRenameState(prev => prev ? { ...prev, isRenaming: true } : null);
    
    try {
      const response: RenameModelResponse = await armyApi.renameModel(id, {
        modelId: renameState.modelId,
        customName: newName
      });
      
      if (response.success && response.army) {
        setArmy(response.army);
        setRenameState(null);
      } else {
        setError(response.error || 'Failed to rename model');
        setRenameState(prev => prev ? { ...prev, isRenaming: false } : null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to rename model');
      setRenameState(prev => prev ? { ...prev, isRenaming: false } : null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="card text-center">
          <p className="text-gray-500">Loading army details...</p>
        </div>
      </div>
    );
  }

  if (error || !army) {
    return (
      <div className="space-y-8">
        <div className="card">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error Loading Army</p>
            <p className="text-sm">{error || 'Army not found'}</p>
          </div>
          <div className="mt-4">
            <Link to="/armies" className="btn-secondary">
              Back to Armies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-2">
            <Link to="/armies" className="btn-secondary">
              ← Back
            </Link>
            <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark">
              {army.name}
            </h1>
          </div>
          
          {army.description && (
            <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-4">
              {army.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
            <span>Game System: {formatGameSystem(army.game_system)}</span>
            <span>•</span>
            <span>Points: {army.list_points}/{army.points_limit}</span>
            <span>•</span>
            <span>Models: {army.model_count}</span>
            <span>•</span>
            <span>Activations: {army.activation_count}</span>
            {army.campaign_mode && (
              <>
                <span>•</span>
                <span>Campaign Mode</span>
              </>
            )}
          </div>
        </div>

        <div className="flex space-x-3">
          <Link 
            to={`/battles/new?army=${army.id}`}
            className="btn-primary"
          >
            Start Battle
          </Link>
        </div>
      </div>

      {/* Validation Warnings */}
      {army.validation_errors && Array.isArray(army.validation_errors) && army.validation_errors.length > 0 && (
        <div className="bg-battle-status-shaken/10 border border-battle-status-shaken/20 text-battle-status-shaken px-4 py-3 rounded-lg">
          <p className="font-medium mb-2 text-sm">Validation Issues</p>
          <ul className="text-xs space-y-1 opacity-90">
            {army.validation_errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Army Units */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Units ({army.units?.length || 0})</h2>
        
        {!army.units || army.units.length === 0 ? (
          <p className="text-battle-text-muted-light dark:text-battle-text-muted-dark">No units found in this army.</p>
        ) : (
          <div className="space-y-8">
            {army.units.map((unit, index) => (
              <div key={unit.id || index} className="unit-card">
                {/* Unit Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-1">
                    {unit.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
                    <span>Size: {unit.model_count}</span>
                    <span>•</span>
                    <span>Quality: {unit.quality}+</span>
                    <span>•</span>
                    <span>Defense: {unit.defense}+</span>
                    <span>•</span>
                    <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">{unit.total_cost} pts</span>
                  </div>
                </div>

                {/* Sub-units */}
                {unit.sub_units && unit.sub_units.length > 0 && (
                  <div className="space-y-6">
                    {unit.sub_units.map((subUnit, subIndex) => (
                      <div key={subUnit.id || subIndex} className="border-l-4 border-battle-accent-light dark:border-battle-accent-dark pl-4">
                        {/* Sub-unit Header */}
                        <div className="mb-3">
                          <div className="flex flex-wrap items-center gap-4 mb-1">
                            <h4 className="font-semibold text-battle-text-primary-light dark:text-battle-text-primary-dark">
                              {subUnit.custom_name || subUnit.name}
                            </h4>
                            <span className="text-sm font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">
                              {subUnit.cost} pts
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-2">
                            <span>XP: {subUnit.xp}</span>
                            <span>•</span>
                            <span>Q: {subUnit.quality}+</span>
                            <span>•</span>
                            <span>D: {subUnit.defense}+</span>
                            {subUnit.base_sizes && (subUnit.base_sizes.round !== 'none' || subUnit.base_sizes.square !== 'none') && (
                              <>
                                <span>•</span>
                                <span>Base: {subUnit.base_sizes.round !== 'none' ? subUnit.base_sizes.round + 'mm' : subUnit.base_sizes.square + 'mm'}</span>
                              </>
                            )}
                          </div>
                          
                          {/* Special Rules and Upgrades */}
                          {(subUnit.rules && subUnit.rules.length > 0) && (
                            <div className="text-xs text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-2">
                              <span className="font-medium">Rules: </span>
                              {[...subUnit.rules]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((rule, ruleIndex) => (
                                <span key={ruleIndex}>
                                  {rule.name}{rule.rating ? `(${rule.rating})` : ''}
                                  {ruleIndex < subUnit.rules.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Campaign Traits */}
                          {(subUnit.traits && subUnit.traits.length > 0) && (
                            <div className="text-xs text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-2">
                              <span className="font-medium">Traits: </span>
                              {[...subUnit.traits]
                                .sort((a, b) => a.localeCompare(b))
                                .map((trait, traitIndex) => (
                                <span key={traitIndex}>
                                  {trait}
                                  {traitIndex < subUnit.traits.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Sub-unit Notes */}
                          {subUnit.notes && (
                            <div className="text-xs text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-2 italic">
                              <span className="font-medium">Notes: </span>
                              {subUnit.notes}
                            </div>
                          )}
                        </div>

                        {/* Models */}
                        {subUnit.models && subUnit.models.length > 0 && (
                          <div className="space-y-3">
                            {subUnit.models.map((model, modelIndex) => (
                              <div key={model.model_id || modelIndex} className="bg-battle-surface-light dark:bg-battle-surface-dark p-3 rounded-lg border border-battle-border-light dark:border-battle-border-dark">
                                {/* Model Header */}
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2">
                                    {renameState?.modelId === model.model_id ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          defaultValue={model.custom_name || model.name}
                                          className="text-sm bg-battle-surface-light dark:bg-battle-surface-dark border border-battle-border-light dark:border-battle-border-dark rounded px-2 py-1 font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleRenameModel(e.currentTarget.value);
                                            } else if (e.key === 'Escape') {
                                              setRenameState(null);
                                            }
                                          }}
                                          onBlur={(e) => {
                                            if (!renameState.isRenaming) {
                                              handleRenameModel(e.currentTarget.value);
                                            }
                                          }}
                                          autoFocus
                                          disabled={renameState.isRenaming}
                                          maxLength={100}
                                        />
                                        <button
                                          onClick={() => setRenameState(null)}
                                          className="text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark hover:underline"
                                          disabled={renameState.isRenaming}
                                        >
                                          Cancel
                                        </button>
                                        {renameState.isRenaming && (
                                          <span className="text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark">
                                            Saving...
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <>
                                        <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">
                                          {model.custom_name || model.name}
                                        </span>
                                        <button
                                          onClick={() => setRenameState({
                                            modelId: model.model_id,
                                            currentName: model.custom_name || model.name,
                                            isRenaming: false
                                          })}
                                          className="text-xs text-battle-accent-light dark:text-battle-accent-dark hover:underline"
                                          disabled={reassignState !== null || renameState !== null}
                                        >
                                          Rename
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <span className="text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
                                    Tough: {model.max_tough}
                                  </span>
                                </div>

                                {/* Model Upgrades */}
                                {model.upgrades && model.upgrades.length > 0 && (
                                  <div className="text-xs text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-2">
                                    {model.upgrades.map((upgrade, upgradeIndex) => {
                                      const isActiveReassignment = reassignState?.modelId === model.model_id && 
                                        reassignState?.upgradeIndex === upgradeIndex;
                                      const availableTargets = getAvailableTargetModels(subUnit.id, model.model_id);
                                      
                                      return (
                                        <div key={upgradeIndex} className="flex items-center gap-2 py-1">
                                          <span className={upgrade.reassignable ? 'text-battle-accent-light dark:text-battle-accent-dark font-medium' : ''}>
                                            {upgrade.name}
                                          </span>
                                          
                                          {upgrade.reassignable && availableTargets.length > 0 && !isActiveReassignment && (
                                            <button
                                              onClick={() => setReassignState({
                                                modelId: model.model_id,
                                                upgradeIndex,
                                                subUnitId: subUnit.id,
                                                isReassigning: false
                                              })}
                                              className="text-battle-accent-light dark:text-battle-accent-dark hover:underline text-xs"
                                              disabled={reassignState !== null}
                                            >
                                              Reassign ↓
                                            </button>
                                          )}
                                          
                                          {isActiveReassignment && (
                                            <div className="inline-flex items-center gap-2">
                                              <span className="text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark">
                                                Move to:
                                              </span>
                                              <select
                                                className="text-xs bg-battle-surface-light dark:bg-battle-surface-dark border border-battle-border-light dark:border-battle-border-dark rounded px-2 py-1"
                                                defaultValue=""
                                                onChange={(e) => {
                                                  if (e.target.value) {
                                                    handleReassignUpgrade(e.target.value);
                                                  }
                                                }}
                                                disabled={reassignState.isReassigning}
                                              >
                                                <option value="">Select model...</option>
                                                {availableTargets.map((targetModel) => (
                                                  <option key={targetModel.model_id} value={targetModel.model_id}>
                                                    {targetModel.custom_name || targetModel.name}
                                                  </option>
                                                ))}
                                              </select>
                                              <button
                                                onClick={() => setReassignState(null)}
                                                className="text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark hover:underline"
                                                disabled={reassignState.isReassigning}
                                              >
                                                Cancel
                                              </button>
                                              {reassignState.isReassigning && (
                                                <span className="text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark">
                                                  Moving...
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Weapons Table */}
                                {model.weapons && model.weapons.length > 0 && (
                                  <div className="mt-2">
                                    <div className="grid grid-cols-5 gap-2 text-xs font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark mb-1 border-b border-battle-border-light dark:border-battle-border-dark pb-1">
                                      <span>Weapon</span>
                                      <span>Range</span>
                                      <span>Atk</span>
                                      <span>AP</span>
                                      <span>Special</span>
                                    </div>
                                    {[...model.weapons]
                                      .sort((a, b) => {
                                        // Sort by range: melee (0) first, then by range ascending
                                        if (a.range === 0 && b.range !== 0) return -1;
                                        if (a.range !== 0 && b.range === 0) return 1;
                                        return a.range - b.range;
                                      })
                                      .map((weapon, weaponIndex) => (
                                      <div key={weaponIndex} className="grid grid-cols-5 gap-2 text-xs text-battle-text-secondary-light dark:text-battle-text-secondary-dark py-1">
                                        <span>{weapon.count && weapon.count > 1 ? `${weapon.count}x ` : ''}{weapon.name}</span>
                                        <span>{weapon.range === 0 ? '-' : weapon.range + '"'}</span>
                                        <span>A{weapon.attacks}</span>
                                        <span>{weapon.ap || '-'}</span>
                                        <span className="text-xs">
                                          {weapon.special_rules && weapon.special_rules.length > 0 
                                            ? [...weapon.special_rules]
                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                .map(rule => 
                                                  rule.name + (rule.value ? `(${rule.value})` : '')
                                                ).join(', ')
                                            : '-'
                                          }
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Unit without sub-units - show basic info */}
                {(!unit.sub_units || unit.sub_units.length === 0) && (
                  <div className="mt-3 text-sm text-battle-text-muted-light dark:text-battle-text-muted-dark">
                    <p>Basic unit - no detailed model breakdown available</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Army Metadata */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Army Information</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Army ID:</span>
            <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-2">{army.id}</span>
          </div>
          <div>
            <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">ArmyForge ID:</span>
            <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-2">{army.armyforge_id}</span>
          </div>
          <div>
            <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Points Used:</span>
            <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-2">{army.list_points} / {army.points_limit}</span>
          </div>
          <div>
            <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Total Models:</span>
            <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-2">{army.model_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}