import React, { useState, useEffect } from 'react';
import { ArmyImportRequest } from '../types/army';
import { apiClient } from '../services/api';

interface ArmyImportModalProps {
  onClose: () => void;
  onImport: (result: any) => void;
}

export const ArmyImportModal: React.FC<ArmyImportModalProps> = ({
  onClose,
  onImport,
}) => {
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const response = await apiClient.getUserCampaigns();
        if (response.data.status === 'success') {
          setCampaigns(response.data.data || []);
        }
      } catch (error) {
        console.error('Failed to load campaigns:', error);
      } finally {
        setLoadingCampaigns(false);
      }
    };
    loadCampaigns();
  }, []);
  const [formData, setFormData] = useState<ArmyImportRequest>({
    armyForgeId: '',
    campaignId: undefined,
    customName: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [pendingResult, setPendingResult] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await apiClient.importArmy(formData);
      
      if (response.data.status === 'success' && response.data.data) {
        const result = response.data.data;
        setWarnings(result.warnings);
        
        if (result.warnings.length > 0) {
          // Show warnings and wait for user to dismiss manually
          setWarnings(result.warnings);
          setShowWarnings(true);
          // Store result for later completion
          setPendingResult(result);
        } else {
          onImport(result);
        }
      } else {
        throw new Error(response.data.message || 'Failed to import army');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Failed to import army');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value === '' ? undefined : value 
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Import Army from ArmyForge</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-900 border border-red-600 text-red-200 p-3 rounded">
            {error}
          </div>
        )}

        {showWarnings && warnings.length > 0 && (
          <div className="mb-4 bg-yellow-900 border border-yellow-600 text-yellow-200 p-3 rounded">
            <div className="font-medium mb-2">Import completed with warnings:</div>
            <ul className="text-sm space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => {
                  setShowWarnings(false);
                  if (pendingResult) {
                    onImport(pendingResult);
                  }
                }}
                className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="armyForgeId">
              ArmyForge Army ID *
            </label>
            <input
              id="armyForgeId"
              name="armyForgeId"
              type="text"
              value={formData.armyForgeId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., IJ1JM_m-jmka"
              required
              disabled={loading}
            />
            <div className="text-xs text-gray-400 mt-1 space-y-1">
              <div>Find this in your ArmyForge army URL: https://army-forge.onepagerules.com/list?listId=<strong>IJ1JM_m-jmka</strong></div>
              <div>Try the example armies:</div>
              <ul><li>
              <button type="button" onClick={() => setFormData(prev => ({...prev, armyForgeId: 'IJ1JM_m-jmka'}))} className="text-blue-400 hover:text-blue-300 underline">IJ1JM_m-jmka</button> (Test Army)</li>
              <li><button type="button" onClick={() => setFormData(prev => ({...prev, armyForgeId: 'vMzljLVC6ZGv'}))} className="text-blue-400 hover:text-blue-300 underline">vMzljLVC6ZGv</button> (The Ashen Pact)</li>
              <li><button type="button" onClick={() => setFormData(prev => ({...prev, armyForgeId: 'Xo19MAwQPGbs'}))} className="text-blue-400 hover:text-blue-300 underline">Xo19MAwQPGbs</button> (van Louen's Roughnecks)</li>
              <li><button type="button" onClick={() => setFormData(prev => ({...prev, armyForgeId: 'Un3_pRTu2xBO'}))} className="text-blue-400 hover:text-blue-300 underline">Un3_pRTu2xBO</button> (Hive Fleet Tarvos)</li>
              <li><button type="button" onClick={() => setFormData(prev => ({...prev, armyForgeId: 'OKOrilTDQs6P'}))} className="text-blue-400 hover:text-blue-300 underline">OKOrilTDQs6P</button> (Galdoo'o naahlk wildigitkw)</li></ul>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="customName">
              Custom Name (Optional)
            </label>
            <input
              id="customName"
              name="customName"
              type="text"
              value={formData.customName || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="Override army name (optional)"
              maxLength={100}
              disabled={loading}
            />
            <div className="text-xs text-gray-400 mt-1">
              Leave blank to use the name from ArmyForge
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="campaignId">
              Campaign (Optional)
            </label>
            <select
              id="campaignId"
              name="campaignId"
              value={formData.campaignId || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
              disabled={loading || loadingCampaigns}
            >
              <option value="">No Campaign (Personal Army)</option>
              {loadingCampaigns ? (
                <option disabled>Loading campaigns...</option>
              ) : (
                campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))
              )}
            </select>
            <div className="text-xs text-gray-400 mt-1">
              Assign this army to a specific campaign
            </div>
          </div>

          <div className="bg-gray-700 p-3 rounded mb-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Import Process:</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Fetches army data directly from ArmyForge API</li>
              <li>• Validates units, weapons, and special rules</li>
              <li>• Creates a local copy with full army details</li>
              <li>• Enables battle tracking and customizations</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || !formData.armyForgeId.trim()}
            >
              {loading ? 'Importing...' : 'Import Army'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};