import React, { useState } from 'react';
import { 
  OPRBattleState, 
  OPRBattleUnit,
  OPRBattleArmy
} from '../types/oprBattle';

interface AmbushDeploymentModalProps {
  isVisible: boolean;
  onClose: () => void;
  battleState: OPRBattleState;
  currentUserId: string;
  onDeployAmbushUnit: (unitId: string) => void;
  onKeepInReserves: (unitId: string) => void;
  onPassTurn: () => void;
}

interface AmbushUnitInfo {
  army: OPRBattleArmy;
  unit: OPRBattleUnit;
  canDeployNow: boolean;
}

export const AmbushDeploymentModal: React.FC<AmbushDeploymentModalProps> = ({
  isVisible,
  onClose,
  battleState,
  currentUserId,
  onDeployAmbushUnit,
  onKeepInReserves,
  onPassTurn
}) => {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [processingUnit, setProcessingUnit] = useState<string | null>(null);

  if (!isVisible) return null;

  // Check if ambush deployment is available
  const ambushAvailable = battleState.activationState.ambushDeploymentAvailable;
  const currentAmbushPlayer = battleState.activationState.currentAmbushPlayer;
  const ambushTurn = battleState.activationState.ambushDeploymentTurn || 1;
  const ambushOrder = battleState.activationState.ambushDeploymentOrder || [];
  const availableAmbushUnits = battleState.activationState.availableAmbushUnits || [];

  // Filter units belonging to current user
  const myAmbushUnits = availableAmbushUnits.filter((unit: any) => unit.userId === currentUserId);
  
  // Check if it's the current user's turn
  const isMyTurn = currentAmbushPlayer === currentUserId;

  // Get full unit details for display
  const ambushUnitsInfo: AmbushUnitInfo[] = myAmbushUnits.map((ambushUnit: any) => {
    const army = battleState.armies.find(a => a.userId === ambushUnit.userId)!;
    const unit = army.units.find(u => u.unitId === ambushUnit.unitId)!;
    
    return {
      army,
      unit,
      canDeployNow: unit.deploymentState.canDeployThisRound !== false
    };
  });

  const handleDeployUnit = async (unitId: string) => {
    setProcessingUnit(unitId);
    try {
      await onDeployAmbushUnit(unitId);
    } finally {
      setProcessingUnit(null);
    }
  };

  const handleKeepInReserves = async (unitId: string) => {
    setProcessingUnit(unitId);
    try {
      await onKeepInReserves(unitId);
    } finally {
      setProcessingUnit(null);
    }
  };

  const renderUnitCard = (unitInfo: AmbushUnitInfo) => {
    const { unit } = unitInfo;
    const isSelected = selectedUnit === unit.unitId;
    const isProcessing = processingUnit === unit.unitId;

    return (
      <div
        key={unit.unitId}
        className={`
          border rounded-lg p-4 cursor-pointer transition-all duration-200
          ${isSelected 
            ? 'border-blue-500 bg-blue-50 shadow-lg' 
            : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onClick={() => setSelectedUnit(isSelected ? null : unit.unitId)}
      >
        {/* Unit Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-semibold text-lg text-gray-900">
              {unit.customName || unit.name}
            </h4>
            <p className="text-sm text-gray-600">
              {unit.currentSize} models • {unit.faction}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
              Ambush Reserves
            </span>
          </div>
        </div>

        {/* Unit Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mb-3">
          <div className="text-center p-2 bg-gray-100 rounded">
            <div className="font-medium text-gray-700">Quality</div>
            <div className="text-lg font-bold text-blue-600">
              {unit.models[0]?.quality || 'N/A'}+
            </div>
          </div>
          <div className="text-center p-2 bg-gray-100 rounded">
            <div className="font-medium text-gray-700">Defense</div>
            <div className="text-lg font-bold text-green-600">
              {unit.models[0]?.defense || 'N/A'}+
            </div>
          </div>
          <div className="text-center p-2 bg-gray-100 rounded">
            <div className="font-medium text-gray-700">Size</div>
            <div className="text-lg font-bold text-gray-800">
              {unit.currentSize}/{unit.originalSize}
            </div>
          </div>
          <div className="text-center p-2 bg-gray-100 rounded">
            <div className="font-medium text-gray-700">Tough</div>
            <div className="text-lg font-bold text-red-600">
              {unit.models[0]?.maxTough || 1}
            </div>
          </div>
        </div>

        {/* Special Rules */}
        {unit.specialRules.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Special Rules:</div>
            <div className="flex flex-wrap gap-1">
              {unit.specialRules.map((rule, index) => (
                <span 
                  key={index} 
                  className="inline-block px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded"
                >
                  {rule}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weapon Summary */}
        {unit.weaponSummary.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Weapons:</div>
            <div className="text-sm text-gray-600">
              {unit.weaponSummary.map((weapon, index) => (
                <div key={index} className="truncate">
                  {weapon.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isSelected && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            {isMyTurn ? (
              <>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeployUnit(unit.unitId);
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm font-medium"
                  >
                    {isProcessing ? 'Deploying...' : '📍 Deploy Now'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleKeepInReserves(unit.unitId);
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm font-medium"
                  >
                    {isProcessing ? 'Waiting...' : '⏳ Keep in Reserves'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Deploy within 9" of any table edge or keep in reserves for later rounds
                </p>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-orange-600 font-medium">
                  ⏳ Waiting for {currentAmbushPlayer} to make their decisions
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  You can view your units but cannot deploy until it's your turn
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ambush Deployment - Round {battleState.currentRound}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {isMyTurn ? (
                  <>
                    <span className="font-semibold text-green-700">🎯 Your Turn</span> - Turn {ambushTurn} of {ambushOrder.length}
                    <br />
                    Choose whether to deploy your ambush units or keep them in reserves
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-orange-700">⏳ Waiting</span> - {currentAmbushPlayer}'s turn ({ambushTurn} of {ambushOrder.length})
                    <br />
                    Players take turns making ambush deployment decisions
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[calc(90vh-140px)] overflow-y-auto">
          {!ambushAvailable ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">No ambush deployment available</div>
              <p className="text-sm text-gray-400">
                Ambush deployment is only available from round 2 onwards when you have units in ambush reserves.
              </p>
            </div>
          ) : myAmbushUnits.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">No ambush units available</div>
              <p className="text-sm text-gray-400">
                You don't have any units in ambush reserves that can be deployed.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Your Ambush Units ({myAmbushUnits.length})
                  </h3>
                  <div className="text-sm text-gray-600">
                    Round {battleState.currentRound} • Click unit to see deployment options
                  </div>
                </div>
                <div className="text-sm text-orange-700 bg-orange-100 rounded-lg p-3">
                  <strong>Ambush Rules:</strong> Units may deploy within 9" of any table edge. 
                  You may choose to keep units in reserves for deployment in later rounds.
                </div>
              </div>

              <div className="space-y-4">
                {ambushUnitsInfo.map(renderUnitCard)}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {isMyTurn ? (
                myAmbushUnits.length > 0 ? (
                  `Your turn: ${myAmbushUnits.length} ambush units available`
                ) : (
                  'Your turn: No ambush units to deploy'
                )
              ) : (
                `Waiting for ${currentAmbushPlayer} to make decisions`
              )}
            </div>
            <div className="flex gap-2">
              {isMyTurn && myAmbushUnits.length > 0 && (
                <button
                  onClick={onPassTurn}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 text-sm font-medium"
                >
                  ⏭️ Pass Turn
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};