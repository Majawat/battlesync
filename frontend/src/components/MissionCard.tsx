import React from 'react';
import { Mission } from '../types/mission';

interface MissionCardProps {
  mission: Mission;
  onDelete: () => void;
  onUpdateStatus: (status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED') => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  onDelete,
  onUpdateStatus,
}) => {
  const getStatusColor = () => {
    switch (mission.status) {
      case 'ACTIVE':
        return 'bg-green-900 text-green-200';
      case 'COMPLETED':
        return 'bg-blue-900 text-blue-200';
      case 'CANCELLED':
        return 'bg-red-900 text-red-200';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-xl font-semibold text-white">
                Mission #{mission.missionNumber}: {mission.name}
              </h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}>
                {mission.status}
              </span>
            </div>
            {mission.description && (
              <p className="text-gray-400 text-sm">{mission.description}</p>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2 ml-4">
            {mission.status === 'PENDING' && (
              <button
                onClick={() => onUpdateStatus('ACTIVE')}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
              >
                Start
              </button>
            )}
            {mission.status === 'ACTIVE' && (
              <button
                onClick={() => onUpdateStatus('COMPLETED')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
              >
                Complete
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 text-sm px-3 py-1"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Mission Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Basic Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Mission Info</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white">{mission.missionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created:</span>
                <span className="text-white">{formatDate(mission.createdAt)}</span>
              </div>
              {mission.scheduledDate && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Scheduled:</span>
                  <span className="text-white">{formatDate(mission.scheduledDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Objectives */}
          {mission.objectives && mission.objectives.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Objectives</h4>
              <div className="space-y-1">
                {mission.objectives.slice(0, 3).map((objective, index) => (
                  <div key={index} className="text-sm text-gray-400 truncate">
                    • {objective}
                  </div>
                ))}
                {mission.objectives.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{mission.objectives.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Rules */}
          {mission.specialRules && mission.specialRules.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Special Rules</h4>
              <div className="space-y-1">
                {mission.specialRules.slice(0, 3).map((rule, index) => (
                  <div key={index} className="text-sm text-gray-400 truncate">
                    • {rule}
                  </div>
                ))}
                {mission.specialRules.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{mission.specialRules.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terrain */}
          {mission.terrainSuggestions && mission.terrainSuggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Terrain</h4>
              <div className="space-y-1">
                {mission.terrainSuggestions.slice(0, 3).map((terrain, index) => (
                  <div key={index} className="text-sm text-gray-400 truncate">
                    • {terrain}
                  </div>
                ))}
                {mission.terrainSuggestions.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{mission.terrainSuggestions.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {mission.status === 'ACTIVE' && 'Mission in progress'}
            {mission.status === 'COMPLETED' && 'Mission completed'}
            {mission.status === 'PENDING' && 'Ready to start'}
            {mission.status === 'CANCELLED' && 'Mission cancelled'}
          </div>
          
          <div className="flex space-x-2">
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded">
              View Details
            </button>
            {mission.status === 'ACTIVE' && (
              <button className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded">
                Enter Battle
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};