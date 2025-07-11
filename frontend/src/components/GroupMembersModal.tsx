import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface GroupMember {
  id: string;
  userId: string;
  username: string;
  email: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REMOVED';
  joinedAt: string;
  invitedBy?: string;
  invitedAt?: string;
  campaignCount: number;
  totalBattles: number;
}

interface GroupMembersModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
  userRole: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  groupId,
  groupName,
  onClose,
  userRole
}) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviting, setInviting] = useState(false);

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';

  useEffect(() => {
    loadMembers();
  }, [groupId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getGroupMembers(groupId);
      if (response.data?.status === 'success') {
        setMembers(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Failed to load members');
      }
    } catch (err: any) {
      console.error('Failed to load group members:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;

    try {
      setInviting(true);
      setError(null);
      
      const response = await apiClient.inviteMemberToGroup(groupId, {
        username: inviteUsername.trim(),
        role: inviteRole
      });

      if (response.data?.status === 'success') {
        setInviteUsername('');
        setInviteRole('MEMBER');
        await loadMembers(); // Reload to show new member
      } else {
        throw new Error(response.data?.message || 'Failed to invite member');
      }
    } catch (err: any) {
      console.error('Failed to invite member:', err);
      setError(err.response?.data?.message || err.message || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateMember = async (membershipId: string, updates: { role?: 'ADMIN' | 'MEMBER'; status?: 'ACTIVE' | 'INACTIVE' }) => {
    try {
      setError(null);
      const response = await apiClient.updateGroupMember(groupId, membershipId, updates);
      
      if (response.data?.status === 'success') {
        await loadMembers(); // Reload to show updates
      } else {
        throw new Error(response.data?.message || 'Failed to update member');
      }
    } catch (err: any) {
      console.error('Failed to update member:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update member');
    }
  };

  const handleRemoveMember = async (membershipId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from the group?`)) {
      return;
    }

    try {
      setError(null);
      const response = await apiClient.removeGroupMember(groupId, membershipId);
      
      if (response.data?.status === 'success') {
        await loadMembers(); // Reload to show removal
      } else {
        throw new Error(response.data?.message || 'Failed to remove member');
      }
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      setError(err.response?.data?.message || err.message || 'Failed to remove member');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'text-purple-600 bg-purple-100';
      case 'ADMIN': return 'text-blue-600 bg-blue-100';
      case 'MEMBER': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'INACTIVE': return 'text-gray-600 bg-gray-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Group Members - {groupName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Invite Member Form */}
          {canManage && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Invite New Member</h3>
              <form onSubmit={handleInviteMember} className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-48">
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={inviting}
                  />
                </div>
                <div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={inviting}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={inviting || !inviteUsername.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'Inviting...' : 'Invite'}
                </button>
              </form>
            </div>
          )}

          {/* Members List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">Loading members...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Members ({members.length})
              </h3>
              
              {members.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No members found.</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {member.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{member.username}</h4>
                            <p className="text-sm text-gray-500">{member.email}</p>
                            <p className="text-xs text-gray-400">
                              Joined {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Stats */}
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Campaigns: {member.campaignCount}</p>
                            <p className="text-xs text-gray-500">Battles: {member.totalBattles}</p>
                          </div>

                          {/* Role Badge */}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>

                          {/* Status Badge */}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(member.status)}`}>
                            {member.status}
                          </span>

                          {/* Actions */}
                          {canManage && member.role !== 'OWNER' && (
                            <div className="flex space-x-2">
                              {/* Role Toggle */}
                              <button
                                onClick={() => handleUpdateMember(member.id, { 
                                  role: member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' 
                                })}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                              >
                                {member.role === 'ADMIN' ? 'Make Member' : 'Make Admin'}
                              </button>

                              {/* Status Toggle */}
                              {member.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleUpdateMember(member.id, { status: 'INACTIVE' })}
                                  className="text-xs px-2 py-1 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200"
                                >
                                  Deactivate
                                </button>
                              )}
                              {member.status === 'INACTIVE' && (
                                <button
                                  onClick={() => handleUpdateMember(member.id, { status: 'ACTIVE' })}
                                  className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                                >
                                  Activate
                                </button>
                              )}

                              {/* Remove */}
                              <button
                                onClick={() => handleRemoveMember(member.id, member.username)}
                                className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};