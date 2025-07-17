import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface PendingInvitation {
  id: string;
  name: string;
  description?: string;
  status: string;
  groupId: string;
  groupName: string;
  createdBy: string;
  participantCount: number;
  invitedAt: string;
  invitedBy?: string;
}

interface PendingInvitationsModalProps {
  onClose: () => void;
  onInvitationHandled?: () => void;
}

export const PendingInvitationsModal: React.FC<PendingInvitationsModalProps> = ({
  onClose,
  onInvitationHandled
}) => {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPendingCampaignInvitations();
      if (response.data.status === 'success') {
        setInvitations(response.data.data || []);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (campaignId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(campaignId));
      await apiClient.acceptCampaignInvitation(campaignId);
      
      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== campaignId));
      
      if (onInvitationHandled) {
        onInvitationHandled();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  };

  const handleDecline = async (campaignId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(campaignId));
      await apiClient.declineCampaignInvitation(campaignId);
      
      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== campaignId));
      
      if (onInvitationHandled) {
        onInvitationHandled();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to decline invitation');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-900 text-green-200 border-green-600';
      case 'PLANNING': return 'bg-blue-900 text-blue-200 border-blue-600';
      case 'COMPLETED': return 'bg-gray-900 text-gray-200 border-gray-600';
      default: return 'bg-yellow-900 text-yellow-200 border-yellow-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Pending Campaign Invitations</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
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

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading invitations...</div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-lg mb-4">No pending invitations</div>
            <p className="text-gray-500 text-sm">
              You'll see campaign invitations here when other players invite you to join their campaigns.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => {
              const isProcessing = processingIds.has(invitation.id);
              
              return (
                <div key={invitation.id} className="bg-gray-700 p-6 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{invitation.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(invitation.status)}`}>
                          {invitation.status}
                        </span>
                      </div>
                      
                      {invitation.description && (
                        <p className="text-gray-300 text-sm mb-3">{invitation.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Group:</span>
                          <span className="text-white ml-2">{invitation.groupName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Created by:</span>
                          <span className="text-white ml-2">{invitation.createdBy}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Participants:</span>
                          <span className="text-white ml-2">{invitation.participantCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Invited:</span>
                          <span className="text-white ml-2">
                            {new Date(invitation.invitedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => handleDecline(invitation.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Decline'}
                    </button>
                    <button
                      onClick={() => handleAccept(invitation.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Accept'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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