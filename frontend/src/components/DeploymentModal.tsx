import React, { useState, useCallback } from 'react';
import { 
  OPRBattleState, 
  OPRBattleUnit
} from '../types/oprBattle';

interface DeploymentModalProps {
  isVisible: boolean;
  onClose: () => void;
  battleState: OPRBattleState;
  currentUserId: string;
  onDeployUnit: (unitId: string) => void;
  onAmbushUnit: (unitId: string) => void;
  onScoutUnit: (unitId: string) => void;
  onEmbarkUnit: (unitId: string, transportId: string) => void;
}

interface UnitDeploymentCapabilities {
  canAmbush: boolean;
  canScout: boolean;
  canEmbark: boolean;
  hasTransport: boolean;
  availableTransports: OPRBattleUnit[];
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({
  isVisible,
  onClose,
  battleState,
  currentUserId,
  onDeployUnit,
  onAmbushUnit,
  onScoutUnit,
  onEmbarkUnit
}) => {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  if (!isVisible) return null;

  const deploymentState = battleState.activationState.deploymentState;
  const myArmy = battleState.armies.find(army => army.userId === currentUserId);
  
  if (!deploymentState || !myArmy) {
    return null;
  }

  const isMyTurn = deploymentState.currentDeployingPlayer === currentUserId;
  const pendingUnits = myArmy.units.filter(unit => 
    unit.deploymentState.status === 'PENDING'
  );

  // Get deployment capabilities for a unit
  const getDeploymentCapabilities = (unit: OPRBattleUnit): UnitDeploymentCapabilities => {
    const allRules = [...unit.specialRules];
    
    // Add joined hero rules if present
    if (unit.joinedHero) {
      allRules.push(...unit.joinedHero.specialRules);
    }

    // Check for Ambush capability
    const canAmbush = allRules.some(rule => 
      rule.toLowerCase().includes('ambush') ||
      rule.toLowerCase().includes('hidden route') ||
      rule.toLowerCase().includes('surprise attack') ||
      rule.toLowerCase().includes('dark assault') ||
      rule.toLowerCase().includes('shadow') ||
      rule.toLowerCase().includes('tunneller')
    );

    // Check for Scout capability
    const canScout = allRules.some(rule => 
      rule.toLowerCase().includes('scout')
    );

    // Check for Transport capability
    const hasTransport = allRules.some(rule => 
      rule.toLowerCase().includes('transport(')
    );

    // Find available transports (deployed units with transport capability)
    const availableTransports = myArmy.units.filter(u => 
      u.deploymentState.status === 'DEPLOYED' &&
      u.specialRules.some(rule => rule.toLowerCase().includes('transport(')) &&
      u.unitId !== unit.unitId
    );

    return {
      canAmbush,
      canScout,
      canEmbark: availableTransports.length > 0,
      hasTransport,
      availableTransports
    };
  };

  const handleDeployUnit = useCallback((unitId: string) => {
    onDeployUnit(unitId);
    setSelectedUnit(null);
  }, [onDeployUnit]);

  const handleAmbushUnit = useCallback((unitId: string) => {
    onAmbushUnit(unitId);
    setSelectedUnit(null);
  }, [onAmbushUnit]);

  const handleScoutUnit = useCallback((unitId: string) => {
    onScoutUnit(unitId);
    setSelectedUnit(null);
  }, [onScoutUnit]);

  const handleEmbarkUnit = useCallback((unitId: string, transportId: string) => {
    onEmbarkUnit(unitId, transportId);
    setSelectedUnit(null);
  }, [onEmbarkUnit]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            Deploy Your Army
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Deployment Status */}
        <div className="mb-4 p-4 bg-gray-700 rounded-lg">
          <div className="text-white mb-2">
            <strong>Deployment Turn {deploymentState.deploymentTurn}</strong>
          </div>
          <div className="text-sm text-gray-300">
            {isMyTurn ? (
              <span className="text-green-400">✓ Your turn to deploy</span>
            ) : (
              <span className="text-yellow-400">⏳ Waiting for opponent to deploy</span>
            )}
          </div>
          <div className="text-sm text-gray-300 mt-1">
            Zone: <span className="text-blue-400">Within 12" of your table edge</span>
          </div>
        </div>

        {/* Units to Deploy */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white mb-3">
            Units Pending Deployment ({pendingUnits.length})
          </h3>
          
          {pendingUnits.length === 0 ? (
            <div className="text-gray-400 text-center py-4">
              All units deployed!
            </div>
          ) : (
            pendingUnits.map(unit => {
              const capabilities = getDeploymentCapabilities(unit);
              const isSelected = selectedUnit === unit.unitId;
              
              return (
                <div 
                  key={unit.unitId}
                  className={`p-4 bg-gray-700 rounded-lg border-2 transition-colors ${
                    isSelected ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">{unit.name}</h4>
                      <div className="text-sm text-gray-300">
                        {unit.currentSize} models
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {unit.specialRules.filter(rule => 
                        capabilities.canAmbush && (rule.toLowerCase().includes('ambush') || 
                        rule.toLowerCase().includes('hidden route')) ||
                        capabilities.canScout && rule.toLowerCase().includes('scout')
                      ).join(', ')}
                    </div>
                  </div>

                  {/* Deployment Actions */}
                  {isMyTurn && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {/* Standard Deploy Button */}
                      <button
                        onClick={() => handleDeployUnit(unit.unitId)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded transition-colors text-sm"
                      >
                        Deploy
                      </button>

                      {/* Ambush Button */}
                      {capabilities.canAmbush && (
                        <button
                          onClick={() => handleAmbushUnit(unit.unitId)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors text-sm"
                          title="Set aside for Ambush deployment after round 1"
                        >
                          Ambush
                        </button>
                      )}

                      {/* Scout Button */}
                      {capabilities.canScout && (
                        <button
                          onClick={() => handleScoutUnit(unit.unitId)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors text-sm"
                          title="Deploy after other units, may redeploy within 12 inches"
                        >
                          Scout
                        </button>
                      )}

                      {/* Embark Buttons */}
                      {capabilities.canEmbark && capabilities.availableTransports.map(transport => (
                        <button
                          key={transport.unitId}
                          onClick={() => handleEmbarkUnit(unit.unitId, transport.unitId)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors text-sm"
                          title={`Embark in ${transport.name}`}
                        >
                          Embark in {transport.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Deployment Rules Summary */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Deployment Rules:</h4>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• <strong>Deploy:</strong> Place unit within 12" of your table edge</li>
            <li>• <strong>Ambush:</strong> Keep in reserves, deploy after round 1 anywhere 9"+ from enemies</li>
            <li>• <strong>Scout:</strong> Deploy after all other units, may redeploy within 12" of original position</li>
            <li>• <strong>Embark:</strong> Deploy unit inside a transport that's already on the battlefield</li>
          </ul>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};