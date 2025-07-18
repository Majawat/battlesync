import { OPRBattleUnit, OPRBattleModel, OPRBattleEvent, OPRBattleEventType } from '../types/oprBattle';
import { logger } from '../utils/logger';

export interface MoraleTestRequest {
  unit: OPRBattleUnit;
  testType: 'MORALE' | 'QUALITY' | 'ROUT_RECOVERY' | 'ACTIVATION';
  modifier?: number; // +/- to the roll
  reason: string;
  forcedRoll?: number; // For testing purposes
}

export interface MoraleTestResult {
  success: boolean;
  rollResult: number;
  targetNumber: number;
  finalResult: number;
  modifier: number;
  unitShaken: boolean;
  unitRouted: boolean;
  unitRecovered: boolean;
  unitDestroyed: boolean;
  description: string;
  events: OPRBattleEvent[];
}

export interface QualityTestRequest {
  model: OPRBattleModel;
  testType: 'ACTIVATION' | 'SPECIAL_ABILITY' | 'INSTANT_KILL' | 'SPELL_RESIST';
  modifier?: number;
  reason: string;
  forcedRoll?: number;
}

export interface QualityTestResult {
  success: boolean;
  rollResult: number;
  targetNumber: number;
  finalResult: number;
  modifier: number;
  description: string;
}

export class MoraleTestService {
  
  /**
   * Perform a morale test for a unit
   */
  static performMoraleTest(request: MoraleTestRequest): MoraleTestResult {
    const { unit, testType, modifier = 0, reason, forcedRoll } = request;
    
    // Get the best quality in the unit for morale tests
    const bestQuality = this.getBestQuality(unit);
    const rollResult = forcedRoll || this.rollD6();
    const finalResult = rollResult + modifier;
    
    logger.info(`Morale test for ${unit.name}: roll ${rollResult} + ${modifier} = ${finalResult}, target ${bestQuality}+`);
    
    const testPassed = finalResult >= bestQuality;
    
    let unitShaken = unit.shaken;
    let unitRouted = unit.routed;
    let unitRecovered = false;
    let unitDestroyed = false;
    
    const events: OPRBattleEvent[] = [];
    
    switch (testType) {
      case 'MORALE':
        if (testPassed) {
          // Morale test passed - no additional effects
          if (unit.shaken && !unit.routed) {
            // Unit was shaken but passes morale, might recover
            unitShaken = false;
            unitRecovered = true;
          }
        } else {
          // Morale test failed
          if (!unit.shaken) {
            // Unit becomes shaken
            unitShaken = true;
          } else if (unit.shaken && !unit.routed) {
            // Shaken unit fails morale test - becomes routed
            unitRouted = true;
            unitShaken = true; // Routed units are also shaken
          } else if (unit.routed) {
            // Routed unit fails another morale test - destroyed
            unitDestroyed = true;
          }
        }
        break;
        
      case 'QUALITY':
        // Quality tests are pass/fail for specific actions
        // No morale state changes
        break;
        
      case 'ROUT_RECOVERY':
        if (testPassed) {
          // Unit recovers from rout
          unitRouted = false;
          unitShaken = false;
          unitRecovered = true;
        }
        // No additional penalties for failing rout recovery
        break;
        
      case 'ACTIVATION':
        if (!testPassed) {
          // Failed activation test - unit becomes shaken
          unitShaken = true;
        }
        break;
    }
    
    // Create event for the morale test
    const eventData = {
      unitId: unit.unitId,
      description: `${testType} test: ${reason}. Rolled ${rollResult}+${modifier}=${finalResult} vs ${bestQuality}+. ${testPassed ? 'PASSED' : 'FAILED'}`,
      additionalData: {
        testType,
        rollResult,
        modifier,
        finalResult,
        targetNumber: bestQuality,
        testPassed,
        unitShaken,
        unitRouted,
        unitRecovered,
        unitDestroyed
      }
    };
    
    events.push({
      id: this.generateEventId(),
      timestamp: new Date(),
      round: 1, // Should be passed from context
      phase: 'BATTLE_ROUNDS',
      userId: 'system', // Should be passed from context
      eventType: 'MORALE_TEST',
      data: eventData
    });
    
    // Update unit state
    unit.shaken = unitShaken;
    unit.routed = unitRouted;
    
    const description = this.generateTestDescription(testType, reason, rollResult, modifier, finalResult, bestQuality, testPassed);
    
    return {
      success: testPassed,
      rollResult,
      targetNumber: bestQuality,
      finalResult,
      modifier,
      unitShaken,
      unitRouted,
      unitRecovered,
      unitDestroyed,
      description,
      events
    };
  }
  
