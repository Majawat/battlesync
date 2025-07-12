import { ArmyForgeData, ArmyForgeUnit, ArmyForgeModel, ModelStats } from '../types/army';
import { 
  OPRBattleArmy, 
  OPRBattleUnit, 
  OPRBattleModel, 
  OPRUnitType,
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
        const battleModel = this.createModelFromUnit(armyUnit, i);
        models.push(battleModel);
      }
    }

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
      specialRules: armyModel.stats.special || []
    };
  }

  /**
   * Create battle model from unit data (when detailed models not available)
   */
  private static createModelFromUnit(armyUnit: ArmyForgeUnit, index: number): OPRBattleModel {
    const isHero = armyUnit.type === 'HERO';
    const toughValue = this.extractToughFromUnit(armyUnit);

    return {
      modelId: `${armyUnit.id}_model_${index}`,
      name: `${armyUnit.name} Model ${index + 1}`,
      isHero,
      maxTough: toughValue,
      currentTough: toughValue,
      quality: armyUnit.quality || 4,
      defense: armyUnit.defense || 4,
      casterTokens: 0,
      isDestroyed: false,
      weapons: armyUnit.weapons?.map(w => w.name) || [],
      specialRules: armyUnit.rules?.map(r => r.name) || []
    };
  }

  /**
   * Process combined units (merge two identical units)
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
        const key = `${unit.name}_${unit.sourceUnit.cost}_${unit.sourceUnit.rules?.length || 0}`;
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
        // Valid combined unit - merge them
        const combinedUnit = this.mergeCombinedUnits(groupUnits[0], groupUnits[1]);
        processedUnits.push(combinedUnit);
        warnings.push(`Combined unit "${combinedUnit.name}" created from 2 identical units`);
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
   */
  private static processJoinedUnits(units: OPRBattleUnit[]): {
    units: OPRBattleUnit[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    const processedUnits: OPRBattleUnit[] = [];
    const heroes = units.filter(u => u.models.some(m => m.isHero));
    const regularUnits = units.filter(u => !u.models.some(m => m.isHero));

    // For now, keep all units separate - joining logic would be implemented in UI
    // This allows players to manually join heroes to units during deployment
    processedUnits.push(...regularUnits);
    processedUnits.push(...heroes);

    if (heroes.length > 0) {
      warnings.push(`${heroes.length} Hero unit(s) can be joined to regular units during deployment`);
    }

    return { units: processedUnits, warnings };
  }

  /**
   * Merge two units into a combined unit
   */
  private static mergeCombinedUnits(unit1: OPRBattleUnit, unit2: OPRBattleUnit): OPRBattleUnit {
    const mergedModels = [...unit1.models, ...unit2.models];
    
    return {
      ...unit1,
      unitId: `combined_${unit1.unitId}_${unit2.unitId}`,
      type: 'COMBINED',
      originalSize: mergedModels.length,
      currentSize: mergedModels.length,
      models: mergedModels,
      combinedFrom: [unit1.unitId, unit2.unitId]
    };
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