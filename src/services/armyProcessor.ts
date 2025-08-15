import { ArmyForgeArmy, ArmyForgeUnit, ArmyForgeWeapon, ArmyForgeRule } from '../types/armyforge';
import { ProcessedArmy, ProcessedUnit, ProcessedSubUnit, ProcessedWeapon, ProcessedRule, ProcessedModel, ProcessedModelUpgrade } from '../types/internal';

export class ArmyProcessor {
  /**
   * Process raw ArmyForge data using dependency-based upgrade system
   * Phase 1: Process each unit individually 
   * Phase 2: Combine units as needed (Combined/Joined)
   */
  public static processArmy(armyForgeData: ArmyForgeArmy): ProcessedArmy {
    // Phase 1: Process each ArmyForge unit individually using new algorithm
    const processedSubUnits = armyForgeData.units.map(unit => ({
      processed: this.processArmyForgeUnitNew(unit),
      original: unit
    }));
    
    // Phase 2: Handle Combined units (merge units with same ID and combined=true)
    const unitsAfterCombining = this.processCombinedUnitsNew(processedSubUnits);
    
    // Phase 3: Handle Joined units (heroes joining regular units)
    const finalUnits = this.processJoinedUnitsNew(unitsAfterCombining);
    
    // Phase 4: Name all models based on their final position in final units
    finalUnits.forEach(unit => {
      unit.sub_units.forEach(subUnit => {
        subUnit.models.forEach((model, index) => {
          if (subUnit.size === 1 && subUnit.custom_name) {
            model.name = subUnit.custom_name;
          } else {
            model.name = `${subUnit.name} ${index + 1}`;
          }
        });
      });
    });
    
    // Calculate totals
    const totalCost = finalUnits.reduce((sum, unit) => sum + unit.total_cost, 0);
    const totalModels = finalUnits.reduce((sum, unit) => sum + unit.model_count, 0);
    
    // Validation
    const validationErrors = [...(armyForgeData.forceOrgErrors || [])];
    if (totalCost > armyForgeData.pointsLimit) {
      validationErrors.push(`Points limit exceeded: ${totalCost}/${armyForgeData.pointsLimit}`);
    }

    return {
      id: '',
      armyforge_id: armyForgeData.id,
      name: armyForgeData.name,
      description: armyForgeData.description,
      validation_errors: validationErrors.length > 0 ? validationErrors : undefined,
      points_limit: armyForgeData.pointsLimit,
      list_points: totalCost,
      model_count: totalModels,
      activation_count: finalUnits.length,
      game_system: armyForgeData.gameSystem,
      campaign_mode: armyForgeData.campaignMode,
      units: finalUnits,
      raw_armyforge_data: JSON.stringify(armyForgeData)
    };
  }

  /**
   * Process individual ArmyForge unit using new dependency-based algorithm
   */
  private static processArmyForgeUnitNew(unit: ArmyForgeUnit): ProcessedSubUnit {
    const isHero = unit.rules.some(rule => rule.name === 'Hero');
    const isCaster = this.hasCasterAbility(unit.rules, unit.loadout);
    const casterRating = this.getCasterRating(unit.rules, unit.loadout);
    
    // Step 1: Create base unit container
    const subUnit: ProcessedSubUnit = {
      id: unit.selectionId,
      armyforge_unit_id: unit.id,
      name: unit.name,
      custom_name: unit.customName || undefined,
      quality: this.calculateAdjustedQuality(unit.quality, unit.loadout),
      defense: this.calculateAdjustedDefense(unit.defense, unit.loadout),
      size: unit.size,
      cost: this.calculateUnitCost(unit),
      is_hero: isHero,
      is_caster: isCaster,
      caster_rating: casterRating,
      xp: unit.xp,
      traits: unit.traits,
      base_sizes: unit.bases,
      weapons: this.processLoadoutWeapons(unit.loadout),
      rules: this.processEnhancedRules(unit.rules, unit.loadout),
      items: this.processLoadoutItems(unit.loadout),
      models: [],
      notes: this.buildNotesWithValidation(unit)
    };
    
    // Step 2: Create individual models and process upgrades using new algorithm
    subUnit.models = this.generateModelsWithNewUpgradeSystem(unit, subUnit);
    
    return subUnit;
  }

