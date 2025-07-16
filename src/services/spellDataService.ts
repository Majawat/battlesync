import { OPRSpell } from '../types/oprBattle';

/**
 * Service for managing faction-specific spell data
 */
export class SpellDataService {
  
  /**
   * Get available spells for a faction
   */
  static getSpellsForFaction(faction: string): OPRSpell[] {
    const normalizedFaction = faction.toLowerCase().replace(/[^a-z]/g, '');
    
    switch (normalizedFaction) {
      case 'blessedsisters':
      case 'blessed':
      case 'sisters':
        return this.getBlessedSistersSpells();
      case 'soulsnatchercults':
      case 'soulsnatcher':
      case 'cults':
        return this.getSoulSnatcherCultsSpells();
      default:
        return this.getGenericSpells();
    }
  }

  /**
   * Get spell by ID
   */
  static getSpellById(spellId: string): OPRSpell | undefined {
    const allSpells = [
      ...this.getBlessedSistersSpells(),
      ...this.getSoulSnatcherCultsSpells(),
      ...this.getGenericSpells()
    ];
    
    return allSpells.find(spell => spell.id === spellId);
  }

  /**
   * Blessed Sisters faction spells
   */
  private static getBlessedSistersSpells(): OPRSpell[] {
    return [
      {
        id: 'blessed-holy-tears',
        name: 'Holy Tears',
        cost: 1,
        range: '12"',
        targets: '2 friendly units',
        effect: 'Target units get Poison next time they fight in melee',
        duration: 'next-action',
        modifiers: [
          {
            type: 'buff',
            stat: 'attacks',
            value: 0, // Poison special rule
            condition: 'next time they fight in melee'
          }
        ]
      },
      {
        id: 'blessed-eternal-flame',
        name: 'Eternal Flame',
        cost: 1,
        range: '12"',
        targets: '1 enemy unit',
        effect: 'Target takes 4 hits',
        duration: 'instant',
        hits: 4
      },
      {
        id: 'blessed-heretics',
        name: 'Heretics',
        cost: 2,
        range: '18"',
        targets: '2 enemy units',
        effect: 'Targets get -1 to defense rolls next time they take hits',
        duration: 'next-action',
        modifiers: [
          {
            type: 'debuff',
            stat: 'defense',
            value: -1,
            condition: 'next time they take hits'
          }
        ]
      },
      {
        id: 'blessed-admonition',
        name: 'Admonition',
        cost: 2,
        range: '12"',
        targets: '1 enemy model',
        effect: 'Target takes 2 hits with AP(4)',
        duration: 'instant',
        hits: 2,
        armorPiercing: 4
      },
      {
        id: 'blessed-litanies',
        name: 'Litanies',
        cost: 3,
        range: '12"',
        targets: '2 friendly units',
        effect: 'Targets get +18" range next time they shoot',
        duration: 'next-action',
        modifiers: [
          {
            type: 'buff',
            stat: 'range',
            value: 18,
            condition: 'next time they shoot'
          }
        ]
      },
      {
        id: 'blessed-righteous-wrath',
        name: 'Righteous Wrath',
        cost: 3,
        range: '12"',
        targets: '2 enemy units',
        effect: 'Each target takes 6 hits',
        duration: 'instant',
        hits: 6
      }
    ];
  }

  /**
   * Soul-Snatcher Cults faction spells
   */
  private static getSoulSnatcherCultsSpells(): OPRSpell[] {
    return [
      {
        id: 'cultist-dark-blessing',
        name: 'Dark Blessing',
        cost: 1,
        range: '12"',
        targets: '1 friendly unit',
        effect: 'Target gets +1 to hit rolls next time they attack',
        duration: 'next-action',
        modifiers: [
          {
            type: 'buff',
            stat: 'quality',
            value: 1,
            condition: 'next time they attack'
          }
        ]
      },
      {
        id: 'cultist-soul-drain',
        name: 'Soul Drain',
        cost: 2,
        range: '18"',
        targets: '1 enemy unit',
        effect: 'Target takes 3 hits and loses 1 tough for the rest of the battle',
        duration: 'permanent',
        hits: 3,
        modifiers: [
          {
            type: 'debuff',
            stat: 'tough',
            value: -1,
            condition: 'permanent'
          }
        ]
      },
      {
        id: 'cultist-chaos-bolt',
        name: 'Chaos Bolt',
        cost: 2,
        range: '24"',
        targets: '1 enemy unit',
        effect: 'Target takes D3+2 hits with AP(2)',
        duration: 'instant',
        hits: 4, // Average of D3+2
        armorPiercing: 2
      }
    ];
  }

  /**
   * Generic spells for factions without specific spell lists
   */
  private static getGenericSpells(): OPRSpell[] {
    return [
      {
        id: 'generic-mystic-bolt',
        name: 'Mystic Bolt',
        cost: 1,
        range: '18"',
        targets: '1 enemy unit',
        effect: 'Target takes 3 hits',
        duration: 'instant',
        hits: 3
      },
      {
        id: 'generic-ward',
        name: 'Ward',
        cost: 1,
        range: '12"',
        targets: '1 friendly unit',
        effect: 'Target gets +1 to defense rolls next time they are attacked',
        duration: 'next-action',
        modifiers: [
          {
            type: 'buff',
            stat: 'defense',
            value: 1,
            condition: 'next time they are attacked'
          }
        ]
      },
      {
        id: 'generic-dispel',
        name: 'Dispel',
        cost: 2,
        range: '18"',
        targets: '1 unit',
        effect: 'Remove all active spell effects from target',
        duration: 'instant'
      }
    ];
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