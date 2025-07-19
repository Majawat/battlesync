import React, { useState, useEffect } from 'react';
import { OPRSpell, OPRBattleUnit } from '../types/oprBattle';

interface SpellCastModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCastSpell: (spellId: string, targetUnitIds: string[]) => void;
  casterUnit: OPRBattleUnit;
  availableSpells: OPRSpell[];
  maxTokens: number; // Available tokens from main caster
  allArmies: any[]; // For target selection
}

interface TargetUnit {
  unitId: string;
  name: string;
  armyName: string;
  isEnemy: boolean;
}

export const SpellCastModal: React.FC<SpellCastModalProps> = ({
  isVisible,
  onClose,
  onCastSpell,
  casterUnit,
  availableSpells,
  maxTokens,
  allArmies
}) => {
  const [selectedSpell, setSelectedSpell] = useState<OPRSpell | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setSelectedSpell(null);
      setSelectedTargets([]);
    }
  }, [isVisible]);

  // Get all possible target units
  const getTargetUnits = (): TargetUnit[] => {
    const targets: TargetUnit[] = [];
    
    for (const army of allArmies) {
      const isEnemyArmy = army.userId !== casterUnit.userId; // Assuming casterUnit has userId
      
      for (const unit of army.units) {
        if (unit.unitId === casterUnit.unitId) continue; // Can't target self
        
        targets.push({
          unitId: unit.unitId,
          name: unit.name,
          armyName: army.name || `Army ${army.userId}`,
          isEnemy: isEnemyArmy
        });
      }
    }
    
    return targets;
  };

  const targetUnits = getTargetUnits();

  const handleTargetToggle = (unitId: string) => {
    setSelectedTargets(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  const handleProceedToCast = () => {
    if (selectedSpell) {
      onCastSpell(selectedSpell.id, selectedTargets);
      onClose();
    }
  };

  const canProceed = selectedSpell && maxTokens >= selectedSpell.cost;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 sm:p-6 w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white pr-2">Cast Spell - {casterUnit.name}</h2>
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
              <span className="text-blue-400 font-bold">{maxTokens}</span>
            </div>
          </div>
        </div>

        {/* Spell Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Select Spell</h3>
          
          {availableSpells.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No spells available
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-3 max-h-48 sm:max-h-64 overflow-y-auto">
              {availableSpells.map(spell => (
                <div
                  key={spell.id}
                  className={`border rounded-lg p-2 sm:p-4 cursor-pointer transition-colors ${
                    selectedSpell?.id === spell.id
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-600 bg-gray-700 hover:border-purple-400'
                  }`}
                  onClick={() => setSelectedSpell(spell)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white text-sm sm:text-base pr-2">{spell.name}</h4>
                    <span className={`px-1 sm:px-2 py-1 rounded text-xs sm:text-sm font-medium whitespace-nowrap ${
                      spell.cost <= maxTokens 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {spell.cost} {spell.cost === 1 ? 'token' : 'tokens'}
                    </span>
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm mb-2 line-clamp-2">{spell.effect}</p>
                  <div className="text-xs text-gray-400 flex flex-col sm:flex-row sm:space-x-2">
                    <span>Range: {spell.range}</span>
                    <span className="hidden sm:inline">|</span>
                    <span>Targets: {spell.targets}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <strong className="text-gray-300">Base Success:</strong> 4+ on D6<br/>
                {selectedSpell.hits && (
                  <>
                    <strong className="text-gray-300">Hits:</strong> {selectedSpell.hits}<br/>
                  </>
                )}
                {selectedSpell.special && (
                  <>
                    <strong className="text-gray-300">Special:</strong> {selectedSpell.special}<br/>
                  </>
                )}
              </div>
            </div>
            <div className="mt-3">
              <strong className="text-gray-300">Effect:</strong>
              <p className="text-white mt-1">{selectedSpell.effect}</p>
            </div>
          </div>
        )}

        {/* Target Selection */}
        {selectedSpell && (
          <div className="mt-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3">
              Select Targets
              <span className="text-xs sm:text-sm text-gray-400 block sm:inline sm:ml-2">(Optional - can be selected later)</span>
            </h3>
            
            <div className="grid grid-cols-1 gap-2 sm:gap-3 max-h-40 sm:max-h-64 overflow-y-auto">
              {targetUnits.map(target => (
                <div
                  key={target.unitId}
                  className={`border rounded-lg p-2 sm:p-3 cursor-pointer transition-colors ${
                    selectedTargets.includes(target.unitId)
                      ? 'border-yellow-500 bg-yellow-900/20'
                      : 'border-gray-600 bg-gray-700 hover:border-yellow-400'
                  }`}
                  onClick={() => handleTargetToggle(target.unitId)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">{target.name}</div>
                      <div className="text-sm text-gray-400">{target.armyName}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      target.isEnemy ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {target.isEnemy ? 'Enemy' : 'Ally'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedTargets.length > 0 && (
              <div className="mt-3 text-sm text-gray-300">
                Selected targets: {selectedTargets.length}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleProceedToCast}
            disabled={!canProceed}
            className={`w-full sm:w-auto px-6 py-2 rounded font-medium transition-colors order-1 sm:order-2 ${
              canProceed
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {!selectedSpell ? 'Select a Spell' : 
             !canProceed ? 'Not Enough Tokens' : 
             'Begin Cooperative Casting'}
          </button>
        </div>
      </div>
    </div>
  );
};