  /**
   * Perform a quality test for a model
   */
  static performQualityTest(request: QualityTestRequest): QualityTestResult {
    const { model, testType, modifier = 0, reason, forcedRoll } = request;
    
    const rollResult = forcedRoll || this.rollD6();
    const finalResult = rollResult + modifier;
    const testPassed = finalResult >= model.quality;
    
    logger.info(`Quality test for ${model.name}: roll ${rollResult} + ${modifier} = ${finalResult}, target ${model.quality}+`);
    
    const description = this.generateTestDescription(testType, reason, rollResult, modifier, finalResult, model.quality, testPassed);
    
    return {
      success: testPassed,
      rollResult,
      targetNumber: model.quality,
      finalResult,
      modifier,
      description
    };
  }
  
  /**
   * Check if a unit should take a morale test after taking casualties
   */
  static shouldTakeMoraleTest(unit: OPRBattleUnit, modelsLost: number): boolean {
    // Units take morale tests when they lose models
    if (modelsLost > 0) {
      return true;
    }
    
    // Units also take morale tests when they become shaken or routed
    if (unit.shaken || unit.routed) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the modifier for a morale test based on unit state
   */
  static getMoraleTestModifier(unit: OPRBattleUnit): number {
    let modifier = 0;
    
    // Shaken units get -1 to morale tests
    if (unit.shaken) {
      modifier -= 1;
    }
    
    // Routed units get -2 to morale tests
    if (unit.routed) {
      modifier -= 2;
    }
    
    // Units at half strength or less get -1 to morale tests
    const halfStrength = Math.ceil(unit.originalSize / 2);
    if (unit.currentSize <= halfStrength) {
      modifier -= 1;
    }
    
    // Heroes and units with special rules might get bonuses
    if (unit.specialRules.includes('Fearless')) {
      modifier += 2;
    }
    
    if (unit.specialRules.includes('Stubborn')) {
      modifier += 1;
    }
    
    return modifier;
  }
  
  /**
   * Check if a unit needs to take a rout recovery test
   */
  static shouldTakeRoutRecoveryTest(unit: OPRBattleUnit): boolean {
    // Routed units can attempt to recover during their activation
    return unit.routed && unit.currentSize > 0;
  }
  
  /**
   * Get the best quality value in a unit (for morale tests)
   */
  private static getBestQuality(unit: OPRBattleUnit): number {
    let bestQuality = 6; // Worst possible quality
    
    // Check all models in the unit
    for (const model of unit.models) {
      if (!model.isDestroyed && model.quality < bestQuality) {
        bestQuality = model.quality;
      }
    }
    
    // Check joined hero
    if (unit.joinedHero && !unit.joinedHero.isDestroyed && unit.joinedHero.quality < bestQuality) {
      bestQuality = unit.joinedHero.quality;
    }
    
    return bestQuality;
  }
  
  /**
   * Roll a D6
   */
  private static rollD6(): number {
    return Math.floor(Math.random() * 6) + 1;
  }
  
  /**
   * Generate a unique event ID
   */
  private static generateEventId(): string {
    return `morale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate a human-readable description of the test
   */
  private static generateTestDescription(
    testType: string,
    reason: string,
    rollResult: number,
    modifier: number,
    finalResult: number,
    targetNumber: number,
    testPassed: boolean
  ): string {
    const modifierText = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
    const resultText = modifier === 0 ? `${rollResult}` : `${rollResult}${modifierText}=${finalResult}`;
    
    return `${testType} test (${reason}): Rolled ${resultText} vs ${targetNumber}+ - ${testPassed ? 'PASSED' : 'FAILED'}`;
  }
  
  /**
   * Get unit morale state description
   */
  static getUnitMoraleState(unit: OPRBattleUnit): string {
    if (unit.routed) {
      return 'Routed';
    } else if (unit.shaken) {
      return 'Shaken';
    } else {
      return 'Steady';
    }
  }
  
  /**
   * Calculate morale penalties for actions
   */
  static getMoraleActionPenalties(unit: OPRBattleUnit): {
    shootingPenalty: number;
    fightingPenalty: number;
    movementPenalty: number;
  } {
    let shootingPenalty = 0;
    let fightingPenalty = 0;
    let movementPenalty = 0;
    
    if (unit.shaken) {
      shootingPenalty = -1;
      fightingPenalty = -1;
    }
    
    if (unit.routed) {
      shootingPenalty = -2;
      fightingPenalty = -2;
      movementPenalty = -1; // Routed units move randomly
    }
    
    return {
      shootingPenalty,
      fightingPenalty,
      movementPenalty
    };
  }
}