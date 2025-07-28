import { ArmyForgeData, ArmyForgeUnit, ArmyForgeModel } from '../types/army';
import { 
  BattleSyncArmy, 
  BattleSyncUnit, 
  BattleSyncSubunit,
  BattleSyncModel, 
  BattleSyncWeapon,
  BattleSyncWeaponRule,
  BattleSyncFaction,
  BattleSyncConversionResult,
  BattleSyncConversionOptions
} from '../types/battleSync';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class BattleSyncConverter {
  
  /**
   * Convert ArmyForge army data to BattleSync format
   */
  static async convertArmyToBattleSync(
    userId: string,
    armyId: string,
    armyData: ArmyForgeData,
    options: BattleSyncConversionOptions = {
      allowCombined: true,
      allowJoined: true,
      preserveCustomNames: true
    },
    commandPointMethod: 'fixed' | 'growing' | 'temporary' | 'fixed-random' | 'growing-random' | 'temporary-random' = 'fixed'
  ): Promise<BattleSyncConversionResult> {
    try {
      // Validate input
      if (!userId || !armyId || !armyData?.units) {
        return {
          success: false,
          errors: ['Invalid input: userId, armyId, and armyData.units are required'],
          warnings: []
        };
      }

      const warnings: string[] = [];
      const errors: string[] = [];

      // Create factions array from armyData
      const factions = this.createFactionsArray(armyData);

      // Initialize battle army
      const battleArmy: BattleSyncArmy = {
        userId,
        armyId,
        armyName: armyData.name,
        factions,
        totalPoints: armyData.points,
        maxCommandPoints: this.calculateCommandPoints(armyData.points, commandPointMethod),
        currentCommandPoints: this.calculateCommandPoints(armyData.points, commandPointMethod),
        maxUnderdogPoints: 0,
        currentUnderdogPoints: 0,
        selectedDoctrine: undefined,
        units: [],
        killCount: 0,
        stratagemActivations: []
      };

      // Convert units to container format
      const containerUnits = await this.convertUnitsToContainers(armyData.units, options);
      battleArmy.units = containerUnits.units;
      warnings.push(...containerUnits.warnings);
      errors.push(...containerUnits.errors);

      logger.info(`Converted army ${armyData.name} to BattleSync format with ${battleArmy.units.length} container units`);

      return {
        success: errors.length === 0,
        army: battleArmy,
        warnings,
        errors
      };

    } catch (error) {
      logger.error('Failed to convert army to BattleSync format:', error);
      return {
        success: false,
        warnings: [],
        errors: [`Critical conversion error: ${error}`]
      };
    }
  }

  /**
   * Create factions array from ArmyForge data
   */
  private static createFactionsArray(armyData: ArmyForgeData): BattleSyncFaction[] {
    const factions: BattleSyncFaction[] = [];
    const seenArmyIds = new Set<string>();

    // Split the faction string (e.g., "Soul-Snatcher Cults, Human Defense Force")
    const factionNames = armyData.faction ? armyData.faction.split(', ') : ['Unknown Faction'];

    // Extract unique armyIds from units and match with faction names
    for (const unit of armyData.units) {
      if (unit.armyId && !seenArmyIds.has(unit.armyId)) {
        seenArmyIds.add(unit.armyId);
        
        // Try to find a matching faction name (this is best effort)
        const factionName = factionNames[factions.length] || factionNames[0] || 'Unknown Faction';
        
        factions.push({
          armyId: unit.armyId,
          factionName,
          factionCustomName: undefined, // User can set this later
          gameSystem: armyData.gameSystem || 'grimdark-future'
        });
      }
    }

    // Fallback if no armyIds found - create faction from main faction string
    if (factions.length === 0) {
      for (let i = 0; i < factionNames.length; i++) {
        factions.push({
          armyId: `faction_${i}`,
          factionName: factionNames[i],
          factionCustomName: undefined,
          gameSystem: armyData.gameSystem || 'grimdark-future'
        });
      }
    }

    return factions;
  }

  /**
   * Convert ArmyForge units to container format with joining logic
   */
  private static async convertUnitsToContainers(
    armyForgeUnits: ArmyForgeUnit[], 
    options: BattleSyncConversionOptions
  ): Promise<{units: BattleSyncUnit[], warnings: string[], errors: string[]}> {
    
    const warnings: string[] = [];
    const errors: string[] = [];
    const containers: BattleSyncUnit[] = [];
    const processedUnits = new Set<string>();

    for (const unit of armyForgeUnits) {
      const unitSelectionId = unit.selectionId || unit.id; // Fallback to id if no selectionId
      
      if (processedUnits.has(unitSelectionId)) {
        continue; // Already processed as part of a joined unit
      }

      // Check if this unit should join another
      if (unit.joinToUnit && options.allowJoined) {
        // Find the target unit
        const targetUnit = armyForgeUnits.find(u => (u.selectionId || u.id) === unit.joinToUnit);
        if (targetUnit) {
          // Create joined container
          const container = await this.createJoinedContainer(targetUnit, unit, options);
          containers.push(container);
          processedUnits.add(targetUnit.selectionId || targetUnit.id);
          processedUnits.add(unitSelectionId);
          continue;
        } else {
          warnings.push(`Unit ${unit.customName || unit.name} wants to join ${unit.joinToUnit} but target not found`);
        }
      }

      // Check if another unit wants to join this one
      const joiningUnit = armyForgeUnits.find(u => u.joinToUnit === unitSelectionId);
      if (joiningUnit && options.allowJoined && !processedUnits.has(joiningUnit.selectionId || joiningUnit.id)) {
        // Create joined container
        const container = await this.createJoinedContainer(unit, joiningUnit, options);
        containers.push(container);
        processedUnits.add(unitSelectionId);
        processedUnits.add(joiningUnit.selectionId || joiningUnit.id);
        continue;
      }

      // Create standard container with single subunit
      const container = await this.createStandardContainer(unit, options);
      containers.push(container);
      processedUnits.add(unitSelectionId);
    }

    // Process combined units if enabled
    if (options.allowCombined) {
      const combinedResult = this.processCombinedUnits(containers);
      warnings.push(...combinedResult.warnings);
    }

    return { units: containers, warnings, errors };
  }

  /**
   * Create a joined container unit (hero + regular unit)
   */
  private static async createJoinedContainer(
    regularUnit: ArmyForgeUnit,
    heroUnit: ArmyForgeUnit,
    options: BattleSyncConversionOptions
  ): Promise<BattleSyncUnit> {
    
    // Convert both units to subunits
    const regularSubunit = await this.convertToSubunit(regularUnit, options);
    const heroSubunit = await this.convertToSubunit(heroUnit, options);

    // Calculate totals
    const originalSize = regularSubunit.models.length + heroSubunit.models.length;
    const originalToughTotal = this.calculateTotalTough(regularSubunit.models) + 
                              this.calculateTotalTough(heroSubunit.models);

    // Create combined weapon summary
    const weaponSummary = this.createWeaponSummary([regularSubunit, heroSubunit]);

    // Create container name
    const containerName = options.preserveCustomNames 
      ? `${regularUnit.customName || regularUnit.name} with ${heroUnit.customName || heroUnit.name}`
      : `${regularUnit.name} with ${heroUnit.name}`;

    return {
      battleSyncUnitId: uuidv4(),
      isJoined: true,
      name: containerName,
      originalSize,
      currentSize: originalSize,
      originalToughTotal,
      currentToughTotal: originalToughTotal,
      
      // Battle state
      action: null,
      fatigued: false,
      shaken: false,
      routed: false,
      casualty: false,
      
      // Deployment state
      deploymentState: {
        status: 'PENDING',
        deploymentMethod: 'STANDARD'
      },
      
      // Combat tracking
      kills: [],
      
      // UI data
      weaponSummary,
      activationState: {
        canActivate: true,
        hasActivated: false,
        activatedInRound: 0,
        activatedInTurn: 0,
        isSelected: false,
        actionPoints: 1,
        actionsUsed: []
      },
      
      // Subunits (regular unit first, then hero)
      subunits: [regularSubunit, heroSubunit],
      
      // Metadata
      metadata: {
        sourceUnits: [regularUnit, heroUnit]
      }
    };
  }

  /**
   * Create a standard container unit (single subunit)
   */
  private static async createStandardContainer(
    unit: ArmyForgeUnit,
    options: BattleSyncConversionOptions
  ): Promise<BattleSyncUnit> {
    
    const subunit = await this.convertToSubunit(unit, options);
    const originalToughTotal = this.calculateTotalTough(subunit.models);

    return {
      battleSyncUnitId: uuidv4(),
      isJoined: false,
      name: options.preserveCustomNames ? (unit.customName || unit.name) : unit.name,
      originalSize: subunit.models.length,
      currentSize: subunit.models.length,
      originalToughTotal,
      currentToughTotal: originalToughTotal,
      
      // Battle state
      action: null,
      fatigued: false,
      shaken: false,
      routed: false,
      casualty: false,
      
      // Deployment state
      deploymentState: {
        status: 'PENDING',
        deploymentMethod: this.determineDeploymentMethod(unit)
      },
      
      // Combat tracking
      kills: [],
      
      // UI data
      weaponSummary: this.createWeaponSummary([subunit]),
      activationState: {
        canActivate: true,
        hasActivated: false,
        activatedInRound: 0,
        activatedInTurn: 0,
        isSelected: false,
        actionPoints: 1,
        actionsUsed: []
      },
      
      // Single subunit
      subunits: [subunit],
      
      // Metadata
      metadata: {
        sourceUnits: [unit]
      }
    };
  }

  /**
   * Convert ArmyForge unit to BattleSync subunit
   */
  private static async convertToSubunit(
    unit: ArmyForgeUnit,
    options: BattleSyncConversionOptions
  ): Promise<BattleSyncSubunit> {
    
    // Convert models
    const models: BattleSyncModel[] = [];
    if (unit.models && unit.models.length > 0) {
      // Use detailed model data
      for (let i = 0; i < unit.models.length; i++) {
        const model = unit.models[i];
        const battleModel = this.convertModelToBattleSync(model, unit, i);
        models.push(battleModel);
      }
    } else {
      // Create models from unit size
      const modelCount = unit.size || 1;
      for (let i = 0; i < modelCount; i++) {
        const battleModel = this.createModelFromUnit(unit, i);
        models.push(battleModel);
      }
    }

    // Convert weapons
    const weapons = this.convertWeaponsToBattleSync(unit);

    // Determine if hero
    const isHero = unit.specialRules?.includes('Hero') || false;

    return {
      armyForgeUnitId: unit.id,
      name: unit.name,
      customName: options.preserveCustomNames ? unit.customName : undefined,
      isHero,
      isCombined: unit.combined || false,
      quality: unit.quality || 4,
      defense: unit.defense || 5,
      factionId: unit.armyId || 'unknown',
      models,
      weapons,
      specialRules: unit.specialRules || []
    };
  }

  /**
   * Convert ArmyForge model to BattleSync model
   */
  private static convertModelToBattleSync(
    model: ArmyForgeModel,
    unit: ArmyForgeUnit,
    index: number
  ): BattleSyncModel {
    
    const isHero = unit.specialRules?.includes('Hero') || false;
    const isCaster = unit.specialRules?.some(rule => rule.startsWith('Caster')) || false;
    
    let casterTokens = 0;
    if (isCaster) {
      // Extract caster token count from rules like "Caster(2)"
      const casterRule = (unit.specialRules || [])
        .find(rule => rule.startsWith('Caster'));
      if (casterRule) {
        const match = casterRule.match(/Caster\((\d+)\)/);
        if (match) {
          casterTokens = parseInt(match[1]);
        }
      }
    }

    // Get tough from model stats or use default
    const toughValue = model.stats?.wounds || 1;

    return {
      modelId: `${unit.id}_model_${index}`,
      name: model.name || `${unit.name} Model ${index + 1}`,
      customName: undefined, // Models don't have custom names in our system
      currentTough: toughValue,
      maxTough: toughValue,
      isDestroyed: false,
      isCaster,
      casterTokens,
      isHero
    };
  }

  /**
   * Create model from unit data (when no detailed models available)
   */
  private static createModelFromUnit(unit: ArmyForgeUnit, index: number): BattleSyncModel {
    const isHero = unit.specialRules?.includes('Hero') || false;
    const isCaster = unit.specialRules?.some(rule => rule.startsWith('Caster')) || false;
    
    let casterTokens = 0;
    if (isCaster) {
      const casterRule = unit.specialRules?.find(rule => rule.startsWith('Caster'));
      if (casterRule) {
        const match = casterRule.match(/Caster\((\d+)\)/);
        if (match) {
          casterTokens = parseInt(match[1]);
        }
      }
    }

    // Use default tough value since we don't have model-specific data
    const toughValue = 1;

    return {
      modelId: `${unit.id}_model_${index}`,
      name: `${unit.name} Model ${index + 1}`,
      customName: undefined,
      currentTough: toughValue,
      maxTough: toughValue,
      isDestroyed: false,
      isCaster,
      casterTokens,
      isHero
    };
  }

  /**
   * Convert ArmyForge weapons to structured BattleSync weapons
   */
  private static convertWeaponsToBattleSync(unit: ArmyForgeUnit): BattleSyncWeapon[] {
    const weapons: BattleSyncWeapon[] = [];
    
    if (!unit.loadout) {
      return weapons;
    }

    for (const weapon of unit.loadout) {
      // Parse weapon rules
      const rules: BattleSyncWeaponRule[] = [];
      if (weapon.specialRules) {
        for (const rule of weapon.specialRules) {
          if (typeof rule === 'string') {
            rules.push({ name: rule });
          } else if (rule.name) {
            rules.push({
              name: rule.name,
              value: rule.rating || rule.value
            });
          }
        }
      }

      weapons.push({
        name: weapon.name,
        quantity: weapon.count || 1,
        melee: weapon.range === 0,
        range: weapon.range || 0,
        attacks: weapon.attacks || 1,
        ap: this.extractAPValue(weapon.specialRules || []),
        rules
      });
    }

    return weapons;
  }

  /**
   * Create combined weapon summary from all subunits
   */
  private static createWeaponSummary(subunits: BattleSyncSubunit[]): BattleSyncWeapon[] {
    const weaponMap = new Map<string, BattleSyncWeapon>();

    for (const subunit of subunits) {
      for (const weapon of subunit.weapons) {
        const key = `${weapon.name}_${weapon.range}_${weapon.attacks}_${weapon.ap}`;
        
        if (weaponMap.has(key)) {
          // Combine quantities
          const existing = weaponMap.get(key)!;
          existing.quantity += weapon.quantity;
        } else {
          // Add new weapon
          weaponMap.set(key, { ...weapon });
        }
      }
    }

    return Array.from(weaponMap.values());
  }

  /**
   * Calculate total tough across all models
   */
  private static calculateTotalTough(models: BattleSyncModel[]): number {
    return models.reduce((total, model) => total + model.maxTough, 0);
  }

  /**
   * Determine deployment method based on special rules
   */
  private static determineDeploymentMethod(unit: ArmyForgeUnit): 'STANDARD' | 'AMBUSH' | 'SCOUT' | 'TRANSPORT' {
    const rules = unit.specialRules || [];
    
    if (rules.some(rule => ['Ambush', 'Hidden Route', 'Surprise Attack', 'Dark Assault', 'Shadow', 'Tunneller'].includes(rule))) {
      return 'AMBUSH';
    }
    
    if (rules.some(rule => ['Scout', 'Pathfinder', 'Reconnaissance'].includes(rule))) {
      return 'SCOUT';
    }
    
    return 'STANDARD';
  }

  /**
   * Process combined units logic
   */
  private static processCombinedUnits(containers: BattleSyncUnit[]): {warnings: string[]} {
    const warnings: string[] = [];
    
    // For now, just mark subunits as combined if they have the combined flag
    for (const container of containers) {
      for (const subunit of container.subunits) {
        if (subunit.isCombined) {
          warnings.push(`Unit ${subunit.name} has combined flag but combination logic not fully implemented`);
        }
      }
    }
    
    return { warnings };
  }

  /**
   * Extract AP value from weapon special rules
   */
  private static extractAPValue(specialRules: any[]): number {
    for (const rule of specialRules) {
      if (typeof rule === 'string' && rule.startsWith('AP(')) {
        const match = rule.match(/AP\((\d+)\)/);
        if (match) {
          return parseInt(match[1]);
        }
      } else if (rule.name === 'AP' && rule.rating) {
        return rule.rating;
      }
    }
    return 0;
  }

  /**
   * Calculate command points based on army points and method
   */
  private static calculateCommandPoints(
    armyPoints: number, 
    method: string
  ): number {
    switch (method) {
      case 'fixed':
      case 'fixed-random':
        return Math.ceil(armyPoints / 500);
      case 'growing':
      case 'growing-random':
        return 1; // Starts at 1, grows each round
      case 'temporary':
      case 'temporary-random':
        return Math.ceil(armyPoints / 500); // Refreshes each round
      default:
        return Math.ceil(armyPoints / 500);
    }
  }
}