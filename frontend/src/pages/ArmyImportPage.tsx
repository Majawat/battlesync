import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { armyApi } from '../api/client';

export default function ArmyImportPage() {
  const [armyForgeId, setArmyForgeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const extractIdFromUrl = (input: string): string => {
    // Match ?id=... or ?listId=... anywhere in the string
    const match = input.match(/[?&](?:id|listId)=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }

    // No match? Assume it's already just an ID
    return input.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const cleanId = extractIdFromUrl(armyForgeId);
      if (!cleanId) {
        throw new Error('Please enter a valid ArmyForge ID or URL');
      }

      const response = await armyApi.importArmy({ armyForgeId: cleanId }) as any;
      
      if (response.success) {
        setSuccess(`Successfully imported army: ${response.army.name}`);
        setArmyForgeId('');
        // Redirect to armies list after 1.5 seconds
        setTimeout(() => {
          navigate('/armies');
        }, 1500);
      } else {
        throw new Error(response.error || 'Import failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to import army');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-battle-text-primary-light dark:text-battle-text-primary-dark mb-4">
          Import Army from ArmyForge
        </h1>
        <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
          Import your army list from ArmyForge using either a share URL or direct army ID.
        </p>
      </div>

      {/* Import Form */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label htmlFor="armyForgeId" className="block text-sm font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark mb-2">
            ArmyForge URL or ID
          </label>
          <input
            type="text"
            id="armyForgeId"
            value={armyForgeId}
            onChange={(e) => setArmyForgeId(e.target.value)}
            placeholder="https://army-forge.onepagerules.com/share?id=... or just the ID"
            className="input-field"
            required
            disabled={loading}
          />
          <p className="text-xs text-battle-text-muted-light dark:text-battle-text-muted-dark mt-1">
            Paste the full share URL or just the army ID
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !armyForgeId.trim()}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing Army...' : 'Import Army'}
        </button>

        {/* Status Messages */}
        {error && (
          <div className="bg-battle-status-routed/10 border border-battle-status-routed/20 text-battle-status-routed px-4 py-3 rounded-lg">
            <p className="font-medium">Import Failed</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-battle-status-normal/10 border border-battle-status-normal/20 text-battle-status-normal px-4 py-3 rounded-lg">
            <p className="font-medium">Import Successful!</p>
            <p className="text-sm">{success}</p>
            <p className="text-xs mt-1">Redirecting to armies page...</p>
          </div>
        )}
      </form>

      {/* Help + Examples Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Help Section */}
        <div className="card flex-1">
          <h3 className="text-lg font-semibold mb-3">How to Import</h3>
          <ol className="space-y-3 text-sm text-battle-text-secondary-light dark:text-battle-text-secondary-dark list-decimal list-inside">
            <li>
              <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">
                Create Army in ArmyForge
              </span>
              <p>
                Visit{" "}
                <a
                  href="https://army-forge.onepagerules.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-battle-accent-primary-light dark:text-battle-accent-primary-dark hover:underline"
                >
                  army-forge.onepagerules.com
                </a>{" "}
                and build your army list.
              </p>
            </li>
            <li>
              <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">
                Share Your Army
              </span>
              <p>Click the options menu at the top right, then click Share as Link to get a shareable URL.</p>
            </li>
            <li>
              <span className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">
                Import to BattleSync
              </span>
              <p>Paste the full URL or just the ID portion into the field above.</p>
            </li>
          </ol>
        </div>

        {/* Example IDs */}
        <div className="card flex-1">
          <h3 className="text-lg font-semibold mb-3">Test with Sample Armies</h3>
          <div className="space-y-3 text-sm">
            {[
              {
                name: "Dev Test Army",
                desc: "Sample army for testing",
                id: "IJ1JM_m-jmka",
              },
              {
                name: "The Ashen Pact",
                desc: "Cody's actual army",
                id: "vMzljLVC6ZGv",
              },
              {
                name: "van Louen's Roughnecks",
                desc: "Alex's bullshit army",
                id: "Xo19MAwQPGbs",
              },
              {
                name: "Hive Fleet Tarvos",
                desc: "Claire's army",
                id: "Un3_pRTu2xBO",
              },
              {
                name: "Galdoo'o naahlk wildigitkw",
                desc: "Victoria's army",
                id: "OKOrilTDQs6P",
              },
            ].map((army) => (
              <div
                key={army.id}
                className="flex justify-between items-center p-3 bg-battle-border-light dark:bg-battle-border-dark rounded-lg"
              >
                <div>
                  <p className="font-medium text-battle-text-primary-light dark:text-battle-text-primary-dark">
                    {army.name}
                  </p>
                  <p className="text-battle-text-secondary-light dark:text-battle-text-secondary-dark">
                    {army.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setArmyForgeId(
                      `https://army-forge.onepagerules.com/share?id=${army.id}`
                    )
                  }
                  className="btn-secondary text-xs"
                >
                  Use This ID
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}