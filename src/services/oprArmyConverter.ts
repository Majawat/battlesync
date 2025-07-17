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
    },
    commandPointMethod: 'fixed' | 'growing' | 'temporary' | 'fixed-random' | 'growing-random' | 'temporary-random' = 'fixed'
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
        maxCommandPoints: this.calculateCommandPoints(armyData.points, commandPointMethod),
        currentCommandPoints: this.calculateCommandPoints(armyData.points, commandPointMethod),
        maxUnderdogPoints: 0,
        currentUnderdogPoints: 0,
        selectedDoctrine: undefined,
        units: [],
        killCount: 0
      };

      // Convert units
      for (const unit of armyData.units) {
        try {
          // Get unit-specific faction from resolved factions or fallback to army faction
          const unitFaction = this.getUnitFaction(unit, armyData);
          const unitOptions = { ...options, factionName: unitFaction };
          const battleUnit = await this.convertUnitToBattle(unit, unitOptions);
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

    // Get effective special rules (base rules + upgrades/traits)
    const effectiveRules = this.getEffectiveRules(armyUnit);
    const specialRules = this.calculateFinalSpecialRules(effectiveRules);

    // Create battle unit
    const battleUnit: OPRBattleUnit = {
      unitId: armyUnit.id,
      name: armyUnit.name,
      customName: options.preserveCustomNames ? armyUnit.customName : undefined,
      type: unitType,
      originalSize: models.length,
      currentSize: models.length,
      faction: options.factionName || 'Unknown', // Add faction for spell casting
      
      // Initial state
      action: null,
      fatigued: false,
      shaken: false,
      routed: false,
      
      kills: 0,
      models,
      weaponSummary,
      specialRules,
      
      isCombined: armyUnit.combined || false,
      sourceUnit: armyUnit
    };

    return battleUnit;
  }

  /**
   * Get unit-specific faction from armyId mapping
   */
  private static getUnitFaction(unit: any, armyData: any): string {
    // If we have resolved factions metadata and unit has armyId, try to map it
    if (unit.armyId) {
      // Create a mapping from the demo army book IDs we know about
      const armyIdToFaction: Record<string, string> = {
        'zz3kp5ry7ks6mxcx': 'Soul-Snatcher Cults',
        'z65fgu0l29i4lnlu': 'Human Defense Force', 
        '7oi8zeiqfamiur21': 'Blessed Sisters',
        'BKi_hJaJflN8ZorH': 'Jackals'
      };

      const unitFaction = armyIdToFaction[unit.armyId];
      if (unitFaction) {
        logger.info(`Resolved unit ${unit.name} with armyId ${unit.armyId} to faction: ${unitFaction}`);
        return unitFaction;
      } else {
        logger.warn(`Unknown armyId ${unit.armyId} for unit ${unit.name}`);
      }
    }

    // Fallback: use first faction from the army's faction list
    if (armyData.faction && armyData.faction.includes(', ')) {
      const firstFaction = armyData.faction.split(', ')[0];
      logger.info(`Using first faction from army faction list: ${firstFaction}`);
      return firstFaction;
    }

    // Final fallback: use the army faction as-is
    logger.info(`Using army faction as-is: ${armyData.faction || 'Unknown'}`);
    return armyData.faction || 'Unknown';
  }

  /**
   * Calculate final special rules by combining base rules with upgrades
   * Handles rule stacking (like Impact) and replacements
   */
  private static calculateFinalSpecialRules(effectiveRules: any[]): string[] {
    const ruleMap = new Map<string, any>();
    
    // Process all rules and handle stacking/replacement
    effectiveRules.forEach(rule => {
      const ruleName = rule.name;
      const existingRule = ruleMap.get(ruleName);
      
      if (existingRule) {
        // Handle rule stacking based on rule type
        if (ruleName === 'Impact') {
          // Impact stacks: base Impact(3) + Great Grinder Impact(5) = Impact(8)
          const existingRating = existingRule.rating || 0;
          const newRating = rule.rating || 0;
          const totalRating = existingRating + newRating;
          
          ruleMap.set(ruleName, {
            ...rule,
            rating: totalRating,
            label: `Impact(${totalRating})`
          });
        } else if (ruleName === 'Defense') {
          // Defense upgrades: lower is better, so take the lowest value
          const existingRating = existingRule.rating || 0;
          const newRating = rule.rating || 0;
          const finalRating = Math.min(existingRating, newRating);
          
          ruleMap.set(ruleName, {
            ...rule,
            rating: finalRating,
            label: `Defense(${finalRating})`
          });
        } else if (rule.rating && existingRule.rating) {
          // For other rated rules, take the higher rating (unless specified otherwise)
          const existingRating = existingRule.rating || 0;
          const newRating = rule.rating || 0;
          const finalRating = Math.max(existingRating, newRating);
          
          ruleMap.set(ruleName, {
            ...rule,
            rating: finalRating,
            label: rule.label || `${ruleName}(${finalRating})`
          });
        } else {
          // For non-rated rules, keep the existing one (no stacking)
          // Do nothing - keep existing rule
        }
      } else {
        // First occurrence of this rule
        ruleMap.set(ruleName, rule);
      }
    });
    
    // Convert to string array for display
    return Array.from(ruleMap.values()).map(rule => rule.label || rule.name);
  }

  /**
   * Extracts caster tokens from special rules
   */
  private static extractCasterTokens(specialRules: string[]): number {
    for (const rule of specialRules) {
      const match = rule.match(/Caster\((\d+)\)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 0;
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

    // Calculate effective defense considering upgrades
    const effectiveDefense = this.calculateEffectiveDefense(parentUnit, armyModel.stats.defense);

    return {
      modelId: armyModel.id,
      name: armyModel.name,
      isHero,
      maxTough: toughValue,
      currentTough: toughValue,
      quality: armyModel.stats.quality,
      defense: effectiveDefense,
      casterTokens: 0, // Tokens are granted at the start of each round, not game start
      isDestroyed: false,
      weapons: armyModel.equipment || [],
      specialRules: [...new Set(combinedRules)], // Remove duplicates
      armyId: parentUnit.armyId // Store armyId for faction resolution
    };
  }

  /**
   * Create weapon summary for a unit using final loadout (after upgrades)
   * 
   * Uses actual weapon counts from ArmyForge loadout, not pre-formatted label counts.
   * This ensures accurate weapon counting for complex upgrade scenarios.
   * 
   * Fixed issues with weapons showing incorrect counts (e.g., Blessed Titan Titan Claws).
   */
  private static createWeaponSummary(armyUnit: ArmyForgeUnit): OPRWeaponSummary[] {
    // Use loadout as authoritative source for final weapons
    const finalWeapons = this.getEffectiveWeapons(armyUnit);
    
    if (finalWeapons.length === 0) {
      return [];
    }

    return finalWeapons.map(weapon => {
      // Use actual weapon count, not count from pre-formatted label
      let count = weapon.count || 1;
      let label = weapon.label || weapon.name;
      
      // Remove any existing count prefix from label to avoid conflicts
      label = label.replace(/^\d+x\s/, '');
      
      // Add correct count prefix if needed
      if (count > 1) {
        // Add count prefix
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
    
    // Add campaign traits as special rules
    if (armyUnit.traits && armyUnit.traits.length > 0) {
      armyUnit.traits.forEach(trait => {
        upgradeRules.push({
          id: `campaign_trait_${trait}`,
          name: trait,
          label: trait,
          count: armyUnit.size || 1 // Apply to all models in the unit
        });
      });
    }

    // Process loadout items (weapons, equipment)
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

    // Process selectedUpgrades (model-level upgrades like Field Radio, Company Standard)
    if (armyUnit.selectedUpgrades) {
      armyUnit.selectedUpgrades.forEach((upgrade: any) => {
        if (upgrade.option && upgrade.option.gains) {
          upgrade.option.gains.forEach((gain: any) => {
            if (gain.type === 'ArmyBookRule') {
              // Use upgrade.affects.value to determine how many models get this rule
              const affectedModelCount = upgrade.upgrade?.affects?.value || gain.count || 1;
              
              upgradeRules.push({
                id: gain.id,
                name: gain.name,
                rating: gain.rating,
                label: gain.label || `${gain.name}${gain.rating ? `(${gain.rating})` : ''}`,
                count: affectedModelCount
              });
            }
          });
        }
      });
    }

    // Combine all rules and merge duplicates with additive ratings
    const allRules = [...baseRules, ...upgradeRules];
    return this.mergeAdditiveRules(allRules);
  }

  /**
   * Merge rules with the same name, combining their ratings for additive rules
   */
  private static mergeAdditiveRules(rules: any[]): any[] {
    const mergedRules = new Map<string, any>();
    
    // Rules that should have their values added together
    const additiveRules = ['impact', 'tough', 'defense', 'ap'];
    
    for (const rule of rules) {
      const ruleName = rule.name.toLowerCase();
      const ruleKey = ruleName;
      
      if (mergedRules.has(ruleKey)) {
        const existing = mergedRules.get(ruleKey)!;
        
        // Check if this is an additive rule type
        if (additiveRules.includes(ruleName) && rule.rating && existing.rating) {
          // Add the ratings together
          const combinedRating = Number(existing.rating) + Number(rule.rating);
          existing.rating = combinedRating;
          existing.label = `${rule.name}(${combinedRating})`;
        }
        // For non-additive rules, keep the existing one (first wins)
      } else {
        // First occurrence of this rule
        mergedRules.set(ruleKey, { ...rule });
      }
    }
    
    return Array.from(mergedRules.values());
  }

  /**
   * Calculate effective defense considering upgrades (Defense upgrades reduce the number)
   * 
   * In OPR, Defense upgrades improve armor by reducing the target number needed.
   * Example: Base Defense 5+ with Defense(1) upgrade = 4+ (better armor save)
   */
  private static calculateEffectiveDefense(armyUnit: ArmyForgeUnit, baseDefense: number): number {
    let effectiveDefense = baseDefense;
    
    // Check for Defense upgrades in loadout
    if (armyUnit.loadout) {
      armyUnit.loadout.forEach((item: any) => {
        if (item.type === 'ArmyBookItem' && item.content) {
          item.content.forEach((content: any) => {
            if (content.name && content.name.toLowerCase() === 'defense' && content.rating) {
              // Defense upgrades improve defense by reducing the number
              effectiveDefense = Math.max(1, effectiveDefense - Number(content.rating));
            }
          });
        }
      });
    }
    
    // Check selectedUpgrades for Defense improvements
    if (armyUnit.selectedUpgrades) {
      armyUnit.selectedUpgrades.forEach((upgrade: any) => {
        if (upgrade.option && upgrade.option.gains) {
          upgrade.option.gains.forEach((gain: any) => {
            if (gain.name && gain.name.toLowerCase() === 'defense' && gain.rating) {
              effectiveDefense = Math.max(1, effectiveDefense - Number(gain.rating));
            }
          });
        }
      });
    }
    
    return effectiveDefense;
  }

  /**
   * Get effective Tough value from base rules plus upgrades (cumulative)
   * 
   * For single-model units and heroes, tough values from equipment are additive.
   * Example: Hero with Tough(3) + Combat Bike Tough(3) = Tough(6) total
   */
  private static getEffectiveToughValue(armyUnit: ArmyForgeUnit): number {
    let toughValue = 1; // Default

    // Check base rules first
    const baseRule = armyUnit.rules?.find(rule => rule.name.toLowerCase() === 'tough');
    if (baseRule?.rating) {
      toughValue = Number(baseRule.rating);
    }

    // Add cumulative Tough values from loadout items (like Combat Bike)
    if (armyUnit.loadout) {
      armyUnit.loadout.forEach((item: any) => {
        if (item.type === 'ArmyBookItem' && item.content) {
          item.content.forEach((content: any) => {
            if (content.type === 'ArmyBookRule' && content.name.toLowerCase() === 'tough' && content.rating) {
              // Tough values are cumulative for heroes and single model units
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
    const modelToughValue = this.getModelToughValue(armyUnit, index, effectiveRules);
    
    // Calculate effective defense considering upgrades
    const effectiveDefense = this.calculateEffectiveDefense(armyUnit, armyUnit.defense || 4);

    return {
      modelId: `${armyUnit.id}_model_${index}`,
      name: `${armyUnit.name} Model ${index + 1}`,
      isHero,
      maxTough: modelToughValue,
      currentTough: modelToughValue,
      quality: armyUnit.quality || 4,
      defense: effectiveDefense,
      casterTokens: 0, // Tokens are granted at the start of each round, not game start
      isDestroyed: false,
      weapons: modelWeapons,
      specialRules: modelSpecialRules,
      armyId: armyUnit.armyId // Store armyId for faction resolution
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
   * 
   * Handles two types of tough upgrades:
   * 1. Replacement (Crew/Weapon Team): Sets tough to specific value (e.g., Crew Tough(3))
   * 2. Additive (Equipment): Adds to base tough (e.g., +1 from armor)
   * 
   * Crew/Weapon Team upgrades take precedence and replace base tough entirely.
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

    // Check if this model gets upgrade tough (from weapon teams, crew, etc.)
    // Some upgrades SET tough (like Crew), others ADD tough (like equipment)
    let finalToughValue = baseToughValue;
    let hasToughReplacement = false;
    
    for (const rule of effectiveRules) {
      if (rule.name.toLowerCase() === 'tough' && rule.count) {
        // This upgrade gives tough to specific number of models
        if (modelIndex < rule.count) {
          // Check if this is a weapon team / crew upgrade (sets tough rather than adds)
          // Weapon team upgrades from selectedUpgrades typically set tough to the specified value
          const isWeaponTeamUpgrade = rule.label?.includes('Weapon Team') || 
                                    rule.label?.includes('Crew') ||
                                    (rule.id && rule.id.includes('a0YtInGiUDd6')); // Tough rule ID from weapon teams
          
          if (isWeaponTeamUpgrade) {
            // This is a replacement tough value, not additive
            finalToughValue = Number(rule.rating || 0);
            hasToughReplacement = true;
          } else if (!hasToughReplacement) {
            // Only add if we haven't already had a replacement
            finalToughValue += Number(rule.rating || 0);
          }
        }
      }
    }

    return finalToughValue;
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
        // Successfully created combined unit - this is expected behavior, not a warning
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
            // Successfully joined hero to unit - this is expected behavior, not a warning
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
   * 
   * Creates a JOINED unit type where:
   * - Hero is stored separately in joinedHero field (not in models array)
   * - Hero weapons are kept separate from unit weapons
   * - Hero tough value is recalculated to include all equipment bonuses
   * - Unit size includes the hero (+1 to originalSize)
   */
  private static joinHeroToUnit(hero: OPRBattleUnit, targetUnit: OPRBattleUnit): OPRBattleUnit {
    // Calculate correct tough value for hero (base + all loadout bonuses)
    const heroToughValue = this.getEffectiveToughValue(hero.sourceUnit);
    
    // Create hero model from the hero unit
    const heroModel: any = {
      modelId: hero.models[0].modelId,
      name: hero.customName || hero.name,
      customName: hero.customName,
      isHero: true,
      maxTough: heroToughValue,
      currentTough: heroToughValue,
      quality: hero.models[0].quality,
      defense: hero.models[0].defense,
      casterTokens: hero.models[0].casterTokens,
      isDestroyed: false,
      weapons: hero.weaponSummary.map(w => w.label),
      specialRules: hero.models[0].specialRules,
      armyId: hero.models[0].armyId // Preserve armyId from original hero
    };
    
    // Keep hero weapons separate - only use target unit's weapons in summary
    // Hero weapons are tracked separately in the joinedHero field
    const unitWeaponSummary = [...targetUnit.weaponSummary];
    
    // Create joined unit based on target unit
    const joinedUnit: OPRBattleUnit = {
      ...targetUnit,
      type: 'JOINED',
      originalSize: targetUnit.originalSize + 1, // Add hero to size
      currentSize: targetUnit.currentSize + 1,
      weaponSummary: unitWeaponSummary, // Only unit weapons, hero weapons separate
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
    // Create unique models for the combined unit with proper sequential naming
    const mergedModels: OPRBattleModel[] = [];
    const combinedUnitId = `combined_${unit1.unitId}_${unit2.unitId}`;
    const unitName = unit1.name;
    
    // Add models from first unit with unique IDs and names
    unit1.models.forEach((model, index) => {
      mergedModels.push({
        ...model,
        modelId: `${combinedUnitId}_model_${index}`,
        name: `${unitName} Model ${index + 1}`
      });
    });
    
    // Add models from second unit with unique IDs and names (continuing sequence)
    unit2.models.forEach((model, index) => {
      const combinedIndex = unit1.models.length + index;
      mergedModels.push({
        ...model,
        modelId: `${combinedUnitId}_model_${combinedIndex}`,
        name: `${unitName} Model ${combinedIndex + 1}`
      });
    });
    
    // Intelligently combine weapon summaries from both units
    const combinedWeaponSummary = this.mergeWeaponSummaries(unit1.weaponSummary, unit2.weaponSummary);
    
    return {
      ...unit1,
      unitId: combinedUnitId,
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
   * Calculate command points based on army points and campaign method
   */
  private static calculateCommandPoints(
    armyPoints: number, 
    method: 'fixed' | 'growing' | 'temporary' | 'fixed-random' | 'growing-random' | 'temporary-random' = 'fixed'
  ): number {
    // Use CommandPointService for consistent calculation
    const { CommandPointService } = require('./commandPointService');
    const result = CommandPointService.calculateCommandPoints(armyPoints, method);
    return result.totalCommandPoints;
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