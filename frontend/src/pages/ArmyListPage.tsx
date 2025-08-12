import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { armyApi } from '../api/client';
import type { Army } from '../types/api';
import { formatGameSystem } from '../utils/gameSystem';

export default function ArmyListPage() {
  const [armies, setArmies] = useState<Army[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArmies = async () => {
      try {
        const response = await armyApi.listArmies() as any;
        if (response.success) {
          setArmies(response.armies || []);
        } else {
          throw new Error(response.error || 'Failed to fetch armies');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch armies');
      } finally {
        setLoading(false);
      }
    };

    fetchArmies();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-4">My Armies</h1>
        </div>
        <div className="card text-center">
          <p className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Loading armies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-4">My Armies</h1>
        </div>
        <div className="card">
          <div className="bg-battle-status-routed/10 border border-battle-status-routed/20 text-battle-status-routed px-4 py-3 rounded-lg">
            <p className="font-medium">Error Loading Armies</p>
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
          <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-2">My Armies</h1>
          <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
            {armies.length} {armies.length === 1 ? 'army' : 'armies'} imported
          </p>
        </div>
        <Link to="/armies/import" className="btn-primary">
          Import Army
        </Link>
      </div>

      {/* Army List */}
      {armies.length === 0 ? (
        <div className="card text-center">
          <div className="py-12">
            <p className="text-xl text-battle-text-muted-light dark:text-battle-text-muted-dark mb-4">No armies imported yet</p>
            <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-6">
              Import your first army from ArmyForge to get started with battle tracking.
            </p>
            <Link to="/armies/import" className="btn-primary">
              Import Your First Army
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {armies.map((army) => (
            <div key={army.id} className="card hover:shadow-md transition-shadow">
              <div className="space-y-4">
                {/* Army Header */}
                <div>
                  <h3 className="text-lg font-semibold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-1">
                    {army.name}
                  </h3>
                  {army.description && (
                    <p className="text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark line-clamp-2">
                      {army.description}
                    </p>
                  )}
                </div>

                {/* Army Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Points:</span>
                    <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-1">
                      {army.list_points}/{army.points_limit}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Models:</span>
                    <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-1">
                      {army.model_count}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Activations:</span>
                    <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-1">
                      {army.activation_count}
                    </span>
                  </div>
                </div>

                {/* Army System */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-battle-accent-primary-light/10 dark:bg-battle-accent-primary-dark/10 text-battle-accent-primary-light dark:text-battle-accent-primary-dark">
                    {formatGameSystem(army.game_system)}
                  </span>
                  {army.campaign_mode && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-battle-text-muted-light/10 dark:bg-battle-text-muted-dark/10 text-battle-text-muted-light dark:text-battle-text-muted-dark">
                      Campaign
                    </span>
                  )}
                </div>

                {/* Validation Warnings */}
                {army.validation_errors && Array.isArray(army.validation_errors) && army.validation_errors.length > 0 && (
                  <div className="bg-battle-status-shaken/10 border border-battle-status-shaken/20 text-battle-status-shaken px-4 py-3 rounded-lg">
                    <p className="font-medium mb-2 text-sm">Validation Issues</p>
                    <ul className="text-xs space-y-1 opacity-90">
                      {army.validation_errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link 
                    to={`/armies/${army.id}`}
                    className="btn-secondary flex-1 text-center"
                  >
                    View Details
                  </Link>
                  <Link 
                    to={`/battles/new?army=${army.id}`}
                    className="btn-primary flex-1 text-center"
                  >
                    Start Battle
                  </Link>
                </div>

                {/* Army ID for debugging */}
                <div className="text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark border-t border-battle-border-light dark:border-battle-border-dark pt-2">
                  ID: {army.id} | ArmyForge: {army.armyforge_id}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}