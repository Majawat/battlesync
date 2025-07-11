import { 
  ArmyForgeData, 
  ArmyValidationResult, 
  ValidationError, 
  ValidationWarning,
  ArmyForgeUnit,
  ModelStats
} from '../types/army';

/**
 * Validate army data from ArmyForge
 */
export async function validateArmyData(armyData: ArmyForgeData): Promise<ArmyValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let pointsTotal = 0;
  const unitCounts: Record<string, number> = {};

  // Basic validation
  if (!armyData.name || armyData.name.trim().length === 0) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: 'Army name is required',
      severity: 'ERROR',
    });
  }

  if (!armyData.faction || armyData.faction.trim().length === 0) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: 'Army faction is required',
      severity: 'ERROR',
    });
  }

  if (!armyData.gameSystem || armyData.gameSystem.trim().length === 0) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: 'Game system is required',
      severity: 'ERROR',
    });
  }

  // Validate units
  if (!armyData.units || armyData.units.length === 0) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: 'Army must contain at least one unit',
      severity: 'ERROR',
    });
  } else {
    for (const unit of armyData.units) {
      const unitValidation = validateUnit(unit);
      errors.push(...unitValidation.errors);
      warnings.push(...unitValidation.warnings);
      
      pointsTotal += unit.cost;
      unitCounts[unit.type] = (unitCounts[unit.type] || 0) + 1;
    }
  }

  // Validate points consistency
  if (Math.abs(pointsTotal - armyData.points) > 5) { // Allow 5 point variance for rounding
    errors.push({
      type: 'POINTS_EXCEEDED',
      message: `Points mismatch: calculated ${pointsTotal}, declared ${armyData.points}`,
      severity: 'ERROR',
    });
  }

  // Validate army composition (basic One Page Rules structure)
  const validation = validateArmyComposition(armyData, unitCounts);
  errors.push(...validation.errors);
  warnings.push(...validation.warnings);

  return {
    isValid: errors.filter(e => e.severity === 'ERROR').length === 0,
    errors,
    warnings,
    pointsTotal,
    unitCounts,
  };
}

/**
 * Validate individual unit
 */
function validateUnit(unit: ArmyForgeUnit): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic unit validation
  if (!unit.name || unit.name.trim().length === 0) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: `Unit is missing name`,
      unitId: unit.id,
      severity: 'ERROR',
    });
  }

  if (!unit.type) {
    errors.push({
      type: 'INVALID_UNIT',
      message: `Unit "${unit.name}" is missing type`,
      unitId: unit.id,
      severity: 'ERROR',
    });
  }

  if (unit.cost < 0) {
    errors.push({
      type: 'INVALID_UNIT',
      message: `Unit "${unit.name}" has negative cost`,
      unitId: unit.id,
      severity: 'ERROR',
    });
  }

  // Validate models
  if (!unit.models || unit.models.length === 0) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: `Unit "${unit.name}" must contain at least one model`,
      unitId: unit.id,
      severity: 'ERROR',
    });
  } else {
    for (const model of unit.models) {
      const modelValidation = validateModel(model, unit.name);
      errors.push(...modelValidation.errors);
      warnings.push(...modelValidation.warnings);
    }
  }

  // Validate unit count constraints
  if (unit.maxCount !== undefined && unit.maxCount < 1) {
    errors.push({
      type: 'INVALID_UNIT',
      message: `Unit "${unit.name}" has invalid max count: ${unit.maxCount}`,
      unitId: unit.id,
      severity: 'ERROR',
    });
  }

  if (unit.minCount !== undefined && unit.minCount < 0) {
    errors.push({
      type: 'INVALID_UNIT',
      message: `Unit "${unit.name}" has invalid min count: ${unit.minCount}`,
      unitId: unit.id,
      severity: 'ERROR',
    });
  }

  // Validate weapons
  for (const weapon of unit.weapons || []) {
    if (weapon.cost < 0) {
      warnings.push({
        type: 'SUBOPTIMAL_LOADOUT',
        message: `Weapon "${weapon.name}" on unit "${unit.name}" has negative cost`,
        suggestion: 'Review weapon configuration',
        unitId: unit.id,
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate individual model
 */
function validateModel(model: any, unitName: string): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!model.name || model.name.trim().length === 0) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: `Model in unit "${unitName}" is missing name`,
      severity: 'ERROR',
    });
  }

  if (model.count <= 0) {
    errors.push({
      type: 'INVALID_UNIT',
      message: `Model "${model.name}" in unit "${unitName}" has invalid count: ${model.count}`,
      severity: 'ERROR',
    });
  }

  if (model.cost < 0) {
    errors.push({
      type: 'INVALID_UNIT',
      message: `Model "${model.name}" in unit "${unitName}" has negative cost`,
      severity: 'ERROR',
    });
  }

  // Validate stats
  if (model.stats) {
    const statsValidation = validateModelStats(model.stats, model.name, unitName);
    errors.push(...statsValidation.errors);
    warnings.push(...statsValidation.warnings);
  }

  return { errors, warnings };
}

