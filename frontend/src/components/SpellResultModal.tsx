import React, { useState } from 'react';

interface SpellResultModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmitResult: (success: boolean) => void;
  spellName: string;
  finalModifier: number;
  targetNumber: number;
  playerRoll?: number; // If provided, we can show the actual roll
}

export const SpellResultModal: React.FC<SpellResultModalProps> = ({
  isVisible,
  onClose,
  onSubmitResult,
  spellName,
  finalModifier,
  targetNumber,
  playerRoll
}) => {
  const [selectedResult, setSelectedResult] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedResult === null || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmitResult(selectedResult);
      onClose();
    } catch (error) {
      console.error('Error submitting spell result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">Cast {spellName}</h3>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-lg font-bold text-white mb-2">
              Roll 1d6, need {targetNumber}+ to succeed
            </div>
            <div className="text-sm text-gray-300">
              Final modifier: {finalModifier >= 0 ? '+' : ''}{finalModifier}
            </div>
            {playerRoll !== undefined && (
              <div className="mt-2 text-lg">
                <span className="text-blue-400">You rolled: {playerRoll}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 text-center mb-4">
            Roll your die and select the result:
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedResult(true)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedResult === true
                  ? 'border-green-500 bg-green-900/20 text-green-400'
                  : 'border-gray-600 bg-gray-700 text-white hover:border-green-400'
              }`}
            >
              <div className="text-lg font-bold">✓ Success</div>
              <div className="text-sm opacity-75">Apply spell effect</div>
            </button>
            
            <button
              onClick={() => setSelectedResult(false)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedResult === false
                  ? 'border-red-500 bg-red-900/20 text-red-400'
                  : 'border-gray-600 bg-gray-700 text-white hover:border-red-400'
              }`}
            >
              <div className="text-lg font-bold">✗ Failed</div>
              <div className="text-sm opacity-75">No effect</div>
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedResult === null || isSubmitting}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              selectedResult !== null && !isSubmitting
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Recording...' : 'Record Result'}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center">
          This result will be recorded for battle history and undo functionality.
        </div>
      </div>
    </div>
  );
};