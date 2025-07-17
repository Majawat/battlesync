import { OPRSpell } from '../types/oprBattle';

interface ArmyForgeSpell {
  id: string;
  name: string;
  type: number; // 0 = offensive, 1 = blessing, 2 = curse
  effect: string;
  threshold: number; // Token cost
  spellbookId: string;
  effectSkirmish?: string;
}

interface ArmyForgeBook {
  spells: ArmyForgeSpell[];
  factionId: string;
  factionName: string;
  uid: string;
}

/**
 * Backend service for managing faction-specific spell data from ArmyForge API
 */
export class SpellDataService {
  private static spellCache: Map<string, { spells: OPRSpell[], timestamp: number }> = new Map();
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  
  /**
   * Get available spells for a faction from ArmyForge API
   */
  static async getSpellsForFaction(factionName: string, gameSystem: number = 2): Promise<OPRSpell[]> {
    try {
      // Try to get from cache first
      const cacheKey = `spells_${factionName}_${gameSystem}`;
      const cached = this.spellCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        return cached.spells;
      }

      // Get faction army book data
      const armyBookId = await this.getFactionArmyBookId(factionName, gameSystem);
      if (!armyBookId) {
        console.warn(`No army book found for faction: ${factionName}`);
        return [];
      }

      // Fetch spell data from ArmyForge
      const spells = await this.fetchSpellsFromArmyForge(armyBookId, gameSystem);
      
      // Cache for 1 hour
      this.spellCache.set(cacheKey, { spells, timestamp: Date.now() });
      
      return spells;
    } catch (error) {
      console.error('Error fetching spells for faction:', error);
      return [];
    }
  }

  /**
   * Get spells for faction by armyId
   */
  static async getSpellsForArmyId(armyId: string, gameSystem: number = 2): Promise<OPRSpell[]> {
    try {
      // Try to get from cache first
      const cacheKey = `spells_armyId_${armyId}_${gameSystem}`;
      const cached = this.spellCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        return cached.spells;
      }

      // Use armyId directly as army book ID
      const spells = await this.fetchSpellsFromArmyForge(armyId, gameSystem);
      
      // Cache for 1 hour
      this.spellCache.set(cacheKey, { spells, timestamp: Date.now() });
      
      return spells;
    } catch (error) {
      console.error('Error fetching spells for armyId:', error);
      return [];
    }
  }

  /**
   * Get faction army book ID from faction name (legacy method)
   */
  private static async getFactionArmyBookId(factionName: string, _gameSystem: number): Promise<string | null> {
    // Import FactionResolver dynamically
    const { FactionResolver } = await import('./factionResolver');
    
    // Try to find armyId by faction name (reverse lookup)
    const allFactions = FactionResolver.getAllFactions();
    const faction = allFactions.find(f => 
      f.factionName.toLowerCase() === factionName.toLowerCase()
    );
    
    return faction?.armyBookId || null;
  }

  /**
   * Fetch spells from ArmyForge API
   */
  private static async fetchSpellsFromArmyForge(armyBookId: string, gameSystem: number): Promise<OPRSpell[]> {
    const response = await fetch(`https://army-forge.onepagerules.com/api/army-books/${armyBookId}?gameSystem=${gameSystem}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch army book: ${response.statusText}`);
    }

    const armyBook = await response.json() as ArmyForgeBook;
    
    return armyBook.spells.map(spell => this.convertArmyForgeSpell(spell));
  }

  /**
   * Convert ArmyForge spell format to our OPRSpell format
   */
  private static convertArmyForgeSpell(armyForgeSpell: ArmyForgeSpell): OPRSpell {
    const spellType = this.getSpellTypeInfo(armyForgeSpell.type);
    
    return {
      id: armyForgeSpell.id,
      name: armyForgeSpell.name,
      cost: armyForgeSpell.threshold,
      range: this.extractRange(armyForgeSpell.effect),
      targets: this.extractTargets(armyForgeSpell.effect),
      effect: armyForgeSpell.effect,
      duration: this.determineDuration(armyForgeSpell.effect),
      hits: this.extractHits(armyForgeSpell.effect),
      armorPiercing: this.extractAP(armyForgeSpell.effect),
      modifiers: this.extractModifiers(armyForgeSpell.effect, spellType)
    };
  }

  /**
   * Get spell type information
   */
  private static getSpellTypeInfo(type: number): { name: string; category: 'offensive' | 'blessing' | 'curse' } {
    switch (type) {
      case 0: return { name: 'Offensive', category: 'offensive' };
      case 1: return { name: 'Blessing', category: 'blessing' };
      case 2: return { name: 'Curse', category: 'curse' };
      default: return { name: 'Unknown', category: 'offensive' };
    }
  }

  /**
   * Extract range from spell effect text
   */
  private static extractRange(effect: string): string {
    const rangeMatch = effect.match(/within (\d+[^"\s]*)/i);
    return rangeMatch ? rangeMatch[1] : 'Touch';
  }

  /**
   * Extract targets from spell effect text
   */
  private static extractTargets(effect: string): string {
    if (effect.includes('Target 2 friendly units')) return '2 friendly units';
    if (effect.includes('Target 2 enemy units')) return '2 enemy units';
    if (effect.includes('Target enemy unit')) return '1 enemy unit';
    if (effect.includes('Target enemy model')) return '1 enemy model';
    if (effect.includes('Target friendly unit')) return '1 friendly unit';
    if (effect.match(/Target \d+ friendly units/)) {
      const match = effect.match(/Target (\d+) friendly units/);
      return match ? `${match[1]} friendly units` : '1 unit';
    }
    if (effect.match(/Target \d+ enemy units/)) {
      const match = effect.match(/Target (\d+) enemy units/);
      return match ? `${match[1]} enemy units` : '1 unit';
    }
    return '1 unit';
  }

  /**
   * Extract number of hits from spell effect
   */
  private static extractHits(effect: string): number | undefined {
    const hitsMatch = effect.match(/takes (\d+) hits/i);
    if (hitsMatch) return parseInt(hitsMatch[1]);
    
    const hitsEachMatch = effect.match(/take (\d+) hits each/i);
    if (hitsEachMatch) return parseInt(hitsEachMatch[1]);
    
    return undefined;
  }

  /**
   * Extract armor piercing value from spell effect
   */
  private static extractAP(effect: string): number | undefined {
    const apMatch = effect.match(/AP\((\d+)\)/i);
    return apMatch ? parseInt(apMatch[1]) : undefined;
  }

  /**
   * Determine spell duration from effect text
   */
  private static determineDuration(effect: string): 'instant' | 'next-action' | 'end-of-round' | 'permanent' {
    if (effect.includes('next time')) return 'next-action';
    if (effect.includes('takes') && effect.includes('hits')) return 'instant';
    return 'instant';
  }

  /**
   * Extract modifiers from spell effect
   */
  private static extractModifiers(effect: string, _spellType: { category: string }): any[] {
    const modifiers = [];
    
    // Look for defense modifiers
    if (effect.includes('-1 to defense rolls')) {
      modifiers.push({
        type: 'debuff',
        stat: 'defense',
        value: -1,
        condition: 'next time they take hits'
      });
    }
    
    // Look for range modifiers
    if (effect.includes('+18" range')) {
      modifiers.push({
        type: 'buff',
        stat: 'range',
        value: 18,
        condition: 'next time they shoot'
      });
    }
    
    // Look for poison
    if (effect.includes('get Poison')) {
      modifiers.push({
        type: 'buff',
        stat: 'attacks',
        value: 0, // Special rule
        condition: 'next time they fight in melee'
      });
    }
    
    return modifiers;
  }

  /**
   * Get spell by ID 
   */
  static async getSpellById(spellId: string, factionName?: string): Promise<OPRSpell | undefined> {
    if (factionName) {
      const factionSpells = await this.getSpellsForFaction(factionName);
      return factionSpells.find(spell => spell.id === spellId);
    }
    
    // No fallback - return undefined if not found
    return undefined;
  }

  /**
   * Get available caster tokens from an army (for cooperative casting)
   */
  static getAvailableCasters(army: any, excludeUnitId?: string): Array<{unitId: string, modelId?: string, tokens: number, name: string}> {
    const casters: Array<{unitId: string, modelId?: string, tokens: number, name: string}> = [];
    
    for (const unit of army.units) {
      if (unit.unitId === excludeUnitId) continue;
      
      // Check unit models for casters
      for (const model of unit.models) {
        if (model.casterTokens > 0) {
          casters.push({
            unitId: unit.unitId,
            modelId: model.modelId,
            tokens: model.casterTokens,
            name: `${unit.name} - ${model.name}`
          });
        }
      }
      
      // Check joined hero for caster tokens
      if (unit.joinedHero && unit.joinedHero.casterTokens > 0) {
        casters.push({
          unitId: unit.unitId,
          modelId: unit.joinedHero.modelId,
          tokens: unit.joinedHero.casterTokens,
          name: `${unit.name} - ${unit.joinedHero.name} (Hero)`
        });
      }
    }
    
    return casters;
  }
}