import React, { useState, useEffect } from 'react';
import { OPRSpell, OPRBattleUnit } from '../types/oprBattle';

interface SpellCastModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCastSpell: (spellId: string, cooperatingCasters: CooperatingCaster[]) => void;
  casterUnit: OPRBattleUnit;
  availableSpells: OPRSpell[];
  availableCasters: AvailableCaster[];
  maxTokens: number; // Available tokens from main caster
}

interface AvailableCaster {
  unitId: string;
  modelId?: string;
  tokens: number;
  name: string;
}

interface CooperatingCaster {
  unitId: string;
  modelId?: string;
  tokensContributed: number;
  modifier: number;
}

export const SpellCastModal: React.FC<SpellCastModalProps> = ({
  isVisible,
  onClose,
  onCastSpell,
  casterUnit,
  availableSpells,
  availableCasters,
  maxTokens
}) => {
  const [selectedSpell, setSelectedSpell] = useState<OPRSpell | null>(null);
  const [cooperatingCasters, setCooperatingCasters] = useState<CooperatingCaster[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setSelectedSpell(null);
      setCooperatingCasters([]);
    }
  }, [isVisible]);

  // Calculate total tokens available and roll modifier
  const totalTokensAvailable = maxTokens + cooperatingCasters.reduce((sum, c) => sum + c.tokensContributed, 0);
  const currentRollModifier = cooperatingCasters.reduce((sum, c) => sum + c.modifier, 0);

  const canCastSpell = selectedSpell ? totalTokensAvailable >= selectedSpell.cost : false;
  const tokensAfterCasting = selectedSpell ? totalTokensAvailable - selectedSpell.cost : totalTokensAvailable;

  const handleCooperatingCasterChange = (caster: AvailableCaster, tokens: number, isPositive: boolean) => {
    const modifier = isPositive ? tokens : -tokens;
    
    setCooperatingCasters(prev => {
      const existing = prev.find(c => c.unitId === caster.unitId && c.modelId === caster.modelId);
      
      if (existing) {
        if (tokens === 0) {
          // Remove caster
          return prev.filter(c => !(c.unitId === caster.unitId && c.modelId === caster.modelId));
        } else {
          // Update existing
          return prev.map(c => 
            c.unitId === caster.unitId && c.modelId === caster.modelId
              ? { ...c, tokensContributed: tokens, modifier }
              : c
          );
        }
      } else if (tokens > 0) {
        // Add new cooperating caster
        return [...prev, {
          unitId: caster.unitId,
          modelId: caster.modelId,
          tokensContributed: tokens,
          modifier
        }];
      }
      
      return prev;
    });
  };

  const handleCastSpell = () => {
    if (!selectedSpell || !canCastSpell) return;
    
    onCastSpell(selectedSpell.id, cooperatingCasters);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Cast Spell - {
            (casterUnit.joinedHero?.casterTokens || 0) > 0 
              ? casterUnit.joinedHero?.name 
              : casterUnit.models.find(m => m.casterTokens > 0)?.name || casterUnit.name
          }</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Token Summary */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-white font-medium">Available Tokens: </span>
              <span className="text-blue-400 font-bold">{totalTokensAvailable}</span>
            </div>
            <div>
              <span className="text-white font-medium">Roll Modifier: </span>
              <span className={`font-bold ${currentRollModifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {currentRollModifier >= 0 ? '+' : ''}{currentRollModifier}
              </span>
            </div>
          </div>
          
          {selectedSpell && (
            <div className="mt-2 text-sm">
              <span className="text-gray-300">After casting: </span>
              <span className="text-yellow-400">{tokensAfterCasting} tokens remaining</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spell Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Available Spells</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableSpells.map(spell => (
                <div
                  key={spell.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedSpell?.id === spell.id
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                  onClick={() => setSelectedSpell(spell)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white">{spell.name}</h4>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      spell.cost <= totalTokensAvailable 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {spell.cost} {spell.cost === 1 ? 'token' : 'tokens'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-300 space-y-1">
                    <div><strong>Range:</strong> {spell.range}</div>
                    <div><strong>Targets:</strong> {spell.targets}</div>
                    <div><strong>Effect:</strong> {spell.effect}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cooperative Casting */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Cooperative Casting
              <span className="text-sm text-gray-400 ml-2">(Other casters within 18")</span>
            </h3>
            
            {availableCasters.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No other casters available for cooperation
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availableCasters.map(caster => {
                  const cooperation = cooperatingCasters.find(c => 
                    c.unitId === caster.unitId && c.modelId === caster.modelId
                  );
                  
                  return (
                    <div key={`${caster.unitId}-${caster.modelId}`} className="bg-gray-700 rounded-lg p-3">
                      <div className="font-medium text-white mb-2">{caster.name}</div>
                      <div className="text-sm text-gray-300 mb-3">
                        {caster.tokens} {caster.tokens === 1 ? 'token' : 'tokens'} available
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Positive (+1/token)</label>
                          <select
                            value={cooperation && cooperation.modifier > 0 ? cooperation.tokensContributed : 0}
                            onChange={(e) => handleCooperatingCasterChange(caster, parseInt(e.target.value), true)}
                            className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                          >
                            {Array.from({ length: caster.tokens + 1 }, (_, i) => (
                              <option key={i} value={i}>{i} {i === 1 ? 'token' : 'tokens'}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Negative (-1/token)</label>
                          <select
                            value={cooperation && cooperation.modifier < 0 ? cooperation.tokensContributed : 0}
                            onChange={(e) => handleCooperatingCasterChange(caster, parseInt(e.target.value), false)}
                            className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                          >
                            {Array.from({ length: caster.tokens + 1 }, (_, i) => (
                              <option key={i} value={i}>{i} {i === 1 ? 'token' : 'tokens'}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Spell Details */}
        {selectedSpell && (
          <div className="mt-6 bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-3">Spell Details: {selectedSpell.name}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-gray-300">Cost:</strong> {selectedSpell.cost} tokens<br/>
                <strong className="text-gray-300">Range:</strong> {selectedSpell.range}<br/>
                <strong className="text-gray-300">Targets:</strong> {selectedSpell.targets}<br/>
                <strong className="text-gray-300">Duration:</strong> {selectedSpell.duration}
              </div>
              <div>
                <strong className="text-gray-300">Success Roll:</strong> 4+ on D6 
                {currentRollModifier !== 0 && (
                  <span className={currentRollModifier > 0 ? 'text-green-400' : 'text-red-400'}>
                    {' '}({currentRollModifier >= 0 ? '+' : ''}{currentRollModifier})
                  </span>
                )}
                <br/>
                {selectedSpell.hits && (
                  <>
                    <strong className="text-gray-300">Damage:</strong> {selectedSpell.hits} hits
                    {selectedSpell.armorPiercing && ` with AP(${selectedSpell.armorPiercing})`}
                    <br/>
                  </>
                )}
              </div>
            </div>
            <div className="mt-3">
              <strong className="text-gray-300">Effect:</strong> {selectedSpell.effect}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCastSpell}
            disabled={!canCastSpell}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              canCastSpell
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {!selectedSpell ? 'Select a Spell' : 
             !canCastSpell ? 'Not Enough Tokens' : 
             'Attempt to Cast'}
          </button>
        </div>
      </div>
    </div>
  );
};