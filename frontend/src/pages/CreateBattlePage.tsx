import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { battleApi, armyApi } from '../api/client';
import type { Army, CreateBattleRequest } from '../types/api';

export default function CreateBattlePage() {
  const [armies, setArmies] = useState<Army[]>([]);
  const [battleData, setBattleData] = useState<CreateBattleRequest>({
    name: '',
    description: '',
    mission_type: 'skirmish',
    has_command_points: true,
    command_point_mode: 'fixed',
    points_limit: 2000,
  });
  const [loading, setLoading] = useState(false);
  const [loadingArmies, setLoadingArmies] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchArmies = async () => {
      try {
        const response = await armyApi.listArmies() as any;
        if (response.success) {
          setArmies(response.armies || []);
        }
      } catch (err) {
        console.error('Failed to fetch armies:', err);
      } finally {
        setLoadingArmies(false);
      }
    };

    fetchArmies();

    // Pre-fill army if provided in URL params
    const armyId = searchParams.get('army');
    if (armyId) {
      // Could pre-select this army for the battle
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setBattleData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await battleApi.createBattle(battleData) as any;
      
      if (response.success) {
        navigate(`/battles/${response.battle.id}`);
      } else {
        throw new Error(response.error || 'Failed to create battle');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create battle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-4">
          Create New Battle
        </h1>
        <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
          Set up a new battle session to track unit health and battle progress.
        </p>
      </div>

      {/* Battle Creation Form */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Battle Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark mb-2">
            Battle Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={battleData.name}
            onChange={handleInputChange}
            placeholder="e.g., Patrol Mission Alpha, Siege of Hive City"
            className="input-field"
            required
            disabled={loading}
          />
        </div>

        {/* Battle Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={battleData.description || ''}
            onChange={handleInputChange}
            placeholder="Optional battle description or notes"
            rows={3}
            className="input-field"
            disabled={loading}
          />
        </div>

        {/* Mission Type */}
        <div>
          <label htmlFor="mission_type" className="block text-sm font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark mb-2">
            Mission Type
          </label>
          <select
            id="mission_type"
            name="mission_type"
            value={battleData.mission_type}
            onChange={handleInputChange}
            className="input-field"
            disabled={loading}
          >
            <option value="skirmish">Skirmish</option>
            <option value="battle">Battle</option>
            <option value="siege">Siege</option>
            <option value="patrol">Patrol</option>
            <option value="tournament">Tournament</option>
            <option value="campaign">Campaign</option>
          </select>
        </div>

        {/* Points Limit */}
        <div>
          <label htmlFor="points_limit" className="block text-sm font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark mb-2">
            Points Limit
          </label>
          <input
            type="number"
            id="points_limit"
            name="points_limit"
            value={battleData.points_limit}
            onChange={handleInputChange}
            min="100"
            step="50"
            className="input-field"
            required
            disabled={loading}
          />
          <div className="flex space-x-2 mt-2">
            {[500, 1000, 1500, 2000, 2500, 3000].map((points) => (
              <button
                key={points}
                type="button"
                onClick={() => setBattleData(prev => ({ ...prev, points_limit: points }))}
                className="btn-secondary text-xs"
                disabled={loading}
              >
                {points}
              </button>
            ))}
          </div>
        </div>

        {/* Command Points */}
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="has_command_points"
              name="has_command_points"
              checked={battleData.has_command_points}
              onChange={handleInputChange}
              className="rounded border-battle-border-light dark:border-battle-border-dark text-battle-accent-primary-light dark:text-battle-accent-primary-dark focus:ring-battle-accent-primary-light dark:focus:ring-battle-accent-primary-dark"
              disabled={loading}
            />
            <label htmlFor="has_command_points" className="ml-2 text-sm font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">
              Use Command Points
            </label>
          </div>

          {battleData.has_command_points && (
            <div>
              <label htmlFor="command_point_mode" className="block text-sm font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark mb-2">
                Command Point Mode
              </label>
              <select
                id="command_point_mode"
                name="command_point_mode"
                value={battleData.command_point_mode}
                onChange={handleInputChange}
                className="input-field"
                disabled={loading}
              >
                <option value="fixed">Fixed (set amount per round)</option>
                <option value="variable">Variable (dice roll each round)</option>
              </select>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !battleData.name.trim()}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Battle...' : 'Create Battle'}
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-battle-status-routed/10 border border-battle-status-routed/20 text-battle-status-routed px-4 py-3 rounded-lg">
            <p className="font-medium">Creation Failed</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </form>

      {/* Available Armies */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Available Armies</h3>
        {loadingArmies ? (
          <p className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Loading armies...</p>
        ) : armies.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-4">No armies available</p>
            <p className="text-sm text-battle-text-muted-light dark:text-battle-text-muted-dark mb-4">
              You'll need to import armies before you can add participants to battles.
            </p>
            <a href="/armies/import" className="btn-secondary">
              Import Armies
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-3">
              You have {armies.length} armies available to add as battle participants.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {armies.map((army) => (
                <div key={army.id} className="flex justify-between items-center p-2 bg-battle-surface-light dark:bg-battle-surface-dark rounded border border-battle-border-light dark:border-battle-border-dark">
                  <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">{army.name}</span>
                  <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark">{army.list_points}pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}