  /**
   * Generate models using new dependency-based upgrade system
   */
  private static generateModelsWithNewUpgradeSystem(unit: ArmyForgeUnit, subUnit: ProcessedSubUnit): ProcessedModel[] {
    console.log(`\n*** Generating models for unit: ${unit.name} ***`);
    const models: ProcessedModel[] = [];
    const isHero = unit.rules.some(rule => rule.name === 'Hero');
    const baseToughness = this.determineBaseToughness(unit);
    
    // Step 1: Create base models
    for (let i = 0; i < unit.size; i++) {
      models.push({
        model_id: `${unit.selectionId}-${i + 1}`,
        name: '', // No name during creation, will be named at the end
        custom_name: unit.size === 1 && unit.customName ? unit.customName : undefined,
        max_tough: baseToughness,
        current_tough: baseToughness,
        is_hero: isHero && unit.size === 1,
        special_rules: [],
        weapons: [],
        upgrades: []
      });
    }
    
    // Step 2: Apply base weapons from weapons[] array
    this.applyBaseWeaponsToModels(models, unit.weapons);
    
    // Step 3: Apply base items from items[] array  
    this.applyBaseItemsToModels(models, unit.items);
    
    // Step 4: Process selectedUpgrades in order using dependency tracking
    this.processUpgradesWithDependencies(models, unit, subUnit);
    
    return models;
  }

  /**
   * Apply base weapons to all models
   */
  private static applyBaseWeaponsToModels(models: ProcessedModel[], baseWeapons: ArmyForgeWeapon[]): void {
    baseWeapons.forEach(weapon => {
      const processedWeapon: ProcessedWeapon = {
        id: weapon.id || weapon.weaponId || `${weapon.name?.toLowerCase().replace(' ', '_')}_weapon`,
        name: weapon.name || 'Unknown Weapon',
        count: weapon.count || 1,
        range: weapon.range || 0,
        attacks: weapon.attacks || 1,
        ap: (weapon.specialRules || []).find((rule: any) => rule.name === 'AP')?.rating as number || 0,
        special_rules: (weapon.specialRules || []).map((rule: any) => ({
          name: rule.name,
          value: rule.rating,
          type: 'weapon_modifier' as const
        }))
      };
      
      // Give weapon to all models (each model gets 1 count)
      models.forEach(model => {
        model.weapons.push({ ...processedWeapon });
      });
    });
  }

  /**
   * Apply base items to all models
   */
  private static applyBaseItemsToModels(models: ProcessedModel[], baseItems: any[]): void {
    if (!baseItems || baseItems.length === 0) return;
    
    baseItems.forEach(item => {
      // Create upgrade record for base item
      const itemUpgrade: ProcessedModelUpgrade = {
        name: item.name,
        description: item.label || item.name,
        rules: this.extractRulesFromItem(item),
        reassignable: false, // Base items are not reassignable
        source: 'unit-wide'
      };
      
      // Give item to all models
      models.forEach(model => {
        model.upgrades.push({ ...itemUpgrade });
      });
    });
  }

  /**
   * Process upgrades using dependency tracking system
   */
  private static processUpgradesWithDependencies(models: ProcessedModel[], unit: ArmyForgeUnit, subUnit: ProcessedSubUnit): void {
    if (!unit.selectedUpgrades || unit.selectedUpgrades.length === 0) {
      return;
    }
    
    // Group upgrades by upgrade section (uid) to handle multi-option upgrades correctly
    const upgradeGroups = new Map<string, any[]>();
    const singleUpgrades: any[] = [];
    
    unit.selectedUpgrades.forEach(selectedUpgrade => {
      const upgradeUid = selectedUpgrade.upgrade.uid;
      const affects = selectedUpgrade.upgrade.affects;
      
      // Check if this is a multi-model upgrade section
      if (affects?.type === 'exactly' && affects.value > 1) {
        if (!upgradeGroups.has(upgradeUid)) {
          upgradeGroups.set(upgradeUid, []);
        }
        upgradeGroups.get(upgradeUid)!.push(selectedUpgrade);
      } else {
        singleUpgrades.push(selectedUpgrade);
      }
    });
    
    // Process single upgrades normally
    singleUpgrades.forEach(selectedUpgrade => {
      this.applyUpgradeWithDependencies(models, selectedUpgrade, unit, subUnit);
    });
    
    // Process grouped upgrades with distribution
    upgradeGroups.forEach((groupedUpgrades, upgradeUid) => {
      this.processGroupedUpgrades(models, groupedUpgrades, unit, subUnit);
    });
  }

