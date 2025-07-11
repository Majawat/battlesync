import React, { useState } from 'react';
import { CreateCampaignRequest } from '../types/campaign';

interface CreateCampaignModalProps {
  onClose: () => void;
  onSubmit: (data: CreateCampaignRequest) => Promise<void>;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    name: '',
    description: '',
    gameSystem: '',
    settings: {
      maxMissions: undefined,
      experienceSystem: 'NONE',
      allowSpectators: true,
      autoAdvanceMissions: false,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('settings.')) {
      const settingKey = name.replace('settings.', '');
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingKey]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                      type === 'number' ? (value ? parseInt(value) : undefined) :
                      value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Create Campaign</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-900 border border-red-600 text-red-200 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="name">
              Campaign Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter campaign name"
              required
              minLength={3}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="Describe your campaign (optional)"
              maxLength={500}
            />
            <div className="text-xs text-gray-400 mt-1">
              {formData.description?.length || 0}/500 characters
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="gameSystem">
              Game System
            </label>
            <input
              id="gameSystem"
              name="gameSystem"
              type="text"
              value={formData.gameSystem}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., One Page Rules, Warhammer 40k, etc."
              maxLength={50}
            />
          </div>

          {/* Campaign Settings */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-medium text-gray-300 mb-4">Campaign Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="maxMissions">
                  Max Missions
                </label>
                <input
                  id="maxMissions"
                  name="settings.maxMissions"
                  type="number"
                  value={formData.settings?.maxMissions || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Leave empty for unlimited"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="experienceSystem">
                  Experience System
                </label>
                <select
                  id="experienceSystem"
                  name="settings.experienceSystem"
                  value={formData.settings?.experienceSystem || 'NONE'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="NONE">None</option>
                  <option value="SIMPLE">Simple (+1 per mission)</option>
                  <option value="ADVANCED">Advanced (victory points)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center">
                <input
                  id="allowSpectators"
                  name="settings.allowSpectators"
                  type="checkbox"
                  checked={formData.settings?.allowSpectators || false}
                  onChange={handleChange}
                  className="mr-2 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="allowSpectators" className="text-gray-300 text-sm">
                  Allow spectators to watch battles
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="autoAdvanceMissions"
                  name="settings.autoAdvanceMissions"
                  type="checkbox"
                  checked={formData.settings?.autoAdvanceMissions || false}
                  onChange={handleChange}
                  className="mr-2 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoAdvanceMissions" className="text-gray-300 text-sm">
                  Auto-advance to next mission when current completes
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
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
              disabled={loading || !formData.name.trim()}
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};