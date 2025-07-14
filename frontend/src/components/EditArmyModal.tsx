import React, { useState, useEffect } from 'react';
import { ArmySummary } from '../types/army';
import { apiClient } from '../services/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface EditArmyModalProps {
  army: ArmySummary;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const EditArmyModal: React.FC<EditArmyModalProps> = ({ 
  army, 
  isOpen, 
  onClose, 
  onUpdate 
}) => {
  // Custom name editing removed - not available in ArmySummary type
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(army.campaignId || '');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
      setSelectedCampaignId(army.campaignId || '');
    }
  }, [isOpen, army]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUserCampaigns();
      if (response.data.status === 'success') {
        setCampaigns(response.data.data.filter((c: Campaign) => c.status === 'ACTIVE'));
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Update campaign association if changed
      if (selectedCampaignId !== army.campaignId) {
        await apiClient.updateArmyCampaignAssociation(
          army.id, 
          selectedCampaignId || null
        );
      }

      // For now, custom name editing is disabled since ArmySummary doesn't have customizations
      // This would require extending the ArmySummary type or fetching full Army data

      onUpdate(); // Trigger parent refresh

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update army');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Edit Army</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900 border border-red-600 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Army Info */}
          <div className="p-3 bg-gray-900 rounded text-sm">
            <div className="text-gray-400 mb-2">Army Information:</div>
            <div className="text-white">
              <div><strong>Name:</strong> {army.name}</div>
              <div><strong>Faction:</strong> {army.faction}</div>
              <div><strong>Points:</strong> {army.points}</div>
            </div>
          </div>

          {/* Campaign Association */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Campaign Association
            </label>
            {loading ? (
              <div className="text-gray-400 text-sm">Loading campaigns...</div>
            ) : (
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">One-off / Unassigned</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Choose a campaign or leave unassigned for one-off battles
            </p>
          </div>

          {/* Current Campaign Status */}
          <div className="p-3 bg-gray-700 rounded text-sm">
            <div className="text-gray-400 mb-1">Current Campaign:</div>
            <div className="text-white">
              {army.campaignId ? (
                <span className="text-green-400">Assigned to campaign {army.campaignId}</span>
              ) : (
                <span className="text-yellow-400">Unassigned (available for one-off battles)</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-300 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};