import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface CampaignMember {
  id: string;
  userId: string;
  username: string;
  email: string | null;
  role: 'CREATOR' | 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REMOVED';
  totalExperience: number;
  battlesWon: number;
  battlesLost: number;
  joinedAt: string;
  invitedBy?: string;
  invitedAt?: string;
  primaryArmyId?: string;
  primaryArmyName?: string;
}

interface AvailableGroupMember {
  groupMembershipId: string;
  userId: string;
  username: string;
  email: string | null;
  groupRole: 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

interface CampaignMembersModalProps {
  campaignId: string;
  campaignName: string;
  onClose: () => void;
  userRole: 'CREATOR' | 'ADMIN' | 'MEMBER';
}

export const CampaignMembersModal: React.FC<CampaignMembersModalProps> = ({
  campaignId,
  campaignName,
  onClose,
  userRole
}) => {
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const canManage = userRole === 'CREATOR' || userRole === 'ADMIN';

  useEffect(() => {
    loadMembers();
    if (canManage) {
      loadAvailableMembers();
    }
  }, [campaignId, canManage]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCampaignMembers(campaignId);
      if (response.data.status === 'success') {
        setMembers(response.data.data || []);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableMembers = async () => {
    try {
      const response = await apiClient.getAvailableGroupMembers(campaignId);
      if (response.data.status === 'success') {
        setAvailableMembers(response.data.data || []);
      }
    } catch (error: any) {
      // Don't show error for available members - just fail silently
      setAvailableMembers([]);
    }
  };

  const handleAddMember = async (groupMembershipId: string, campaignRole: 'PARTICIPANT' | 'ADMIN' = 'PARTICIPANT') => {
    try {
      await apiClient.addMemberToCampaign(campaignId, {
        groupMembershipId,
        campaignRole
      });
      await loadMembers(); // Refresh campaign members
      await loadAvailableMembers(); // Refresh available members
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add member');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;

    try {
      setInviting(true);
      await apiClient.inviteMemberToCampaign(campaignId, {
        username: inviteUsername.trim(),
        role: inviteRole
      });
      setInviteUsername('');
      setInviteRole('MEMBER');
      await loadMembers(); // Refresh the list
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateMember = async (membershipId: string, updates: { role?: 'ADMIN' | 'MEMBER'; status?: 'ACTIVE' | 'INACTIVE' }) => {
    try {
      await apiClient.updateCampaignMember(campaignId, membershipId, updates);
      await loadMembers(); // Refresh the list
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update member');
    }
  };

  const handleRemoveMember = async (membershipId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from this campaign?`)) {
      return;
    }

    try {
      await apiClient.removeCampaignMember(campaignId, membershipId);
      await loadMembers(); // Refresh the list
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CREATOR': return 'text-yellow-400';
      case 'ADMIN': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-900 text-green-200 border-green-600';
      case 'PENDING': return 'bg-yellow-900 text-yellow-200 border-yellow-600';
      case 'INACTIVE': return 'bg-gray-900 text-gray-200 border-gray-600';
      default: return 'bg-red-900 text-red-200 border-red-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Campaign Members - {campaignName}</h2>
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
            <button
              onClick={() => setError(null)}
              className="float-right text-red-400 hover:text-red-200"
            >
              ×
            </button>
          </div>
        )}

        {/* Member Management - Only for admins/creators */}
        {canManage && (
          <div className="mb-6 space-y-4">
            {/* Add from Group */}
            {availableMembers.length > 0 && (
              <div className="bg-gray-700 p-4 rounded">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-white">Add from Group</h3>
                  <button
                    onClick={() => setShowAddMembers(!showAddMembers)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {showAddMembers ? 'Hide' : 'Show'} ({availableMembers.length})
                  </button>
                </div>
                
                {showAddMembers && (
                  <div className="space-y-2">
                    {availableMembers.map((member) => (
                      <div key={member.groupMembershipId} className="bg-gray-600 p-3 rounded flex items-center justify-between">
                        <div>
                          <span className="font-medium text-white">{member.username}</span>
                          <span className="text-sm text-gray-400 ml-2">({member.groupRole})</span>
                        </div>
                        <button
                          onClick={() => handleAddMember(member.groupMembershipId, 'PARTICIPANT')}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Invite New Member */}
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-lg font-medium text-white mb-3">Invite New Member</h3>
              <form onSubmit={handleInvite} className="flex gap-3">
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="Username"
                  className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  disabled={inviting}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                  className="px-3 py-2 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  disabled={inviting}
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting || !inviteUsername.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviting ? 'Inviting...' : 'Invite'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-white">
            Members ({members.length})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No members found</div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="bg-gray-700 p-4 rounded flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white">{member.username}</span>
                      <span className={`text-sm font-medium ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusBadge(member.status)}`}>
                        {member.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      <span>Joined: {new Date(member.joinedAt).toLocaleDateString()}</span>
                      {member.status === 'PENDING' && member.invitedAt && (
                        <span className="ml-4">Invited: {new Date(member.invitedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      Experience: {member.totalExperience} | 
                      Battles: {member.battlesWon}W / {member.battlesLost}L
                    </div>
                  </div>

                  {/* Action Buttons - Only for admins/creators, and not for creator role */}
                  {canManage && member.role !== 'CREATOR' && (
                    <div className="flex gap-2">
                      {/* Role Toggle */}
                      {member.status === 'ACTIVE' && (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMember(member.id, { role: e.target.value as 'ADMIN' | 'MEMBER' })}
                          className="px-2 py-1 text-xs border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      )}

                      {/* Status Toggle */}
                      {member.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleUpdateMember(member.id, { status: 'INACTIVE' })}
                          className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
                        >
                          Deactivate
                        </button>
                      )}
                      {member.status === 'INACTIVE' && (
                        <button
                          onClick={() => handleUpdateMember(member.id, { status: 'ACTIVE' })}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-500"
                        >
                          Activate
                        </button>
                      )}

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveMember(member.id, member.username)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};