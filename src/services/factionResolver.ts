/**
 * Service for resolving faction names from armyIds
 */
export class FactionResolver {
  private static readonly ARMY_ID_TO_FACTION: Record<string, string> = {
    // Grimdark Future factions
    'zz3kp5ry7ks6mxcx': 'Soul-Snatcher Cults',
    'z65fgu0l29i4lnlu': 'Human Defense Force', 
    '7oi8zeiqfamiur21': 'Blessed Sisters',
    'BKi_hJaJflN8ZorH': 'Jackals',
    // Add more as needed when we encounter them
  };

  private static readonly ARMY_ID_TO_ARMY_BOOK_ID: Record<string, string> = {
    // These map to the army book IDs used in the ArmyForge API for spells
    'zz3kp5ry7ks6mxcx': 'zz3kp5ry7ks6mxcx', // Soul-Snatcher Cults
    'z65fgu0l29i4lnlu': 'z65fgu0l29i4lnlu', // Human Defense Force
    '7oi8zeiqfamiur21': '7oi8zeiqfamiur21', // Blessed Sisters
    'BKi_hJaJflN8ZorH': 'BKi_hJaJflN8ZorH', // Jackals
  };

  /**
   * Resolve faction name from armyId
   */
  static getFactionName(armyId: string): string | null {
    return this.ARMY_ID_TO_FACTION[armyId] || null;
  }

  /**
   * Get army book ID for spell fetching from armyId
   */
  static getArmyBookId(armyId: string): string | null {
    return this.ARMY_ID_TO_ARMY_BOOK_ID[armyId] || null;
  }

  /**
   * Get all known factions
   */
  static getAllFactions(): Array<{ armyId: string; factionName: string; armyBookId: string }> {
    return Object.keys(this.ARMY_ID_TO_FACTION).map(armyId => ({
      armyId,
      factionName: this.ARMY_ID_TO_FACTION[armyId],
      armyBookId: this.ARMY_ID_TO_ARMY_BOOK_ID[armyId]
    }));
  }

  /**
   * Add new faction mapping (for future extensibility)
   */
  static addFactionMapping(armyId: string, factionName: string, armyBookId?: string): void {
    this.ARMY_ID_TO_FACTION[armyId] = factionName;
    if (armyBookId) {
      this.ARMY_ID_TO_ARMY_BOOK_ID[armyId] = armyBookId;
    }
  }
}