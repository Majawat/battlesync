import React, { useState } from 'react';
import { JoinGroupRequest } from '../types/gamingGroup';

interface JoinGroupModalProps {
  onClose: () => void;
  onSubmit: (data: JoinGroupRequest) => Promise<void>;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<JoinGroupRequest>({
    inviteCode: '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert to uppercase and limit to 8 characters
    const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, [name]: cleanValue }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Join Gaming Group</h2>
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

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="inviteCode">
              Invite Code *
            </label>
            <input
              id="inviteCode"
              name="inviteCode"
              type="text"
              value={formData.inviteCode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500 font-mono text-center text-lg tracking-wider"
              placeholder="XXXXXXXX"
              required
              maxLength={8}
            />
            <div className="text-xs text-gray-400 mt-1">
              Enter the 8-character invite code shared by the group owner
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-2">How to get an invite code:</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Ask the group owner for their invite code</li>
              <li>• The code is 8 characters (letters and numbers)</li>
              <li>• Each group has a unique invite code</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-4">
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
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={loading || formData.inviteCode.length !== 8}
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};