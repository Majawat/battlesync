import { ArmyForgeData, ArmyForgeUnit, ArmyForgeModel, ModelStats } from '../types/army';
import { 
  OPRBattleArmy, 
  OPRBattleUnit, 
  OPRBattleModel, 
  OPRUnitType,
  OPRWeaponSummary,
  ArmyConversionResult,
  UnitConversionOptions 
} from '../types/oprBattle';
import { logger } from '../utils/logger';

export class OPRArmyConverter {
  
  /**
   * Convert ArmyForge army data to OPR battle army
   */
  static async convertArmyToBattle(
    userId: string,
    armyId: string,
    armyData: ArmyForgeData,
    options: UnitConversionOptions = {
      allowCombined: true,
      allowJoined: true,
      preserveCustomNames: true
    }
  ): Promise<ArmyConversionResult> {
    try {
      const warnings: string[] = [];
      const errors: string[] = [];

      // Initialize battle army
      const battleArmy: OPRBattleArmy = {
        userId,
        armyId,
        armyName: armyData.name,
        faction: armyData.faction,
        totalPoints: armyData.points,
        maxCommandPoints: this.calculateCommandPoints(armyData.points),
        currentCommandPoints: this.calculateCommandPoints(armyData.points),
        maxUnderdogPoints: 0,
        currentUnderdogPoints: 0,
        selectedDoctrine: undefined,
        units: [],
        killCount: 0
      };

      // Convert units
      for (const unit of armyData.units) {
        try {
          const battleUnit = await this.convertUnitToBattle(unit, options);
          battleArmy.units.push(battleUnit);
        } catch (error) {
          logger.error('Error converting unit to battle:', error);
          errors.push(`Failed to convert unit "${unit.name}": ${error}`);
        }
      }

      // Process combined units if enabled
      if (options.allowCombined) {
        const combinedUnits = this.processCombinedUnits(battleArmy.units);
        battleArmy.units = combinedUnits.units;
        warnings.push(...combinedUnits.warnings);
      }

      // Process joined units (Heroes joining regular units)
      if (options.allowJoined) {
        const joinedUnits = this.processJoinedUnits(battleArmy.units);
        battleArmy.units = joinedUnits.units;
        warnings.push(...joinedUnits.warnings);
      }

      logger.info(`Converted army ${armyData.name} to battle format with ${battleArmy.units.length} units`);

      return {
        success: errors.length === 0,
        army: battleArmy,
        warnings,
        errors
      };

    } catch (error) {
      logger.error('Failed to convert army to battle format:', error);
      return {
        success: false,
        army: {} as OPRBattleArmy,
        warnings: [],
        errors: [`Critical conversion error: ${error}`]
      };
    }
  }

  /**
   * Convert individual ArmyForge unit to battle unit
   */
  private static async convertUnitToBattle(
    armyUnit: ArmyForgeUnit, 
    options: UnitConversionOptions
  ): Promise<OPRBattleUnit> {
    
    // Determine unit type
    const unitType: OPRUnitType = armyUnit.combined ? 'COMBINED' : 'STANDARD';
    
    // Convert models
    const models: OPRBattleModel[] = [];
    
    if (armyUnit.models && armyUnit.models.length > 0) {
      // Use detailed model data if available
      for (const model of armyUnit.models) {
        const battleModel = this.convertModelToBattle(model, armyUnit);
        models.push(battleModel);
      }
    } else {
      // Create models from unit size and basic stats
      const modelCount = armyUnit.size || 1;
      for (let i = 0; i < modelCount; i++) {
        const battleModel = OPRArmyConverter.createModelFromUnit(armyUnit, i);
        models.push(battleModel);
      }
    }

    // Create weapon summary
    const weaponSummary = this.createWeaponSummary(armyUnit);

    // Create battle unit
    const battleUnit: OPRBattleUnit = {
      unitId: armyUnit.id,
      name: armyUnit.name,
      customName: options.preserveCustomNames ? armyUnit.customName : undefined,
      type: unitType,
      originalSize: models.length,
      currentSize: models.length,
      
      // Initial state
      action: null,
      fatigued: false,
      shaken: false,
      routed: false,
      
      kills: 0,
      models,
      weaponSummary,
      
      isCombined: armyUnit.combined || false,
      sourceUnit: armyUnit
    };

    return battleUnit;
  }

