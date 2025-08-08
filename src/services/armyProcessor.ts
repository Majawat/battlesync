import { ArmyForgeArmy, ArmyForgeUnit, ArmyForgeWeapon, ArmyForgeRule } from '../types/armyforge';
import { ProcessedArmy, ProcessedUnit, ProcessedSubUnit, ProcessedWeapon, ProcessedRule, ProcessedModel, ProcessedModelUpgrade } from '../types/internal';

export class ArmyProcessor {
  /**
   * Process raw ArmyForge data into BattleSync internal format
   * Handles Combined and Joined unit merging according to OPR rules
   */
  public static processArmy(armyForgeData: ArmyForgeArmy): ProcessedArmy {
    // Step 1: Process individual units into sub-units, preserving original data
    const allUnitsWithOriginal = armyForgeData.units.map(unit => ({
      processed: this.processArmyForgeUnit(unit),
      original: unit
    }));
    
    // Step 2: Handle Combined units (merge units with same ID and combined=true)
    const unitsAfterCombining = this.processCombinedUnits(allUnitsWithOriginal);
    
    // Step 3: Handle Joined units (heroes joining regular units)
    const finalUnits = this.processJoinedUnits(unitsAfterCombining);
    
    // Step 4: Calculate total army cost
    const totalCost = finalUnits.reduce((sum, unit) => sum + unit.total_cost, 0);
    const totalModels = finalUnits.reduce((sum, unit) => sum + unit.model_count, 0);

    // Check for army-level validation issues
    const hasArmyValidationIssues = armyForgeData.forceOrgErrors && armyForgeData.forceOrgErrors.length > 0;
    const validationNotes = hasArmyValidationIssues ? 
      `ARMY VALIDATION: ${armyForgeData.forceOrgErrors?.join(', ')}` : '';

    return {
      id: '', // Will be set when saving to database
      armyforge_id: armyForgeData.id,
      name: armyForgeData.name,
      description: validationNotes ? 
        `${armyForgeData.description || ''}${armyForgeData.description ? ' | ' : ''}${validationNotes}`.trim() :
        armyForgeData.description,
      points_limit: armyForgeData.pointsLimit,
      list_points: totalCost, // Use our calculated total
      model_count: totalModels,
      activation_count: finalUnits.length,
      game_system: armyForgeData.gameSystem,
      campaign_mode: armyForgeData.campaignMode,
      units: finalUnits,
      raw_armyforge_data: JSON.stringify(armyForgeData)
    };
  }

  /**
   * Process a single ArmyForge unit into a processed sub-unit
   */
  private static processArmyForgeUnit(unit: ArmyForgeUnit): ProcessedSubUnit {
    const isHero = unit.rules.some(rule => rule.name === 'Hero');
    const isCaster = unit.rules.some(rule => rule.name === 'Caster') || 
                    unit.items?.some(item => item.content?.some(rule => rule.name === 'Caster')) ||
                    unit.selectedUpgrades.some(upgrade => 
                      upgrade.option.label.toLowerCase().includes('caster') ||
                      upgrade.option.label.toLowerCase().includes('witch')
                    );
    
    const casterRule = unit.rules.find(rule => rule.name === 'Caster') ||
                      unit.items?.find(item => item.content?.find(rule => rule.name === 'Caster'))?.content?.find(rule => rule.name === 'Caster');
    
    const casterRating = casterRule?.rating ? parseInt(casterRule.rating.toString()) : undefined;

    // Check for validation issues from ArmyForge
    const hasValidationIssues = !unit.valid || unit.hasBalanceInvalid || 
                               (unit.disabledSections && unit.disabledSections.length > 0) || 
                               (unit.disabledUpgradeSections && unit.disabledUpgradeSections.length > 0);

    return {
      id: unit.selectionId,
      armyforge_unit_id: unit.id,
      name: unit.name,
      custom_name: unit.customName || undefined,
      quality: this.calculateAdjustedQuality(unit.quality, unit.loadout),
      defense: this.calculateAdjustedDefense(unit.defense, unit.loadout),
      size: unit.size,
      cost: this.calculateUnitCost(unit),
      is_hero: isHero,
      is_caster: this.hasCasterAbility(unit.rules, unit.loadout),
      caster_rating: this.getCasterRating(unit.rules, unit.loadout),
      xp: unit.xp,
      traits: unit.traits,
      base_sizes: unit.bases,
      weapons: this.processLoadoutWeapons(unit.loadout),
      rules: this.processEnhancedRules(unit.rules, unit.loadout),
      items: this.processLoadoutItems(unit.loadout),
      models: this.generateModelsWithWeapons(unit),
      notes: hasValidationIssues ? 
        `${unit.notes || ''}${unit.notes ? ' | ' : ''}VALIDATION: ${!unit.valid ? 'Invalid unit' : ''}${unit.hasBalanceInvalid ? ' Balance invalid' : ''}${unit.disabledSections && unit.disabledSections.length > 0 ? ` Disabled sections: ${unit.disabledSections.join(', ')}` : ''}`.trim() :
        unit.notes || undefined
    };
  }

