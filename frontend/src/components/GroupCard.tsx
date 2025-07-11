import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GamingGroup } from '../types/gamingGroup';

interface GroupCardProps {
  group: GamingGroup;
  currentUserId: string;
  onDelete: () => void;
  onLeave: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  currentUserId,
  onDelete,
  onLeave,
}) => {
  const navigate = useNavigate();
  const isOwner = group.owner.id === currentUserId;

  const getStatusColor = () => {
    if (group.campaignCount > 0) {
      return 'bg-green-900 text-green-200';
    }
    return 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white truncate">{group.name}</h3>
          <div className="flex items-center space-x-2">
            {isOwner && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-900 text-purple-200">
                Owner
              </span>
            )}
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}>
              {group.campaignCount > 0 ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        {group.description && (
          <p className="text-gray-400 text-sm mt-2 line-clamp-2">{group.description}</p>
        )}
      </div>

      {/* Card Body */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{group.memberCount}</div>
            <div className="text-xs text-gray-400">Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{group.campaignCount}</div>
            <div className="text-xs text-gray-400">Campaigns</div>
          </div>
        </div>

        {/* Member List Preview */}
        {group.members.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Members</h4>
            <div className="space-y-1">
              {group.members.slice(0, 3).map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{member.username}</span>
                  {member.role === 'ADMIN' && (
                    <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                      Admin
                    </span>
                  )}
                </div>
              ))}
              {group.members.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{group.members.length - 3} more...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite Code for Owner */}
        {isOwner && (
          <div className="mb-4 p-3 bg-gray-700 rounded">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Invite Code</div>
                <div className="text-sm font-mono text-white">{group.inviteCode}</div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(group.inviteCode)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-gray-900 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => navigate(`/groups/${group.id}/campaigns`)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded"
          >
            View Details
          </button>
          
          <div className="flex space-x-2">
            {isOwner ? (
              <>
                <button className="text-gray-400 hover:text-white text-sm">
                  Settings
                </button>
                <button
                  onClick={onDelete}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </>
            ) : (
              <button
                onClick={onLeave}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Leave
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};