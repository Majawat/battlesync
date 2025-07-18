import React, { useState } from 'react';
import { OPRBattleUnit, OPRSpell, CooperatingCaster } from '../types/oprBattle';
import { SpellCastModal } from './SpellCastModal';

// Helper component for health bars
const HealthBar: React.FC<{ 
  current: number; 
  max: number; 
  size?: 'sm' | 'md';
  showNumbers?: boolean;
}> = ({ current, max, size = 'sm', showNumbers = true }) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const height = size === 'sm' ? 'h-2' : 'h-3';
  
  // Color based on health percentage
  const healthColor = percentage > 75 ? 'bg-green-500' : 
                     percentage > 50 ? 'bg-yellow-500' : 
                     percentage > 25 ? 'bg-orange-500' : 'bg-red-500';
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`flex-1 bg-gray-700 rounded ${height}`}>
        <div 
          className={`${healthColor} ${height} rounded transition-all duration-300`}
          style={{ width: `${Math.max(0, percentage)}%` }}
        />
      </div>
      {showNumbers && (
        <span className="text-xs text-gray-400 min-w-0">
          {current}/{max}
        </span>
      )}
    </div>
  );
};

// Helper component for wound markers
const WoundMarkers: React.FC<{ 
  currentTough: number; 
  maxTough: number;
  modelName: string;
}> = ({ currentTough, maxTough }) => {
  const wounds = maxTough - currentTough;
  if (wounds <= 0) return null;
  
  return (
    <div className="flex items-center space-x-1">
      <span className="text-xs text-red-400">💀</span>
      <span className="text-xs text-red-400">{wounds}</span>
    </div>
  );
};

interface BattleUnitCardProps {
  unit: OPRBattleUnit;
  battleId: string;
  battlePhase: string;
  isOwned?: boolean;
  isSelected?: boolean;
  damageMode?: boolean;
  compactMode?: boolean;
  onSelect?: () => void;
  onQuickDamage?: (damage: number, modelId?: string) => void;
  onAdvancedDamage?: () => void;
  onAction?: (action: 'hold' | 'advance' | 'rush' | 'charge', targetId?: string) => void;
  onCastSpell?: (spellId: string, targetUnitIds: string[]) => void;
  allArmies?: any[]; // For finding cooperative casters
  canAct?: boolean;
}

// Helper function to calculate movement distances based on special rules
const calculateMovement = (unit: OPRBattleUnit) => {
  const hasSpecialRule = (rule: string) => {
    return unit.models.some(model => 
      model.specialRules.some(sr => sr.toLowerCase().includes(rule.toLowerCase()))
    );
  };

  let advanceDistance = 6;
  let rushChargeDistance = 12;

  if (hasSpecialRule('fast')) {
    advanceDistance += 2;
    rushChargeDistance += 4;
  } else if (hasSpecialRule('slow')) {
    advanceDistance = Math.max(0, advanceDistance - 2);
    rushChargeDistance = Math.max(0, rushChargeDistance - 4);
  }

  // Aircraft have special movement
  if (hasSpecialRule('aircraft')) {
    advanceDistance = 30;
    rushChargeDistance = 30;
  }

  return { advanceDistance, rushChargeDistance };
};