  /**
   * Calculate true unit cost including all upgrades and campaign level costs
   * Uses unit-specific costs from the costs array
   */
  private static calculateUnitCost(unit: ArmyForgeUnit): number {
    const baseCost = unit.cost;
    
    const upgradeCosts = unit.selectedUpgrades
      .map(upgrade => {
        // Find the cost entry that matches this unit's ID
        const costEntry = upgrade.option.costs.find(c => c.unitId === unit.id);
        return costEntry ? costEntry.cost : 0;
      })
      .reduce((sum, cost) => sum + cost, 0);
    
    // Campaign level costs: 25pts per level for regular units, 55pts for heroes
    const isHero = unit.rules.some(rule => rule.name === 'Hero');
    const levels = Math.floor(unit.xp / 5); // 5 XP = 1 level
    const levelCosts = levels * (isHero ? 55 : 25);
    
    return baseCost + upgradeCosts + levelCosts;
  }

  /**
   * Process Combined units - merge units with same ID and combined=true
   */
  private static processCombinedUnits(unitsWithOriginal: { processed: ProcessedSubUnit; original: ArmyForgeUnit }[]): { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }[] {
    const combinedGroups = new Map<string, { processed: ProcessedSubUnit; original: ArmyForgeUnit }[]>();
    const regularUnits: { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }[] = [];

    unitsWithOriginal.forEach(unitData => {
      const original = unitData.original;
      
      // Check if this is part of a combined unit (same armyforge ID and combined flag)
      if (original.combined) {
        const groupKey = original.id; // Use unit ID as group key
        if (!combinedGroups.has(groupKey)) {
          combinedGroups.set(groupKey, []);
        }
        combinedGroups.get(groupKey)!.push(unitData);
      } else {
        regularUnits.push({ ...unitData, isCombined: false });
      }
    });

    // Merge combined units
    combinedGroups.forEach((group, groupKey) => {
      if (group.length > 1) {
        // Multiple units with same ID - merge them
        const mergedProcessed = this.mergeCombinedSubUnits(group.map(g => g.processed));
        // Mark as combined and store merged unit
        mergedProcessed.id = mergedProcessed.id + '_combined'; // Ensure unique ID
        const firstOriginal = group[0]!.original;
        regularUnits.push({ processed: mergedProcessed, original: firstOriginal, isCombined: true });
      } else if (group.length === 1) {
        // Single unit marked as combined but no duplicates - treat as regular
        regularUnits.push({ ...group[0]!, isCombined: false });
      }
    });

    return regularUnits;
  }

