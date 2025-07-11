import React, { useState } from 'react';
import { CreateMissionRequest } from '../types/mission';

interface CreateMissionModalProps {
  onClose: () => void;
  onSubmit: (data: CreateMissionRequest) => Promise<void>;
}

const MISSION_TEMPLATES = [
  {
    name: 'Patrol Clash',
    type: 'PATROL_CLASH',
    objectives: ['Eliminate enemy forces', 'Control center objective'],
    specialRules: ['6-turn limit', 'First blood bonus'],
    terrainSuggestions: ['Central hill or building', 'Scattered cover'],
  },
  {
    name: 'Control Zones',
    type: 'CONTROL_ZONES',
    objectives: ['Control 3 of 5 objectives', 'Prevent enemy from scoring'],
    specialRules: ['Objectives score at end of turn', 'Move through cover'],
    terrainSuggestions: ['5 objective markers', 'Buildings for cover', 'Open firing lanes'],
  },
  {
    name: 'Breakthrough',
    type: 'BREAKTHROUGH',
    objectives: ['Get units to enemy deployment zone', 'Eliminate enemy commander'],
    specialRules: ['Deployment zone scoring', 'Reserves available'],
    terrainSuggestions: ['Narrow corridor', 'Defensive positions', 'Multiple approach routes'],
  },
];

export const CreateMissionModal: React.FC<CreateMissionModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<CreateMissionRequest>({
    name: '',
    description: '',
    missionType: 'CUSTOM',
    objectives: [],
    specialRules: [],
    terrainSuggestions: [],
    scheduledDate: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (field: 'objectives' | 'specialRules' | 'terrainSuggestions', value: string) => {
    const items = value.split('\n').filter(item => item.trim());
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const handleTemplateSelect = (templateName: string) => {
    const template = MISSION_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name,
        missionType: template.type as any,
        objectives: template.objectives,
        specialRules: template.specialRules,
        terrainSuggestions: template.terrainSuggestions,
      }));
      setSelectedTemplate(templateName);
    }
  };

  const clearTemplate = () => {
    setFormData({
      name: '',
      description: '',
      missionType: 'CUSTOM',
      objectives: [],
      specialRules: [],
      terrainSuggestions: [],
      scheduledDate: undefined,
    });
    setSelectedTemplate(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Create Mission</h2>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-300 mb-3">Quick Start Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {MISSION_TEMPLATES.map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => handleTemplateSelect(template.name)}
                  className={`p-3 border rounded text-left transition-colors ${
                    selectedTemplate === template.name
                      ? 'border-blue-500 bg-blue-900 text-blue-200'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {template.objectives.length} objectives, {template.specialRules.length} rules
                  </div>
                </button>
              ))}
            </div>
            {selectedTemplate && (
              <button
                type="button"
                onClick={clearTemplate}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Clear template and start custom
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="name">
                  Mission Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter mission name"
                  required
                  minLength={3}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="missionType">
                  Mission Type
                </label>
                <select
                  id="missionType"
                  name="missionType"
                  value={formData.missionType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="CUSTOM">Custom</option>
                  <option value="PATROL_CLASH">Patrol Clash</option>
                  <option value="CONTROL_ZONES">Control Zones</option>
                  <option value="BREAKTHROUGH">Breakthrough</option>
                  <option value="ASSASSINATION">Assassination</option>
                  <option value="ESCORT">Escort</option>
                </select>
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
                  placeholder="Describe the mission background and story (optional)"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="scheduledDate">
                  Scheduled Date (Optional)
                </label>
                <input
                  id="scheduledDate"
                  name="scheduledDate"
                  type="datetime-local"
                  value={formData.scheduledDate || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="objectives">
                  Objectives
                </label>
                <textarea
                  id="objectives"
                  value={formData.objectives.join('\n')}
                  onChange={(e) => handleArrayChange('objectives', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter each objective on a new line&#10;Example:&#10;Control the center objective&#10;Eliminate enemy commander&#10;Prevent enemy from scoring"
                />
                <div className="text-xs text-gray-400 mt-1">
                  One objective per line
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="specialRules">
                  Special Rules
                </label>
                <textarea
                  id="specialRules"
                  value={formData.specialRules.join('\n')}
                  onChange={(e) => handleArrayChange('specialRules', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter each special rule on a new line&#10;Example:&#10;Night fighting rules apply&#10;Reserves enter from turn 2&#10;First blood gives extra VP"
                />
                <div className="text-xs text-gray-400 mt-1">
                  One rule per line
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="terrainSuggestions">
                  Terrain Suggestions
                </label>
                <textarea
                  id="terrainSuggestions"
                  value={formData.terrainSuggestions.join('\n')}
                  onChange={(e) => handleArrayChange('terrainSuggestions', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter terrain setup suggestions&#10;Example:&#10;Central hill with cover&#10;Buildings on flanks&#10;Open ground in middle"
                />
                <div className="text-xs text-gray-400 mt-1">
                  One suggestion per line
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
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
              {loading ? 'Creating...' : 'Create Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};