import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { battleApi } from '../api/client';
import type { Battle } from '../types/api';

export default function BattleListPage() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBattles = async () => {
      try {
        const response = await battleApi.listBattles() as any;
        if (response.success) {
          setBattles(response.battles || []);
        } else {
          throw new Error(response.error || 'Failed to fetch battles');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch battles');
      } finally {
        setLoading(false);
      }
    };

    fetchBattles();
  }, []);

  const getStatusColor = (status: Battle['status']) => {
    switch (status) {
      case 'setup': return 'bg-battle-accent-primary-light/10 dark:bg-battle-accent-primary-dark/10 text-battle-accent-primary-light dark:text-battle-accent-primary-dark';
      case 'deployment': return 'bg-battle-status-shaken/10 text-battle-status-shaken';
      case 'active': return 'bg-battle-status-normal/10 text-battle-status-normal';
      case 'finished': return 'bg-battle-text-muted-light/10 dark:bg-battle-text-muted-dark/10 text-battle-text-muted-light dark:text-battle-text-muted-dark';
      default: return 'bg-battle-text-muted-light/10 dark:bg-battle-text-muted-dark/10 text-battle-text-muted-light dark:text-battle-text-muted-dark';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-4">Battle History</h1>
        </div>
        <div className="card text-center">
          <p className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Loading battles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-4">Battle History</h1>
        </div>
        <div className="card">
          <div className="bg-battle-status-routed/10 border border-battle-status-routed/20 text-battle-status-routed px-4 py-3 rounded-lg">
            <p className="font-medium">Error Loading Battles</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-2">Battle History</h1>
          <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
            {battles.length} {battles.length === 1 ? 'battle' : 'battles'} created
          </p>
        </div>
        <Link to="/battles/new" className="btn-primary">
          New Battle
        </Link>
      </div>

      {/* Battle List */}
      {battles.length === 0 ? (
        <div className="card text-center">
          <div className="py-12">
            <p className="text-xl text-battle-text-muted-light dark:text-battle-text-muted-dark mb-4">No battles created yet</p>
            <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-6">
              Create your first battle to start tracking unit health and battle progress.
            </p>
            <Link to="/battles/new" className="btn-primary">
              Create Your First Battle
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {battles.map((battle) => (
            <div key={battle.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                {/* Battle Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-battle-text-primary-light dark:text-battle-text-primary-dark">
                      {battle.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(battle.status)}`}>
                      {battle.status}
                    </span>
                  </div>

                  {battle.description && (
                    <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark text-sm">
                      {battle.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-battle-text-muted-light dark:text-battle-text-muted-dark">
                    <span>Mission: {battle.mission_type}</span>
                    <span>•</span>
                    <span>Points: {battle.points_limit}</span>
                    <span>•</span>
                    <span>Round: {battle.current_round}</span>
                    {battle.has_command_points && (
                      <>
                        <span>•</span>
                        <span>CP: {battle.command_point_mode}</span>
                      </>
                    )}
                  </div>

                  {/* Participants */}
                  {battle.participants && battle.participants.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-battle-text-primary-light dark:text-battle-text-primary-dark font-medium">Players:</span>
                      <div className="flex space-x-2">
                        {battle.participants.map((participant) => (
                          <span 
                            key={participant.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-battle-surface-light dark:bg-battle-surface-dark text-battle-text-secondary-light dark:text-battle-text-secondary-dark border border-battle-border-light dark:border-battle-border-dark"
                          >
                            {participant.player_name}
                            {participant.doctrine && ` (${participant.doctrine})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Battle Actions */}
                <div className="flex items-center space-x-3">
                  <div className="text-right text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark">
                    <p>Created: {new Date(battle.created_at).toLocaleDateString()}</p>
                    <p>Updated: {new Date(battle.updated_at).toLocaleDateString()}</p>
                  </div>
                  
                  <Link 
                    to={`/battles/${battle.id}`}
                    className="btn-primary whitespace-nowrap"
                  >
                    {battle.status === 'setup' ? 'Setup Battle' : 
                     battle.status === 'finished' ? 'View Results' : 'Continue Battle'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}