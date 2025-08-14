import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { healthApi } from '../api/client';
import { VERSION } from '../utils/version';

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
        <h1 className="text-4xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-4">
          Welcome to BattleSync
        </h1>
        <p className="text-xl text-battle-text-secondary-light dark:text-battle-text-secondary-dark max-w-3xl mx-auto">
          Simple OPR battle tracker built for mobile-first gaming. 
          Import armies from ArmyForge and track unit health during battles.
        </p>
      </div>

      {/* Server Status */}
      <div className="card text-center">
        <h2 className="text-lg font-semibold mb-4">Server Status</h2>
        {loading ? (
          <p className="text-battle-text-muted-light dark:text-battle-text-muted-dark">Checking server...</p>
        ) : serverHealth ? (
          <div className="space-y-2">
            <p className="text-battle-status-normal font-medium">✅ Server Online</p>
            <p className="text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
              Version: {serverHealth.version}
            </p>
            <p className="text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark">
              Last checked: {new Date(serverHealth.timestamp).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-battle-status-routed font-medium">❌ Server Offline</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Import Army</h3>
          <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-4">
            Import your army from ArmyForge using a share link or ID.
          </p>
          <Link to="/armies/import" className="btn-primary">
            Import Army
          </Link>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Start Battle</h3>
          <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-4">
            Create a new battle session and track unit health.
          </p>
          <Link to="/battles/new" className="btn-primary">
            New Battle
          </Link>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">BattleAura Firmware</h3>
          <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-4">
            Flash BattleAura firmware directly to your ESP32 device via USB.
          </p>
          <Link to="/flash" className="btn-primary bg-orange-600 hover:bg-orange-700">
            Flash Firmware
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">My Armies</h3>
          <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-4">
            View and manage your imported armies.
          </p>
          <Link to="/armies" className="btn-secondary">
            View Armies
          </Link>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Recent Battles</h3>
          <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark mb-4">
            View your battle history and continue active battles.
          </p>
          <Link to="/battles" className="btn-secondary">
            View Battles
          </Link>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Recent Updates in v{VERSION}</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark mb-2">Latest Changes</h4>
            <ul className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark space-y-1">
              <li>• Centralized version management system</li>
              <li>• New logo and favicon implementation</li>
              <li>• Enhanced dark mode as default theme</li>
              <li>• Improved Docker deployment workflow</li>
            </ul>
          </div>
          <div className="text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark pt-2 border-t border-battle-border-light dark:border-battle-border-dark">
            <p>For complete version history and detailed changes, see the project changelog.</p>
          </div>
        </div>
      </div>

      {/* Core Features */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Core Features</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Battle Tracking</h4>
            <ul className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark space-y-1">
              <li>• Unit health management</li>
              <li>• Status effects tracking</li>
              <li>• Fatigue from melee</li>
              <li>• Spell token management</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">OPR Integration</h4>
            <ul className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark space-y-1">
              <li>• ArmyForge import</li>
              <li>• Combined unit merging</li>
              <li>• Campaign XP costs</li>
              <li>• Model-level tracking</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">Mobile Ready</h4>
            <ul className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark space-y-1">
              <li>• Touch-friendly interface</li>
              <li>• Responsive design</li>
              <li>• Battle-optimized dark theme</li>
              <li>• Fast performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}