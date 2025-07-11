import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Campaign } from '../types/campaign';

interface CampaignCardProps {
  campaign: Campaign;
  currentUserId: string;
  onDelete: () => void;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  currentUserId,
  onDelete,
}) => {
  const navigate = useNavigate();
  const isOwner = campaign.createdBy === currentUserId;

  const getStatusColor = () => {
    switch (campaign.status) {
      case 'ACTIVE':
        return 'bg-green-900 text-green-200';
      case 'COMPLETED':
        return 'bg-blue-900 text-blue-200';
      case 'ON_HOLD':
        return 'bg-yellow-900 text-yellow-200';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white truncate">{campaign.name}</h3>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}>
            {campaign.status.replace('_', ' ')}
          </span>
        </div>
        {campaign.description && (
          <p className="text-gray-400 text-sm mt-2 line-clamp-2">{campaign.description}</p>
        )}
      </div>

      {/* Card Body */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{campaign.missionCount}</div>
            <div className="text-xs text-gray-400">Missions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{campaign.participantCount}</div>
            <div className="text-xs text-gray-400">Participants</div>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="space-y-2 mb-4">
          {campaign.gameSystem && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Game System:</span>
              <span className="text-sm text-white">{campaign.gameSystem}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Created:</span>
            <span className="text-sm text-white">{formatDate(campaign.createdAt)}</span>
          </div>
          {campaign.settings?.experienceSystem && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Experience:</span>
              <span className="text-sm text-white capitalize">{campaign.settings.experienceSystem}</span>
            </div>
          )}
        </div>

        {/* Progress Indicators */}
        {campaign.settings?.maxMissions && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Progress</span>
              <span>{campaign.missionCount}/{campaign.settings.maxMissions}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min((campaign.missionCount / campaign.settings.maxMissions) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-gray-900 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/campaigns/${campaign.id}/missions`)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded"
          >
            View Missions
          </button>
          
          <div className="flex space-x-2">
            {isOwner && (
              <>
                <button
                  onClick={() => navigate(`/campaigns/${campaign.id}/settings`)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Settings
                </button>
                <button
                  onClick={onDelete}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};