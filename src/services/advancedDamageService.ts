import { 
  OPRBattleUnit, 
  OPRBattleModel,
  ApplyDamageRequest,
  DamageResult,
  DamageType
} from '../types/oprBattle';
import { logger } from '../utils/logger';

export class AdvancedDamageService {

  /**
   * Process advanced damage types with special rules
   */
  static async processAdvancedDamage(
    unit: OPRBattleUnit,
    request: ApplyDamageRequest
  ): Promise<DamageResult> {
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
   * Instant Kill damage - bypasses tough on successful quality roll
   */
  private static async processInstantKill(
    unit: OPRBattleUnit,
    request: ApplyDamageRequest
  ): Promise<DamageResult> {
    const targetModel = this.selectTargetModel(unit, request.targetModelId);
    
    if (!targetModel) {
      return this.createEmptyResult();
    }

    // Check if instant kill succeeds
    const qualityRoll = request.instantKillRoll || Math.floor(Math.random() * 6) + 1;
    const instantKillSucceeds = qualityRoll >= targetModel.quality;

    let modelsDestroyed = 0;
    
    if (instantKillSucceeds) {
      // Instant kill - destroy model regardless of tough
      targetModel.isDestroyed = true;
      targetModel.currentTough = 0;
      modelsDestroyed = 1;
      
      logger.info(`Instant kill successful on ${targetModel.name} (roll: ${qualityRoll}, needed: ${targetModel.quality}+)`);
    } else {
      // Failed instant kill - apply normal damage
      const normalDamage = await this.processNormalDamage(unit, {
        ...request,
        damageType: 'NORMAL'
      });
      return normalDamage;
    }

    // Update unit state
    unit.currentSize = unit.models.filter(m => !m.isDestroyed).length;
    const unitDestroyed = unit.currentSize === 0;
    
    // Check for morale effects
    const { unitShaken, unitRouted, moraleTestRequired } = this.checkMoraleEffects(unit, modelsDestroyed);

    return {
      success: true,
      modelsDestroyed,
      unitDestroyed,
      unitShaken,
      unitRouted,
      moraleTestRequired,
      experienceGained: modelsDestroyed,
      events: [{
        id: '',
        timestamp: new Date(),
        round: 0,
        phase: 'BATTLE_ROUNDS',
        userId: '',
        eventType: 'MODEL_DESTROYED',
        data: {
          description: `Instant kill on ${targetModel.name}`,
          targetUnitId: unit.unitId,
          targetModelId: targetModel.modelId,
          additionalData: { instantKill: true, qualityRoll }
        }
      }]
    };
  }

  /**
   * Pierce damage - ignores X points of tough
   */
  private static async processPierceDamage(
    unit: OPRBattleUnit,
    request: ApplyDamageRequest
  ): Promise<DamageResult> {
    const targetModel = this.selectTargetModel(unit, request.targetModelId);
    
    if (!targetModel) {
      return this.createEmptyResult();
    }

    const pierceValue = request.pierceValue || 0;
    const effectiveTough = Math.max(0, targetModel.maxTough - pierceValue);
    const damage = request.damage;
    
    let modelsDestroyed = 0;
    
    // Apply damage considering pierce
    if (request.ignoreTough || effectiveTough === 0) {
      // Pierce bypasses all remaining tough
      targetModel.isDestroyed = true;
      targetModel.currentTough = 0;
      modelsDestroyed = 1;
    } else {
      // Reduce tough by damage amount
      const newTough = Math.max(0, targetModel.currentTough - damage);
      targetModel.currentTough = newTough;
      
      if (newTough === 0) {
        targetModel.isDestroyed = true;
        modelsDestroyed = 1;
      }
    }

    // Update unit state
    unit.currentSize = unit.models.filter(m => !m.isDestroyed).length;
    const unitDestroyed = unit.currentSize === 0;
    
    // Check for morale effects
    const { unitShaken, unitRouted, moraleTestRequired } = this.checkMoraleEffects(unit, modelsDestroyed);

    logger.info(`Pierce damage applied: ${damage} damage, ${pierceValue} pierce vs ${targetModel.name}`);

    return {
      success: true,
      modelsDestroyed,
      unitDestroyed,
      unitShaken,
      unitRouted,
      moraleTestRequired,
      experienceGained: modelsDestroyed,
      events: [{
        id: '',
        timestamp: new Date(),
        round: 0,
        phase: 'BATTLE_ROUNDS',
        userId: '',
        eventType: modelsDestroyed > 0 ? 'MODEL_DESTROYED' : 'DAMAGE_APPLIED',
        data: {
          description: `Pierce(${pierceValue}) damage on ${targetModel.name}`,
          targetUnitId: unit.unitId,
          targetModelId: targetModel.modelId,
          damage,
          additionalData: { pierceValue, effectiveTough }
        }
      }]
    };
  }

  /**
   * Multi-damage - targets multiple models in the same unit
   */
  private static async processMultiDamage(
    unit: OPRBattleUnit,
    request: ApplyDamageRequest
  ): Promise<DamageResult> {
    const targetModelIds = request.multiTargets || [];
    const damagePerTarget = Math.floor(request.damage / Math.max(1, targetModelIds.length));
    
    let totalModelsDestroyed = 0;
    const events = [];
    
    for (const modelId of targetModelIds) {
      const targetModel = unit.models.find(m => m.modelId === modelId && !m.isDestroyed);
      
      if (!targetModel) continue;
      
      // Apply damage to this model
      const newTough = Math.max(0, targetModel.currentTough - damagePerTarget);
      targetModel.currentTough = newTough;
      
      if (newTough === 0) {
        targetModel.isDestroyed = true;
        totalModelsDestroyed++;
      }
      
      events.push({
        id: '',
        timestamp: new Date(),
        round: 0,
        phase: 'BATTLE_ROUNDS' as const,
        userId: '',
        eventType: newTough === 0 ? 'MODEL_DESTROYED' as const : 'DAMAGE_APPLIED' as const,
        data: {
          description: `Multi-damage on ${targetModel.name}`,
          targetUnitId: unit.unitId,
          targetModelId: targetModel.modelId,
          damage: damagePerTarget,
          additionalData: { multiTarget: true }
        }
      });
    }

    // Update unit state
    unit.currentSize = unit.models.filter(m => !m.isDestroyed).length;
    const unitDestroyed = unit.currentSize === 0;
    
    // Check for morale effects
    const { unitShaken, unitRouted, moraleTestRequired } = this.checkMoraleEffects(unit, totalModelsDestroyed);

    logger.info(`Multi-damage applied to ${targetModelIds.length} models, ${totalModelsDestroyed} destroyed`);

    return {
      success: true,
      modelsDestroyed: totalModelsDestroyed,
      unitDestroyed,
      unitShaken,
      unitRouted,
      moraleTestRequired,
      experienceGained: totalModelsDestroyed,
      events
    };
  }

  /**
   * Area effect damage - affects multiple units (handled at higher level)
   */
  private static async processAreaEffect(
    unit: OPRBattleUnit,
    request: ApplyDamageRequest
  ): Promise<DamageResult> {
    // For area effects, we process as normal damage on this unit
    // The calling code should handle applying to multiple units
    return this.processNormalDamage(unit, {
      ...request,
      damageType: 'NORMAL',
      sourceDescription: `Area effect: ${request.sourceDescription || 'Unknown'}`
    });
  }

  /**
   * Normal damage processing
   */
  private static async processNormalDamage(
    unit: OPRBattleUnit,
    request: ApplyDamageRequest
  ): Promise<DamageResult> {
    const targetModel = this.selectTargetModel(unit, request.targetModelId);
    
    if (!targetModel) {
      return this.createEmptyResult();
    }

    const damage = request.damage;
    let modelsDestroyed = 0;
    
    if (request.ignoreTough) {
      // Bypass tough entirely
      targetModel.isDestroyed = true;
      targetModel.currentTough = 0;
      modelsDestroyed = 1;
    } else {
      // Normal damage application
      const newTough = Math.max(0, targetModel.currentTough - damage);
      targetModel.currentTough = newTough;
      
      if (newTough === 0) {
        targetModel.isDestroyed = true;
        modelsDestroyed = 1;
      }
    }

    // Update unit state
    unit.currentSize = unit.models.filter(m => !m.isDestroyed).length;
    const unitDestroyed = unit.currentSize === 0;
    
    // Check for morale effects
    const { unitShaken, unitRouted, moraleTestRequired } = this.checkMoraleEffects(unit, modelsDestroyed);

    return {
      success: true,
      modelsDestroyed,
      unitDestroyed,
      unitShaken,
      unitRouted,
      moraleTestRequired,
      experienceGained: modelsDestroyed,
      events: [{
        id: '',
        timestamp: new Date(),
        round: 0,
        phase: 'BATTLE_ROUNDS',
        userId: '',
        eventType: modelsDestroyed > 0 ? 'MODEL_DESTROYED' : 'DAMAGE_APPLIED',
        data: {
          description: request.sourceDescription || 'Normal damage',
          targetUnitId: unit.unitId,
          targetModelId: targetModel.modelId,
          damage,
          additionalData: { normalDamage: true }
        }
      }]
    };
  }

  /**
   * Select target model based on targeting rules
   */
  private static selectTargetModel(
    unit: OPRBattleUnit,
    targetModelId?: string
  ): OPRBattleModel | null {
    if (targetModelId) {
      const found = unit.models.find(m => m.modelId === targetModelId && !m.isDestroyed);
      return found || null;
    }

    // Auto-targeting: non-heroes first, then heroes
    const availableModels = unit.models.filter(m => !m.isDestroyed);
    if (availableModels.length === 0) return null;

    // Target non-heroes first
    const nonHeroes = availableModels.filter(m => !m.isHero);
    if (nonHeroes.length > 0) {
      return nonHeroes[0];
    }

    // Only heroes left
    return availableModels[0];
  }

  /**
   * Check morale effects after damage
   */
  private static checkMoraleEffects(
    unit: OPRBattleUnit,
    modelsDestroyed: number
  ): { unitShaken: boolean; unitRouted: boolean; moraleTestRequired: boolean } {
    const wasAtFullStrength = !unit.shaken && !unit.routed;
    
    // Unit becomes shaken when first model is lost
    let unitShaken = unit.shaken;
    if (modelsDestroyed > 0 && wasAtFullStrength) {
      unitShaken = true;
      unit.shaken = true;
    }

    // Unit routes when reduced to half strength or less
    let unitRouted = unit.routed;
    const halfStrength = Math.ceil(unit.originalSize / 2);
    if (unit.currentSize <= halfStrength && !unit.routed) {
      unitRouted = true;
      unit.routed = true;
      unit.shaken = true; // Routed units are also shaken
    }

    // Morale test required when models are lost
    const moraleTestRequired = modelsDestroyed > 0;

    return { unitShaken, unitRouted, moraleTestRequired };
  }

  /**
   * Create empty damage result
   */
  private static createEmptyResult(): DamageResult {
    return {
      success: false,
      modelsDestroyed: 0,
      unitDestroyed: false,
      unitShaken: false,
      unitRouted: false,
      moraleTestRequired: false,
      experienceGained: 0,
      events: []
    };
  }
}