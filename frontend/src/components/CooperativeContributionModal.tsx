import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface CooperativeContributionRequest {
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
  targetUnitIds: string[];
  targetUnitNames: string[];
  timeoutSeconds: number;
  expiresAt: string;
}

interface CooperativeContributionModalProps {
  battleId: string;
  onCooperativeContributionRequest?: (handler: (request: CooperativeContributionRequest) => void) => void;
  allArmies: any[]; // For finding user's casters
}

export const CooperativeContributionModal: React.FC<CooperativeContributionModalProps> = ({ 
  battleId, 
  onCooperativeContributionRequest,
  allArmies 
}) => {
  const { user } = useAuth();
  const [currentRequest, setCurrentRequest] = useState<CooperativeContributionRequest | null>(null);
  const [selectedContributions, setSelectedContributions] = useState<{[casterKey: string]: {tokens: number, isPositive: boolean}}>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  // Handle incoming cooperative contribution requests
  useEffect(() => {
    if (onCooperativeContributionRequest && user?.id) {
      const handler = (request: CooperativeContributionRequest) => {
        console.log('CooperativeContributionModal received request:', request);
        setCurrentRequest(request);
        setSelectedContributions({});
        setTimeRemaining(request.timeoutSeconds);
        setHasSubmitted(false);
      };
      console.log('Registering cooperative contribution handler for user:', user.id);
      onCooperativeContributionRequest(handler);
    }
  }, [user?.id]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining > 0 && !hasSubmitted) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && currentRequest && !hasSubmitted) {
      // Auto-submit with no contributions if time expires
      handleSubmit();
    }
  }, [timeRemaining, currentRequest, hasSubmitted]);

  // Get user's available casters
  const getUserCasters = () => {
    if (!user?.id || !allArmies) return [];
    
    const userArmy = allArmies.find(army => army.userId === user.id);
    if (!userArmy) return [];

    const casters: Array<{
      unitId: string;
      modelId?: string;
      name: string;
      tokens: number;
      maxContribution: number;
    }> = [];

    for (const unit of userArmy.units) {
      // Skip the casting unit (can't contribute to own spell)
      if (unit.unitId === currentRequest?.casterUnitId) continue;

      // Check unit models for casters
      for (const model of unit.models) {
        if (model.casterTokens > 0 && model.specialRules.some((rule: string) => rule.includes('Caster('))) {
          casters.push({
            unitId: unit.unitId,
            modelId: model.modelId,
            name: `${model.customName || model.name} (${unit.name})`,
            tokens: model.casterTokens,
            maxContribution: Math.min(model.casterTokens, 6) // OPR max contribution
          });
        }
      }

      // Check joined hero for caster tokens
      if (unit.joinedHero && unit.joinedHero.casterTokens > 0 && 
          unit.joinedHero.specialRules.some((rule: string) => rule.includes('Caster('))) {
        casters.push({
          unitId: unit.unitId,
          modelId: unit.joinedHero.modelId,
          name: `${unit.joinedHero.customName || unit.joinedHero.name} (Hero)`,
          tokens: unit.joinedHero.casterTokens,
          maxContribution: Math.min(unit.joinedHero.casterTokens, 6)
        });
      }
    }

    return casters;
  };

  const userCasters = getUserCasters();

  const handleContributionChange = (casterKey: string, tokens: number, isPositive: boolean) => {
    setSelectedContributions(prev => ({
      ...prev,
      [casterKey]: { tokens, isPositive }
    }));
  };

  const handleSubmit = async () => {
    if (!currentRequest || !user || hasSubmitted) return;

    setIsSubmitting(true);
    setHasSubmitted(true);
    
    try {
      // Convert contributions to API format
      const contributions = Object.entries(selectedContributions).map(([casterKey, contribution]) => {
        const [unitId, modelId] = casterKey.split('_');
        return {
          unitId,
          modelId: modelId || undefined,
          tokensContributed: contribution.tokens,
          modifier: contribution.isPositive ? contribution.tokens : -contribution.tokens
        };
      });

      const response = await fetch('/api/spells/submit-cooperative-contribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          battleId,
          cooperationRequestId: currentRequest.cooperationRequestId,
          contributions
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Contribution submission error:', errorData);
        throw new Error(errorData.error || 'Failed to submit contribution');
      }

      console.log('Contribution submitted successfully');
      
      // Keep modal open showing submitted state
      
    } catch (error) {
      console.error('Error submitting contribution:', error);
      setIsSubmitting(false);
      setHasSubmitted(false);
    }
  };

  if (!currentRequest || !user) {
    return null;
  }

  const isOriginalCaster = currentRequest.casterUserId === user.id;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-white">
            🪄 Cooperative Spell Casting
          </h3>
          <div className={`px-3 py-1 rounded text-sm font-bold ${
            timeRemaining > 10 ? 'bg-green-600' : timeRemaining > 5 ? 'bg-yellow-600' : 'bg-red-600'
          } text-white`}>
            {hasSubmitted ? 'Submitted' : `${timeRemaining}s`}
          </div>
        </div>

        {/* Spell Information */}
        <div className="mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">
              {isOriginalCaster ? 'You are casting:' : `${currentRequest.casterName} is casting:`}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-blue-400 font-medium text-lg">{currentRequest.spell.name}</p>
                <p className="text-gray-300 text-sm mt-1">{currentRequest.spell.effect}</p>
              </div>
              <div className="text-sm">
                <p><strong className="text-gray-300">Cost:</strong> {currentRequest.spell.cost} tokens</p>
                <p><strong className="text-gray-300">Base Roll:</strong> 4+ on D6</p>
                {currentRequest.targetUnitNames.length > 0 && (
                  <p><strong className="text-gray-300">Targets:</strong> {currentRequest.targetUnitNames.join(', ')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasSubmitted ? (
          <div className="text-center py-8">
            <div className="text-green-400 text-lg font-medium mb-2">✓ Contribution Submitted</div>
            <p className="text-gray-300">Waiting for other players...</p>
          </div>
        ) : (
          <>
            {/* User's Casters */}
            <div className="mb-6">
              <h4 className="font-semibold text-white mb-3">
                {isOriginalCaster ? 'Your Contribution:' : 'Your Casters Can Contribute:'}
              </h4>
              
              {userCasters.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  {isOriginalCaster 
                    ? 'You have no other casters to contribute with.' 
                    : 'You have no casters available to contribute.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {userCasters.map(caster => {
                    const casterKey = `${caster.unitId}_${caster.modelId || ''}`;
                    const contribution = selectedContributions[casterKey];
                    
                    return (
                      <div key={casterKey} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <div className="font-medium text-white">{caster.name}</div>
                            <div className="text-sm text-gray-400">{caster.tokens} tokens available</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Tokens</label>
                            <input
                              type="number"
                              min="0"
                              max={caster.maxContribution}
                              value={contribution?.tokens || 0}
                              onChange={(e) => handleContributionChange(
                                casterKey, 
                                parseInt(e.target.value) || 0, 
                                contribution?.isPositive ?? true
                              )}
                              className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Effect</label>
                            <select
                              value={contribution?.isPositive ? 'help' : 'hinder'}
                              onChange={(e) => handleContributionChange(
                                casterKey,
                                contribution?.tokens || 0,
                                e.target.value === 'help'
                              )}
                              className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                            >
                              <option value="help">Help (+)</option>
                              <option value="hinder">Hinder (-)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Modifier</label>
                            <div className={`px-2 py-1 rounded text-sm font-medium text-center ${
                              contribution?.tokens > 0
                                ? contribution.isPositive 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-red-600 text-white'
                                : 'bg-gray-600 text-gray-300'
                            }`}>
                              {contribution?.tokens > 0 
                                ? `${contribution.isPositive ? '+' : '-'}${contribution.tokens}`
                                : '0'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-medium transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Contribution'}
              </button>
            </div>
          </>
        )}

        <div className="mt-4 text-xs text-gray-400">
          OPR Rules: All players can contribute spell tokens simultaneously to help or hinder the casting roll.
        </div>
      </div>
    </div>
  );
};