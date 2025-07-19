import React, { useState, useEffect } from 'react';
import { OPRBattleUnit } from '../types/oprBattle';

interface MeleeAttackModalProps {
  isVisible: boolean;
  onClose: () => void;
  attackerUnit: OPRBattleUnit;
  allArmies: any[];
  battleId: string;
  onMeleeComplete: () => void;
}

interface MeleeWeaponSummary {
  name: string;
  count: number;
  totalAttacks: number;
  specialRules: string[];
}

interface TargetUnit {
  unitId: string;
  name: string;
  armyName: string;
  isEnemy: boolean;
  unit: OPRBattleUnit;
}

type MeleePhase = 'target-selection' | 'attacker-melee' | 'defender-choice' | 'defender-melee' | 'resolution';

interface MeleeResult {
  attackerWounds: number;
  defenderWounds: number;
  winner: 'attacker' | 'defender' | 'tie';
  attackerMustTest: boolean;
  defenderMustTest: boolean;
}

export const MeleeAttackModal: React.FC<MeleeAttackModalProps> = ({
  isVisible,
  onClose,
  attackerUnit,
  allArmies,
  battleId,
  onMeleeComplete
}) => {
  const [currentPhase, setCurrentPhase] = useState<MeleePhase>('target-selection');
  const [selectedTarget, setSelectedTarget] = useState<TargetUnit | null>(null);
  const [attackerWounds, setAttackerWounds] = useState<number>(0);
  const [defenderWounds, setDefenderWounds] = useState<number>(0);
  const [, setDefenderWillStrikeBack] = useState<boolean>(false);
  const [meleeResult, setMeleeResult] = useState<MeleeResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setCurrentPhase('target-selection');
      setSelectedTarget(null);
      setAttackerWounds(0);
      setDefenderWounds(0);
      setDefenderWillStrikeBack(false);
      setMeleeResult(null);
      setError(null);
    }
  }, [isVisible]);

  // Get melee weapon summary for a unit
  const getMeleeWeaponSummary = (unit: OPRBattleUnit): MeleeWeaponSummary[] => {
    const weaponMap = new Map<string, MeleeWeaponSummary>();

    unit.weaponSummary.forEach(weapon => {
      // Melee weapons are those with range "Melee" or no range specified
      if (!weapon.range || weapon.range === 'Melee') {
        let totalAttacks = 0;
        
        // Calculate total attacks
        if (typeof weapon.attacks === 'number') {
          totalAttacks = weapon.attacks * weapon.count;
        } else if (typeof weapon.attacks === 'string') {
          const match = weapon.attacks.match(/(\d+)d(\d+)/);
          if (match) {
            const numDice = parseInt(match[1]);
            const diceSides = parseInt(match[2]);
            const average = numDice * ((diceSides + 1) / 2);
            totalAttacks = Math.ceil(average) * weapon.count;
          } else {
            const parsed = parseInt(weapon.attacks);
            if (!isNaN(parsed)) {
              totalAttacks = parsed * weapon.count;
            }
          }
        }

        const existing = weaponMap.get(weapon.name);
        if (existing) {
          existing.count += weapon.count;
          existing.totalAttacks += totalAttacks;
        } else {
          weaponMap.set(weapon.name, {
            name: weapon.name,
            count: weapon.count,
            totalAttacks,
            specialRules: weapon.specialRules
          });
        }
      }
    });

    return Array.from(weaponMap.values());
  };

  // Get available targets for melee (enemies only)
  const getAvailableTargets = (): TargetUnit[] => {
    const targets: TargetUnit[] = [];
    
    // Find the attacker's army
    const attackerArmy = allArmies.find(army => 
      army.units.some((u: any) => u.unitId === attackerUnit.unitId)
    );
    
    if (!attackerArmy) return [];
    
    // Get all enemy units
    for (const army of allArmies) {
      const isEnemyArmy = army.userId !== attackerArmy.userId;
      
      if (isEnemyArmy) {
        for (const armyUnit of army.units) {
          targets.push({
            unitId: armyUnit.unitId,
            name: armyUnit.customName || armyUnit.name,
            armyName: army.armyName || `Army ${army.userId}`,
            isEnemy: true,
            unit: armyUnit
          });
        }
      }
    }
    
    return targets;
  };

  const proceedToAttackerMelee = () => {
    if (!selectedTarget) {
      setError('Please select a target');
      return;
    }
    setCurrentPhase('attacker-melee');
  };

  const submitAttackerMelee = () => {
    setCurrentPhase('defender-choice');
  };

  const handleDefenderChoice = (willStrikeBack: boolean) => {
    setDefenderWillStrikeBack(willStrikeBack);
    if (willStrikeBack) {
      setCurrentPhase('defender-melee');
    } else {
      // Skip to resolution
      resolveMelee();
    }
  };

  const submitDefenderMelee = () => {
    resolveMelee();
  };

  const resolveMelee = () => {
    if (!selectedTarget) return;

    let winner: 'attacker' | 'defender' | 'tie' = 'tie';
    let attackerMustTest = false;
    let defenderMustTest = false;

    // Determine winner based on wounds caused
    if (attackerWounds > defenderWounds) {
      winner = 'attacker';
      defenderMustTest = true; // Loser takes morale test
    } else if (defenderWounds > attackerWounds) {
      winner = 'defender';
      attackerMustTest = true; // Loser takes morale test
    }
    // If tied or both caused 0 wounds, no morale test for melee loss

    // Additional morale tests for units under half strength after wounds
    const attackerAfterWounds = attackerUnit.currentSize - defenderWounds;
    const defenderAfterWounds = selectedTarget.unit.currentSize - attackerWounds;
    
    if (attackerAfterWounds <= Math.ceil(attackerUnit.originalSize / 2) && defenderWounds > 0) {
      attackerMustTest = true;
    }
    if (defenderAfterWounds <= Math.ceil(selectedTarget.unit.originalSize / 2) && attackerWounds > 0) {
      defenderMustTest = true;
    }

    const result: MeleeResult = {
      attackerWounds,
      defenderWounds,
      winner,
      attackerMustTest,
      defenderMustTest
    };

    setMeleeResult(result);
    setCurrentPhase('resolution');
  };

  const completeMelee = async () => {
    if (!selectedTarget || !meleeResult) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // First, perform the charge action
      const actionResponse = await fetch(`/api/opr/battles/${battleId}/unit-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          unitId: attackerUnit.unitId,
          action: 'charge'
        })
      });

      if (!actionResponse.ok) {
        throw new Error('Failed to perform charge action');
      }

      // Apply wounds to attacker if any
      if (meleeResult.defenderWounds > 0) {
        const attackerDamageResponse = await fetch(`/api/opr/battles/${battleId}/quick-damage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            unitId: attackerUnit.unitId,
            customDamage: meleeResult.defenderWounds
          })
        });

        if (!attackerDamageResponse.ok) {
          throw new Error('Failed to apply melee damage to attacker');
        }
      }

      // Apply wounds to defender if any
      if (meleeResult.attackerWounds > 0) {
        const defenderDamageResponse = await fetch(`/api/opr/battles/${battleId}/quick-damage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            unitId: selectedTarget.unitId,
            customDamage: meleeResult.attackerWounds
          })
        });

        if (!defenderDamageResponse.ok) {
          throw new Error('Failed to apply melee damage to defender');
        }
      }

      onMeleeComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete melee');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  const attackerMeleeWeapons = getMeleeWeaponSummary(attackerUnit);
  const defenderMeleeWeapons = selectedTarget ? getMeleeWeaponSummary(selectedTarget.unit) : [];
  const availableTargets = getAvailableTargets();
  const attackerTotalAttacks = attackerMeleeWeapons.reduce((sum, weapon) => sum + weapon.totalAttacks, 0);
  const defenderTotalAttacks = defenderMeleeWeapons.reduce((sum, weapon) => sum + weapon.totalAttacks, 0);

  const renderTargetSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Select Charge Target</h3>
      
      {availableTargets.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No enemy units available to charge
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {availableTargets.map((target) => (
            <div
              key={target.unitId}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedTarget?.unitId === target.unitId
                  ? 'border-red-500 bg-red-900/20'
                  : 'border-gray-600 bg-gray-700 hover:border-red-400'
              }`}
              onClick={() => setSelectedTarget(target)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-white">{target.name}</div>
                  <div className="text-sm text-gray-400">{target.armyName}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {target.unit.currentSize}/{target.unit.originalSize} models
                  </div>
                </div>
                <div className="px-2 py-1 rounded text-xs bg-red-600 text-white">
                  Enemy
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAttackerMelee = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        {attackerUnit.customName || attackerUnit.name} Charges {selectedTarget?.name}
      </h3>

      {/* Attacker's Melee Weapons */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Your Melee Weapons:</h4>
        <div className="space-y-1">
          {attackerMeleeWeapons.map(weapon => (
            <div key={weapon.name} className="text-sm text-white">
              <span className="font-medium">{weapon.count}x {weapon.name}</span>
              <span className="text-gray-400 ml-2">({weapon.totalAttacks} attacks)</span>
              {weapon.specialRules.length > 0 && (
                <span className="text-blue-400 ml-2">{weapon.specialRules.join(', ')}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-600">
          <span className="text-sm font-medium text-red-400">Total: {attackerTotalAttacks} attacks</span>
        </div>
      </div>

      {/* Wounds Caused Input */}
      <div className="bg-gray-700 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          How many wounds did you cause to {selectedTarget?.name}?
        </label>
        <input
          type="number"
          min="0"
          max="20"
          value={attackerWounds}
          onChange={(e) => setAttackerWounds(parseInt(e.target.value) || 0)}
          className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
          placeholder="0"
        />
        <p className="text-xs text-gray-400 mt-1">
          Roll {attackerTotalAttacks} dice vs Quality {attackerUnit.models[0]?.quality || 4}+, then opponent rolls Defense {selectedTarget?.unit.models[0]?.defense || 5}+
        </p>
      </div>
    </div>
  );

  const renderDefenderChoice = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Defender's Choice: Strike Back?
      </h3>

      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
        <div className="text-yellow-400 font-medium mb-2">⚡ Defender Decision Required</div>
        <p className="text-yellow-200 text-sm">
          {selectedTarget?.name} has been charged and taken {attackerWounds} wounds. 
          They can now choose to strike back in melee.
        </p>
      </div>

      {/* Defender's Melee Weapons */}
      {defenderMeleeWeapons.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">{selectedTarget?.name}'s Melee Weapons:</h4>
          <div className="space-y-1">
            {defenderMeleeWeapons.map(weapon => (
              <div key={weapon.name} className="text-sm text-white">
                <span className="font-medium">{weapon.count}x {weapon.name}</span>
                <span className="text-gray-400 ml-2">({weapon.totalAttacks} attacks)</span>
                {weapon.specialRules.length > 0 && (
                  <span className="text-blue-400 ml-2">{weapon.specialRules.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-600">
            <span className="text-sm font-medium text-blue-400">Total: {defenderTotalAttacks} attacks</span>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => handleDefenderChoice(true)}
          className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
        >
          ⚔️ Strike Back ({defenderTotalAttacks} attacks)
        </button>
        <button
          onClick={() => handleDefenderChoice(false)}
          className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
        >
          🛡️ Don't Strike Back
        </button>
      </div>
    </div>
  );

  const renderDefenderMelee = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        {selectedTarget?.name} Strikes Back!
      </h3>

      {/* Defender's Melee Weapons */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">{selectedTarget?.name}'s Melee Weapons:</h4>
        <div className="space-y-1">
          {defenderMeleeWeapons.map(weapon => (
            <div key={weapon.name} className="text-sm text-white">
              <span className="font-medium">{weapon.count}x {weapon.name}</span>
              <span className="text-gray-400 ml-2">({weapon.totalAttacks} attacks)</span>
              {weapon.specialRules.length > 0 && (
                <span className="text-blue-400 ml-2">{weapon.specialRules.join(', ')}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-600">
          <span className="text-sm font-medium text-blue-400">Total: {defenderTotalAttacks} attacks</span>
        </div>
      </div>

      {/* Wounds Caused Input */}
      <div className="bg-gray-700 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          How many wounds did {selectedTarget?.name} cause to {attackerUnit.customName || attackerUnit.name}?
        </label>
        <input
          type="number"
          min="0"
          max="20"
          value={defenderWounds}
          onChange={(e) => setDefenderWounds(parseInt(e.target.value) || 0)}
          className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
          placeholder="0"
        />
        <p className="text-xs text-gray-400 mt-1">
          Roll {defenderTotalAttacks} dice vs Quality {selectedTarget?.unit.models[0]?.quality || 4}+, then opponent rolls Defense {attackerUnit.models[0]?.defense || 5}+
        </p>
      </div>
    </div>
  );

  const renderResolution = () => {
    if (!meleeResult || !selectedTarget) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Melee Resolution</h3>

        {/* Melee Results Summary */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-white mb-3">Battle Results:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Attacker ({attackerUnit.customName || attackerUnit.name}):</div>
              <div className="text-white font-medium">{meleeResult.attackerWounds} wounds caused</div>
            </div>
            <div>
              <div className="text-gray-400">Defender ({selectedTarget.name}):</div>
              <div className="text-white font-medium">{meleeResult.defenderWounds} wounds caused</div>
            </div>
          </div>
        </div>

        {/* Winner Declaration */}
        <div className={`rounded-lg p-4 ${
          meleeResult.winner === 'attacker' ? 'bg-green-900/20 border border-green-600' :
          meleeResult.winner === 'defender' ? 'bg-red-900/20 border border-red-600' :
          'bg-gray-700 border border-gray-600'
        }`}>
          <div className="font-medium text-white mb-2">
            {meleeResult.winner === 'attacker' && `🏆 ${attackerUnit.customName || attackerUnit.name} wins the melee!`}
            {meleeResult.winner === 'defender' && `🏆 ${selectedTarget.name} wins the melee!`}
            {meleeResult.winner === 'tie' && '🤝 Melee is a tie!'}
          </div>
        </div>

        {/* Morale Tests Required */}
        {(meleeResult.attackerMustTest || meleeResult.defenderMustTest) && (
          <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-4">
            <div className="text-orange-400 font-medium mb-2">⚠️ Morale Tests Required:</div>
            <div className="space-y-1 text-sm">
              {meleeResult.attackerMustTest && (
                <div className="text-orange-200">
                  • {attackerUnit.customName || attackerUnit.name} must take a morale test
                  {meleeResult.winner === 'defender' ? ' (lost melee)' : ' (under half strength)'}
                </div>
              )}
              {meleeResult.defenderMustTest && (
                <div className="text-orange-200">
                  • {selectedTarget.name} must take a morale test
                  {meleeResult.winner === 'attacker' ? ' (lost melee)' : ' (under half strength)'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Consolidation */}
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <div className="text-blue-400 font-medium mb-2">📏 Consolidation:</div>
          <div className="text-blue-200 text-sm">
            After morale tests, units must make consolidation moves:
            <br />• If a unit was destroyed: winner may move up to 3"
            <br />• If both units survive: charging unit moves back 1" to separate
          </div>
        </div>
      </div>
    );
  };

  const getPhaseTitle = () => {
    switch (currentPhase) {
      case 'target-selection': return 'Select Charge Target';
      case 'attacker-melee': return 'Attacker Melee Phase';
      case 'defender-choice': return 'Defender Decision';
      case 'defender-melee': return 'Defender Melee Phase';
      case 'resolution': return 'Melee Resolution';
      default: return 'Charge Action';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-lg md:max-w-2xl mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white pr-2">
            {getPhaseTitle()}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-900 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {currentPhase === 'target-selection' && renderTargetSelection()}
        {currentPhase === 'attacker-melee' && renderAttackerMelee()}
        {currentPhase === 'defender-choice' && renderDefenderChoice()}
        {currentPhase === 'defender-melee' && renderDefenderMelee()}
        {currentPhase === 'resolution' && renderResolution()}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            {currentPhase === 'resolution' ? 'Close' : 'Cancel'}
          </button>
          
          {/* Phase-specific action buttons */}
          {currentPhase === 'target-selection' && (
            <button
              onClick={proceedToAttackerMelee}
              disabled={!selectedTarget}
              className={`w-full sm:w-auto px-6 py-2 rounded font-medium transition-colors ${
                selectedTarget
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              ⚔️ Charge!
            </button>
          )}

          {currentPhase === 'attacker-melee' && (
            <button
              onClick={submitAttackerMelee}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
            >
              Continue to Defender
            </button>
          )}

          {currentPhase === 'defender-melee' && (
            <button
              onClick={submitDefenderMelee}
              className="w-full sm:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
            >
              Resolve Melee
            </button>
          )}

          {currentPhase === 'resolution' && (
            <button
              onClick={completeMelee}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded font-medium"
            >
              {isSubmitting ? 'Applying Results...' : 'Complete Melee'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};