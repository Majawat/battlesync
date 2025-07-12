import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BattleDashboard } from './BattleDashboard';

export const BattleRoute: React.FC = () => {
  const { battleId } = useParams<{ battleId: string }>();
  const navigate = useNavigate();

  if (!battleId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Invalid battle ID</div>
      </div>
    );
  }

  return (
    <BattleDashboard 
      battleId={battleId} 
      onExit={() => navigate(-1)}
    />
  );
};