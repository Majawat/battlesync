import React from 'react';
import { OPRBattleUnit } from '../types/oprBattle';

interface BattleUnitCardProps {
  unit: OPRBattleUnit;
  isOwned?: boolean;
  isSelected?: boolean;
  damageMode?: boolean;
  compactMode?: boolean;
  onSelect?: () => void;
  onQuickDamage?: (damage: number, modelId?: string) => void;
}

export const BattleUnitCard: React.FC<BattleUnitCardProps> = ({ 
  unit, 
  isOwned = true,
  isSelected = false,
  damageMode = false,
  compactMode = false,
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
      className={`border-2 ${statusColor} ${bgColor} rounded-lg p-3 ${
        onSelect ? 'cursor-pointer transition-all' : ''
      } ${
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
        {damageMode && !isDestroyed && onQuickDamage && (
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

      {/* Joined Hero Information */}
      {unit.type === 'JOINED' && unit.joinedHero && (
        <div className="mt-2 text-xs">
          <div className="text-gray-300">
            Joined Hero: {unit.joinedHero.name} • 
            Tough: {unit.joinedHero.currentTough}/{unit.joinedHero.maxTough} • 
            Quality: {unit.joinedHero.quality}+ • 
            Defense: {unit.joinedHero.defense}+
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
              <div key={model.modelId} className="flex items-center justify-between">
                <span className={model.isHero ? 'text-yellow-400 font-medium' : ''}>
                  {model.customName || model.name}
                  {model.isHero && ' (Hero)'}
                </span>
                <span className="text-gray-400">
                  {model.currentTough}/{model.maxTough} Tough
                </span>
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
            ))}
            
            {/* Joined Hero (separate section) */}
            {unit.type === 'JOINED' && unit.joinedHero && !unit.joinedHero.isDestroyed && (
              <>
                <div className="border-t border-gray-700 my-2 pt-2">
                  <div className="text-gray-500 text-xs mb-1">Joined Hero:</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-400 font-medium">
                    {unit.joinedHero.name}
                  </span>
                  <span className="text-gray-400">
                    {unit.joinedHero.currentTough}/{unit.joinedHero.maxTough} Tough
                  </span>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};