  /**
   * Merge multiple sub-units into a single combined unit
   */
  private static mergeCombinedSubUnits(subUnits: ProcessedSubUnit[]): ProcessedSubUnit {
    if (subUnits.length === 0) throw new Error('Cannot merge empty sub-units array');
    
    const baseUnit = subUnits[0]!;
    const totalCost = subUnits.reduce((sum, unit) => sum + unit.cost, 0);
    const totalSize = subUnits.reduce((sum, unit) => sum + unit.size, 0);
    const allModels = subUnits.flatMap(unit => unit.models);
    const totalXp = subUnits.reduce((sum, unit) => sum + unit.xp, 0);
    
    // Merge weapons from all sub-units
    const allWeapons = subUnits.flatMap(unit => unit.weapons);
    const mergedWeapons = this.mergeWeapons(allWeapons);

    return {
      id: baseUnit.id,
      armyforge_unit_id: baseUnit.armyforge_unit_id,
      name: baseUnit.name,
      custom_name: baseUnit.custom_name,
      quality: baseUnit.quality,
      defense: baseUnit.defense,
      size: totalSize,
      cost: totalCost,
      is_hero: baseUnit.is_hero,
      is_caster: baseUnit.is_caster,
      caster_rating: baseUnit.caster_rating,
      xp: totalXp,
      traits: baseUnit.traits,
      base_sizes: baseUnit.base_sizes,
      weapons: mergedWeapons,
      rules: baseUnit.rules,
      items: baseUnit.items,
      models: allModels,
      notes: baseUnit.notes
    };
  }

  /**
   * Merge weapons with same name by combining their counts
   */
  private static mergeWeapons(weapons: ProcessedWeapon[]): ProcessedWeapon[] {
    const weaponMap = new Map<string, ProcessedWeapon>();
    
    weapons.forEach(weapon => {
      const existing = weaponMap.get(weapon.name);
      if (existing) {
        existing.count += weapon.count;
      } else {
        weaponMap.set(weapon.name, { ...weapon });
      }
    });
    
    return Array.from(weaponMap.values());
  }

  /**
   * Process Joined units - heroes joining regular units
   */
  private static processJoinedUnits(unitsWithOriginal: { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }[]): ProcessedUnit[] {
    const processedUnits: ProcessedUnit[] = [];
    const joinedHeroes = new Map<string, { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }>(); 
    const joinTargets = new Map<string, { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }>();

    // First pass: identify joined units and their targets using original ArmyForge data
    unitsWithOriginal.forEach(unitData => {
      const original = unitData.original;
      
      if (original.joinToUnit) {
        // This unit joins another unit
        joinedHeroes.set(original.joinToUnit, unitData);
      } else {
        // Check if this unit is a target for joining (has no joinToUnit but might be referenced)
        joinTargets.set(original.selectionId, unitData);
      }
    });

    // Second pass: create joined units and standalone units
    joinTargets.forEach((targetUnitData, targetSelectionId) => {
      const joiningHero = joinedHeroes.get(targetSelectionId);
      
      if (joiningHero) {
        // This target unit has a hero joining it
        processedUnits.push(this.createJoinedUnit(targetUnitData.processed, joiningHero.processed));
      } else {
        // Standalone unit
        const isCombined = targetUnitData.isCombined || false;
        processedUnits.push(this.createStandaloneUnit(targetUnitData.processed, isCombined));
      }
    });

    // Handle any heroes that couldn't find their target (shouldn't happen with valid data)
    joinedHeroes.forEach((heroData, targetId) => {
      if (!joinTargets.has(targetId)) {
        console.warn(`Hero ${heroData.processed.name} trying to join non-existent unit ${targetId}, treating as standalone`);
        processedUnits.push(this.createStandaloneUnit(heroData.processed));
      }
    });

    return processedUnits;
  }

  /**
   * Create a standalone unit (no joining)
   */
  private static createStandaloneUnit(subUnit: ProcessedSubUnit, isCombined = false): ProcessedUnit {
    // Always prioritize custom name over regular name
    const displayName = subUnit.custom_name || subUnit.name;
    
    return {
      id: subUnit.id,
      army_id: '', // Will be set when saving
      armyforge_unit_ids: [subUnit.armyforge_unit_id],
      name: displayName,
      custom_name: subUnit.custom_name,
      quality: subUnit.quality,
      defense: subUnit.defense,
      total_cost: subUnit.cost,
      model_count: subUnit.size,
      is_combined: isCombined,
      is_joined: false,
      has_hero: subUnit.is_hero,
      has_caster: subUnit.is_caster,
      sub_units: [subUnit],
      notes: subUnit.notes
    };
  }