  /**
   * Convert ArmyForge model to battle model
   */
  private static convertModelToBattle(
    armyModel: ArmyForgeModel, 
    parentUnit: ArmyForgeUnit
  ): OPRBattleModel {
    
    const isHero = this.isHeroModel(armyModel, parentUnit);
    const toughValue = this.extractToughValue(armyModel.stats);
    
    // For individual models, also check parent unit upgrades that might affect them
    const effectiveRules = this.getEffectiveRules(parentUnit);
    const modelRules = armyModel.stats.special || [];
    const combinedRules = [...modelRules, ...effectiveRules.map(r => r.label || r.name)];

    return {
      modelId: armyModel.id,
      name: armyModel.name,
      isHero,
      maxTough: toughValue,
      currentTough: toughValue,
      quality: armyModel.stats.quality,
      defense: armyModel.stats.defense,
      casterTokens: 0,
      isDestroyed: false,
      weapons: armyModel.equipment || [],
      specialRules: [...new Set(combinedRules)] // Remove duplicates
    };
  }

  /**
   * Create weapon summary for a unit using final loadout (after upgrades)
   */
  private static createWeaponSummary(armyUnit: ArmyForgeUnit): OPRWeaponSummary[] {
    // Use loadout as authoritative source for final weapons
    const finalWeapons = this.getEffectiveWeapons(armyUnit);
    
    if (finalWeapons.length === 0) {
      return [];
    }

    return finalWeapons.map(weapon => {
      // Extract count from label if present, otherwise use weapon.count
      let count = weapon.count || 1;
      let label = weapon.label || weapon.name;
      
      // Check if label already includes count (e.g., "8x Rifle (24", A1)")
      const countMatch = label.match(/^(\d+)x\s/);
      if (countMatch) {
        count = parseInt(countMatch[1], 10);
        // Label already formatted correctly, don't duplicate count
      } else if (count > 1) {
        // Add count prefix if not already present
        label = `${count}x ${label}`;
      }
      
      
      return {
        name: weapon.name,
        count: count,
        range: weapon.range,
        attacks: weapon.attacks,
        specialRules: weapon.specialRules?.map((rule: any) => 
          rule.rating ? `${rule.name}(${rule.rating})` : rule.name
        ) || [],
        label: label
      };
    });
  }

  /**
   * Get effective weapons from loadout (final weapons after all upgrades)
   */
  private static getEffectiveWeapons(armyUnit: ArmyForgeUnit): any[] {
    if (!armyUnit.loadout) {
      // Fallback to original weapons if no loadout
      return armyUnit.weapons || [];
    }

    // Extract weapons from loadout
    const weapons = armyUnit.loadout.filter((item: any) => item.type === 'ArmyBookWeapon');
    
    // Also check for weapons inside item content (like from upgrades)
    const weaponsFromItems: any[] = [];
    armyUnit.loadout.forEach((item: any) => {
      if (item.type === 'ArmyBookItem' && item.content) {
        item.content.forEach((content: any) => {
          if (content.type === 'ArmyBookWeapon') {
            weaponsFromItems.push(content);
          }
        });
      }
    });

    return [...weapons, ...weaponsFromItems];
  }

  /**
   * Get effective special rules from base rules plus upgrades
   */
  private static getEffectiveRules(armyUnit: ArmyForgeUnit): any[] {
    const baseRules = armyUnit.rules || [];
    const upgradeRules: any[] = [];

    if (armyUnit.loadout) {
      armyUnit.loadout.forEach((item: any) => {
        if (item.type === 'ArmyBookItem' && item.content) {
          item.content.forEach((content: any) => {
            if (content.type === 'ArmyBookRule') {
              upgradeRules.push({
                id: content.id,
                name: content.name,
                rating: content.rating,
                label: content.label || `${content.name}${content.rating ? `(${content.rating})` : ''}`,
                count: content.count || 1
              });
            }
          });
        }
      });
    }

    return [...baseRules, ...upgradeRules];
  }

