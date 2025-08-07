import { ArmyForgeArmy, ArmyForgeUnit, ArmyForgeWeapon, ArmyForgeRule } from '../types/armyforge';
import { ProcessedArmy, ProcessedUnit, ProcessedSubUnit, ProcessedWeapon, ProcessedRule, ProcessedModel } from '../types/internal';

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
      quality: unit.quality,
      defense: unit.defense,
      size: unit.size,
      cost: this.calculateUnitCost(unit),
      is_hero: isHero,
      is_caster: isCaster,
      caster_rating: casterRating,
      xp: unit.xp,
      traits: unit.traits,
      base_sizes: unit.bases,
      weapons: this.processWeapons(unit.loadout.filter(item => item.type === 'ArmyBookWeapon') as ArmyForgeWeapon[]),
      rules: this.processRules(unit.rules),
      items: this.processRules(unit.items?.flatMap(item => item.content) || []),
      models: this.generateModels(unit),
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
  private static processWeapons(weapons: ArmyForgeWeapon[]): ProcessedWeapon[] {
    return weapons.map(weapon => ({
      id: weapon.id,
      name: weapon.name,
      count: weapon.count,
      range: weapon.range,
      attacks: weapon.attacks,
      ap: weapon.specialRules.find(rule => rule.name === 'AP')?.rating as number || 0,
      special_rules: weapon.specialRules.map(rule => ({
        name: rule.name,
        type: 'weapon_modifier' as const,
        rating: rule.rating,
        description: rule.label
      }))
    }));
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
   * Generate individual models for wound tracking
   */
  private static generateModels(unit: ArmyForgeUnit): ProcessedModel[] {
    const models: ProcessedModel[] = [];
    const isHero = unit.rules.some(rule => rule.name === 'Hero');
    const toughRule = unit.rules.find(rule => rule.name === 'Tough');
    const maxTough = toughRule?.rating ? parseInt(toughRule.rating.toString()) : 1;

    for (let i = 0; i < unit.size; i++) {
      models.push({
        model_id: `${unit.selectionId}-${i + 1}`,
        name: unit.size === 1 && unit.customName ? unit.customName : `${unit.name} ${i + 1}`,
        custom_name: unit.size === 1 && unit.customName ? unit.customName : undefined,
        max_tough: maxTough,
        current_tough: maxTough,
        is_hero: isHero && unit.size === 1, // Only single-model heroes
        special_rules: []
      });
    }

    return models;
  }
}