  /**
   * Process grouped upgrades that should be distributed across multiple models
   */
  private static processGroupedUpgrades(models: ProcessedModel[], groupedUpgrades: any[], unit: ArmyForgeUnit, subUnit: ProcessedSubUnit): void {
    if (groupedUpgrades.length === 0) return;
    
    const firstUpgrade = groupedUpgrades[0];
    const affects = firstUpgrade.upgrade.affects;
    const numModelsToAffect = affects?.value || 1;
    
    // Process grouped upgrade (affects multiple models with distributed options)
    
    // Get the models that should be affected
    const modelsToAffect = models.slice(0, numModelsToAffect);
    
    // Distribute the upgrades across the affected models
    groupedUpgrades.forEach((selectedUpgrade, index) => {
      if (index < modelsToAffect.length) {
        const targetModel = modelsToAffect[index];
        if (targetModel) {
          // Apply base size updates if needed
          this.processBaseSizeUpdates(selectedUpgrade.option.gains, subUnit, selectedUpgrade);
          
          // Apply gains to the specific model
          this.addGainsToModel(targetModel, selectedUpgrade.option.gains, selectedUpgrade);
        }
      }
    });
  }

  /**
   * Apply single upgrade using dependency system
   */
  private static applyUpgradeWithDependencies(models: ProcessedModel[], selectedUpgrade: any, unit: ArmyForgeUnit, subUnit: ProcessedSubUnit): void {
    const upgrade = selectedUpgrade.upgrade;
    
    if (upgrade.variant === 'replace') {
      this.processReplaceUpgrade(models, selectedUpgrade, unit);
    } else if (upgrade.variant === 'upgrade') {
      this.processAddUpgrade(models, selectedUpgrade, subUnit);
    }
  }

  /**
   * Process "replace" variant upgrades using dependency tracking
   */
  private static processReplaceUpgrade(models: ProcessedModel[], selectedUpgrade: any, unit: ArmyForgeUnit): void {
    const upgrade = selectedUpgrade.upgrade;
    const option = selectedUpgrade.option;
    const instanceId = selectedUpgrade.instanceId;
    const affects = upgrade.affects;
    
    // Debug logging for troubleshooting
    console.log(`\n=== Processing upgrade: ${upgrade.label} (${instanceId}) for unit: ${unit.name} ===`);
    
    // Step 1: Find weapons/items that have this upgrade in their dependencies
    // Search in base unit weapons
    const baseAffectedWeapons = unit.weapons.filter(weapon => 
      weapon.dependencies?.some(dep => dep.upgradeInstanceId === instanceId)
    );
    
    // Search in weapons that were added by previous upgrades (upgrade chains)
    // These weapons are found in the gains of previous selectedUpgrades
    const upgradeChainWeapons: any[] = [];
    unit.selectedUpgrades.forEach(prevUpgrade => {
      if (prevUpgrade.instanceId === instanceId) return; // Skip current upgrade
      
      prevUpgrade.option.gains?.forEach((gain: any) => {
        if (gain.type === 'ArmyBookWeapon' && gain.dependencies?.some((dep: any) => dep.upgradeInstanceId === instanceId)) {
          upgradeChainWeapons.push(gain);
        }
        // Also check weapons inside items
        if (gain.type === 'ArmyBookItem' && gain.content) {
          gain.content.forEach((content: any) => {
            if (content.type === 'ArmyBookWeapon' && content.dependencies?.some((dep: any) => dep.upgradeInstanceId === instanceId)) {
              upgradeChainWeapons.push(content);
            }
          });
        }
      });
    });

    const affectedWeapons = [...baseAffectedWeapons, ...upgradeChainWeapons];
    
    if (unit.name === 'Destroyer Sisters') {
      console.log(`Affected weapons:`, affectedWeapons.map(w => ({ name: w.name, id: w.id })));
      console.log(`Models before upgrade:`, models.map(m => ({ name: m.name, weapons: m.weapons.map(w => ({ name: w.name, id: w.id })) })));
    }
    
    
    // Step 2: Calculate how many models to affect based on affects type
    let modelsToAffect: ProcessedModel[] = [];
    
    if (affectedWeapons.length > 0) {
      const affectedWeaponIds = new Set(affectedWeapons.map(w => w.id));
      if (unit.name === 'Destroyer Sisters') {
        console.log(`Looking for weapon IDs:`, Array.from(affectedWeaponIds));
        console.log(`Model weapon IDs:`, models.map(m => m.weapons.map(w => w.id)));
      }
      const modelsWithAffectedWeapons = models.filter(model => 
        model.weapons.some(weapon => affectedWeaponIds.has(weapon.id))
      );
      
      if (affects?.type === 'exactly') {
        const exactCount = affects.value || 1;
        modelsToAffect = modelsWithAffectedWeapons.slice(0, exactCount);
      } else if (affects?.type === 'any') {
        modelsToAffect = modelsWithAffectedWeapons.slice(0, 1);
      } else if (affects?.type === 'all') {
        modelsToAffect = modelsWithAffectedWeapons;
      } else {
        modelsToAffect = modelsWithAffectedWeapons.slice(0, 1);
      }
    }
    
    // Step 3: Apply replacement to selected models
    if (unit.name === 'Destroyer Sisters') {
      console.log(`Models to affect: ${modelsToAffect.length}`);
    }
    modelsToAffect.forEach(model => {
      // Remove weapons using dependency-based matching
      if (affectedWeapons.length > 0) {
        // Create set of weapon IDs to remove (handle both id and weaponId)
        const affectedWeaponIds = new Set();
        affectedWeapons.forEach(weapon => {
          // Add both id and weaponId to cover all matching scenarios
          if (weapon.id) affectedWeaponIds.add(weapon.id);
          if (weapon.weaponId) affectedWeaponIds.add(weapon.weaponId);
          // For upgrade chain weapons that may only have weaponId
          if (!weapon.id && weapon.weaponId) {
            affectedWeaponIds.add(weapon.weaponId);
          }
        });
        
        if (unit.name === 'Destroyer Sisters') {
          console.log(`Removing weapons with IDs:`, Array.from(affectedWeaponIds));
          console.log(`Model ${model.name} weapon IDs before:`, model.weapons.map(w => w.id));
          console.log(`Affected weapons found:`, affectedWeapons.map(w => ({ name: w.name, id: w.id, weaponId: w.weaponId })));
        }
        
        model.weapons = model.weapons.filter(weapon => 
          !affectedWeaponIds.has(weapon.id)
        );
        
        if (unit.name === 'Destroyer Sisters') {
          console.log(`Model ${model.name} weapon IDs after:`, model.weapons.map(w => w.id));
        }
      }
      
      // Add replacement weapons/items
      this.addGainsToModel(model, option.gains, selectedUpgrade);
    });
    
    if (unit.name === 'Destroyer Sisters') {
      console.log(`Models after upgrade:`, models.map(m => ({ name: m.name, weapons: m.weapons.map(w => w.name) })));
    }
  }

