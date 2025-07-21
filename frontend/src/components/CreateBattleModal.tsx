import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mission } from '../types/mission';
import { Army } from '../types/army';

interface CreateBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | { id: string; campaignId: string; name?: string; title?: string; missionNumber?: number; number?: number; points?: number; description?: string; };
  onBattleCreated: (battleId: string) => void;
}

interface BattleParticipant {
  userId: string;
  armyId: string;
  username: string;
  armyName: string;
}

export const CreateBattleModal: React.FC<CreateBattleModalProps> = ({
  isOpen,
  onClose,
  mission,
  onBattleCreated
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableArmies, setAvailableArmies] = useState<Army[]>([]);
  const [participants, setParticipants] = useState<BattleParticipant[]>([]);
  const [selectedArmyId, setSelectedArmyId] = useState<string>('');

  // Fetch available armies for the campaign
  useEffect(() => {
    if (isOpen && mission.campaignId) {
      fetchAvailableArmies();
    }
  }, [isOpen, mission.campaignId]);

  const fetchAvailableArmies = async () => {
    try {
      const response = await fetch(`/api/armies?campaignId=${mission.campaignId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch armies');
      }

      const data = await response.json();
      setAvailableArmies(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch armies');
    }
  };

  const addParticipant = () => {
    if (!selectedArmyId || !user) return;

    const selectedArmy = availableArmies.find(army => army.id === selectedArmyId);
    if (!selectedArmy) return;

    // Check if this army is already added
    if (participants.some(p => p.armyId === selectedArmyId)) {
      setError('This army is already participating in the battle');
      return;
    }

    const newParticipant: BattleParticipant = {
      userId: user.id,
      armyId: selectedArmyId,
      username: user.username,
      armyName: selectedArmy.name
    };

    setParticipants([...participants, newParticipant]);
    setSelectedArmyId('');
    setError(null);
  };

  const removeParticipant = (armyId: string) => {
    setParticipants(participants.filter(p => p.armyId !== armyId));
  };

  const createBattle = async () => {
    if (participants.length < 1) {
      setError('At least 1 army is required for a battle');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/opr/battles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          missionId: mission.id,
          participants: participants.map(p => ({
            userId: p.userId,
            armyId: p.armyId
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create battle');
      }

      const data = await response.json();
      console.log('Battle creation response:', data); // Debug log
      if (data.success && data.data && data.data.battleId) {
        onBattleCreated(data.data.battleId);
      } else {
        throw new Error('Invalid battle creation response');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create battle');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-lg md:max-w-2xl mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">
          Create Battle for {mission.name || mission.title}
        </h2>

        {error && (
          <div className="bg-red-900 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Mission Info */}
        <div className="bg-gray-700 rounded p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Mission Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
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

        {/* Add Participant Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Add Armies to Battle</h3>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              value={selectedArmyId}
              onChange={(e) => setSelectedArmyId(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="">Select an army...</option>
              {availableArmies.filter(army => 
                !participants.some(p => p.armyId === army.id)
              ).map(army => (
                <option key={army.id} value={army.id}>
                  {army.name}</option>
              ))}
            </select>
            <button
              onClick={addParticipant}
              disabled={!selectedArmyId}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Add Army
            </button>
          </div>
        </div>

        {/* Current Participants */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Battle Participants ({participants.length})
          </h3>
          {participants.length === 0 ? (
            <p className="text-gray-400 text-sm">No armies added yet. Add at least 1 army to start a battle.</p>
          ) : (
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div key={participant.armyId} className="flex items-center justify-between bg-gray-700 rounded p-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-medium">
                      Army {index + 1}: {participant.armyName}
                    </span>
                    <span className="text-gray-400 text-sm">
                      (Owner: {participant.username})
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

        {/* Available Armies Info */}
        {availableArmies.length === 0 && (
          <div className="bg-yellow-900 text-yellow-200 p-3 rounded mb-4">
            No armies available for this campaign. Players need to import armies before creating battles.
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={createBattle}
            disabled={loading || participants.length < 1}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded order-1 sm:order-2"
          >
            {loading ? 'Creating...' : `Create Battle (${participants.length} ${participants.length === 1 ? 'army' : 'armies'})`}
          </button>
        </div>
      </div>
    </div>
  );
};