import { OPRSpell } from '../types/oprBattle';



/**
 * Frontend service for managing faction-specific spell data from ArmyForge API
 */
export class SpellDataService {
  private static spellCache: Map<string, { spells: OPRSpell[], timestamp: number }> = new Map();
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  
  /**
   * Get available spells for a faction from backend API
   */
  static async getSpellsForFaction(factionName: string, gameSystem: number = 2): Promise<OPRSpell[]> {
    try {
      // Try to get from cache first
      const cacheKey = `spells_${factionName}_${gameSystem}`;
      const cached = this.spellCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        return cached.spells;
      }

      // Get token for API calls
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        return [];
      }

      // Fetch spell data from backend API
      const response = await fetch(`/api/spells/faction/${encodeURIComponent(factionName)}?gameSystem=${gameSystem}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch spells');
      }

      const spells = result.data.spells || [];
      
      // Cache for 1 hour
      this.spellCache.set(cacheKey, { spells, timestamp: Date.now() });
      
      return spells;
    } catch (error) {
      console.error('Error fetching spells for faction:', error);
      return [];
    }
  }




  /**
   * Get spell by ID (now checks cache and API)
   */
  static async getSpellById(spellId: string, factionName?: string): Promise<OPRSpell | undefined> {
    if (factionName) {
      const factionSpells = await this.getSpellsForFaction(factionName);
      return factionSpells.find(spell => spell.id === spellId);
    }
    
    // No fallback - return undefined if not found
    return undefined;
  }
}