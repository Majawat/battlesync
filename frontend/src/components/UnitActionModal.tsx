import React, { useState, useEffect } from 'react';
import { OPRBattleUnit } from '../types/oprBattle';

interface UnitActionModalProps {
  isVisible: boolean;
  onClose: () => void;
  unit: OPRBattleUnit;
  action: 'hold' | 'advance' | 'rush' | 'charge';
  allArmies: any[];
  battleId: string;
  onActionComplete: () => void;
}

interface WeaponSummary {
  name: string;
  count: number;
  totalAttacks: number;
  range?: string;
}

interface TargetUnit {
  unitId: string;
  name: string;
  armyName: string;
  isEnemy: boolean;
}

export const UnitActionModal: React.FC<UnitActionModalProps> = ({
  isVisible,
  onClose,
  unit,
  action,
  allArmies,
  battleId,
  onActionComplete
}) => {
  const [didShoot, setDidShoot] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [woundsCaused, setWoundsCaused] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setDidShoot(false);
      setSelectedTarget(null);
      setWoundsCaused(0);
      setError(null);
    }
  }, [isVisible]);

  // Get weapon summary for this unit
  const getWeaponSummary = (): WeaponSummary[] => {
    const weaponMap = new Map<string, WeaponSummary>();

    unit.weaponSummary.forEach(weapon => {
      if (weapon.range && weapon.range !== 'Melee') {
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
            range: weapon.range?.toString()
          });
        }
      }
    });

    return Array.from(weaponMap.values());
  };

  // Get available targets
  const getAvailableTargets = (): TargetUnit[] => {
    const targets: TargetUnit[] = [];
    
    // Find the unit's army
    const unitArmy = allArmies.find(army => 
      army.units.some((u: any) => u.unitId === unit.unitId)
    );
    
    if (!unitArmy) return [];
    
    // Get all other units
    for (const army of allArmies) {
      const isEnemyArmy = army.userId !== unitArmy.userId;
      
      for (const armyUnit of army.units) {
        if (armyUnit.unitId === unit.unitId) continue; // Can't target self
        
        targets.push({
          unitId: armyUnit.unitId,
          name: armyUnit.customName || armyUnit.name,
          armyName: army.armyName || `Army ${army.userId}`,
          isEnemy: isEnemyArmy
        });
      }
    }
    
    return targets;
  };

  const submitAction = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // First, submit the basic action (hold/advance/etc)
      const actionResponse = await fetch(`/api/opr/battles/${battleId}/unit-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          unitId: unit.unitId,
          action
        })
      });

      if (!actionResponse.ok) {
        throw new Error('Failed to perform unit action');
      }

      // If they shot, apply wounds to target
      if (didShoot && selectedTarget && woundsCaused > 0) {
        const damageResponse = await fetch(`/api/opr/battles/${battleId}/quick-damage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            unitId: selectedTarget,
            customDamage: woundsCaused
          })
        });

        if (!damageResponse.ok) {
          throw new Error('Failed to apply shooting damage');
        }
      }

      onActionComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  const weaponSummary = getWeaponSummary();
  const availableTargets = getAvailableTargets();
  const canShoot = weaponSummary.length > 0 && (action === 'hold' || action === 'advance');
  const totalAttacks = weaponSummary.reduce((sum, weapon) => sum + weapon.totalAttacks, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-lg mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white pr-2">
            {action.charAt(0).toUpperCase() + action.slice(1)}: {unit.customName || unit.name}
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

        {/* Action Description */}
        <div className="mb-6 bg-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-2">Action: {action.charAt(0).toUpperCase() + action.slice(1)}</h3>
          <p className="text-gray-300 text-sm">
            {action === 'hold' && 'Unit remains in position and can shoot at full effectiveness.'}
            {action === 'advance' && 'Unit moves up to 6" and can shoot with -1 to hit.'}
            {action === 'rush' && 'Unit moves up to 12" but cannot shoot.'}
            {action === 'charge' && 'Unit moves up to 12" and must fight in melee.'}
          </p>
        </div>

        {/* Shooting Section */}
        {canShoot && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Shooting</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={didShoot}
                  onChange={(e) => setDidShoot(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white">Did you shoot?</span>
              </label>
            </div>

            {weaponSummary.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Available Weapons:</h4>
                <div className="space-y-1">
                  {weaponSummary.map(weapon => (
                    <div key={weapon.name} className="text-sm text-white">
                      <span className="font-medium">{weapon.count}x {weapon.name}</span>
                      <span className="text-gray-400 ml-2">({weapon.totalAttacks} attacks)</span>
                      {weapon.range && <span className="text-gray-400 ml-2">Range: {weapon.range}</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <span className="text-sm font-medium text-blue-400">Total: {totalAttacks} attacks</span>
                </div>
              </div>
            )}

            {didShoot && (
              <>
                {/* Target Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Who did you shoot at?
                  </label>
                  <select
                    value={selectedTarget || ''}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">Select target...</option>
                    {availableTargets.map(target => (
                      <option key={target.unitId} value={target.unitId}>
                        {target.name} ({target.armyName}) {target.isEnemy ? '- Enemy' : '- Ally'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Wounds Caused */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    How many wounds did you cause?
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={woundsCaused}
                    onChange={(e) => setWoundsCaused(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="0"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submitAction}
            disabled={isSubmitting || (didShoot && (!selectedTarget || woundsCaused < 0))}
            className={`w-full sm:w-auto px-6 py-2 rounded font-medium transition-colors ${
              !isSubmitting && (!didShoot || (selectedTarget && woundsCaused >= 0))
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Submitting...' : `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`}
          </button>
        </div>
      </div>
    </div>
  );
};