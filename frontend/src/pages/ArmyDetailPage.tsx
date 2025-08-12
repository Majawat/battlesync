import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { armyApi } from '../api/client';
import type { Army } from '../types/api';
import { formatGameSystem } from '../utils/gameSystem';

export default function ArmyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [army, setArmy] = useState<Army | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                              {subUnit.rules.map((rule, ruleIndex) => (
                                <span key={ruleIndex}>
                                  {rule.name}{rule.rating ? `(${rule.rating})` : ''}
                                  {ruleIndex < subUnit.rules.length - 1 ? ', ' : ''}
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
                                  <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">
                                    {model.custom_name || model.name}
                                  </span>
                                  <span className="text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
                                    Tough: {model.max_tough}
                                  </span>
                                </div>

                                {/* Model Upgrades */}
                                {model.upgrades && model.upgrades.length > 0 && (
                                  <div className="text-xs text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-2">
                                    {model.upgrades.map((upgrade, upgradeIndex) => (
                                      <div key={upgradeIndex} className={upgrade.reassignable ? 'text-battle-accent-light dark:text-battle-accent-dark font-medium' : ''}>
                                        {upgrade.name}{upgrade.reassignable ? ' (reassignable)' : ''}
                                      </div>
                                    ))}
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
                                    {model.weapons.map((weapon, weaponIndex) => (
                                      <div key={weaponIndex} className="grid grid-cols-5 gap-2 text-xs text-battle-text-secondary-light dark:text-battle-text-secondary-dark py-1">
                                        <span>{weapon.name}</span>
                                        <span>{weapon.range === 0 ? '-' : weapon.range + '"'}</span>
                                        <span>A{weapon.attacks}</span>
                                        <span>{weapon.ap || '-'}</span>
                                        <span className="text-xs">
                                          {weapon.special_rules && weapon.special_rules.length > 0 
                                            ? weapon.special_rules.map(rule => 
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