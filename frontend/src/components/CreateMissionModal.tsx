import React, { useState } from 'react';
import { CreateMissionRequest, MissionObjective, MissionRule, TerrainFeature } from '../types/mission';

interface CreateMissionModalProps {
  onClose: () => void;
  onSubmit: (data: CreateMissionRequest) => Promise<void>;
}

export const CreateMissionModal: React.FC<CreateMissionModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<CreateMissionRequest>({
    title: '',
    description: '',
    points: 1000,
    objectives: [{
      title: 'Primary Objective',
      description: 'Complete the primary mission objective',
      points: 3,
      type: 'CAPTURE_POINT',
      isRequired: true
    }],
    specialRules: [],
    terrainSuggestions: [],
    scheduledDate: undefined,
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
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? (value ? parseInt(value) : 0) : value 
    }));
  };

  const addObjective = () => {
    setFormData(prev => ({
      ...prev,
      objectives: [...prev.objectives, {
        title: '',
        description: '',
        points: 1,
        type: 'CAPTURE_POINT',
        isRequired: false
      }]
    }));
  };

  const updateObjective = (index: number, field: keyof Omit<MissionObjective, 'id'>, value: any) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.map((obj, i) => 
        i === index ? { ...obj, [field]: value } : obj
      )
    }));
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const addSpecialRule = () => {
    setFormData(prev => ({
      ...prev,
      specialRules: [...prev.specialRules, {
        title: '',
        description: '',
        phase: 'DEPLOYMENT',
        isActive: true
      }]
    }));
  };

  const updateSpecialRule = (index: number, field: keyof Omit<MissionRule, 'id'>, value: any) => {
    setFormData(prev => ({
      ...prev,
      specialRules: prev.specialRules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeSpecialRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialRules: prev.specialRules.filter((_, i) => i !== index)
    }));
  };

  const addTerrainFeature = () => {
    setFormData(prev => ({
      ...prev,
      terrainSuggestions: [...prev.terrainSuggestions, {
        name: '',
        description: '',
        size: 'MEDIUM',
        category: 'BUILDING',
        isRequired: false
      }]
    }));
  };

  const updateTerrainFeature = (index: number, field: keyof Omit<TerrainFeature, 'id'>, value: any) => {
    setFormData(prev => ({
      ...prev,
      terrainSuggestions: prev.terrainSuggestions.map((terrain, i) => 
        i === index ? { ...terrain, [field]: value } : terrain
      )
    }));
  };

  const removeTerrainFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      terrainSuggestions: prev.terrainSuggestions.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
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
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="title">
                Mission Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter mission title"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="points">
                Points Limit *
              </label>
              <input
                id="points"
                name="points"
                type="number"
                value={formData.points}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                placeholder="1000"
                min="100"
                max="10000"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="description">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="Describe the mission scenario"
              required
            />
          </div>

          {/* Objectives */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-300">Objectives</h3>
              <button
                type="button"
                onClick={addObjective}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
              >
                Add Objective
              </button>
            </div>
            {formData.objectives.map((objective, index) => (
              <div key={index} className="bg-gray-700 p-4 rounded mb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Objective title"
                    value={objective.title}
                    onChange={(e) => updateObjective(index, 'title', e.target.value)}
                    className="px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <select
                      value={objective.type}
                      onChange={(e) => updateObjective(index, 'type', e.target.value)}
                      className="px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="CAPTURE_POINT">Capture Point</option>
                      <option value="DESTROY_UNIT">Destroy Unit</option>
                      <option value="HOLD_POSITION">Hold Position</option>
                      <option value="ELIMINATE_ENEMY">Eliminate Enemy</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Points"
                      value={objective.points}
                      onChange={(e) => updateObjective(index, 'points', parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500"
                      min="0"
                      max="10"
                    />
                  </div>
                </div>
                <textarea
                  placeholder="Objective description"
                  value={objective.description}
                  onChange={(e) => updateObjective(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500 mb-3"
                />
                <div className="flex justify-between items-center">
                  <label className="flex items-center text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={objective.isRequired}
                      onChange={(e) => updateObjective(index, 'isRequired', e.target.checked)}
                      className="mr-2 rounded border-gray-600 bg-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    Required objective
                  </label>
                  <button
                    type="button"
                    onClick={() => removeObjective(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Special Rules */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-300">Special Rules</h3>
              <button
                type="button"
                onClick={addSpecialRule}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
              >
                Add Rule
              </button>
            </div>
            {formData.specialRules.map((rule, index) => (
              <div key={index} className="bg-gray-700 p-4 rounded mb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Rule title"
                    value={rule.title}
                    onChange={(e) => updateSpecialRule(index, 'title', e.target.value)}
                    className="px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={rule.phase}
                    onChange={(e) => updateSpecialRule(index, 'phase', e.target.value)}
                    className="px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="DEPLOYMENT">Deployment</option>
                    <option value="MOVEMENT">Movement</option>
                    <option value="SHOOTING">Shooting</option>
                    <option value="COMBAT">Combat</option>
                    <option value="MORALE">Morale</option>
                    <option value="END_TURN">End Turn</option>
                    <option value="GAME_END">Game End</option>
                  </select>
                </div>
                <textarea
                  placeholder="Rule description"
                  value={rule.description}
                  onChange={(e) => updateSpecialRule(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500 mb-3"
                />
                <div className="flex justify-between items-center">
                  <label className="flex items-center text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={(e) => updateSpecialRule(index, 'isActive', e.target.checked)}
                      className="mr-2 rounded border-gray-600 bg-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    Active rule
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSpecialRule(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Terrain Suggestions */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-300">Terrain Suggestions</h3>
              <button
                type="button"
                onClick={addTerrainFeature}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
              >
                Add Terrain
              </button>
            </div>
            {formData.terrainSuggestions.map((terrain, index) => (
              <div key={index} className="bg-gray-700 p-4 rounded mb-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Terrain name"
                    value={terrain.name}
                    onChange={(e) => updateTerrainFeature(index, 'name', e.target.value)}
                    className="px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={terrain.size}
                    onChange={(e) => updateTerrainFeature(index, 'size', e.target.value)}
                    className="px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="SMALL">Small</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LARGE">Large</option>
                    <option value="MASSIVE">Massive</option>
                  </select>
                  <select
                    value={terrain.category}
                    onChange={(e) => updateTerrainFeature(index, 'category', e.target.value)}
                    className="px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="BUILDING">Building</option>
                    <option value="FOREST">Forest</option>
                    <option value="HILL">Hill</option>
                    <option value="RUINS">Ruins</option>
                    <option value="WATER">Water</option>
                    <option value="INDUSTRIAL">Industrial</option>
                    <option value="OBSTACLE">Obstacle</option>
                    <option value="DECORATION">Decoration</option>
                  </select>
                </div>
                <textarea
                  placeholder="Terrain description"
                  value={terrain.description}
                  onChange={(e) => updateTerrainFeature(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white focus:outline-none focus:border-blue-500 mb-3"
                />
                <div className="flex justify-between items-center">
                  <label className="flex items-center text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={terrain.isRequired}
                      onChange={(e) => updateTerrainFeature(index, 'isRequired', e.target.checked)}
                      className="mr-2 rounded border-gray-600 bg-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    Required terrain
                  </label>
                  <button
                    type="button"
                    onClick={() => removeTerrainFeature(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
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
              disabled={loading || !formData.title.trim() || !formData.description.trim()}
            >
              {loading ? 'Creating...' : 'Create Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};