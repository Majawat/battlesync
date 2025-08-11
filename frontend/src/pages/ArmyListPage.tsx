import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { armyApi } from '../api/client';
import type { Army } from '../types/api';

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
          <h1 className="text-3xl font-bold text-gray-300 mb-4">My Armies</h1>
        </div>
        <div className="card text-center">
          <p className="text-gray-500">Loading armies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-300 mb-4">My Armies</h1>
        </div>
        <div className="card">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
          <h1 className="text-3xl font-bold text-gray-300 mb-2">My Armies</h1>
          <p className="text-gray-600">
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
            <p className="text-xl text-gray-500 mb-4">No armies imported yet</p>
            <p className="text-gray-600 mb-6">
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
                  <h3 className="text-lg font-semibold text-gray-300 mb-1">
                    {army.name}
                  </h3>
                  {army.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {army.description}
                    </p>
                  )}
                </div>

                {/* Army Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Points:</span>
                    <span className="text-gray-600 ml-1">
                      {army.list_points}/{army.points_limit}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Models:</span>
                    <span className="text-gray-600 ml-1">
                      {army.model_count}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Activations:</span>
                    <span className="text-gray-600 ml-1">
                      {army.activation_count}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Game System:</span>
                    <span className="text-gray-600 ml-1 text-xs">
                      {army.game_system || 'OPR'}
                    </span>
                  </div>
                </div>

                {/* Army System */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {army.game_system}
                  </span>
                  {army.campaign_mode && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Campaign
                    </span>
                  )}
                </div>

                {/* Validation Warnings */}
                {army.validation_errors && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-xs">
                    <p className="font-medium">Validation Issues</p>
                    <p className="line-clamp-2">{army.validation_errors}</p>
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
                <div className="text-xs text-gray-400 border-t pt-2">
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