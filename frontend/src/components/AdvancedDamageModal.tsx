import React, { useState } from 'react';
import { OPRBattleUnit, OPRBattleModel } from '../types/oprBattle';

type DamageType = 'NORMAL' | 'INSTANT_KILL' | 'MULTI_DAMAGE' | 'PIERCE' | 'AREA_EFFECT';

interface AdvancedDamageModalProps {
  isVisible: boolean;
  targetUnit: OPRBattleUnit;
  targetModel?: OPRBattleModel;
  onClose: () => void;
  onApplyDamage: (damageData: {
    damage: number;
    damageType: DamageType;
    targetModelId?: string;
    pierceValue?: number;
    multiTargets?: string[];
    instantKillRoll?: number;
    sourceDescription: string;
  }) => void;
}

export const AdvancedDamageModal: React.FC<AdvancedDamageModalProps> = ({
  isVisible,
  targetUnit,
  targetModel,
  onClose,
  onApplyDamage
}) => {
  const [damage, setDamage] = useState(1);
  const [damageType, setDamageType] = useState<DamageType>('NORMAL');
  const [pierceValue, setPierceValue] = useState(0);
  const [instantKillRoll, setInstantKillRoll] = useState(4);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [sourceDescription, setSourceDescription] = useState('');

  const availableModels = targetUnit.models.filter(m => !m.isDestroyed);

  const handleSubmit = () => {
    const damageData = {
      damage,
      damageType,
      targetModelId: damageType === 'MULTI_DAMAGE' ? undefined : targetModel?.modelId,
      pierceValue: damageType === 'PIERCE' ? pierceValue : undefined,
      multiTargets: damageType === 'MULTI_DAMAGE' ? selectedModels : undefined,
      instantKillRoll: damageType === 'INSTANT_KILL' ? instantKillRoll : undefined,
      sourceDescription: sourceDescription || `${damageType.toLowerCase().replace('_', ' ')} damage`
    };

    onApplyDamage(damageData);
    onClose();
  };

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-xl font-bold">Advanced Damage Application</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Target Information */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Target: {targetUnit.name}</h3>
            <div className="text-sm text-gray-300">
              {targetUnit.currentSize}/{targetUnit.originalSize} models remaining
              {targetModel && (
                <span className="ml-3">
                  Targeting: {targetModel.name} ({targetModel.currentTough}/{targetModel.maxTough} Tough)
                </span>
              )}
            </div>
          </div>

          {/* Damage Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Damage Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { type: 'NORMAL' as DamageType, label: 'Normal', desc: 'Standard damage application' },
                { type: 'INSTANT_KILL' as DamageType, label: 'Instant Kill', desc: 'Quality roll to bypass tough' },
                { type: 'PIERCE' as DamageType, label: 'Pierce', desc: 'Ignores X points of tough' },
                { type: 'MULTI_DAMAGE' as DamageType, label: 'Multi-Target', desc: 'Damage multiple models' },
                { type: 'AREA_EFFECT' as DamageType, label: 'Area Effect', desc: 'Template weapon damage' }
              ].map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => setDamageType(type)}
                  className={`p-3 rounded border text-left transition-colors ${
                    damageType === type
                      ? 'border-blue-500 bg-blue-600/20 text-blue-200'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-xs opacity-75">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Damage Amount */}
          <div>
            <label htmlFor="damage" className="block text-sm font-medium mb-2">
              Damage Amount
            </label>
            <input
              id="damage"
              type="number"
              min="1"
              max="20"
              value={damage}
              onChange={(e) => setDamage(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Pierce Value (for PIERCE damage) */}
          {damageType === 'PIERCE' && (
            <div>
              <label htmlFor="pierce" className="block text-sm font-medium mb-2">
                Pierce Value
              </label>
              <input
                id="pierce"
                type="number"
                min="0"
                max="10"
                value={pierceValue}
                onChange={(e) => setPierceValue(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ignores this many points of tough value
              </p>
            </div>
          )}

          {/* Instant Kill Roll (for INSTANT_KILL damage) */}
          {damageType === 'INSTANT_KILL' && (
            <div>
              <label htmlFor="killRoll" className="block text-sm font-medium mb-2">
                Quality Roll Result
              </label>
              <input
                id="killRoll"
                type="number"
                min="1"
                max="6"
                value={instantKillRoll}
                onChange={(e) => setInstantKillRoll(parseInt(e.target.value, 10) || 4)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Roll result (1-6). Must equal or exceed target's Quality to instant kill.
                Target Quality: {targetModel?.quality || 'Unknown'}+
              </p>
            </div>
          )}

          {/* Multi-Target Selection (for MULTI_DAMAGE) */}
          {damageType === 'MULTI_DAMAGE' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Target Models ({selectedModels.length} selected)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableModels.map(model => (
                  <label
                    key={model.modelId}
                    className="flex items-center p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.modelId)}
                      onChange={() => toggleModelSelection(model.modelId)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <span className={model.isHero ? 'text-yellow-400 font-medium' : ''}>
                        {model.name}
                        {model.isHero && ' (Hero)'}
                      </span>
                      <span className="ml-2 text-gray-400 text-sm">
                        {model.currentTough}/{model.maxTough} Tough
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              {selectedModels.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Damage will be split between selected models: {Math.floor(damage / selectedModels.length)} each
                </p>
              )}
            </div>
          )}

          {/* Source Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Source Description (Optional)
            </label>
            <input
              id="description"
              type="text"
              value={sourceDescription}
              onChange={(e) => setSourceDescription(e.target.value)}
              placeholder="e.g. Plasma Rifle, Grenade, Heavy Weapon..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Damage Preview */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium mb-2">Damage Preview</h4>
            <div className="text-sm space-y-1">
              <div>Type: <span className="text-blue-400">{damageType.replace('_', ' ')}</span></div>
              <div>Amount: <span className="text-red-400">{damage} damage</span></div>
              {damageType === 'PIERCE' && (
                <div>Pierce: <span className="text-orange-400">Ignores {pierceValue} tough</span></div>
              )}
              {damageType === 'INSTANT_KILL' && (
                <div>
                  Instant Kill: <span className="text-purple-400">
                    Roll {instantKillRoll} vs Quality {targetModel?.quality || '?'}+
                  </span>
                </div>
              )}
              {damageType === 'MULTI_DAMAGE' && (
                <div>
                  Targets: <span className="text-green-400">
                    {selectedModels.length} models ({Math.floor(damage / Math.max(1, selectedModels.length))} each)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-600">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={damageType === 'MULTI_DAMAGE' && selectedModels.length === 0}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            Apply Damage
          </button>
        </div>
      </div>
    </div>
  );
};