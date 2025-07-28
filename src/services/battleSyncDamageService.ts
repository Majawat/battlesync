import { 
  BattleSyncUnit, 
  BattleSyncModel,
  BattleSyncSubunit
} from '../types/battleSync';
import { logger } from '../utils/logger';

export interface BattleSyncDamageRequest {
  targetUnitId: string;
  targetModelId?: string;
  damage: number;
  damageType?: 'NORMAL' | 'INSTANT_KILL' | 'PIERCE' | 'MULTI_DAMAGE' | 'AREA_EFFECT';
  weaponRules?: string[];
  bypassTough?: boolean;
  ignoreRegeneration?: boolean;
}

export interface BattleSyncDamageResult {
  success: boolean;
  modelsDestroyed: number;
  unitDestroyed: boolean;
  toughDamage: number;
  casualtiesRemoved: number;
  description: string;
  triggerMoraleTest: boolean;
}

export class BattleSyncDamageService {

  /**
   * Apply damage to a unit using BattleSync format
   */
  static async applyDamage(
    unit: BattleSyncUnit,
    request: BattleSyncDamageRequest
  ): Promise<BattleSyncDamageResult> {
    
    const damageType = request.damageType || 'NORMAL';
    
    switch (damageType) {
      case 'INSTANT_KILL':
        return this.processInstantKill(unit, request);
      
      case 'PIERCE':
        return this.processPierceDamage(unit, request);
      
      case 'MULTI_DAMAGE':
        return this.processMultiDamage(unit, request);
      
      case 'AREA_EFFECT':
        return this.processAreaEffect(unit, request);
      
      case 'NORMAL':
      default:
        return this.processNormalDamage(unit, request);
    }
  }

  /**
   * Process normal tough-based damage
   */
  private static processNormalDamage(
    unit: BattleSyncUnit,
    request: BattleSyncDamageRequest
  ): BattleSyncDamageResult {
    
    let totalDamage = request.damage;
    let modelsDestroyed = 0;
    let toughDamage = 0;
    
    // Find target models
    const targetModels = this.selectTargetModels(unit, request);
    
    // Apply regeneration if applicable
    if (!request.ignoreRegeneration) {
      totalDamage = this.applyRegeneration(unit, totalDamage, request.weaponRules || []);
    }
    
    // Distribute damage across models
    for (const model of targetModels) {
      if (totalDamage <= 0) break;
      
      const damageToApply = request.bypassTough ? model.maxTough : Math.min(totalDamage, model.currentTough);
      
      if (request.bypassTough) {
        // Instant destruction
        model.currentTough = 0;
        model.isDestroyed = true;
        modelsDestroyed++;
        toughDamage += model.maxTough;
      } else {
        // Normal tough damage
        model.currentTough -= damageToApply;
        toughDamage += damageToApply;
        totalDamage -= damageToApply;
        
        if (model.currentTough <= 0) {
          model.isDestroyed = true;
          modelsDestroyed++;
        }
      }
    }
    
    // Update unit totals
    this.updateUnitTotals(unit);
    
    const unitDestroyed = unit.currentSize === 0;
    if (unitDestroyed) {
      unit.casualty = true;
    }

    // Check if morale test is needed (50%+ casualties or unit under half strength)
    const triggerMoraleTest = this.shouldTriggerMoraleTest(unit, modelsDestroyed);
    
    return {
      success: true,
      modelsDestroyed,
      unitDestroyed,
      toughDamage,
      casualtiesRemoved: modelsDestroyed,
      description: `Applied ${toughDamage} tough damage, destroyed ${modelsDestroyed} models`,
      triggerMoraleTest
    };
  }

  /**
   * Process instant kill damage (bypasses tough on quality roll)
   */
  private static processInstantKill(
    unit: BattleSyncUnit,
    request: BattleSyncDamageRequest
  ): BattleSyncDamageResult {
    
    const targetModels = this.selectTargetModels(unit, request);
    let modelsDestroyed = 0;
    
    // For each point of damage, attempt instant kill
    for (let i = 0; i < request.damage && targetModels.length > modelsDestroyed; i++) {
      const model = targetModels[modelsDestroyed];
      if (!model || model.isDestroyed) continue;
      
      // Assume quality roll succeeds (in actual game, player would roll)
      // For now, we'll apply the instant kill
      model.currentTough = 0;
      model.isDestroyed = true;
      modelsDestroyed++;
    }
    
    this.updateUnitTotals(unit);
    
    const unitDestroyed = unit.currentSize === 0;
    if (unitDestroyed) {
      unit.casualty = true;
    }
    
    return {
      success: true,
      modelsDestroyed,
      unitDestroyed,
      toughDamage: 0,
      casualtiesRemoved: modelsDestroyed,
      description: `Instant kill destroyed ${modelsDestroyed} models`,
      triggerMoraleTest: this.shouldTriggerMoraleTest(unit, modelsDestroyed)
    };
  }

  /**
   * Process pierce damage (ignores tough, destroys models directly)
   */
  private static processPierceDamage(
    unit: BattleSyncUnit,
    request: BattleSyncDamageRequest
  ): BattleSyncDamageResult {
    
    const targetModels = this.selectTargetModels(unit, request);
    const modelsDestroyed = Math.min(request.damage, targetModels.length);
    
    // Destroy models directly
    for (let i = 0; i < modelsDestroyed; i++) {
      const model = targetModels[i];
      if (model && !model.isDestroyed) {
        model.currentTough = 0;
        model.isDestroyed = true;
      }
    }
    
    this.updateUnitTotals(unit);
    
    const unitDestroyed = unit.currentSize === 0;
    if (unitDestroyed) {
      unit.casualty = true;
    }
    
    return {
      success: true,
      modelsDestroyed,
      unitDestroyed,
      toughDamage: 0,
      casualtiesRemoved: modelsDestroyed,
      description: `Pierce damage destroyed ${modelsDestroyed} models directly`,
      triggerMoraleTest: this.shouldTriggerMoraleTest(unit, modelsDestroyed)
    };
  }

