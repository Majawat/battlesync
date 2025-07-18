import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { 
  MoraleTestRequest, 
  MoraleTestResult, 
  QualityTestRequest, 
  QualityTestResult, 
  MoraleTestSuggestion, 
  ActionPenalties,
  OPRBattleUnit,
  OPRBattleModel 
} from '../types/oprBattle';

interface MoraleTestPanelProps {
  battleId: string;
  selectedUnit: OPRBattleUnit | null;
  selectedModel: OPRBattleModel | null;
  isVisible: boolean;
  onClose: () => void;
  onTestComplete: () => void;
}

interface UnitMoraleInfo {
  suggestions: MoraleTestSuggestion[];
  currentMoraleState: string;
  actionPenalties: ActionPenalties;
  unitInfo: {
    name: string;
    currentSize: number;
    originalSize: number;
    shaken: boolean;
    routed: boolean;
  };
}

interface ModelQualityInfo {
  modelInfo: {
    name: string;
    quality: number;
    currentTough: number;
    maxTough: number;
    isDestroyed: boolean;
    isHero: boolean;
    specialRules: string[];
  };
  availableTests: {
    testType: string;
    description: string;
    modifier: number;
  }[];
}

export const MoraleTestPanel: React.FC<MoraleTestPanelProps> = ({
  battleId,
  selectedUnit,
  selectedModel,
  isVisible,
  onClose,
  onTestComplete
}) => {
  const [moraleInfo, setMoraleInfo] = useState<UnitMoraleInfo | null>(null);
  const [qualityInfo, setQualityInfo] = useState<ModelQualityInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<MoraleTestResult | QualityTestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'morale' | 'quality'>('morale');

  // Load unit morale info
  const loadMoraleInfo = async (unitId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getMoraleTestSuggestions(battleId, unitId);
      setMoraleInfo(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load morale info');
    } finally {
      setLoading(false);
    }
  };

  // Load model quality info
  const loadQualityInfo = async (unitId: string, modelId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getQualityTestInfo(battleId, unitId, modelId);
      setQualityInfo(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load quality info');
    } finally {
      setLoading(false);
    }
  };

  // Perform morale test
  const performMoraleTest = async (testType: string, modifier: number, reason: string) => {
    if (!selectedUnit) return;

    try {
      setLoading(true);
      setError(null);
      
      const request: MoraleTestRequest = {
        unitId: selectedUnit.unitId,
        testType: testType as any,
        modifier,
        reason
      };

      const response = await apiClient.performMoraleTest(battleId, request);
      setTestResult(response.data.data.result);
      onTestComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to perform morale test');
    } finally {
      setLoading(false);
    }
  };

  // Perform quality test
  const performQualityTest = async (testType: string, modifier: number, reason: string) => {
    if (!selectedUnit || !selectedModel) return;

    try {
      setLoading(true);
      setError(null);
      
      const request: QualityTestRequest = {
        unitId: selectedUnit.unitId,
        modelId: selectedModel.modelId,
        testType: testType as any,
        modifier,
        reason
      };

      const response = await apiClient.performQualityTest(battleId, request);
      setTestResult(response.data.data.result);
      onTestComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to perform quality test');
    } finally {
      setLoading(false);
    }
  };

  // Load data when unit/model changes
  useEffect(() => {
    if (isVisible && selectedUnit) {
      loadMoraleInfo(selectedUnit.unitId);
      if (selectedModel) {
        loadQualityInfo(selectedUnit.unitId, selectedModel.modelId);
      }
    }
  }, [isVisible, selectedUnit, selectedModel]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-xl font-bold">Morale & Quality Tests</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-600">
          <button
            onClick={() => setActiveTab('morale')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'morale'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Morale Tests
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'quality'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={!selectedModel}
          >
            Quality Tests
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-800 border-b border-gray-600">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Test Result Display */}
        {testResult && (
          <div className="p-4 bg-green-800 border-b border-gray-600">
            <h3 className="font-medium mb-2">Test Result</h3>
            <p className="text-green-200">{testResult.description}</p>
            <div className="mt-2 text-sm text-green-300">
              Roll: {testResult.rollResult} + {testResult.modifier} = {testResult.finalResult} vs {testResult.targetNumber}+
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading...</p>
            </div>
          )}

          {!loading && activeTab === 'morale' && selectedUnit && moraleInfo && (
            <div className="space-y-6">
              {/* Unit Info */}
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-2">Unit Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="ml-2 font-medium">{moraleInfo.unitInfo.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Morale State:</span>
                    <span className={`ml-2 font-medium ${
                      moraleInfo.currentMoraleState === 'Routed' ? 'text-red-400' :
                      moraleInfo.currentMoraleState === 'Shaken' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {moraleInfo.currentMoraleState}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Size:</span>
                    <span className="ml-2 font-medium">
                      {moraleInfo.unitInfo.currentSize}/{moraleInfo.unitInfo.originalSize}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Combat Penalties:</span>
                    <span className="ml-2 font-medium">
                      {moraleInfo.actionPenalties.shootingPenalty !== 0 && 
                        `Shooting: ${moraleInfo.actionPenalties.shootingPenalty} `}
                      {moraleInfo.actionPenalties.fightingPenalty !== 0 && 
                        `Fighting: ${moraleInfo.actionPenalties.fightingPenalty} `}
                      {moraleInfo.actionPenalties.movementPenalty !== 0 && 
                        `Movement: ${moraleInfo.actionPenalties.movementPenalty}`}
                      {moraleInfo.actionPenalties.shootingPenalty === 0 && 
                       moraleInfo.actionPenalties.fightingPenalty === 0 && 
                       moraleInfo.actionPenalties.movementPenalty === 0 && 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Suggested Tests */}
              {moraleInfo.suggestions.length > 0 && (
                <div className="bg-gray-700 p-4 rounded">
                  <h3 className="text-lg font-medium mb-3">Suggested Tests</h3>
                  <div className="space-y-2">
                    {moraleInfo.suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                        <div>
                          <div className="font-medium">{suggestion.testType}</div>
                          <div className="text-sm text-gray-300">{suggestion.reason}</div>
                          <div className="text-xs text-gray-400">
                            Modifier: {suggestion.modifier >= 0 ? '+' : ''}{suggestion.modifier}
                          </div>
                        </div>
                        <button
                          onClick={() => performMoraleTest(suggestion.testType, suggestion.modifier, suggestion.reason)}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm font-medium transition-colors"
                        >
                          Test
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Morale Test */}
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-3">Custom Morale Test</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Test Type</label>
                      <select 
                        className="w-full p-2 bg-gray-600 border border-gray-500 rounded"
                        id="moraleTestType"
                      >
                        <option value="MORALE">Morale Test</option>
                        <option value="ROUT_RECOVERY">Rout Recovery</option>
                        <option value="ACTIVATION">Activation Test</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Modifier</label>
                      <input
                        type="number"
                        className="w-full p-2 bg-gray-600 border border-gray-500 rounded"
                        min="-10"
                        max="10"
                        defaultValue="0"
                        id="moraleModifier"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-gray-600 border border-gray-500 rounded"
                      placeholder="Reason for test"
                      id="moraleReason"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const testType = (document.getElementById('moraleTestType') as HTMLSelectElement).value;
                      const modifier = parseInt((document.getElementById('moraleModifier') as HTMLInputElement).value);
                      const reason = (document.getElementById('moraleReason') as HTMLInputElement).value;
                      
                      if (reason.trim()) {
                        performMoraleTest(testType, modifier, reason);
                      }
                    }}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-medium transition-colors"
                  >
                    Perform Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'quality' && selectedModel && qualityInfo && (
            <div className="space-y-6">
              {/* Model Info */}
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-2">Model Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="ml-2 font-medium">{qualityInfo.modelInfo.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Quality:</span>
                    <span className="ml-2 font-medium">{qualityInfo.modelInfo.quality}+</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tough:</span>
                    <span className="ml-2 font-medium">
                      {qualityInfo.modelInfo.currentTough}/{qualityInfo.modelInfo.maxTough}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Type:</span>
                    <span className="ml-2 font-medium">
                      {qualityInfo.modelInfo.isHero ? 'Hero' : 'Model'}
                    </span>
                  </div>
                </div>
                {qualityInfo.modelInfo.specialRules.length > 0 && (
                  <div className="mt-2">
                    <span className="text-gray-400">Special Rules:</span>
                    <span className="ml-2 font-medium">
                      {qualityInfo.modelInfo.specialRules.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Available Tests */}
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-3">Available Quality Tests</h3>
                <div className="space-y-2">
                  {qualityInfo.availableTests.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                      <div>
                        <div className="font-medium">{test.testType}</div>
                        <div className="text-sm text-gray-300">{test.description}</div>
                      </div>
                      <button
                        onClick={() => performQualityTest(test.testType, test.modifier, test.description)}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm font-medium transition-colors"
                      >
                        Test
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Quality Test */}
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-3">Custom Quality Test</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Test Type</label>
                      <select 
                        className="w-full p-2 bg-gray-600 border border-gray-500 rounded"
                        id="qualityTestType"
                      >
                        <option value="ACTIVATION">Activation</option>
                        <option value="SPECIAL_ABILITY">Special Ability</option>
                        <option value="INSTANT_KILL">Instant Kill Resist</option>
                        <option value="SPELL_RESIST">Spell Resist</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Modifier</label>
                      <input
                        type="number"
                        className="w-full p-2 bg-gray-600 border border-gray-500 rounded"
                        min="-10"
                        max="10"
                        defaultValue="0"
                        id="qualityModifier"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-gray-600 border border-gray-500 rounded"
                      placeholder="Reason for test"
                      id="qualityReason"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const testType = (document.getElementById('qualityTestType') as HTMLSelectElement).value;
                      const modifier = parseInt((document.getElementById('qualityModifier') as HTMLInputElement).value);
                      const reason = (document.getElementById('qualityReason') as HTMLInputElement).value;
                      
                      if (reason.trim()) {
                        performQualityTest(testType, modifier, reason);
                      }
                    }}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-medium transition-colors"
                  >
                    Perform Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !selectedUnit && (
            <div className="text-center py-8">
              <div className="text-gray-400">Select a unit to perform morale tests</div>
            </div>
          )}

          {!loading && activeTab === 'quality' && !selectedModel && (
            <div className="text-center py-8">
              <div className="text-gray-400">Select a model to perform quality tests</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600 bg-gray-750 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {selectedUnit && `Selected: ${selectedUnit.name}`}
            {selectedModel && ` • Model: ${selectedModel.name}`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};