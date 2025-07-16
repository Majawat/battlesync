import React, { useState } from 'react';
import { OPRBattleArmy } from '../types/oprBattle';

interface CommandPointPanelProps {
  army: OPRBattleArmy;
  onSpendCommandPoints: (armyId: string, amount: number, purpose: string, targetUnitId?: string) => void;
  canSpend?: boolean;
}

const COMMON_PURPOSES = [
  'Unit Activation',
  'Re-roll Failed Test',
  'Extra Action',
  'Stratagem: Smoke Screen',
  'Stratagem: Focus Fire',
  'Stratagem: Swift Advance',
  'Stratagem: Counter Attack',
  'Other'
];

export const CommandPointPanel: React.FC<CommandPointPanelProps> = ({
  army,
  onSpendCommandPoints,
  canSpend = true
}) => {
  const [isSpendModalOpen, setIsSpendModalOpen] = useState(false);
  const [spendAmount, setSpendAmount] = useState(1);
  const [selectedPurpose, setSelectedPurpose] = useState(COMMON_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState('');
  const [targetUnitId, setTargetUnitId] = useState<string>('');

  const handleSpendCP = () => {
    const purpose = selectedPurpose === 'Other' ? customPurpose : selectedPurpose;
    if (!purpose.trim()) {
      alert('Please specify the purpose for spending command points');
      return;
    }

    onSpendCommandPoints(army.armyId, spendAmount, purpose, targetUnitId || undefined);
    setIsSpendModalOpen(false);
    setSpendAmount(1);
    setSelectedPurpose(COMMON_PURPOSES[0]);
    setCustomPurpose('');
    setTargetUnitId('');
  };

  const cpPercentage = army.maxCommandPoints > 0 
    ? (army.currentCommandPoints / army.maxCommandPoints) * 100 
    : 0;

  const cpColor = cpPercentage > 66 ? 'text-green-400' : 
                  cpPercentage > 33 ? 'text-yellow-400' : 'text-red-400';

  const cpBarColor = cpPercentage > 66 ? 'bg-green-500' : 
                     cpPercentage > 33 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Command Points</h3>
        <div className={`text-xl font-bold ${cpColor}`}>
          {army.currentCommandPoints} / {army.maxCommandPoints}
        </div>
      </div>

      {/* Command Point Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
          <span>Available CP</span>
          <span>{Math.round(cpPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className={`${cpBarColor} h-3 rounded-full transition-all duration-300`}
            style={{ width: `${Math.max(0, cpPercentage)}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsSpendModalOpen(true)}
          disabled={!canSpend || army.currentCommandPoints <= 0}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm font-medium"
        >
          Spend CP
        </button>
        
        <button
          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
          title="View Command Point History"
        >
          📋
        </button>
      </div>

      {/* Spend CP Modal */}
      {isSpendModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Spend Command Points</h3>
            
            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount to Spend
                </label>
                <input
                  type="number"
                  min="1"
                  max={army.currentCommandPoints}
                  value={spendAmount}
                  onChange={(e) => setSpendAmount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Purpose
                </label>
                <select
                  value={selectedPurpose}
                  onChange={(e) => setSelectedPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  {COMMON_PURPOSES.map(purpose => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>

              {/* Custom Purpose */}
              {selectedPurpose === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Purpose
                  </label>
                  <input
                    type="text"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    placeholder="Describe the purpose..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Target Unit (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Unit (Optional)
                </label>
                <select
                  value={targetUnitId}
                  onChange={(e) => setTargetUnitId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">No specific unit</option>
                  {army.units.map(unit => (
                    <option key={unit.unitId} value={unit.unitId}>
                      {unit.customName || unit.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSpendCP}
                disabled={spendAmount > army.currentCommandPoints || spendAmount <= 0}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
              >
                Spend {spendAmount} CP
              </button>
              <button
                onClick={() => setIsSpendModalOpen(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Remaining CP Info */}
            <div className="mt-3 text-sm text-gray-400 text-center">
              After spending: {army.currentCommandPoints - spendAmount} / {army.maxCommandPoints} CP remaining
            </div>
          </div>
        </div>
      )}
    </div>
  );
};