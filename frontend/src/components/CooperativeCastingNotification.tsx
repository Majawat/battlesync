import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface CooperativeCastingRequest {
  cooperationRequestId: string;
  casterUserId: string;
  casterUnitId: string;
  casterName: string;
  spell: {
    id: string;
    name: string;
    cost: number;
    effect: string;
    targets: string[];
  };
  potentialCooperators: Array<{
    userId: string;
    unitId: string;
    modelId?: string;
    unitName: string;
    casterName: string;
    maxTokens: number;
  }>;
  timeoutSeconds: number;
  expiresAt: string;
}

interface CooperativeCastingNotificationProps {
  battleId: string;
  onCooperativeCastingRequest?: (handler: (request: CooperativeCastingRequest) => void) => void;
}

export const CooperativeCastingNotification: React.FC<CooperativeCastingNotificationProps> = ({ 
  battleId, 
  onCooperativeCastingRequest 
}) => {
  const { user } = useAuth();
  const [currentRequest, setCurrentRequest] = useState<CooperativeCastingRequest | null>(null);
  const [selectedCooperator, setSelectedCooperator] = useState<string | null>(null);
  const [tokensToContribute, setTokensToContribute] = useState<number>(1);
  const [isPositiveModifier, setIsPositiveModifier] = useState<boolean>(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isResponding, setIsResponding] = useState<boolean>(false);

  // Handle incoming cooperative casting requests
  useEffect(() => {
    if (onCooperativeCastingRequest && user?.id) {
      const handler = (request: CooperativeCastingRequest) => {
        console.log('CooperativeCastingNotification received request:', request);
        // Only show if this user has potential cooperators
        const userCooperators = request.potentialCooperators.filter(c => c.userId === user?.id);
        console.log('User cooperators found:', userCooperators);
        if (userCooperators.length > 0) {
          setCurrentRequest(request);
          setSelectedCooperator(userCooperators[0].unitId + '_' + (userCooperators[0].modelId || ''));
          setTimeRemaining(request.timeoutSeconds);
        }
      };
      console.log('Registering cooperative casting handler for user:', user.id);
      onCooperativeCastingRequest(handler);
    }
  }, [user?.id]); // Remove onCooperativeCastingRequest from deps since it's now stable

  // Countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && currentRequest) {
      // Request expired
      setCurrentRequest(null);
      setSelectedCooperator(null);
    }
  }, [timeRemaining, currentRequest]);

  const handleResponse = async (accept: boolean) => {
    if (!currentRequest || !user) return;

    setIsResponding(true);
    
    try {
      const response = {
        accept,
        unitId: accept ? selectedCooperator?.split('_')[0] : undefined,
        modelId: accept ? selectedCooperator?.split('_')[1] || undefined : undefined,
        tokensContributed: accept ? tokensToContribute : 0,
        modifier: accept ? (isPositiveModifier ? 1 : -1) : 0
      };

      const apiResponse = await fetch('/api/spells/respond-cooperation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          battleId,
          cooperationRequestId: currentRequest.cooperationRequestId,
          response
        })
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to respond to cooperative casting request');
      }

      // Close the notification
      setCurrentRequest(null);
      setSelectedCooperator(null);
      
    } catch (error) {
      console.error('Error responding to cooperative casting:', error);
    } finally {
      setIsResponding(false);
    }
  };

  const userCooperators = currentRequest?.potentialCooperators.filter(c => c.userId === user?.id) || [];
  const selectedCooperatorData = userCooperators.find(c => 
    selectedCooperator === c.unitId + '_' + (c.modelId || '')
  );

  if (!currentRequest || userCooperators.length === 0) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-white">
            🪄 Cooperative Casting Request
          </h3>
          <div className="bg-yellow-600 text-white px-2 py-1 rounded text-sm">
            {timeRemaining}s
          </div>
        </div>

        <div className="mb-4">
          <p className="text-gray-300 mb-2">
            <strong className="text-white">{currentRequest.casterName}</strong> is casting{' '}
            <strong className="text-blue-400">{currentRequest.spell.name}</strong>
          </p>
          <p className="text-gray-400 text-sm mb-2">
            {currentRequest.spell.effect}
          </p>
          <p className="text-gray-400 text-sm">
            Spell cost: {currentRequest.spell.cost} tokens
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Choose Cooperating Caster:
          </label>
          <select
            value={selectedCooperator || ''}
            onChange={(e) => setSelectedCooperator(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            {userCooperators.map(cooperator => (
              <option 
                key={cooperator.unitId + '_' + (cooperator.modelId || '')} 
                value={cooperator.unitId + '_' + (cooperator.modelId || '')}
              >
                {cooperator.casterName} ({cooperator.unitName}) - {cooperator.maxTokens} tokens
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tokens to Contribute:
          </label>
          <input
            type="number"
            min="1"
            max={selectedCooperatorData?.maxTokens || 1}
            value={tokensToContribute}
            onChange={(e) => setTokensToContribute(parseInt(e.target.value) || 1)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Modifier Type:
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="modifier"
                checked={isPositiveModifier}
                onChange={() => setIsPositiveModifier(true)}
                className="mr-2"
              />
              <span className="text-green-400">+1 (Help)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="modifier"
                checked={!isPositiveModifier}
                onChange={() => setIsPositiveModifier(false)}
                className="mr-2"
              />
              <span className="text-red-400">-1 (Hinder)</span>
            </label>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => handleResponse(true)}
            disabled={isResponding}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
          >
            {isResponding ? 'Responding...' : 'Contribute'}
          </button>
          <button
            onClick={() => handleResponse(false)}
            disabled={isResponding}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
          >
            {isResponding ? 'Responding...' : 'Decline'}
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          OPR Rules: Cooperative casting allows nearby casters to contribute tokens for +/- modifiers to the spell roll.
        </div>
      </div>
    </div>
  );
};