  /**
   * Create a joined unit (hero + regular unit)
   */
  private static createJoinedUnit(regularUnit: ProcessedSubUnit, heroUnit: ProcessedSubUnit): ProcessedUnit {
    // Use custom names for display, format as "Hero w/ Unit"
    const heroDisplayName = heroUnit.custom_name || heroUnit.name;
    const unitDisplayName = regularUnit.custom_name || regularUnit.name;
    const joinedName = `${heroDisplayName} w/ ${unitDisplayName}`;
    
    return {
      id: regularUnit.id, // Use regular unit's ID as primary
      army_id: '', // Will be set when saving
      armyforge_unit_ids: [regularUnit.armyforge_unit_id, heroUnit.armyforge_unit_id],
      name: joinedName,
      custom_name: joinedName, // Use the joined name as custom name
      quality: heroUnit.quality, // Use hero's quality
      defense: regularUnit.defense, // Use regular unit's defense
      total_cost: regularUnit.cost + heroUnit.cost,
      model_count: regularUnit.size + heroUnit.size,
      is_combined: false,
      is_joined: true,
      has_hero: true,
      has_caster: heroUnit.is_caster || regularUnit.is_caster,
      sub_units: [regularUnit, heroUnit],
      notes: [regularUnit.notes, heroUnit.notes].filter(Boolean).join('; ') || undefined
    };
  }

  /**
   * Process ArmyForge weapons into internal format
   */
  private static processWeapons(weapons: any[]): ProcessedWeapon[] {
    return weapons.map(weapon => ({
      id: weapon.id || weapon.weaponId || `${weapon.name?.toLowerCase().replace(' ', '_')}_weapon`,
      name: weapon.name,
      count: weapon.count || 1,
      range: weapon.range,
      attacks: weapon.attacks,
      ap: (weapon.specialRules || []).find((rule: any) => rule.name === 'AP')?.rating as number || 0,
      special_rules: (weapon.specialRules || []).map((rule: any) => ({
        name: rule.name,
        value: rule.rating
      }))
    }));
  }

  /**
   * Process weapons from loadout (final equipment after upgrades)
   */
  private static processLoadoutWeapons(loadout: any[]): ProcessedWeapon[] {
    const weapons = loadout.filter(item => item.type === 'ArmyBookWeapon');
    const weaponItems = loadout.filter(item => 
      item.type === 'ArmyBookItem' && 
      item.content && 
      item.content.some((c: any) => c.type === 'ArmyBookWeapon')
    );
    
    // Process regular weapons
    const regularWeapons = this.processWeapons(weapons);
    
    // Extract weapons from items with weapon content
    const embeddedWeapons = weaponItems.flatMap(item => this.extractWeaponsFromItem(item));
    
    return [...regularWeapons, ...embeddedWeapons];
  }

  /**
   * Process enhanced rules combining base rules + loadout item rules
   */
  private static processEnhancedRules(baseRules: ArmyForgeRule[], loadout: any[]): ProcessedRule[] {
    const processedBaseRules = this.processRules(baseRules);
    const loadoutRules = this.extractRulesFromLoadout(loadout);
    
    // Merge and handle rule stacking
    return this.mergeAndStackRules(processedBaseRules, loadoutRules);
  }

  /**
   * Process items from loadout 
   */
  private static processLoadoutItems(loadout: any[]): ProcessedRule[] {
    const items = loadout.filter(item => item.type === 'ArmyBookItem');
    return items.map(item => ({
      name: item.name,
      type: 'upgrade' as const,
      rating: undefined,
      description: item.label || item.name
    }));
  }

  /**
   * Check if unit has caster ability from rules or loadout
   */
  private static hasCasterAbility(baseRules: ArmyForgeRule[], loadout: any[]): boolean {
    // Check base rules
    const baseCaster = baseRules.some(rule => rule.name.toLowerCase().includes('caster'));
    
    // Check loadout items
    const loadoutCaster = loadout.some(item => 
      item.label && item.label.toLowerCase().includes('caster')
    );
    
    return baseCaster || loadoutCaster;
  }

