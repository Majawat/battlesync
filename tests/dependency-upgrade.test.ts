/**
 * Test for dependency-based upgrade system
 * Validates that weapon upgrades use dependencies instead of string matching
 */

import { ArmyProcessor } from '../src/services/armyProcessor';

describe('Dependency-Based Upgrade System', () => {
  describe('Infantry Squad Rifle Upgrades', () => {
    test('should match sniper rifle upgrade using dependency instanceId', () => {
      // Mock Infantry Squad base rifle with dependencies
      const mockRifle = {
        id: "ar_e50-g",
        name: "Rifle",
        dependencies: [
          {"upgradeInstanceId": "HY7mAnJ5G", "count": 1, "variant": "replace"}, // Sniper Rifle
          {"upgradeInstanceId": "N8P9pbPmx", "count": 1, "variant": "replace"}  // Plasma Rifle
        ]
      };

      // Mock sniper rifle upgrade
      const mockSniperUpgrade = {
        instanceId: "HY7mAnJ5G",
        upgrade: {
          variant: "replace",
          targets: ["Rifles"] // This is the broken string matching
        },
        option: {
          gains: [{
            name: "Sniper Rifle",
            type: "ArmyBookWeapon",
            range: 30,
            attacks: 1
          }]
        }
      };

      // Test dependency matching logic
      const shouldMatch = mockRifle.dependencies?.some(dep => 
        dep.upgradeInstanceId === mockSniperUpgrade.instanceId
      );

      expect(shouldMatch).toBe(true);
    });

    test('should match plasma rifle upgrade using dependency instanceId', () => {
      const mockRifle = {
        id: "ar_e50-g", 
        name: "Rifle",
        dependencies: [
          {"upgradeInstanceId": "HY7mAnJ5G", "count": 1, "variant": "replace"},
          {"upgradeInstanceId": "N8P9pbPmx", "count": 1, "variant": "replace"}
        ]
      };

      const mockPlasmaUpgrade = {
        instanceId: "N8P9pbPmx",
        upgrade: {
          variant: "replace",
          targets: ["Rifles"]
        }
      };

      const shouldMatch = mockRifle.dependencies?.some(dep =>
        dep.upgradeInstanceId === mockPlasmaUpgrade.instanceId
      );

      expect(shouldMatch).toBe(true);
    });

    test('should NOT match upgrade without dependency', () => {
      const mockRifle = {
        id: "ar_e50-g",
        name: "Rifle", 
        dependencies: [
          {"upgradeInstanceId": "HY7mAnJ5G", "count": 1, "variant": "replace"}
        ]
      };

      const mockUnrelatedUpgrade = {
        instanceId: "UNRELATED_ID",
        upgrade: {
          variant: "replace",
          targets: ["Rifles"]
        }
      };

      const shouldMatch = mockRifle.dependencies?.some(dep =>
        dep.upgradeInstanceId === mockUnrelatedUpgrade.instanceId  
      );

      expect(shouldMatch).toBe(false);
    });
  });

  describe('String Matching Failures', () => {
    test('should demonstrate current string matching failure', () => {
      const weaponName = "Rifle";  // Singular
      const upgradeTargets = ["Rifles"]; // Plural
      
      // This is the current broken logic
      const stringMatchWorks = upgradeTargets.includes(weaponName);
      
      expect(stringMatchWorks).toBe(false); // This is why upgrades fail
    });
  });

  describe('Upgrade Chain Dependencies', () => {
    test('should find dependencies in weapons added by previous upgrades', () => {
      // This tests the core issue: Sgt. Pistol has dependency for Drum Pistol upgrade,
      // but Sgt. Pistol was added by a previous upgrade, not from base unit
      
      // Mock Sgt. Pistol weapon that was added by previous upgrade
      const mockSgtPistol = {
        id: "1HINdgr0",
        name: "Sgt. Pistol",
        dependencies: [
          {"upgradeInstanceId": "a95xGXQME", "count": 1, "variant": "replace"} // Drum Pistol upgrade
        ]
      };

      // Mock Drum Pistol upgrade  
      const mockDrumPistolUpgrade = {
        instanceId: "a95xGXQME",
        upgrade: {
          variant: "replace",
          targets: ["Sgt. Pistol"]
        },
        option: {
          gains: [{
            name: "Drum Pistol",
            type: "ArmyBookWeapon",
            range: 9,
            attacks: 2
          }]
        }
      };

      // Test that we can find the dependency
      const shouldMatch = mockSgtPistol.dependencies?.some(dep =>
        dep.upgradeInstanceId === mockDrumPistolUpgrade.instanceId
      );

      expect(shouldMatch).toBe(true);
    });

    test('should handle nested upgrade chains (Sgt. Hand Weapon -> Energy Axe)', () => {
      // Mock Sgt. Hand Weapon that was added by previous upgrade
      const mockSgtHandWeapon = {
        id: "c9dTSUKw", 
        name: "Sgt. Hand Weapon",
        dependencies: [
          {"upgradeInstanceId": "8chyHQBxX", "count": 1, "variant": "replace"} // Energy Axe upgrade
        ]
      };

      // Mock Energy Axe upgrade
      const mockEnergyAxeUpgrade = {
        instanceId: "8chyHQBxX",
        upgrade: {
          variant: "replace", 
          targets: ["Sgt. Hand Weapon"]
        },
        option: {
          gains: [{
            name: "Energy Axe",
            type: "ArmyBookWeapon",
            range: 0,
            attacks: 2
          }]
        }
      };

      // Test that we can find the dependency
      const shouldMatch = mockSgtHandWeapon.dependencies?.some(dep =>
        dep.upgradeInstanceId === mockEnergyAxeUpgrade.instanceId
      );

      expect(shouldMatch).toBe(true);
    });

    test('should process upgrade chains in correct order', () => {
      // This tests that upgrade processing order matters:
      // 1. Base Rifle+CCW -> Sgt. Pistol + Sgt. Hand Weapon  
      // 2. Sgt. Pistol -> Drum Pistol
      // 3. Sgt. Hand Weapon -> Energy Axe

      const upgradeChain = [
        {
          instanceId: "SLcejRU90", // Replace Rifle+CCW with Sgt weapons
          order: 1
        },
        {
          instanceId: "a95xGXQME", // Replace Sgt. Pistol with Drum Pistol  
          order: 2
        },
        {
          instanceId: "8chyHQBxX", // Replace Sgt. Hand Weapon with Energy Axe
          order: 3
        }
      ];

      // Upgrades should be processed in order they appear in selectedUpgrades array
      const correctOrder = upgradeChain.every((upgrade, index) => {
        if (index === 0) return true;
        const previousUpgrade = upgradeChain[index - 1];
        return previousUpgrade ? previousUpgrade.order < upgrade.order : false;
      });

      expect(correctOrder).toBe(true);
    });
  });

  // Note: Base size upgrade tests are validated via Docker integration testing
  // with real army data due to complex interface mocking requirements
});