  /**
   * Process "upgrade" variant upgrades (additive)
   */
  private static processAddUpgrade(models: ProcessedModel[], selectedUpgrade: any, subUnit: ProcessedSubUnit): void {
    const upgrade = selectedUpgrade.upgrade;
    const option = selectedUpgrade.option;
    const affects = upgrade.affects;
    
    // Check for base size updates from ArmyBookItem gains
    this.processBaseSizeUpdates(option.gains, subUnit, selectedUpgrade);
    
    // Determine how many models to affect
    let modelsToAffect: ProcessedModel[] = [];
    
    if (affects?.type === 'exactly') {
      const exactCount = affects.value || 1;
      modelsToAffect = models.slice(0, exactCount);
    } else if (affects?.type === 'all') {
      modelsToAffect = [...models];
    } else {
      // Default: affect 1 model
      modelsToAffect = models.slice(0, 1);
    }
    
    // Add gains to selected models
    modelsToAffect.forEach(model => {
      this.addGainsToModel(model, option.gains, selectedUpgrade);
    });
  }

  /**
   * Process base size updates from ArmyBookItem gains
   */
  private static processBaseSizeUpdates(gains: any[], subUnit: ProcessedSubUnit, selectedUpgrade: any): void {
    if (!gains) return;
    
    gains.forEach(gain => {
      if (gain.type === 'ArmyBookItem' && gain.bases) {
        // Update the unit's base sizes from the upgrade
        subUnit.base_sizes = { ...subUnit.base_sizes, ...gain.bases };
      }
    });
  }