  /**
   * Get effective Tough value from base rules plus upgrades (cumulative)
   */
  private static getEffectiveToughValue(armyUnit: ArmyForgeUnit): number {
    let toughValue = 1; // Default

    // Check base rules first
    const baseRule = armyUnit.rules?.find(rule => rule.name.toLowerCase() === 'tough');
    if (baseRule?.rating) {
      toughValue = Number(baseRule.rating);
    }

    // Add cumulative Tough values from loadout items
    if (armyUnit.loadout) {
      armyUnit.loadout.forEach((item: any) => {
        if (item.type === 'ArmyBookItem' && item.content) {
          item.content.forEach((content: any) => {
            if (content.name.toLowerCase() === 'tough' && content.rating) {
              // Tough values are cumulative for single model units
              // TODO: Handle multi-model units where upgrades might apply to individual models
              toughValue += Number(content.rating);
            }
          });
        }
      });
    }

    return toughValue;
  }

  /**
   * Create battle model from unit data (when detailed models not available)
   */
  private static createModelFromUnit(armyUnit: ArmyForgeUnit, index: number): OPRBattleModel {
    const isHero = OPRArmyConverter.isHeroUnit(armyUnit);
    const effectiveRules = OPRArmyConverter.getEffectiveRules(armyUnit);

    // Distribute weapons to this specific model based on weapon counts
    const modelWeapons = OPRArmyConverter.distributeWeaponsToModel(armyUnit, index);
    
    // Distribute special rules to this specific model based on rule counts
    const modelSpecialRules = OPRArmyConverter.distributeRulesToModel(armyUnit, index, effectiveRules);
    
    // Calculate individual model tough value based on upgrades
    // TODO: Fix tough value distribution properly
    const modelToughValue = 1; // Temporary basic tough value

    return {
      modelId: `${armyUnit.id}_model_${index}`,
      name: `${armyUnit.name} Model ${index + 1}`,
      isHero,
      maxTough: modelToughValue,
      currentTough: modelToughValue,
      quality: armyUnit.quality || 4,
      defense: armyUnit.defense || 4,
      casterTokens: 0,
      isDestroyed: false,
      weapons: modelWeapons,
      specialRules: modelSpecialRules
    };
  }

  /**
   * Distribute weapons to a specific model based on weapon count distribution
   * Uses sequential allocation for partial upgrades (non-overlapping weapon upgrades)
   */
  private static distributeWeaponsToModel(armyUnit: ArmyForgeUnit, modelIndex: number): string[] {
    if (!armyUnit.weapons || armyUnit.weapons.length === 0) {
      return [];
    }

    const modelWeapons: string[] = [];
    const unitSize = armyUnit.size || 1;
    
    // Separate universal weapons from upgrade weapons
    const universalWeapons = armyUnit.weapons.filter(w => (w.count || unitSize) >= unitSize);
    const upgradeWeapons = armyUnit.weapons.filter(w => (w.count || unitSize) < unitSize);

    // Give universal weapons to all models
    universalWeapons.forEach(weapon => {
      modelWeapons.push(weapon.label || weapon.name);
    });

    // Distribute upgrade weapons sequentially
    // This handles cases where upgrades are mutually exclusive (shotguns vs plasma rifles)
    let currentStartIndex = 0;
    for (const weapon of upgradeWeapons) {
      const weaponCount = weapon.count || 0;
      const weaponLabel = weapon.label || weapon.name;

      // Check if this model falls within the range for this weapon
      if (modelIndex >= currentStartIndex && modelIndex < currentStartIndex + weaponCount) {
        modelWeapons.push(weaponLabel);
      }
      
      // Move start index for next weapon type
      currentStartIndex += weaponCount;
    }

    return modelWeapons;
  }

  /**
   * Distribute special rules to a specific model based on rule count distribution
   */
  private static distributeRulesToModel(
    armyUnit: ArmyForgeUnit, 
    modelIndex: number, 
    allRules: any[]
  ): string[] {
    const modelRules: string[] = [];

    for (const rule of allRules) {
      const ruleCount = rule.count || armyUnit.size || 1;
      const ruleLabel = rule.label || rule.name;

      // Distribute this rule to the first 'ruleCount' models
      if (modelIndex < ruleCount) {
        modelRules.push(ruleLabel);
      }
    }

    return [...new Set(modelRules)]; // Remove duplicates
  }

