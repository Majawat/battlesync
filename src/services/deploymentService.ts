import { 
  OPRBattleUnit, 
  OPRBattleState, 
  OPRDeploymentState,
  OPRUnitDeploymentStatus,
  DeploymentRuleGranter 
} from '../types/oprBattle';
import { logger } from '../utils/logger';

export class DeploymentService {

  // Rules that grant deployment abilities
  private static readonly DEPLOYMENT_RULE_GRANTERS: DeploymentRuleGranter[] = [
    { ruleName: 'Hidden Route', grants: 'AMBUSH', description: 'This model and its unit get Ambush.' },
    { ruleName: 'Surprise Attack', grants: 'AMBUSH', description: 'Unit may deploy via Ambush' },
    { ruleName: 'Dark Assault', grants: 'AMBUSH', description: 'Unit may deploy via Ambush' },
    { ruleName: 'Shadow', grants: 'AMBUSH', description: 'Unit may deploy via Ambush' },
    { ruleName: 'Tunneller', grants: 'AMBUSH', description: 'Unit may deploy via Ambush' },
    // Add more as discovered
  ];

  /**
   * Check if a unit has deployment abilities based on its special rules
   */
  static getUnitDeploymentCapabilities(unit: OPRBattleUnit): {
    canAmbush: boolean;
    canScout: boolean;
    canEmbark: boolean;
    hasTransport: boolean;
  } {
    const allRules = [...unit.specialRules];
    
    // Add joined hero rules if present
    if (unit.joinedHero) {
      allRules.push(...unit.joinedHero.specialRules);
    }

    // Check direct rules
    const hasAmbush = allRules.some(rule => 
      rule.toLowerCase().includes('ambush')
    );

    const hasScout = allRules.some(rule => 
      rule.toLowerCase().includes('scout')
    );

    // Check rules that grant deployment abilities
    const grantsAmbush = allRules.some(rule => 
      this.DEPLOYMENT_RULE_GRANTERS.some(granter => 
        granter.ruleName.toLowerCase() === rule.toLowerCase() && 
        granter.grants === 'AMBUSH'
      )
    );

    const grantsScout = allRules.some(rule => 
      this.DEPLOYMENT_RULE_GRANTERS.some(granter => 
        granter.ruleName.toLowerCase() === rule.toLowerCase() && 
        granter.grants === 'SCOUT'
      )
    );

    // Check for transport capability
    const hasTransport = allRules.some(rule => 
      rule.toLowerCase().includes('transport(')
    );

    return {
      canAmbush: hasAmbush || grantsAmbush,
      canScout: hasScout || grantsScout,
      canEmbark: true, // All units can embark in available transports
      hasTransport
    };
  }

  /**
   * Initialize deployment state when entering deployment phase
   */
  static initializeDeploymentState(
    battleState: OPRBattleState,
    rollOffWinner: string,
    chosenFirstPlayer: string
  ): OPRDeploymentState {
    
    // Create alternating deployment order starting with chosen player
    const playerIds = battleState.armies.map(army => army.userId);
    const otherPlayer = playerIds.find(id => id !== chosenFirstPlayer)!;
    
    const deploymentOrder: string[] = [];
    const maxUnits = Math.max(...battleState.armies.map(army => army.units.length));
    
    for (let i = 0; i < maxUnits; i++) {
      deploymentOrder.push(chosenFirstPlayer);
      if (i < maxUnits - 1) { // Don't add other player if we're at the end
        deploymentOrder.push(otherPlayer);
      }
    }

    // Separate units by deployment type
    const unitsToDeploy: Record<string, string[]> = {};
    const ambushUnits: string[] = [];
    const scoutUnits: string[] = [];

    for (const army of battleState.armies) {
      unitsToDeploy[army.userId] = [];
      
      for (const unit of army.units) {
        // Initialize unit deployment state
        const capabilities = this.getUnitDeploymentCapabilities(unit);
        
        unit.deploymentState = {
          status: 'PENDING',
          deploymentMethod: 'STANDARD'
        };

        // Standard deployment units
        unitsToDeploy[army.userId].push(unit.unitId);

        // Track special deployment units for later phases
        if (capabilities.canAmbush) {
          ambushUnits.push(unit.unitId);
        }
        if (capabilities.canScout) {
          scoutUnits.push(unit.unitId);
        }
      }
    }

    return {
      phase: 'DEPLOYMENT',
      currentDeployingPlayer: chosenFirstPlayer,
      deploymentTurn: 1,
      firstDeployingPlayer: chosenFirstPlayer,
      deploymentOrder,
      unitsToDeploy,
      unitsDeployed: Object.fromEntries(playerIds.map(id => [id, []])),
      ambushUnits,
      scoutUnits,
      allUnitsDeployed: false,
      readyForBattle: false
    };
  }