  /**
   * Get caster rating from rules or loadout
   */
  private static getCasterRating(baseRules: ArmyForgeRule[], loadout: any[]): number | undefined {
    // Check base rules first
    const baseCasterRule = baseRules.find(rule => rule.name.toLowerCase().includes('caster'));
    if (baseCasterRule?.rating) return typeof baseCasterRule.rating === 'number' ? baseCasterRule.rating : parseInt(baseCasterRule.rating as string);
    
    // Check loadout items
    const casterItem = loadout.find(item => 
      item.label && item.label.toLowerCase().includes('caster')
    );
    
    if (casterItem?.label) {
      // Extract rating from label like "Witch (Caster(2))"
      const match = casterItem.label.match(/caster\((\d+)\)/i);
      return match ? parseInt(match[1]) : undefined;
    }
    
    return undefined;
  }

  /**
   * Extract weapons from complex items like Weapon Team using structured content
   */
  private static extractWeaponsFromItem(item: any): ProcessedWeapon[] {
    if (!item.content) return [];
    
    // Extract weapons from the content array
    const weapons = item.content.filter((content: any) => content.type === 'ArmyBookWeapon');
    
    return this.processWeapons(weapons);
  }


  /**
   * Extract rules from loadout items
   */
  private static extractRulesFromLoadout(loadout: any[]): ProcessedRule[] {
    const rules: ProcessedRule[] = [];
    
    loadout.forEach(item => {
      if (item.type === 'ArmyBookItem' && item.label) {
        // Extract rules from item labels
        
        // Caster rules
        const casterMatch = item.label.match(/Caster\((\d+)\)/i);
        if (casterMatch) {
          rules.push({
            name: 'Caster',
            type: 'ability' as const,
            rating: parseInt(casterMatch[1]),
            description: `Caster(${casterMatch[1]})`
          });
        }
        
        // Fast rule
        if (item.label.includes('Fast')) {
          rules.push({
            name: 'Fast',
            type: 'ability' as const,
            rating: undefined,
            description: 'Fast'
          });
        }
        
        // Tough rules (for stacking)
        const toughMatch = item.label.match(/Tough\((\d+)\)/);
        if (toughMatch) {
          rules.push({
            name: 'Tough',
            type: 'ability' as const,
            rating: parseInt(toughMatch[1]),
            description: `Tough(${toughMatch[1]})`
          });
        }
        
        // Impact rules (for stacking like Great Grinder)
        const impactMatch = item.label.match(/Impact\((\d+)\)/);
        if (impactMatch) {
          rules.push({
            name: 'Impact',
            type: 'ability' as const,
            rating: parseInt(impactMatch[1]),
            description: `Impact(${impactMatch[1]})`
          });
        }
        
        // Defense rules (for stat improvement - handled separately in calculateAdjustedDefense)
        const defenseMatch = item.label.match(/Defense\((\d+)\)/);
        if (defenseMatch) {
          rules.push({
            name: 'Defense',
            type: 'ability' as const,
            rating: parseInt(defenseMatch[1]),
            description: `Defense(${defenseMatch[1]})`
          });
        }
        
        // Quality rules (for stat improvement - handled separately in calculateAdjustedQuality)
        const qualityMatch = item.label.match(/Quality\((\d+)\)/);
        if (qualityMatch) {
          rules.push({
            name: 'Quality',
            type: 'ability' as const,
            rating: parseInt(qualityMatch[1]),
            description: `Quality(${qualityMatch[1]})`
          });
        }
        
        // Shield Wall (from Combat Shield content)
        if (item.name === 'Combat Shield' || (item.content && item.content.some((c: any) => c.name === 'Shield Wall'))) {
          rules.push({
            name: 'Shield Wall',
            type: 'ability' as const,
            rating: undefined,
            description: 'Shield Wall'
          });
        }
      }
    });
    
    return rules;
  }

