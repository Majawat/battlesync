import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { armyApi } from '../api/client';
import type { Army } from '../types/api';

export default function ArmyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [army, setArmy] = useState<Army | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchArmy = async () => {
      try {
        const response = await armyApi.getArmy(id) as any;
        if (response.success) {
          setArmy(response.army);
        } else {
          throw new Error(response.error || 'Failed to fetch army');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch army');
      } finally {
        setLoading(false);
      }
    };

    fetchArmy();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="card text-center">
          <p className="text-gray-500">Loading army details...</p>
        </div>
      </div>
    );
  }

  if (error || !army) {
    return (
      <div className="space-y-8">
        <div className="card">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error Loading Army</p>
            <p className="text-sm">{error || 'Army not found'}</p>
          </div>
          <div className="mt-4">
            <Link to="/armies" className="btn-secondary">
              Back to Armies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-2">
            <Link to="/armies" className="btn-secondary">
              ← Back
            </Link>
            <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark">
              {army.name}
            </h1>
          </div>
          
          {army.description && (
            <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-4">
              {army.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
            <span>Game System: {army.game_system}</span>
            <span>•</span>
            <span>Points: {army.list_points}/{army.points_limit}</span>
            <span>•</span>
            <span>Models: {army.model_count}</span>
            <span>•</span>
            <span>Activations: {army.activation_count}</span>
            {army.campaign_mode && (
              <>
                <span>•</span>
                <span>Campaign Mode</span>
              </>
            )}
          </div>
        </div>

        <div className="flex space-x-3">
          <Link 
            to={`/battles/new?army=${army.id}`}
            className="btn-primary"
          >
            Start Battle
          </Link>
        </div>
      </div>

      {/* Validation Warnings */}
      {army.validation_errors && Array.isArray(army.validation_errors) && army.validation_errors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <p className="font-medium mb-2">Validation Issues</p>
          <ul className="text-sm space-y-1">
            {army.validation_errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Army Units */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Units ({army.units?.length || 0})</h2>
        
        {!army.units || army.units.length === 0 ? (
          <p className="text-gray-500">No units found in this army.</p>
        ) : (
          <div className="space-y-6">
            {army.units.map((unit, index) => (
              <div key={unit.id || index} className="unit-card">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-battle-text-primary-light dark:text-battle-text-primary-dark">
                      {unit.name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark mt-1">
                      <span>Size: {unit.size}</span>
                      <span>•</span>
                      <span>Quality: {unit.quality}+</span>
                      <span>•</span>
                      <span>Defense: {unit.defense}+</span>
                      <span>•</span>
                      <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">{unit.cost} pts</span>
                    </div>
                  </div>
                </div>

                {/* Sub-units */}
                {unit.sub_units && unit.sub_units.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Sub-units:</h4>
                    {unit.sub_units.map((subUnit, subIndex) => (
                      <div key={subUnit.id || subIndex} className="ml-4 p-3 bg-battle-surface-light dark:bg-battle-surface-dark rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">{subUnit.name}</h5>
                          <div className="text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
                            Size: {subUnit.size} | Q: {subUnit.quality}+ | D: {subUnit.defense}+
                          </div>
                        </div>

                        {/* Models */}
                        {subUnit.models && subUnit.models.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-2">Models ({subUnit.models.length}):</p>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                              {subUnit.models.map((model, modelIndex) => (
                                <div key={model.id || modelIndex} className="text-xs bg-battle-bg-light dark:bg-battle-bg-dark p-2 rounded border border-battle-border-light dark:border-battle-border-dark">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">{model.name}</span>
                                    <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark">{model.cost} pts</span>
                                  </div>
                                  <div className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mt-1">
                                    Tough: {model.max_tough} | Q: {model.quality}+ | D: {model.defense}+
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Unit without sub-units - show basic info */}
                {(!unit.sub_units || unit.sub_units.length === 0) && (
                  <div className="mt-3 text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
                    <p>Basic unit - no detailed model breakdown available</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Army Metadata */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Army Information</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Army ID:</span>
            <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-2">{army.id}</span>
          </div>
          <div>
            <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">ArmyForge ID:</span>
            <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-2">{army.armyforge_id}</span>
          </div>
          <div>
            <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Points Used:</span>
            <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-2">{army.list_points} / {army.points_limit}</span>
          </div>
          <div>
            <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Total Models:</span>
            <span className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark ml-2">{army.model_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}