  /**
   * Add gains (weapons, items, rules) to a specific model
   */
  private static addGainsToModel(model: ProcessedModel, gains: any[], selectedUpgrade: any): void {
    const upgrade = selectedUpgrade.upgrade;
    const option = selectedUpgrade.option;
    
    const upgradeRules: ProcessedRule[] = [];
    const upgradeWeapons: ProcessedWeapon[] = [];
    
    gains?.forEach(gain => {
      if (gain.type === 'ArmyBookWeapon') {
        // Direct weapon gain
        const newWeapon: ProcessedWeapon = {
          id: gain.weaponId || gain.id,
          name: gain.name,
          count: gain.count || 1,
          range: gain.range || 0,
          attacks: gain.attacks || 1,
          ap: gain.specialRules?.find((rule: any) => rule.name === 'AP')?.rating || 0,
          special_rules: gain.specialRules?.map((rule: any) => ({
            name: rule.name,
            value: rule.rating,
            type: 'weapon_modifier' as const
          })) || []
        };
        model.weapons.push(newWeapon);
        upgradeWeapons.push(newWeapon);
        
      } else if (gain.type === 'ArmyBookItem') {
        // Item with content (weapons and/or rules)
        if (gain.content) {
          gain.content.forEach((content: any) => {
            if (content.type === 'ArmyBookWeapon') {
              // Weapon within item
              const newWeapon: ProcessedWeapon = {
                id: content.weaponId || content.id,
                name: content.name,
                count: gain.count || 1,
                range: content.range || 0,
                attacks: content.attacks || 1,
                ap: content.specialRules?.find((rule: any) => rule.name === 'AP')?.rating || 0,
                special_rules: content.specialRules?.map((rule: any) => ({
                  name: rule.name,
                  value: rule.rating,
                  type: 'weapon_modifier' as const
                })) || []
              };
              model.weapons.push(newWeapon);
              upgradeWeapons.push(newWeapon);
              
            } else if (content.type === 'ArmyBookRule') {
              // Rule within item
              upgradeRules.push({
                name: content.name,
                type: 'upgrade',
                rating: content.rating,
                description: content.name
              });
            }
          });
        }
        
      } else if (gain.type === 'ArmyBookRule') {
        // Direct rule gain
        upgradeRules.push({
          name: gain.name,
          type: 'upgrade',
          rating: gain.rating,
          description: gain.name
        });
      }
    });
    
    // Create model upgrade record
    if (upgradeRules.length > 0 || upgradeWeapons.length > 0) {
      const reassignable = this.determineReassignability(selectedUpgrade);
      const source = this.determineUpgradeSource(selectedUpgrade);
      
      const modelUpgrade: ProcessedModelUpgrade = {
        name: option.label || 'Unknown Upgrade',
        description: option.label || 'Unknown Upgrade',
        rules: upgradeRules,
        reassignable,
        source
      };
      
      model.upgrades.push(modelUpgrade);
    }
    
    // Apply toughness modifications
    upgradeRules.forEach(rule => {
      if (rule.name === 'Tough' && rule.rating) {
        const toughValue = parseInt(rule.rating.toString());
        
        if (upgrade.variant === 'replace') {
          // Replace: set new toughness value
          model.max_tough = toughValue;
          model.current_tough = toughValue;
        } else {
          // Upgrade: add to existing toughness  
          model.max_tough += toughValue;
          model.current_tough += toughValue;
        }
      }
    });
  }

  /**
   * Determine if an upgrade is reassignable based on game rules
   */
  private static determineReassignability(selectedUpgrade: any): boolean {
    const upgrade = selectedUpgrade.upgrade;
    
    // Reassignable if it's a "select exactly 1" upgrade affecting specific models
    if (upgrade.select?.type === 'exactly' && upgrade.select?.value === 1) {
      return true;
    }
    
    // Reassignable if it's a weapon replacement affecting single model  
    if (upgrade.variant === 'replace' && upgrade.affects?.type === 'any') {
      return true;
    }
    
    // Not reassignable if it affects all models or is unit-wide
    return false;
  }

  /**
   * Determine upgrade source for categorization
   */
  private static determineUpgradeSource(selectedUpgrade: any): 'weapon-team' | 'choose-model' | 'unit-wide' {
    const upgrade = selectedUpgrade.upgrade;
    const option = selectedUpgrade.option;

    // Check if it's a weapon team (has weapons and tough in same item)
    const hasWeaponTeam = option.gains?.some((gain: any) => 
      gain.type === 'ArmyBookItem' && 
      gain.content?.some((content: any) => content.type === 'ArmyBookWeapon') &&
      gain.content?.some((content: any) => content.type === 'ArmyBookRule' && content.name === 'Tough')
    );
    
    if (hasWeaponTeam) {
      return 'weapon-team';
    }

    // Check if it affects all models
    if (upgrade.affects?.type === 'all') {
      return 'unit-wide';
    }

    // Default for individual model upgrades
    return 'choose-model';
  }