  /**
   * Calculate Tough value for a specific model based on base tough + upgrade tough
   */
  private static getModelToughValue(
    armyUnit: ArmyForgeUnit, 
    modelIndex: number, 
    effectiveRules: any[]
  ): number {
    // Base tough value for the unit type
    let baseToughValue = 1; // Default for infantry
    
    // Check base unit rules for tough
    const baseRule = armyUnit.rules?.find(rule => rule.name.toLowerCase() === 'tough');
    if (baseRule?.rating) {
      baseToughValue = Number(baseRule.rating);
    }

    // Check if this model gets upgrade tough (from weapon teams, etc.)
    let upgradeToughValue = 0;
    for (const rule of effectiveRules) {
      if (rule.name.toLowerCase() === 'tough' && rule.count) {
        // This upgrade gives tough to specific number of models
        if (modelIndex < rule.count) {
          upgradeToughValue += Number(rule.rating || 0);
        }
      }
    }

    return baseToughValue + upgradeToughValue;
  }

  /**
   * Process combined units (merge units with same name that are marked as combined)
   */
  private static processCombinedUnits(units: OPRBattleUnit[]): {
    units: OPRBattleUnit[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    const processedUnits: OPRBattleUnit[] = [];
    const combinedGroups = new Map<string, OPRBattleUnit[]>();

    // Group units by name for potential combining
    for (const unit of units) {
      if (unit.isCombined) {
        const key = unit.name; // Group by name only, not by loadout
        if (!combinedGroups.has(key)) {
          combinedGroups.set(key, []);
        }
        combinedGroups.get(key)!.push(unit);
      } else {
        processedUnits.push(unit);
      }
    }

    // Process combined groups
    for (const [key, groupUnits] of combinedGroups) {
      if (groupUnits.length === 2) {
        // Valid combined unit - merge them intelligently
        const combinedUnit = this.mergeCombinedUnits(groupUnits[0], groupUnits[1]);
        processedUnits.push(combinedUnit);
        warnings.push(`Combined unit "${combinedUnit.name}" created from 2 units with different loadouts`);
      } else if (groupUnits.length === 1) {
        // Single unit marked as combined - treat as normal
        groupUnits[0].type = 'STANDARD';
        groupUnits[0].isCombined = false;
        processedUnits.push(groupUnits[0]);
        warnings.push(`Unit "${groupUnits[0].name}" marked as combined but no duplicate found - treating as standard`);
      } else {
        // More than 2 units - this shouldn't happen per OPR rules
        processedUnits.push(...groupUnits);
        warnings.push(`Multiple units with same profile "${key}" found - combined units should only have 2 copies`);
      }
    }

    return { units: processedUnits, warnings };
  }

  /**
   * Process joined units (Heroes joining regular units)
   * Reads joinToUnit field from Army Forge data to determine which heroes join which units
   */
  private static processJoinedUnits(units: OPRBattleUnit[]): {
    units: OPRBattleUnit[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    const processedUnits: OPRBattleUnit[] = [];
    const unitsToJoin = new Map<string, OPRBattleUnit>(); // selectionId -> unit
    const heroesToJoin: OPRBattleUnit[] = [];
    
    // Build map of units by their selectionId for joining lookup
    units.forEach(unit => {
      if (unit.sourceUnit.selectionId) {
        unitsToJoin.set(unit.sourceUnit.selectionId, unit);
      }
    });
    
    // Process each unit to determine joining
    units.forEach(unit => {
      const joinToUnit = unit.sourceUnit.joinToUnit;
      
      if (joinToUnit) {
        // This unit wants to join another unit
        const targetUnit = unitsToJoin.get(joinToUnit);
        
        if (targetUnit) {
          // Check if this is a valid hero join (Tough ≤ 6 and has Hero rule)
          const isValidHeroJoin = this.canHeroJoinUnit(unit, targetUnit);
          
          if (isValidHeroJoin) {
            heroesToJoin.push(unit);
            warnings.push(`Hero ${unit.customName || unit.name} joined unit ${targetUnit.customName || targetUnit.name}`);
          } else {
            // Can't join - keep as separate unit
            processedUnits.push(unit);
            warnings.push(`Hero ${unit.customName || unit.name} cannot join ${targetUnit.customName || targetUnit.name} (invalid join conditions)`);
          }
        } else {
          // Target unit not found
          processedUnits.push(unit);
          warnings.push(`Hero ${unit.customName || unit.name} could not find target unit ${joinToUnit}`);
        }
      } else {
        // Regular unit or hero not joining anyone
        processedUnits.push(unit);
      }
    });
    
    // Now process the actual joining
    heroesToJoin.forEach(hero => {
      const targetSelectionId = hero.sourceUnit.joinToUnit!;
      const targetUnitIndex = processedUnits.findIndex(unit => 
        unit.sourceUnit.selectionId === targetSelectionId
      );
      
      if (targetUnitIndex >= 0) {
        const targetUnit = processedUnits[targetUnitIndex];
        const joinedUnit = this.joinHeroToUnit(hero, targetUnit);
        processedUnits[targetUnitIndex] = joinedUnit;
      }
    });
    
    return { units: processedUnits, warnings };
  }
  
  /**
   * Check if a hero can join a unit according to OPR rules
   */
  private static canHeroJoinUnit(hero: OPRBattleUnit, targetUnit: OPRBattleUnit): boolean {
    // Must be a hero
    const isHero = hero.models.some(m => m.isHero) || 
                   hero.sourceUnit.rules?.some(r => r.name.toLowerCase() === 'hero');
    
    if (!isHero) {
      return false;
    }
    
    // Hero must have Tough ≤ 6
    const heroTough = this.getUnitToughValue(hero);
    if (heroTough > 6) {
      return false;
    }
    
    // Target unit must be multi-model unit without another hero
    if (targetUnit.originalSize <= 1) {
      return false;
    }
    
    const targetHasHero = targetUnit.models.some(m => m.isHero) || 
                         targetUnit.joinedHero !== undefined;
    
    if (targetHasHero) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Join a hero to a unit, creating a new joined unit
   */
  private static joinHeroToUnit(hero: OPRBattleUnit, targetUnit: OPRBattleUnit): OPRBattleUnit {
    // Create hero model from the hero unit
    const heroModel: any = {
      modelId: hero.models[0].modelId,
      name: hero.customName || hero.name,
      customName: hero.customName,
      isHero: true,
      maxTough: hero.models[0].maxTough,
      currentTough: hero.models[0].currentTough,
      quality: hero.models[0].quality,
      defense: hero.models[0].defense,
      casterTokens: hero.models[0].casterTokens,
      isDestroyed: false,
      weapons: hero.weaponSummary.map(w => w.label),
      specialRules: hero.models[0].specialRules
    };
    
    // Combine weapon summaries (target unit + hero weapons)
    const combinedWeaponSummary = [
      ...targetUnit.weaponSummary,
      ...hero.weaponSummary
    ];
    
    // Create joined unit based on target unit
    const joinedUnit: OPRBattleUnit = {
      ...targetUnit,
      type: 'JOINED',
      originalSize: targetUnit.originalSize + 1, // Add hero to size
      currentSize: targetUnit.currentSize + 1,
      weaponSummary: combinedWeaponSummary,
      joinedHero: heroModel,
      // Note: models array stays the same (regular models only)
      // Hero is tracked separately in joinedHero field
    };
    
    return joinedUnit;
  }
  
  /**
   * Get the Tough value for a unit (looks at first model or unit rules)
   */
  private static getUnitToughValue(unit: OPRBattleUnit): number {
    // Check first model's tough value
    if (unit.models.length > 0) {
      return unit.models[0].maxTough;
    }
    
    // Fallback to unit rules
    const toughRule = unit.sourceUnit.rules?.find(r => r.name.toLowerCase() === 'tough');
    return toughRule?.rating || 1;
  }

  /**
   * Merge two units into a combined unit (intelligently combining different loadouts)
   */
  private static mergeCombinedUnits(unit1: OPRBattleUnit, unit2: OPRBattleUnit): OPRBattleUnit {
    const mergedModels = [...unit1.models, ...unit2.models];
    
    // Intelligently combine weapon summaries from both units
    const combinedWeaponSummary = this.mergeWeaponSummaries(unit1.weaponSummary, unit2.weaponSummary);
    
    return {
      ...unit1,
      unitId: `combined_${unit1.unitId}_${unit2.unitId}`,
      type: 'COMBINED',
      originalSize: mergedModels.length,
      currentSize: mergedModels.length,
      models: mergedModels,
      weaponSummary: combinedWeaponSummary,
      combinedFrom: [unit1.unitId, unit2.unitId]
    };
  }

  /**
   * Merge weapon summaries from two units, combining counts for same weapons
   */
  private static mergeWeaponSummaries(
    summary1: OPRWeaponSummary[], 
    summary2: OPRWeaponSummary[]
  ): OPRWeaponSummary[] {
    const merged = new Map<string, OPRWeaponSummary>();
    
    // Add weapons from first unit
    summary1.forEach(weapon => {
      merged.set(weapon.name, { ...weapon });
    });
    
    // Add weapons from second unit, combining counts if weapon already exists
    summary2.forEach(weapon => {
      if (merged.has(weapon.name)) {
        const existing = merged.get(weapon.name)!;
        existing.count += weapon.count;
        // Update label to reflect new count
        existing.label = existing.count > 1 ? 
          `${existing.count}x ${weapon.name} (${weapon.range ? weapon.range + '", ' : ''}A${weapon.attacks}${weapon.specialRules.length > 0 ? ', ' + weapon.specialRules.join(', ') : ''})` :
          `${weapon.name} (${weapon.range ? weapon.range + '", ' : ''}A${weapon.attacks}${weapon.specialRules.length > 0 ? ', ' + weapon.specialRules.join(', ') : ''})`;
      } else {
        merged.set(weapon.name, { ...weapon });
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * Check if a model is a Hero
   */
  private static isHeroModel(model: ArmyForgeModel, parentUnit: ArmyForgeUnit): boolean {
    // Check parent unit type
    if (parentUnit.type === 'HERO') return true;
    
    // Check for Hero special rule
    const heroRules = ['Hero', 'HERO', 'hero'];
    return model.stats.special?.some(rule => heroRules.includes(rule)) || false;
  }
  
  /**
   * Check if a unit is a Hero unit
   */
  private static isHeroUnit(unit: ArmyForgeUnit): boolean {
    // Check unit type
    if (unit.type === 'HERO') return true;
    
    // Check for Hero rule in unit rules
    return unit.rules?.some(rule => rule.name.toLowerCase() === 'hero') || false;
  }

  /**
   * Extract Tough value from model stats
   */
  private static extractToughValue(stats: ModelStats): number {
    // Look for Tough(X) in special rules
    if (stats.special) {
      for (const rule of stats.special) {
        const toughMatch = rule.match(/Tough\((\d+)\)/i);
        if (toughMatch) {
          return parseInt(toughMatch[1], 10);
        }
      }
    }
    
    // Default to 1 if no Tough rule found
    return stats.wounds || 1;
  }

  /**
   * Extract Tough value from unit (when models not detailed)
   */
  private static extractToughFromUnit(unit: ArmyForgeUnit): number {
    // Check unit rules for Tough
    if (unit.rules) {
      for (const rule of unit.rules) {
        if (rule.name.includes('Tough') && rule.rating) {
          return rule.rating;
        }
      }
    }
    
    // Default tough for different unit types
    if (unit.type === 'HERO') return 3;
    if (unit.type === 'VEHICLE') return 6;
    return 1; // Standard infantry
  }

  /**
   * Calculate command points based on army points
   */
  private static calculateCommandPoints(armyPoints: number): number {
    // OPR standard: 1 command point per 100 points (minimum 1)
    return Math.max(1, Math.floor(armyPoints / 100));
  }

  /**
   * Validate unit for battle readiness
   */
  static validateBattleUnit(unit: OPRBattleUnit): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (unit.models.length === 0) {
      errors.push('Unit has no models');
    }

    if (unit.originalSize <= 0) {
      errors.push('Unit has invalid size');
    }

    for (const model of unit.models) {
      if (model.maxTough <= 0) {
        errors.push(`Model ${model.name} has invalid Tough value`);
      }
      
      if (model.quality <= 0 || model.quality > 6) {
        errors.push(`Model ${model.name} has invalid Quality value`);
      }
      
      if (model.defense <= 0 || model.defense > 6) {
        errors.push(`Model ${model.name} has invalid Defense value`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}