export const BattleUnitCard: React.FC<BattleUnitCardProps> = ({ 
  unit,
  battleId,
  battlePhase,
  isOwned = true,
  isSelected = false,
  damageMode = false,
  compactMode = false,
  onSelect,
  onQuickDamage,
  onAdvancedDamage,
  onAction,
  onCastSpell,
  allArmies = [],
  canAct = false
}) => {
  // State for spell modal
  const [showSpellModal, setShowSpellModal] = useState(false);
  const [availableSpells, setAvailableSpells] = useState<OPRSpell[]>([]);
  const [isLoadingSpells, setIsLoadingSpells] = useState(false);
  const isDestroyed = unit.currentSize === 0;
  const isShaken = unit.shaken;
  const isRouted = unit.routed;
  
  const statusColor = isDestroyed ? 'border-red-600' : 
                     isRouted ? 'border-red-400' :
                     isShaken ? 'border-yellow-400' : 
                     'border-gray-600';

  const bgColor = isOwned ? 'bg-gray-800' : 'bg-gray-750';

  // Calculate movement distances
  const { advanceDistance, rushChargeDistance } = calculateMovement(unit);

  // Check if unit can perform different actions
  const isInGameplayPhase = battlePhase === 'BATTLE_ROUNDS';
  const canPerformAction = canAct && !isDestroyed && !isRouted && isInGameplayPhase;
  const canAdvanceRushCharge = canPerformAction && !isShaken;
  const canOnlyHold = canPerformAction && isShaken;

  // Debug logging (remove for production)
  // console.log(`Unit ${unit.name}: canAct=${canAct}, isDestroyed=${isDestroyed}, isRouted=${isRouted}, canPerformAction=${canPerformAction}`);

  // Check for special rules
  const hasSpecialRule = (rule: string) => {
    return unit.models.some(model => 
      model.specialRules.some(sr => sr.toLowerCase().includes(rule.toLowerCase()))
    );
  };

  const isAircraft = hasSpecialRule('aircraft');
  const isImmobile = hasSpecialRule('immobile');
  // Check if unit has any caster abilities (regardless of current tokens)
  const hasCaster = unit.models.some(model => 
    model.casterTokens >= 0 && model.specialRules.some(rule => rule.includes('Caster('))
  ) || (unit.joinedHero && unit.joinedHero.casterTokens >= 0 && 
       unit.joinedHero.specialRules.some(rule => rule.includes('Caster(')));

  // Handle spell button click - fetch spells and open modal
  const handleSpellButtonClick = async () => {
    // Determine the actual caster and their armyId
    let casterArmyId = null;
    let casterName = unit.name;
    
    // If the caster is a joined hero, use their armyId
    if (unit.joinedHero && unit.joinedHero.casterTokens > 0) {
      casterArmyId = unit.joinedHero.armyId;
      casterName = unit.joinedHero.name;
    } else {
      // Find the first caster model in the unit
      const casterModel = unit.models.find(m => m.casterTokens > 0);
      if (casterModel) {
        casterArmyId = casterModel.armyId;
        casterName = casterModel.name;
      }
    }
    
    console.log('Spell button clicked for caster:', casterName, 'armyId:', casterArmyId);
    
    if (!casterArmyId) {
      console.error('Caster has no armyId set, cannot fetch spells');
      return;
    }

    setIsLoadingSpells(true);
    try {
      // Get token for API calls
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        return;
      }

      // Fetch spell data from backend API using armyId
      const response = await fetch(`/api/spells/army/${encodeURIComponent(casterArmyId)}?gameSystem=2`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch spells');
      }

      const spells = result.data.spells || [];
      console.log('Fetched spells for armyId', casterArmyId, ':', spells.length, 'spells');
      
      if (spells.length === 0) {
        console.warn('No spells found for armyId:', casterArmyId);
        return;
      }
      
      setAvailableSpells(spells);
      setShowSpellModal(true);
    } catch (error) {
      console.error('Error fetching spells:', error);
      return;
    } finally {
      setIsLoadingSpells(false);
    }
  };

  // Handle spell selection from modal
  const handleSpellCast = (spellId: string, targetUnitIds: string[]) => {
    onCastSpell?.(spellId, targetUnitIds);
    setShowSpellModal(false);
  };

  // Get available cooperative casters from all armies (excluding the specific caster casting the spell)
  const getCooperativeCasters = () => {
    const casters: Array<{unitId: string, modelId?: string, tokens: number, name: string, armyName?: string}> = [];
    
    // Find the current active caster to exclude them
    const currentCaster = unit.models.find(m => m.casterTokens > 0) || unit.joinedHero;
    
    for (const army of allArmies) {
      for (const armyUnit of army.units) {
        // For the current unit, check other models but exclude the active caster
        if (armyUnit.unitId === unit.unitId) {
          // Check unit models for casters (excluding the current caster)
          for (const model of armyUnit.models) {
            if (model.casterTokens > 0 && model.modelId !== currentCaster?.modelId) {
              casters.push({
                unitId: armyUnit.unitId,
                modelId: model.modelId,
                tokens: model.casterTokens,
                name: model.customName || model.name,
                armyName: army.armyName
              });
            }
          }
          
          // Check joined hero for caster tokens (excluding if it's the current caster)
          if (armyUnit.joinedHero && 
              armyUnit.joinedHero.casterTokens > 0 && 
              armyUnit.joinedHero.modelId !== currentCaster?.modelId) {
            casters.push({
              unitId: armyUnit.unitId,
              modelId: armyUnit.joinedHero.modelId,
              tokens: armyUnit.joinedHero.casterTokens,
              name: armyUnit.joinedHero.customName || armyUnit.joinedHero.name,
              armyName: army.armyName
            });
          }
        } else {
          // For other units, include all casters
          // Check unit models for casters
          for (const model of armyUnit.models) {
            if (model.casterTokens > 0) {
              casters.push({
                unitId: armyUnit.unitId,
                modelId: model.modelId,
                tokens: model.casterTokens,
                name: model.customName || model.name,
                armyName: army.armyName
              });
            }
          }
          
          // Check joined hero for caster tokens
          if (armyUnit.joinedHero && armyUnit.joinedHero.casterTokens > 0) {
            casters.push({
              unitId: armyUnit.unitId,
              modelId: armyUnit.joinedHero.modelId,
              tokens: armyUnit.joinedHero.casterTokens,
              name: armyUnit.joinedHero.customName || armyUnit.joinedHero.name,
              armyName: army.armyName
            });
          }
        }
      }
    }
    
    return casters;
  };

  return (
    <div 
      className={`border-2 ${statusColor} ${bgColor} rounded-lg p-3 ${
        onSelect ? 'cursor-pointer transition-all' : ''
      } ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isDestroyed ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 mr-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">
              {unit.type === 'JOINED' && unit.joinedHero && (
                      <span>{unit.joinedHero.name} & </span>
              )}
              {unit.customName || unit.name}
            </h3>
            {/* Unit Health Overview */}
            <div className="flex items-center space-x-2">
              <HealthBar 
                current={unit.currentSize} 
                max={unit.originalSize} 
                size="sm"
                showNumbers={false}
              />
              <span className="text-xs text-gray-400">
                {unit.currentSize}/{unit.originalSize}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {unit.kills > 0 && ` • ${unit.kills} kills`}
            {unit.currentSize < unit.originalSize && (
              <span className="text-red-400 ml-1">
                • {unit.originalSize - unit.currentSize} lost
              </span>
            )}
          </div>
        </div>
        
        {/* Quick Damage Buttons (Touch Optimized) */}
        {damageMode && !isDestroyed && (
          <div className="flex space-x-1">
            {onQuickDamage && [1, 2, 3, 5].map(damage => (
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
            {onAdvancedDamage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvancedDamage();
                }}
                className="px-2 h-8 bg-purple-600 hover:bg-purple-700 rounded text-xs font-bold touch-manipulation"
                title="Advanced Damage Types"
              >
                ADV
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {canPerformAction && !damageMode && (
        <div className="mb-3 p-2 bg-gray-900/50 rounded border border-gray-700">
          <div className="flex flex-wrap gap-2">
            {/* Hold Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.('hold');
              }}
              disabled={!canPerformAction}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                canPerformAction 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Hold
            </button>

            {/* Advance Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.('advance');
              }}
              disabled={!canAdvanceRushCharge || isImmobile}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                canAdvanceRushCharge && !isImmobile
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title={isImmobile ? 'Unit is immobile' : isShaken ? 'Unit is shaken' : ''}
            >
              Advance ({advanceDistance}")
            </button>

            {/* Rush Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.('rush');
              }}
              disabled={!canAdvanceRushCharge || isImmobile || isAircraft}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                canAdvanceRushCharge && !isImmobile && !isAircraft
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title={isImmobile ? 'Unit is immobile' : isAircraft ? 'Aircraft cannot rush' : isShaken ? 'Unit is shaken' : ''}
            >
              Rush ({rushChargeDistance}")
            </button>

            {/* Charge Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.('charge');
              }}
              disabled={!canAdvanceRushCharge || isImmobile || isAircraft}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                canAdvanceRushCharge && !isImmobile && !isAircraft
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title={isImmobile ? 'Unit is immobile' : isAircraft ? 'Aircraft cannot charge' : isShaken ? 'Unit is shaken' : ''}
            >
              Charge ({rushChargeDistance}")
            </button>
          </div>

          {/* Cast Spell Action (if unit has caster and in gameplay phase) */}
          {hasCaster && isInGameplayPhase && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpellButtonClick();
                }}
                disabled={isLoadingSpells}
                className="px-3 py-1 rounded text-sm font-medium transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isLoadingSpells ? 'Loading...' : `Cast Spell (${
                  unit.models.find(m => m.specialRules.some(rule => rule.includes('Caster(')))?.casterTokens || 
                  unit.joinedHero?.casterTokens || 0
                } tokens)`}
              </button>
            </div>
          )}

          {/* Action Warnings */}
          {canOnlyHold && (
            <div className="mt-2 text-xs text-yellow-400">
              Unit is shaken - can only Hold to recover
            </div>
          )}
          {unit.fatigued && (
            <div className="mt-2 text-xs text-orange-400">
              Unit is fatigued - melee hits on 6s only
            </div>
          )}
        </div>
      )}

      {/* Unit Status Indicators */}
      <div className="flex items-center space-x-2 text-xs">
        {isRouted && <span className="px-2 py-1 bg-red-600 rounded">ROUTED</span>}
        {isShaken && !isRouted && <span className="px-2 py-1 bg-yellow-600 rounded">SHAKEN</span>}
        {unit.fatigued && <span className="px-2 py-1 bg-orange-600 rounded">FATIGUED</span>}
        {unit.action && <span className="px-2 py-1 bg-blue-600 rounded">{unit.action.toUpperCase()}</span>}
      </div>

      {/* Joined Hero Information */}
      {unit.type === 'JOINED' && unit.joinedHero && (
        <div className="mt-2 text-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="text-gray-300 flex items-center space-x-2">
              <span>Joined Hero: {unit.joinedHero.name}</span>
              <WoundMarkers 
                currentTough={unit.joinedHero.currentTough}
                maxTough={unit.joinedHero.maxTough}
                modelName={unit.joinedHero.name}
              />
            </div>
            <div className="text-gray-400">
              Q{unit.joinedHero.quality}+ • D{unit.joinedHero.defense}+
            </div>
          </div>
          <div className="mb-2">
            <HealthBar 
              current={unit.joinedHero.currentTough} 
              max={unit.joinedHero.maxTough}
              size="sm"
            />
          </div>
          {unit.joinedHero.weapons && unit.joinedHero.weapons.length > 0 && (
            <div className="text-gray-400">
              Weapons: {unit.joinedHero.weapons.join(', ')}
            </div>
          )}
          {unit.joinedHero.specialRules && unit.joinedHero.specialRules.length > 0 && (
            <div className="text-gray-400">
              Rules: {unit.joinedHero.specialRules.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Combined Unit Information */}
      {unit.type === 'COMBINED' && unit.combinedFrom && unit.combinedFrom.length > 0 && (
        <div className="mt-2 text-xs text-gray-300">
          Combined from {unit.combinedFrom.length} units: {unit.combinedFrom.join(' + ')}
        </div>
      )}

      {/* Weapon Summary Table */}
      {unit.weaponSummary && unit.weaponSummary.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-400 mb-1">Weapons:</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left text-gray-400 font-medium py-1 pr-2">Weapon</th>
                  <th className="text-left text-gray-400 font-medium py-1 pr-2">RNG</th>
                  <th className="text-left text-gray-400 font-medium py-1 pr-2">ATK</th>
                  <th className="text-left text-gray-400 font-medium py-1 pr-2">AP</th>
                  <th className="text-left text-gray-400 font-medium py-1">Special</th>
                </tr>
              </thead>
              <tbody>
                {unit.weaponSummary.map((weapon, index) => {
                  // Extract AP value from special rules
                  const apRule = weapon.specialRules.find(rule => rule.toLowerCase().includes('ap('));
                  const apValue = apRule ? apRule.match(/ap\((\d+)\)/i)?.[1] : null;
                  
                  // Get other special rules (excluding AP)
                  const otherRules = weapon.specialRules.filter(rule => !rule.toLowerCase().includes('ap('));
                  const specialText = otherRules.length > 0 ? otherRules.join(', ') : '-';
                  
                  return (
                    <tr key={index} className="border-b border-gray-700/50">
                      <td className="text-gray-300 py-1 pr-2">
                        {weapon.count > 1 ? `${weapon.count}x ` : ''}{weapon.name}
                      </td>
                      <td className="text-gray-400 py-1 pr-2">{weapon.range ? `${weapon.range}"` : '-'}</td>
                      <td className="text-gray-400 py-1 pr-2">A{weapon.attacks || '1'}</td>
                      <td className="text-gray-400 py-1 pr-2">{apValue || '-'}</td>
                      <td className="text-gray-400 py-1">{specialText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model Details (Expanded) */}
      {isSelected && !compactMode && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-xs space-y-1">
            {/* Regular Models */}
            {unit.models.filter(m => !m.isDestroyed).map(model => (
              <div key={model.modelId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={model.isHero ? 'text-yellow-400 font-medium' : ''}>
                      {model.customName || model.name}
                      {model.isHero && ' (Hero)'}
                    </span>
                    <WoundMarkers 
                      currentTough={model.currentTough}
                      maxTough={model.maxTough}
                      modelName={model.name}
                    />
                  </div>
                  {damageMode && onQuickDamage && (
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
                <div className="pl-4">
                  <HealthBar 
                    current={model.currentTough} 
                    max={model.maxTough}
                    size="sm"
                  />
                </div>
              </div>
            ))}
            
            {/* Joined Hero (separate section) */}
            {unit.type === 'JOINED' && unit.joinedHero && !unit.joinedHero.isDestroyed && (
              <>
                <div className="border-t border-gray-700 my-2 pt-2">
                  <div className="text-gray-500 text-xs mb-1">Joined Hero:</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400 font-medium">
                        {unit.joinedHero.name}
                      </span>
                      <WoundMarkers 
                        currentTough={unit.joinedHero.currentTough}
                        maxTough={unit.joinedHero.maxTough}
                        modelName={unit.joinedHero.name}
                      />
                    </div>
                    {damageMode && onQuickDamage && (
                      <div className="flex space-x-1">
                        {[1, 2, 3].map(damage => (
                          <button
                            key={damage}
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickDamage(damage, unit.joinedHero!.modelId);
                            }}
                            className="w-6 h-6 bg-red-600 hover:bg-red-700 rounded text-xs touch-manipulation"
                          >
                            {damage}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pl-4">
                    <HealthBar 
                      current={unit.joinedHero.currentTough} 
                      max={unit.joinedHero.maxTough}
                      size="sm"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spell Cast Modal */}
      {showSpellModal && (
        <SpellCastModal
          isVisible={showSpellModal}
          onClose={() => setShowSpellModal(false)}
          battleId={battleId}
          casterUnit={unit}
          availableSpells={availableSpells}
          allArmies={allArmies || []}
          maxTokens={
            unit.models.find(m => m.specialRules.some(rule => rule.includes('Caster(')))?.casterTokens || 
            unit.joinedHero?.casterTokens || 0
          }
          onCastSpell={handleSpellCast}
        />
      )}
    </div>
  );
};