import React, { useState, useEffect, useCallback } from 'react';
import { OPRDeploymentRollOff } from '../types/oprBattle';

interface DeploymentRollOffModalProps {
  isVisible: boolean;
  onClose: () => void;
  currentUserId: string;
  players: Array<{
    userId: string;
    name: string;
    armyName: string;
  }>;
  rollOffState?: OPRDeploymentRollOff;
  onRollSubmitted: (roll: number) => void;
}

export const DeploymentRollOffModal: React.FC<DeploymentRollOffModalProps> = ({
  isVisible,
  onClose,
  currentUserId,
  players,
  rollOffState,
  onRollSubmitted
}) => {
  const [myRoll, setMyRoll] = useState<number | null>(null);
  const [rollInput, setRollInput] = useState<string>('');
  const [hasRolled, setHasRolled] = useState(false);

  // Reset state when modal opens/closes or roll-off resets
  useEffect(() => {
    if (isVisible && rollOffState?.status === 'ROLLING') {
      setMyRoll(null);
      setRollInput('');
      // Check if current user has already rolled
      const userHasRolled = rollOffState.rolls[currentUserId] !== undefined;
      setHasRolled(userHasRolled);
      if (userHasRolled) {
        setMyRoll(rollOffState.rolls[currentUserId]);
      }
    }
  }, [isVisible, rollOffState, currentUserId]);

  const handleSubmitRoll = useCallback(() => {
    if (hasRolled) return;
    
    const roll = parseInt(rollInput, 10);
    if (isNaN(roll) || roll < 1 || roll > 6) {
      return; // Invalid roll
    }
    
    setMyRoll(roll);
    setHasRolled(true);
    onRollSubmitted(roll);
  }, [hasRolled, rollInput, onRollSubmitted]);

  // Get current player name
  const getCurrentPlayerName = (userId: string) => {
    const player = players.find(p => p.userId === userId);
    return player ? player.name : 'Unknown Player';
  };

  if (!isVisible) return null;

  const renderRollOffContent = () => {
    console.log('DeploymentRollOffModal - rollOffState:', rollOffState);
    
    if (!rollOffState) {
      return (
        <div className="text-center">
          <p className="text-gray-300">Waiting for deployment roll-off to begin...</p>
        </div>
      );
    }

    switch (rollOffState.status) {
      case 'PENDING':
        return (
          <div className="text-center">
            <p className="text-gray-300 mb-4">Preparing deployment roll-off...</p>
            <div className="animate-pulse">
              <div className="h-2 bg-gray-600 rounded"></div>
            </div>
          </div>
        );

      case 'ROLLING':
        return (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 text-white">Deployment Roll-Off</h3>
              <p className="text-gray-300 text-sm">
                Each player rolls a D6. Highest roll chooses who deploys first.
              </p>
            </div>

            {/* Current player's roll section */}
            <div className="bg-gray-700 p-4 rounded-lg border-2 border-blue-500">
              <h4 className="font-semibold mb-3 text-white">Your Roll</h4>
              <div className="text-center">
                {!hasRolled ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-300">Roll a D6 on the table and enter your result:</p>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={rollInput}
                        onChange={(e) => setRollInput(e.target.value)}
                        placeholder="1-6"
                        className="w-16 h-12 text-center text-xl font-bold border-2 border-gray-500 bg-gray-600 text-white rounded-lg focus:border-blue-400 focus:outline-none"
                      />
                      <button
                        onClick={handleSubmitRoll}
                        disabled={!rollInput || parseInt(rollInput, 10) < 1 || parseInt(rollInput, 10) > 6}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white text-2xl font-bold rounded-lg mb-2">
                      {myRoll}
                    </div>
                    <p className="text-green-600 font-semibold">Roll submitted!</p>
                  </div>
                )}
              </div>
            </div>

            {/* All players' rolls */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white">All Players</h4>
              {players.map(player => {
                const playerRoll = rollOffState.rolls[player.userId];
                const isCurrentPlayer = player.userId === currentUserId;
                
                return (
                  <div
                    key={player.userId}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isCurrentPlayer ? 'bg-gray-700 border-2 border-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-white">{player.name}</span>
                      {isCurrentPlayer && <span className="text-blue-400 text-sm ml-2">(You)</span>}
                      <div className="text-sm text-gray-300">{player.armyName}</div>
                    </div>
                    <div className="text-right">
                      {playerRoll !== undefined ? (
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-600 text-white font-bold rounded">
                          {playerRoll}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm">
                          Waiting...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Waiting message */}
            {hasRolled && (
              <div className="text-center text-gray-300">
                <p>Waiting for other players to roll...</p>
              </div>
            )}
          </div>
        );

      case 'COMPLETED':
        const winner = rollOffState.winner;
        const winnerName = winner ? getCurrentPlayerName(winner) : 'Unknown';
        const isWinner = winner === currentUserId;

        return (
          <div className="space-y-6">
            {/* Winner announcement */}
            <div className={`text-center p-6 rounded-lg ${
              isWinner ? 'bg-green-800 border-2 border-green-500' : 'bg-gray-700'
            }`}>
              <h3 className="text-xl font-bold mb-2 text-white">
                {isWinner ? '🎉 You Won!' : `🎯 ${winnerName} Won`}
              </h3>
              <p className="text-gray-300">
                {isWinner ? 
                  'You choose who deploys first.' : 
                  `${winnerName} chooses who deploys first.`
                }
              </p>
            </div>

            {/* Final rolls summary */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white">Final Rolls</h4>
              {players
                .sort((a, b) => (rollOffState.rolls[b.userId] || 0) - (rollOffState.rolls[a.userId] || 0))
                .map((player, index) => {
                  const playerRoll = rollOffState.rolls[player.userId];
                  const isWinnerPlayer = player.userId === winner;
                  const isCurrentPlayer = player.userId === currentUserId;
                  
                  return (
                    <div
                      key={player.userId}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isWinnerPlayer ? 'bg-green-800 border-2 border-green-500' :
                        isCurrentPlayer ? 'bg-gray-700 border border-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center">
                        {index === 0 && <span className="text-green-600 mr-2">👑</span>}
                        <div>
                          <span className="font-medium text-white">{player.name}</span>
                          {isCurrentPlayer && <span className="text-blue-400 text-sm ml-2">(You)</span>}
                          <div className="text-sm text-gray-300">{player.armyName}</div>
                        </div>
                      </div>
                      <div className={`inline-flex items-center justify-center w-10 h-10 font-bold rounded ${
                        isWinnerPlayer ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                      }`}>
                        {playerRoll}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Close button for winner or continue button */}
            <div className="text-center pt-4">
              <button
                onClick={onClose}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Continue to Deployment
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-300">
            <p>Unknown roll-off status: {rollOffState.status}</p>
            <p className="text-xs text-gray-500 mt-2">Debug info: {JSON.stringify(rollOffState)}</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <h2 className="text-xl font-bold text-white">Deployment Roll-Off</h2>
          {rollOffState?.status === 'COMPLETED' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {renderRollOffContent()}
        </div>
      </div>
    </div>
  );
};

export default DeploymentRollOffModal;