  /**
   * Merge base rules with loadout rules, handling stacking
   */
  private static mergeAndStackRules(baseRules: ProcessedRule[], loadoutRules: ProcessedRule[]): ProcessedRule[] {
    const ruleMap = new Map<string, ProcessedRule>();
    
    // Add base rules first
    baseRules.forEach(rule => {
      ruleMap.set(rule.name, { ...rule });
    });
    
    // Process loadout rules with stacking logic
    loadoutRules.forEach(loadoutRule => {
      const existing = ruleMap.get(loadoutRule.name);
      
      if (existing && existing.rating !== undefined && loadoutRule.rating !== undefined) {
        // Stack numeric rules like Tough(3) + Tough(3) = Tough(6) or Impact(3) + Impact(5) = Impact(8)
        if (loadoutRule.name === 'Tough' || loadoutRule.name === 'Impact') {
          const existingValue = typeof existing.rating === 'number' ? existing.rating : parseInt(existing.rating as string);
          const loadoutValue = typeof loadoutRule.rating === 'number' ? loadoutRule.rating : parseInt(loadoutRule.rating as string);
          existing.rating = existingValue + loadoutValue;
          existing.description = `${loadoutRule.name}(${existing.rating})`;
        } else {
          // For most other rules, loadout overrides base
          ruleMap.set(loadoutRule.name, { ...loadoutRule });
        }
      } else {
        // Add new rule from loadout
        ruleMap.set(loadoutRule.name, { ...loadoutRule });
      }
    });
    
    return Array.from(ruleMap.values());
  }

  /**
   * Calculate adjusted Quality from base quality and loadout upgrades
   * Quality upgrades IMPROVE by lowering the number (Q5+ -> Q4+ is better)
   */
  private static calculateAdjustedQuality(baseQuality: number, loadout: any[]): number {
    let adjustment = 0;
    
    // Check loadout items for Quality upgrades
    loadout.forEach(item => {
      if (item.type === 'ArmyBookItem' && item.content) {
        // Check content array for Quality rules (this is the proper way)
        const hasQualityInContent = item.content.some((content: any) => 
          content.type === 'ArmyBookRule' && content.name === 'Quality'
        );
        
        if (hasQualityInContent) {
          item.content.forEach((content: any) => {
            if (content.type === 'ArmyBookRule' && content.name === 'Quality') {
              const value = typeof content.rating === 'number' ? content.rating : parseInt(content.rating as string);
              adjustment += value;
            }
          });
        }
      }
    });
    
    // Quality upgrades improve by lowering the number
    return Math.max(1, baseQuality - adjustment); // Minimum Q1+
  }

  /**
   * Calculate adjusted Defense from base defense and loadout upgrades  
   * Defense upgrades IMPROVE by lowering the number (D5+ -> D4+ is better)
   */
  private static calculateAdjustedDefense(baseDefense: number, loadout: any[]): number {
    let adjustment = 0;
    
    // Check loadout items for Defense upgrades
    loadout.forEach(item => {
      if (item.type === 'ArmyBookItem' && item.content) {
        // Check content array for Defense rules (this is the proper way)
        const hasDefenseInContent = item.content.some((content: any) => 
          content.type === 'ArmyBookRule' && content.name === 'Defense'
        );
        
        if (hasDefenseInContent) {
          item.content.forEach((content: any) => {
            if (content.type === 'ArmyBookRule' && content.name === 'Defense') {
              const value = typeof content.rating === 'number' ? content.rating : parseInt(content.rating as string);
              adjustment += value;
            }
          });
        }
      }
    });
    
    // Defense upgrades improve by lowering the number
    const result = Math.max(1, baseDefense - adjustment);
    return result;
  }

  /**
   * Process ArmyForge rules into internal format
   */
  private static processRules(rules: ArmyForgeRule[]): ProcessedRule[] {
    return rules.map(rule => ({
      name: rule.name,
      type: 'ability' as const,
      rating: rule.rating,
      description: rule.label
    }));
  }

  /**
   * Generate individual models with weapon distribution
   */
  private static generateModelsWithWeapons(unit: ArmyForgeUnit): ProcessedModel[] {
    const models: ProcessedModel[] = [];
    const isHero = unit.rules.some(rule => rule.name === 'Hero');
    const toughRule = unit.rules.find(rule => rule.name === 'Tough');
    const maxTough = toughRule?.rating ? parseInt(toughRule.rating.toString()) : 1;

    // Get processed weapons from loadout
    const unitWeapons = this.processLoadoutWeapons(unit.loadout);

    for (let i = 0; i < unit.size; i++) {
      models.push({
        model_id: `${unit.selectionId}-${i + 1}`,
        name: unit.size === 1 && unit.customName ? unit.customName : `${unit.name} ${i + 1}`,
        custom_name: unit.size === 1 && unit.customName ? unit.customName : undefined,
        max_tough: maxTough,
        current_tough: maxTough,
        is_hero: isHero && unit.size === 1, // Only single-model heroes
        special_rules: [],
        weapons: [], // Will be populated by distributeWeaponsToModels
        upgrades: [] // Will be populated by assignModelUpgrades
      });
    }

    // Distribute weapons to models
    this.distributeWeaponsToModels(models, unitWeapons, unit);

    // Assign model-specific upgrades and calculate final toughness
    this.assignModelUpgrades(models, unit);

    return models;
  }