  /**
   * Process multi-damage (each wound causes multiple tough damage)
   */
  private static processMultiDamage(
    unit: BattleSyncUnit,
    request: BattleSyncDamageRequest
  ): BattleSyncDamageResult {
    
    // Multi-damage typically doubles the damage
    const enhancedRequest = { ...request, damage: request.damage * 2 };
    return this.processNormalDamage(unit, enhancedRequest);
  }

  /**
   * Process area effect damage (affects multiple models)
   */
  private static processAreaEffect(
    unit: BattleSyncUnit,
    request: BattleSyncDamageRequest
  ): BattleSyncDamageResult {
    
    // For area effect, we apply damage to all models in the unit
    const allModels = this.getAllLivingModels(unit);
    const damagePerModel = Math.floor(request.damage / Math.max(allModels.length, 1));
    
    let totalModelsDestroyed = 0;
    let totalToughDamage = 0;
    
    for (const model of allModels) {
      if (damagePerModel > 0) {
        const damageToApply = Math.min(damagePerModel, model.currentTough);
        model.currentTough -= damageToApply;
        totalToughDamage += damageToApply;
        
        if (model.currentTough <= 0) {
          model.isDestroyed = true;
          totalModelsDestroyed++;
        }
      }
    }
    
    this.updateUnitTotals(unit);
    
    const unitDestroyed = unit.currentSize === 0;
    if (unitDestroyed) {
      unit.casualty = true;
    }
    
    return {
      success: true,
      modelsDestroyed: totalModelsDestroyed,
      unitDestroyed,
      toughDamage: totalToughDamage,
      casualtiesRemoved: totalModelsDestroyed,
      description: `Area effect damaged ${allModels.length} models, destroyed ${totalModelsDestroyed}`,
      triggerMoraleTest: this.shouldTriggerMoraleTest(unit, totalModelsDestroyed)
    };
  }

  /**
   * Select target models for damage application
   */
  private static selectTargetModels(unit: BattleSyncUnit, request: BattleSyncDamageRequest): BattleSyncModel[] {
    if (request.targetModelId) {
      // Target specific model
      for (const subunit of unit.subunits) {
        const model = subunit.models.find(m => m.modelId === request.targetModelId && !m.isDestroyed);
        if (model) {
          return [model];
        }
      }
    }
    
    // Return all living models
    return this.getAllLivingModels(unit);
  }

  /**
   * Get all living models in the unit
   */
  private static getAllLivingModels(unit: BattleSyncUnit): BattleSyncModel[] {
    const models: BattleSyncModel[] = [];
    for (const subunit of unit.subunits) {
      models.push(...subunit.models.filter(m => !m.isDestroyed));
    }
    return models;
  }

  /**
   * Apply regeneration special rule
   */
  private static applyRegeneration(unit: BattleSyncUnit, damage: number, weaponRules: string[]): number {
    // Check if any subunit has regeneration
    const hasRegeneration = unit.subunits.some(subunit => 
      subunit.specialRules.some(rule => rule.toLowerCase().includes('regeneration'))
    );
    
    if (!hasRegeneration) {
      return damage;
    }
    
    // Check if weapon ignores regeneration (Poison, Rending, etc.)
    const ignoresRegeneration = weaponRules.some(rule => 
      ['poison', 'rending'].includes(rule.toLowerCase())
    );
    
    if (ignoresRegeneration) {
      return damage;
    }
    
    // Apply regeneration (typically 5+ save)
    // For simplicity, assume half damage gets through regeneration
    return Math.ceil(damage / 2);
  }

  /**
   * Update unit size and tough totals after damage
   */
  private static updateUnitTotals(unit: BattleSyncUnit): void {
    unit.currentSize = 0;
    unit.currentToughTotal = 0;
    
    for (const subunit of unit.subunits) {
      for (const model of subunit.models) {
        if (!model.isDestroyed) {
          unit.currentSize++;
          unit.currentToughTotal += model.currentTough;
        }
      }
    }
  }

  /**
   * Determine if unit should take morale test
   */
  private static shouldTriggerMoraleTest(unit: BattleSyncUnit, modelsDestroyed: number): boolean {
    // Morale test triggers if:
    // 1. Unit lost 50% or more models this round
    // 2. Unit is now under half strength
    
    const casualtyRate = modelsDestroyed / unit.originalSize;
    const isUnderHalfStrength = unit.currentSize < (unit.originalSize / 2);
    
    return casualtyRate >= 0.5 || isUnderHalfStrength;
  }

  /**
   * Check if unit has specific special rule
   */
  static hasSpecialRule(unit: BattleSyncUnit, ruleName: string): boolean {
    return unit.subunits.some(subunit => 
      subunit.specialRules.some(rule => 
        rule.toLowerCase().includes(ruleName.toLowerCase())
      )
    );
  }

  /**
   * Get special rule value (e.g., "Tough(3)" returns 3)
   */
  static getSpecialRuleValue(unit: BattleSyncUnit, ruleName: string): number | null {
    for (const subunit of unit.subunits) {
      for (const rule of subunit.specialRules) {
        if (rule.toLowerCase().includes(ruleName.toLowerCase())) {
          const match = rule.match(/\((\d+)\)/);
          if (match) {
            return parseInt(match[1]);
          }
        }
      }
    }
    return null;
  }
}