  /**
   * Get available deployment actions for a unit
   */
  static getAvailableDeploymentActions(
    unit: OPRBattleUnit,
    battleState: OPRBattleState
  ): {
    canDeploy: boolean;
    canAmbush: boolean;
    canScout: boolean;
    canEmbark: boolean;
    availableTransports: OPRBattleUnit[];
  } {
    if (unit.deploymentState.status !== 'PENDING') {
      return {
        canDeploy: false,
        canAmbush: false,
        canScout: false,
        canEmbark: false,
        availableTransports: []
      };
    }

    const capabilities = this.getUnitDeploymentCapabilities(unit);
    
    // Find available transports in same army
    const sameArmy = battleState.armies.find(army => 
      army.units.some(u => u.unitId === unit.unitId)
    );
    
    const availableTransports = sameArmy?.units.filter(u => 
      capabilities.hasTransport && 
      u.deploymentState.status === 'DEPLOYED' &&
      // TODO: Check transport capacity
      true
    ) || [];

    return {
      canDeploy: true,
      canAmbush: capabilities.canAmbush,
      canScout: capabilities.canScout,
      canEmbark: availableTransports.length > 0,
      availableTransports
    };
  }

  /**
   * Deploy a unit with standard deployment
   */
  static deployUnit(
    battleId: string,
    userId: string,
    unitId: string,
    battleState: OPRBattleState
  ): { success: boolean; error?: string } {
    
    const deploymentState = battleState.activationState.deploymentState;
    if (!deploymentState || deploymentState.phase !== 'DEPLOYMENT') {
      return { success: false, error: 'Not in deployment phase' };
    }

    if (deploymentState.currentDeployingPlayer !== userId) {
      return { success: false, error: 'Not your turn to deploy' };
    }

    const unit = this.findUnit(battleState, unitId);
    if (!unit) {
      return { success: false, error: 'Unit not found' };
    }

    if (unit.deploymentState.status !== 'PENDING') {
      return { success: false, error: 'Unit already deployed' };
    }

    // Deploy the unit
    unit.deploymentState.status = 'DEPLOYED';
    unit.deploymentState.deployedInTurn = deploymentState.deploymentTurn;
    unit.deploymentState.deploymentMethod = 'STANDARD';

    // Update deployment tracking
    deploymentState.unitsDeployed[userId].push(unitId);
    deploymentState.unitsToDeploy[userId] = deploymentState.unitsToDeploy[userId]
      .filter(id => id !== unitId);

    // Advance to next player
    this.advanceDeploymentTurn(deploymentState);

    logger.info(`Unit ${unitId} deployed by player ${userId} in battle ${battleId}`);
    return { success: true };
  }

  /**
   * Set unit to ambush reserves
   */
  static setUnitToAmbush(
    battleId: string,
    userId: string,
    unitId: string,
    battleState: OPRBattleState
  ): { success: boolean; error?: string } {
    
    const unit = this.findUnit(battleState, unitId);
    if (!unit) {
      return { success: false, error: 'Unit not found' };
    }

    const capabilities = this.getUnitDeploymentCapabilities(unit);
    if (!capabilities.canAmbush) {
      return { success: false, error: 'Unit cannot use Ambush deployment' };
    }

    if (unit.deploymentState.status !== 'PENDING') {
      return { success: false, error: 'Unit already deployed' };
    }

    // Set to ambush reserves
    unit.deploymentState.status = 'RESERVES';
    unit.deploymentState.deploymentMethod = 'AMBUSH';
    unit.deploymentState.canDeployThisRound = false; // Can't deploy round 1

    const deploymentState = battleState.activationState.deploymentState!;
    deploymentState.unitsDeployed[userId].push(unitId);
    deploymentState.unitsToDeploy[userId] = deploymentState.unitsToDeploy[userId]
      .filter(id => id !== unitId);

    // Advance to next player
    this.advanceDeploymentTurn(deploymentState);

    logger.info(`Unit ${unitId} set to ambush by player ${userId} in battle ${battleId}`);
    return { success: true };
  }

  /**
   * Check if deployment is complete and battle can start
   */
  static checkDeploymentComplete(battleState: OPRBattleState): boolean {
    const deploymentState = battleState.activationState.deploymentState;
    if (!deploymentState) return false;

    // Check if all players have deployed all their units
    const allDeployed = Object.values(deploymentState.unitsToDeploy)
      .every(units => units.length === 0);

    if (allDeployed) {
      deploymentState.allUnitsDeployed = true;
      deploymentState.readyForBattle = true;
      deploymentState.phase = 'COMPLETED';
    }

    return allDeployed;
  }

  // Helper methods
  private static findUnit(battleState: OPRBattleState, unitId: string): OPRBattleUnit | null {
    for (const army of battleState.armies) {
      const unit = army.units.find(u => u.unitId === unitId);
      if (unit) return unit;
    }
    return null;
  }

  private static advanceDeploymentTurn(deploymentState: OPRDeploymentState): void {
    deploymentState.deploymentTurn++;
    
    if (deploymentState.deploymentTurn <= deploymentState.deploymentOrder.length) {
      deploymentState.currentDeployingPlayer = 
        deploymentState.deploymentOrder[deploymentState.deploymentTurn - 1];
    } else {
      // All deployment turns complete
      deploymentState.currentDeployingPlayer = undefined;
    }
  }
}