  /**
   * Distribute weapons from unit loadout to individual models
   */
  private static distributeWeaponsToModels(models: ProcessedModel[], weapons: ProcessedWeapon[], unit: ArmyForgeUnit): void {
    if (models.length === 1) {
      // Single model gets all weapons
      if (models[0]) {
        models[0].weapons = [...weapons];
      }
      return;
    }

    // Multi-model unit - distribute weapons
    // Create a pool of individual weapon instances
    const weaponPool: ProcessedWeapon[] = [];
    
    weapons.forEach(weapon => {
      for (let i = 0; i < weapon.count; i++) {
        weaponPool.push({
          ...weapon,
          count: 1 // Each instance is count 1
        });
      }
    });

    // Distribute weapons to models
    // Priority: melee weapons first, then ranged weapons
    const meleeWeapons = weaponPool.filter(w => w.range === 0);
    const rangedWeapons = weaponPool.filter(w => w.range > 0);
    
    let modelIndex = 0;

    // Distribute melee weapons first (every model should have a melee weapon if possible)
    meleeWeapons.forEach(weapon => {
      if (modelIndex < models.length) {
        models[modelIndex]?.weapons.push(weapon);
        modelIndex = (modelIndex + 1) % models.length;
      }
    });

    // Reset and distribute ranged weapons
    modelIndex = 0;
    rangedWeapons.forEach(weapon => {
      if (modelIndex < models.length) {
        models[modelIndex]?.weapons.push(weapon);
        modelIndex = (modelIndex + 1) % models.length;
      }
    });

    // Handle models without weapons (give them a basic weapon if unit has base weapons)
    models.forEach(model => {
      if (model.weapons.length === 0) {
        // Try to give them a basic weapon from the unit's base weapons
        const baseWeapons = unit.weapons || [];
        if (baseWeapons.length > 0) {
          // Give them the first base weapon
          const baseWeapon = baseWeapons[0];
          if (baseWeapon) {
            model.weapons.push({
              id: baseWeapon.id || `${baseWeapon.name?.toLowerCase().replace(' ', '_')}_weapon`,
              name: baseWeapon.name || 'Unknown Weapon',
              count: 1,
              range: baseWeapon.range || 0,
              attacks: baseWeapon.attacks || 1,
              ap: (baseWeapon.specialRules || []).find((rule: any) => rule.name === 'AP')?.rating as number || 0,
              special_rules: (baseWeapon.specialRules || []).map((rule: any) => ({
                name: rule.name,
                value: rule.rating,
                type: 'weapon_modifier' as const
              }))
            });
          }
        }
      }
    });
  }

  /**
   * Assign model-specific upgrades and recalculate toughness
   */
  private static assignModelUpgrades(models: ProcessedModel[], unit: ArmyForgeUnit): void {
    if (!unit.selectedUpgrades || unit.selectedUpgrades.length === 0) {
      return;
    }

    // Get unit-wide tough value from processed rules
    const unitRules = this.processEnhancedRules(unit.rules, unit.loadout);
    const baseToughRule = unitRules.find(rule => rule.name === 'Tough');
    const baseTough = baseToughRule?.rating ? parseInt(baseToughRule.rating.toString()) : 1;

    // Set base toughness for all models
    models.forEach(model => {
      model.max_tough = baseTough;
      model.current_tough = baseTough;
    });

    // Process model-specific upgrades
    unit.selectedUpgrades.forEach(selectedUpgrade => {
      const upgradeType = this.categorizeUpgrade(selectedUpgrade);
      
      if (upgradeType.source === 'unit-wide') {
        // Unit-wide upgrades affect all models (already handled in unit rules)
        return;
      }

      if (upgradeType.source === 'weapon-team') {
        // Find model with weapon team weapons
        const targetModel = this.findWeaponTeamModel(models, selectedUpgrade);
        if (targetModel) {
          this.applyUpgradeToModel(targetModel, selectedUpgrade, upgradeType);
        }
      }

      if (upgradeType.source === 'choose-model') {
        // Assign to first available model (user can reassign later)
        const targetModel = models[0]; // Simple assignment for now
        if (targetModel) {
          this.applyUpgradeToModel(targetModel, selectedUpgrade, upgradeType);
        }
      }
    });
  }

