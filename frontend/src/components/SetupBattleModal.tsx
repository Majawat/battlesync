import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mission } from '../types/mission';
import { ArmySummary } from '../types/army';

interface SetupBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | { id: string; campaignId: string; name?: string; title?: string; missionNumber?: number; number?: number; points?: number; description?: string; };
  onBattleSetup: (battleId: string) => void;
}

interface BattleParticipant {
  userId: string;
  armyId: string;
  username: string;
  armyName: string;
}

export const SetupBattleModal: React.FC<SetupBattleModalProps> = ({
  isOpen,
  onClose,
  mission,
  onBattleSetup
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableArmies, setAvailableArmies] = useState<ArmySummary[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<BattleParticipant[]>([]);
  const [selectedArmyId, setSelectedArmyId] = useState<string>('');

  // Fetch all campaign armies for setup
  useEffect(() => {
    if (isOpen && mission.campaignId) {
      fetchCampaignArmies();
    }
  }, [isOpen, mission.campaignId]);

  const fetchCampaignArmies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/armies/campaign/${mission.campaignId}/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaign armies');
      }

      const data = await response.json();
      setAvailableArmies(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign armies');
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = () => {
    if (!selectedArmyId) return;

    const selectedArmy = availableArmies.find(army => army.id === selectedArmyId);
    if (!selectedArmy) return;

    // Check if this army is already added
    if (selectedParticipants.some(p => p.armyId === selectedArmyId)) {
      setError('This army is already participating in the battle');
      return;
    }

    const newParticipant: BattleParticipant = {
      userId: selectedArmy.userId || '',
      armyId: selectedArmyId,
      username: selectedArmy.username || 'Unknown',
      armyName: selectedArmy.name
    };

    setSelectedParticipants([...selectedParticipants, newParticipant]);
    setSelectedArmyId('');
    setError(null);
  };

  const removeParticipant = (armyId: string) => {
    setSelectedParticipants(selectedParticipants.filter(p => p.armyId !== armyId));
  };

  const setupBattle = async () => {
    if (selectedParticipants.length < 2) {
      setError('At least 2 armies are required for a battle');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/opr/battles/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          missionId: mission.id,
          participants: selectedParticipants.map(p => ({
            userId: p.userId,
            armyId: p.armyId
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to setup battle');
      }

      const data = await response.json();
      if (data.success && data.data && data.data.battleId) {
        onBattleSetup(data.data.battleId);
      } else {
        throw new Error('Invalid battle setup response');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup battle');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">
          Setup Battle for {mission.name || mission.title}
        </h2>

        {error && (
          <div className="bg-red-900 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Mission Info */}
        <div className="bg-gray-700 rounded p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Mission Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Mission:</span>
              <span className="text-white ml-2">#{mission.missionNumber || mission.number} {mission.name || mission.title}</span>
            </div>
            <div>
              <span className="text-gray-400">Points:</span>
              <span className="text-white ml-2">{mission.points || 'N/A'}</span>
            </div>
          </div>
          {mission.description && (
            <p className="text-gray-300 text-sm mt-2">{mission.description}</p>
          )}
        </div>

        {/* Available Armies */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Available Campaign Armies</h3>
          <div className="bg-gray-700 rounded p-4 max-h-40 overflow-y-auto">
            {loading ? (
              <div className="text-gray-400">Loading armies...</div>
            ) : availableArmies.length === 0 ? (
              <div className="text-gray-400">No armies available in this campaign</div>
            ) : (
              <div className="space-y-2">
                {availableArmies.map(army => (
                  <div key={army.id} className="flex items-center justify-between p-2 bg-gray-600 rounded">
                    <div className="flex-1">
                      <span className="text-white font-medium">{army.name}</span>
                      <span className="text-gray-400 ml-2">- {army.points}pts</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Owner: {army.username || 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Participant Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Select Battle Participants</h3>
          <div className="flex space-x-3 mb-4">
            <select
              value={selectedArmyId}
              onChange={(e) => setSelectedArmyId(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="">Select an army...</option>
              {availableArmies.filter(army => 
                !selectedParticipants.some(p => p.armyId === army.id)
              ).map(army => (
                <option key={army.id} value={army.id}>
                  {army.name} ({army.username}) - {army.points}pts
                </option>
              ))}
            </select>
            <button
              onClick={addParticipant}
              disabled={!selectedArmyId}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Add Army
            </button>
          </div>
        </div>

        {/* Selected Participants */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Battle Participants ({selectedParticipants.length})
          </h3>
          {selectedParticipants.length === 0 ? (
            <p className="text-gray-400 text-sm">No armies selected yet. Add at least 2 armies to setup a battle.</p>
          ) : (
            <div className="space-y-2">
              {selectedParticipants.map((participant, index) => (
                <div key={participant.armyId} className="flex items-center justify-between bg-gray-700 rounded p-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-medium">
                      {participant.armyName}
                    </span>
                    <span className="text-gray-400 text-sm">
                      (Player: {participant.username})
                    </span>
                  </div>
                  <button
                    onClick={() => removeParticipant(participant.armyId)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={setupBattle}
            disabled={loading || selectedParticipants.length < 2}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded"
          >
            {loading ? 'Setting up...' : `Setup Battle (${selectedParticipants.length} armies)`}
          </button>
        </div>
      </div>
    </div>
  );
};