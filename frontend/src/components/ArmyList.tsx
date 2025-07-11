import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArmySummary } from '../types/army';
import { ArmyCard } from './ArmyCard';

interface ArmyListProps {
  armies: ArmySummary[];
  onArmyDeleted: (armyId: string) => void;
  onRefresh: () => void;
}

export const ArmyList: React.FC<ArmyListProps> = ({
  armies,
  onArmyDeleted,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<{
    faction?: string;
    campaign?: string;
    hasCustomizations?: boolean;
    search?: string;
  }>({});

  // Get unique factions and campaigns for filtering
  const factions = Array.from(new Set(armies.map(army => army.faction))).sort();
  const campaigns = Array.from(new Set(
    armies.map(army => army.campaignId).filter(Boolean)
  ));

  // Filter armies based on current filters
  const filteredArmies = armies.filter(army => {
    if (filter.faction && army.faction !== filter.faction) return false;
    if (filter.campaign && army.campaignId !== filter.campaign) return false;
    if (filter.hasCustomizations !== undefined && army.hasCustomizations !== filter.hasCustomizations) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return army.name.toLowerCase().includes(searchLower) ||
             army.faction.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const handleViewArmy = (armyId: string) => {
    navigate(`/armies/${armyId}`);
  };

  if (armies.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-600 mb-4">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-400 mb-2">No Armies</h3>
        <p className="text-gray-500 mb-6">
          Connect to ArmyForge and import your first army to get started
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 bg-gray-800 p-4 rounded-lg">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search armies..."
              value={filter.search || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Faction Filter */}
          <div>
            <select
              value={filter.faction || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, faction: e.target.value || undefined }))}
              className="px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Factions</option>
              {factions.map(faction => (
                <option key={faction} value={faction}>{faction}</option>
              ))}
            </select>
          </div>

          {/* Campaign Filter */}
          <div>
            <select
              value={filter.campaign || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, campaign: e.target.value || undefined }))}
              className="px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Campaigns</option>
              <option value="null">No Campaign</option>
              {campaigns.map(campaignId => (
                <option key={campaignId || 'no-campaign'} value={campaignId || 'null'}>
                  Campaign {campaignId || 'None'}
                </option>
              ))}
            </select>
          </div>

          {/* Customizations Filter */}
          <div>
            <select
              value={filter.hasCustomizations === undefined ? '' : filter.hasCustomizations.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setFilter(prev => ({ 
                  ...prev, 
                  hasCustomizations: value === '' ? undefined : value === 'true'
                }));
              }}
              className="px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Armies</option>
              <option value="true">With Customizations</option>
              <option value="false">Stock Armies</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => setFilter({})}
            className="px-3 py-2 text-gray-400 hover:text-white text-sm"
          >
            Clear Filters
          </button>
        </div>

        {/* Results Count */}
        <div className="mt-2 text-sm text-gray-400">
          Showing {filteredArmies.length} of {armies.length} armies
        </div>
      </div>

      {/* Army Grid */}
      {filteredArmies.length === 0 ? (
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-400 mb-2">No armies match your filters</h3>
          <p className="text-gray-500">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArmies.map((army) => (
            <ArmyCard
              key={army.id}
              army={army}
              onView={() => handleViewArmy(army.id)}
              onDelete={() => onArmyDeleted(army.id)}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
};