  /**
   * Categorize upgrade based on its affects/select properties
   */
  private static categorizeUpgrade(selectedUpgrade: any): { source: 'weapon-team' | 'choose-model' | 'unit-wide'; reassignable: boolean } {
    const upgrade = selectedUpgrade.upgrade;
    const option = selectedUpgrade.option;

    // Check if it's a weapon team (affects exactly 1 model and has weapons)
    if (upgrade.affects?.type === 'exactly' && upgrade.affects?.value === 1 && 
        option.gains?.some((gain: any) => gain.type === 'ArmyBookItem' && 
        gain.content?.some((content: any) => content.type === 'ArmyBookWeapon'))) {
      return { source: 'weapon-team', reassignable: false };
    }

    // Check if it's a choose-model upgrade (select exactly 1)
    if (upgrade.select?.type === 'exactly' && upgrade.select?.value === 1) {
      return { source: 'choose-model', reassignable: true };
    }

    // Check if it affects all models
    if (upgrade.affects?.type === 'all') {
      return { source: 'unit-wide', reassignable: false };
    }

    // Default to choose-model if unclear
    return { source: 'choose-model', reassignable: true };
  }

  /**
   * Find the model that should get weapon team upgrades
   */
  private static findWeaponTeamModel(models: ProcessedModel[], selectedUpgrade: any): ProcessedModel | undefined {
    const weaponNames = selectedUpgrade.option.gains
      ?.find((gain: any) => gain.type === 'ArmyBookItem')
      ?.content?.filter((content: any) => content.type === 'ArmyBookWeapon')
      ?.map((weapon: any) => weapon.name) || [];

    return models.find(model => 
      model.weapons.some(weapon => weaponNames.includes(weapon.name))
    );
  }

  /**
   * Apply upgrade to specific model
   */
  private static applyUpgradeToModel(model: ProcessedModel, selectedUpgrade: any, upgradeType: { source: string; reassignable: boolean }): void {
    const option = selectedUpgrade.option;
    
    // Extract rules from the upgrade
    const upgradeRules: ProcessedRule[] = [];
    option.gains?.forEach((gain: any) => {
      if (gain.type === 'ArmyBookItem' && gain.content) {
        gain.content.forEach((content: any) => {
          if (content.type === 'ArmyBookRule') {
            upgradeRules.push({
              name: content.name,
              type: 'upgrade',
              rating: content.rating,
              description: content.name
            });
          }
        });
      }
    });

    // Add upgrade to model
    const modelUpgrade: ProcessedModelUpgrade = {
      name: option.label || 'Unknown Upgrade',
      description: option.label || 'Unknown Upgrade',
      rules: upgradeRules,
      reassignable: upgradeType.reassignable,
      source: upgradeType.source as 'weapon-team' | 'choose-model' | 'unit-wide'
    };

    model.upgrades.push(modelUpgrade);

    // Apply toughness bonuses
    const toughRule = upgradeRules.find(rule => rule.name === 'Tough');
    if (toughRule && toughRule.rating) {
      const bonusTough = parseInt(toughRule.rating.toString());
      model.max_tough += bonusTough;
      model.current_tough += bonusTough;
    }

    // Add other rules to model's special rules
    upgradeRules.forEach(rule => {
      if (rule.name !== 'Tough') { // Tough is handled above
        model.special_rules.push(rule);
      }
    });
  }
}