  // Helper methods (reuse from original processor)
  private static calculateUnitCost(unit: ArmyForgeUnit): number {
    const baseCost = unit.cost;
    
    const upgradeCosts = unit.selectedUpgrades
      .map(upgrade => {
        const costEntry = upgrade.option.costs.find((c: any) => c.unitId === unit.id);
        return costEntry ? costEntry.cost : 0;
      })
      .reduce((sum, cost) => sum + cost, 0);
    
    const isHero = unit.rules.some(rule => rule.name === 'Hero');
    const levels = Math.floor(unit.xp / 5);
    const levelCosts = levels * (isHero ? 55 : 25);
    
    return baseCost + upgradeCosts + levelCosts;
  }

  private static determineBaseToughness(unit: ArmyForgeUnit): number {
    let baseToughness = 1;
    
    if (unit.rules && unit.rules.length > 0) {
      for (const rule of unit.rules) {
        if (rule.name === 'Tough') {
          if (rule.rating !== undefined && rule.rating !== null) {
            const toughValue = typeof rule.rating === 'string' 
              ? parseInt(rule.rating, 10) 
              : Number(rule.rating);
            
            if (!isNaN(toughValue) && toughValue > 0) {
              baseToughness = Math.max(baseToughness, toughValue);
            }
          }
        }
      }
    }

    return baseToughness;
  }

  private static extractRulesFromItem(item: any): ProcessedRule[] {
    const rules: ProcessedRule[] = [];
    
    if (item.content) {
      item.content.forEach((content: any) => {
        if (content.type === 'ArmyBookRule') {
          rules.push({
            name: content.name,
            type: 'upgrade',
            rating: content.rating,
            description: content.name
          });
        }
      });
    }
    
    return rules;
  }

  private static buildNotesWithValidation(unit: ArmyForgeUnit): string | undefined {
    const hasValidationIssues = !unit.valid || unit.hasBalanceInvalid || 
                               (unit.disabledSections && unit.disabledSections.length > 0) || 
                               (unit.disabledUpgradeSections && unit.disabledUpgradeSections.length > 0);

    if (hasValidationIssues) {
      const issues = [];
      if (!unit.valid) issues.push('Invalid unit');
      if (unit.hasBalanceInvalid) issues.push('Balance invalid');
      if (unit.disabledSections && unit.disabledSections.length > 0) {
        issues.push(`Disabled sections: ${unit.disabledSections.join(', ')}`);
      }
      
      return `${unit.notes || ''}${unit.notes ? ' | ' : ''}VALIDATION: ${issues.join(' ')}`.trim();
    }
    
    return unit.notes || undefined;
  }

  // Reuse existing helper methods for consistency
  private static hasCasterAbility(baseRules: ArmyForgeRule[], loadout: any[]): boolean {
    const baseCaster = baseRules.some(rule => rule.name.toLowerCase().includes('caster'));
    const loadoutCaster = loadout.some(item => 
      item.label && item.label.toLowerCase().includes('caster')
    );
    return baseCaster || loadoutCaster;
  }

  private static getCasterRating(baseRules: ArmyForgeRule[], loadout: any[]): number | undefined {
    const baseCasterRule = baseRules.find(rule => rule.name.toLowerCase().includes('caster'));
    if (baseCasterRule?.rating) return typeof baseCasterRule.rating === 'number' ? baseCasterRule.rating : parseInt(baseCasterRule.rating as string);
    
    const casterItem = loadout.find(item => 
      item.label && item.label.toLowerCase().includes('caster')
    );
    
    if (casterItem?.label) {
      const match = casterItem.label.match(/caster\((\d+)\)/i);
      return match ? parseInt(match[1]) : undefined;
    }
    
    return undefined;
  }