/**
 * Validate model statistics
 */
function validateModelStats(stats: ModelStats, modelName: string, unitName: string): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // One Page Rules typical stat ranges
  if (stats.quality < 2 || stats.quality > 6) {
    warnings.push({
      type: 'UNTESTED_COMBINATION',
      message: `Model "${modelName}" in unit "${unitName}" has unusual Quality: ${stats.quality} (typical range: 2-6)`,
      suggestion: 'Verify this is correct for the game system',
    });
  }

  if (stats.defense < 2 || stats.defense > 6) {
    warnings.push({
      type: 'UNTESTED_COMBINATION',
      message: `Model "${modelName}" in unit "${unitName}" has unusual Defense: ${stats.defense} (typical range: 2-6)`,
      suggestion: 'Verify this is correct for the game system',
    });
  }

  if (stats.wounds !== undefined && (stats.wounds < 1 || stats.wounds > 10)) {
    warnings.push({
      type: 'UNTESTED_COMBINATION',
      message: `Model "${modelName}" in unit "${unitName}" has unusual Wounds: ${stats.wounds}`,
      suggestion: 'Verify this is correct for the game system',
    });
  }

  return { errors, warnings };
}

/**
 * Validate army composition rules
 */
function validateArmyComposition(
  armyData: ArmyForgeData, 
  unitCounts: Record<string, number>
): { errors: ValidationError[], warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic One Page Rules army composition
  const totalUnits = Object.values(unitCounts).reduce((sum, count) => sum + count, 0);
  
  if (totalUnits === 0) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: 'Army must contain at least one unit',
      severity: 'ERROR',
    });
    return { errors, warnings };
  }

  // Hero requirements for larger armies
  const heroCount = unitCounts['HERO'] || 0;
  if (armyData.points >= 1000 && heroCount === 0) {
    warnings.push({
      type: 'SUBOPTIMAL_LOADOUT',
      message: 'Armies over 1000 points typically require at least one Hero',
      suggestion: 'Consider adding a Hero unit for army leadership',
    });
  }

  // Check for overly large armies
  if (totalUnits > 20) {
    warnings.push({
      type: 'SUBOPTIMAL_LOADOUT',
      message: `Army has ${totalUnits} units, which may be difficult to manage`,
      suggestion: 'Consider consolidating units for easier gameplay',
    });
  }

  // Check for unusual point distributions
  if (armyData.points > 0) {
    const averageUnitCost = armyData.points / totalUnits;
    if (averageUnitCost < 20) {
      warnings.push({
        type: 'SUBOPTIMAL_LOADOUT',
        message: `Average unit cost is very low (${Math.round(averageUnitCost)} points)`,
        suggestion: 'Consider upgrading units or reducing unit count',
      });
    }
    
    if (averageUnitCost > 200) {
      warnings.push({
        type: 'SUBOPTIMAL_LOADOUT',
        message: `Average unit cost is very high (${Math.round(averageUnitCost)} points)`,
        suggestion: 'Consider adding more units for tactical flexibility',
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate campaign-specific army requirements
 */
export function validateArmyForCampaign(
  armyData: ArmyForgeData, 
  campaignSettings: any
): Promise<ArmyValidationResult> {
  // This can be extended to validate campaign-specific rules
  // For now, just use the basic validation
  return validateArmyData(armyData);
}

/**
 * Quick validation for army data integrity
 */
export function quickValidateArmy(army: any): boolean {
  return !!(
    army &&
    army.name &&
    army.faction &&
    army.gameSystem &&
    army.units &&
    Array.isArray(army.units) &&
    army.units.length > 0 &&
    typeof army.points === 'number' &&
    army.points >= 0
  );
}