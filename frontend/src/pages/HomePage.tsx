import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { healthApi } from '../api/client';

interface ServerHealth {
  status: string;
  version: string;
  timestamp: string;
}

export default function HomePage() {
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const health = await healthApi.getHealth() as any;
        setServerHealth(health);
      } catch (error) {
        console.error('Failed to check server health:', error);
      } finally {
        setLoading(false);
      }
    };

    checkServerHealth();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-300 mb-4">
          Welcome to BattleSync
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Simple OPR battle tracker built for mobile-first gaming. 
          Import armies from ArmyForge and track unit health during battles.
        </p>
      </div>

      {/* Server Status */}
      <div className="card text-center">
        <h2 className="text-lg font-semibold mb-4">Server Status</h2>
        {loading ? (
          <p className="text-gray-500">Checking server...</p>
        ) : serverHealth ? (
          <div className="space-y-2">
            <p className="text-green-600 font-medium">✅ Server Online</p>
            <p className="text-sm text-gray-600">
              Version: {serverHealth.version}
            </p>
            <p className="text-xs text-gray-500">
              Last checked: {new Date(serverHealth.timestamp).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-red-600 font-medium">❌ Server Offline</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Import Army</h3>
          <p className="text-gray-600 mb-4">
            Import your army from ArmyForge using a share link or ID.
          </p>
          <Link to="/armies/import" className="btn-primary">
            Import Army
          </Link>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Start Battle</h3>
          <p className="text-gray-600 mb-4">
            Create a new battle session and track unit health.
          </p>
          <Link to="/battles/new" className="btn-primary">
            New Battle
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">My Armies</h3>
          <p className="text-gray-600 mb-4">
            View and manage your imported armies.
          </p>
          <Link to="/armies" className="btn-secondary">
            View Armies
          </Link>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Recent Battles</h3>
          <p className="text-gray-600 mb-4">
            View your battle history and continue active battles.
          </p>
          <Link to="/battles" className="btn-secondary">
            View Battles
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">What's New in v2.10.0</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Battle Tracking</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Unit health management</li>
              <li>• Status effects tracking</li>
              <li>• Fatigue from melee</li>
              <li>• Spell token management</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">OPR Integration</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• ArmyForge import</li>
              <li>• Combined unit merging</li>
              <li>• Campaign XP costs</li>
              <li>• Model-level tracking</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Mobile Ready</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Touch-friendly interface</li>
              <li>• Responsive design</li>
              <li>• Offline capability</li>
              <li>• Fast performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}