  private static calculateAdjustedQuality(baseQuality: number, loadout: any[]): number {
    let adjustment = 0;
    
    loadout.forEach(item => {
      if (item.type === 'ArmyBookItem' && item.content) {
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
    
    return Math.max(1, baseQuality - adjustment);
  }

  private static calculateAdjustedDefense(baseDefense: number, loadout: any[]): number {
    let adjustment = 0;
    
    loadout.forEach(item => {
      if (item.type === 'ArmyBookItem' && item.content) {
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
    
    return Math.max(1, baseDefense - adjustment);
  }

  private static processLoadoutWeapons(loadout: any[]): ProcessedWeapon[] {
    const weapons = loadout.filter(item => item.type === 'ArmyBookWeapon');
    const weaponItems = loadout.filter(item => 
      item.type === 'ArmyBookItem' && 
      item.content && 
      item.content.some((c: any) => c.type === 'ArmyBookWeapon')
    );
    
    const regularWeapons = this.processWeapons(weapons);
    const embeddedWeapons = weaponItems.flatMap(item => this.extractWeaponsFromItem(item));
    
    return [...regularWeapons, ...embeddedWeapons];
  }

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
        value: rule.rating,
        type: 'weapon_modifier' as const
      }))
    }));
  }

  private static extractWeaponsFromItem(item: any): ProcessedWeapon[] {
    if (!item.content) return [];
    
    const weapons = item.content.filter((content: any) => content.type === 'ArmyBookWeapon');
    return this.processWeapons(weapons);
  }

  private static processEnhancedRules(baseRules: ArmyForgeRule[], loadout: any[]): ProcessedRule[] {
    const processedBaseRules = this.processRules(baseRules);
    const loadoutRules = this.extractRulesFromLoadout(loadout);
    
    return this.mergeAndStackRules(processedBaseRules, loadoutRules);
  }

  private static processRules(rules: ArmyForgeRule[]): ProcessedRule[] {
    return rules.map(rule => ({
      name: rule.name,
      type: 'ability' as const,
      rating: rule.rating,
      description: rule.label
    }));
  }

  private static extractRulesFromLoadout(loadout: any[]): ProcessedRule[] {
    const rules: ProcessedRule[] = [];
    
    loadout.forEach(item => {
      if (item.type === 'ArmyBookItem' && item.label) {
        // Extract various rule types from labels
        const patterns = [
          { name: 'Caster', pattern: /Caster\((\d+)\)/i },
          { name: 'Tough', pattern: /Tough\((\d+)\)/ },
          { name: 'Impact', pattern: /Impact\((\d+)\)/ },
          { name: 'Defense', pattern: /Defense\((\d+)\)/ },
          { name: 'Quality', pattern: /Quality\((\d+)\)/ }
        ];
        
        patterns.forEach(({ name, pattern }) => {
          const match = item.label.match(pattern);
          if (match) {
            rules.push({
              name,
              type: 'ability' as const,
              rating: parseInt(match[1]),
              description: `${name}(${match[1]})`
            });
          }
        });
        
        // Handle non-rated rules
        if (item.label.includes('Fast')) {
          rules.push({
            name: 'Fast',
            type: 'ability' as const,
            rating: undefined,
            description: 'Fast'
          });
        }
        
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

  private static mergeAndStackRules(baseRules: ProcessedRule[], loadoutRules: ProcessedRule[]): ProcessedRule[] {
    const ruleMap = new Map<string, ProcessedRule>();
    
    baseRules.forEach(rule => {
      ruleMap.set(rule.name, { ...rule });
    });
    
    loadoutRules.forEach(loadoutRule => {
      const existing = ruleMap.get(loadoutRule.name);
      
      if (existing && existing.rating !== undefined && loadoutRule.rating !== undefined) {
        if (loadoutRule.name === 'Tough' || loadoutRule.name === 'Impact') {
          const existingValue = typeof existing.rating === 'number' ? existing.rating : parseInt(existing.rating as string);
          const loadoutValue = typeof loadoutRule.rating === 'number' ? loadoutRule.rating : parseInt(loadoutRule.rating as string);
          existing.rating = existingValue + loadoutValue;
          existing.description = `${loadoutRule.name}(${existing.rating})`;
        } else {
          ruleMap.set(loadoutRule.name, { ...loadoutRule });
        }
      } else {
        ruleMap.set(loadoutRule.name, { ...loadoutRule });
      }
    });
    
    return Array.from(ruleMap.values());
  }

  private static processLoadoutItems(loadout: any[]): ProcessedRule[] {
    const items = loadout.filter(item => item.type === 'ArmyBookItem');
    return items.map(item => ({
      name: item.name,
      type: 'upgrade' as const,
      rating: undefined,
      description: item.label || item.name
    }));
  }

  // Combined and Joined unit processing (reuse existing logic for now)
  private static processCombinedUnitsNew(unitsWithOriginal: { processed: ProcessedSubUnit; original: ArmyForgeUnit }[]): { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }[] {
    // Reuse existing logic - this part works correctly
    const combinedGroups = new Map<string, { processed: ProcessedSubUnit; original: ArmyForgeUnit }[]>();
    const regularUnits: { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }[] = [];

    unitsWithOriginal.forEach(unitData => {
      const original = unitData.original;
      
      if (original.combined) {
        const groupKey = original.id;
        if (!combinedGroups.has(groupKey)) {
          combinedGroups.set(groupKey, []);
        }
        combinedGroups.get(groupKey)!.push(unitData);
      } else {
        regularUnits.push({ ...unitData, isCombined: false });
      }
    });

    combinedGroups.forEach((group) => {
      if (group.length > 1) {
        const mergedProcessed = this.mergeCombinedSubUnits(group.map(g => g.processed));
        mergedProcessed.id = mergedProcessed.id + '_combined';
        const firstOriginal = group[0]!.original;
        regularUnits.push({ processed: mergedProcessed, original: firstOriginal, isCombined: true });
      } else if (group.length === 1) {
        regularUnits.push({ ...group[0]!, isCombined: false });
      }
    });

    return regularUnits;
  }

  private static mergeCombinedSubUnits(subUnits: ProcessedSubUnit[]): ProcessedSubUnit {
    if (subUnits.length === 0) throw new Error('Cannot merge empty sub-units array');
    
    const baseUnit = subUnits[0]!;
    const totalCost = subUnits.reduce((sum, unit) => sum + unit.cost, 0);
    const totalSize = subUnits.reduce((sum, unit) => sum + unit.size, 0);
    const allModels = subUnits.flatMap(unit => unit.models);
    const totalXp = subUnits.reduce((sum, unit) => sum + unit.xp, 0);
    
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

  private static processJoinedUnitsNew(unitsWithOriginal: { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }[]): ProcessedUnit[] {
    const processedUnits: ProcessedUnit[] = [];
    const joinedHeroes = new Map<string, { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }>(); 
    const joinTargets = new Map<string, { processed: ProcessedSubUnit; original: ArmyForgeUnit; isCombined?: boolean }>();

    unitsWithOriginal.forEach(unitData => {
      const original = unitData.original;
      
      if (original.joinToUnit) {
        joinedHeroes.set(original.joinToUnit, unitData);
      } else {
        joinTargets.set(original.selectionId, unitData);
      }
    });

    joinTargets.forEach((targetUnitData, targetSelectionId) => {
      const joiningHero = joinedHeroes.get(targetSelectionId);
      
      if (joiningHero) {
        processedUnits.push(this.createJoinedUnit(targetUnitData.processed, joiningHero.processed));
      } else {
        const isCombined = targetUnitData.isCombined || false;
        processedUnits.push(this.createStandaloneUnit(targetUnitData.processed, isCombined));
      }
    });

    joinedHeroes.forEach((heroData, targetId) => {
      if (!joinTargets.has(targetId)) {
        console.warn(`Hero ${heroData.processed.name} trying to join non-existent unit ${targetId}, treating as standalone`);
        processedUnits.push(this.createStandaloneUnit(heroData.processed));
      }
    });

    return processedUnits;
  }

  private static createStandaloneUnit(subUnit: ProcessedSubUnit, isCombined = false): ProcessedUnit {
    const displayName = subUnit.custom_name || subUnit.name;
    
    return {
      id: subUnit.id,
      army_id: '',
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

  private static createJoinedUnit(regularUnit: ProcessedSubUnit, heroUnit: ProcessedSubUnit): ProcessedUnit {
    const heroDisplayName = heroUnit.custom_name || heroUnit.name;
    const unitDisplayName = regularUnit.custom_name || regularUnit.name;
    const joinedName = `${heroDisplayName} w/ ${unitDisplayName}`;
    
    return {
      id: regularUnit.id,
      army_id: '',
      armyforge_unit_ids: [regularUnit.armyforge_unit_id, heroUnit.armyforge_unit_id],
      name: joinedName,
      custom_name: joinedName,
      quality: heroUnit.quality,
      defense: regularUnit.defense,
      total_cost: regularUnit.cost + heroUnit.cost,
      model_count: regularUnit.size + heroUnit.size,
      is_combined: false,
      is_joined: true,
      has_hero: true,
      has_caster: heroUnit.is_caster || regularUnit.is_caster,
      sub_units: [heroUnit, regularUnit],
      notes: [regularUnit.notes, heroUnit.notes].filter(Boolean).join('; ') || undefined
    };
  }
}