import { NewArmyProcessor } from '../src/services/newArmyProcessor';
import { ArmyForgeArmy, ArmyForgeUnit } from '../src/types/armyforge';

describe('NewArmyProcessor', () => {
  describe('processArmy', () => {
    test('should process Grinder Truck with single model upgrades correctly', () => {
      // Mock Grinder Truck data based on our analysis
      const grinderTruckUnit: ArmyForgeUnit = {
        id: 'q6fx4lG',
        selectionId: 'Ym0TT',
        name: 'Grinder Truck',
        customName: 'Grindr Love Truck',
        size: 1,
        quality: 4,
        defense: 2,
        cost: 285,
        xp: 5,
        traits: ['Agile', 'Elite', 'Headstrong', 'Fast Learner', 'Specialist', 'Resilient'],
        bases: { round: 'none', square: 'none' },
        combined: false,
        joinToUnit: null,
        rules: [
          { id: 'KdgwlPb8LuD2', name: 'Fast', label: 'Fast' },
          { id: '62-mYKVM9MLd', name: 'Impact', rating: 3, label: 'Impact(3)' },
          { id: 'JSKVyurtWIyW', name: 'Strider', label: 'Strider' },
          { id: 'a0YtInGiUDd6', name: 'Tough', rating: 9, label: 'Tough(9)' },
          { id: 'aogQZcOOQrDI', name: 'Transport', rating: 6, label: 'Transport(6)' }
        ],
        weapons: [
          {
            id: '_OuuPXyd',
            name: 'Heavy Machinegun',
            type: 'ArmyBookWeapon',
            range: 30,
            attacks: 3,
            weaponId: '_OuuPXyd',
            specialRules: [{ type: 'ArmyBookRule', id: '17crjK7P6_w6', name: 'AP', rating: 1, label: 'AP(1)' }],
            label: 'Heavy Machinegun (30", A3, AP(1))',
            count: 1,
            originalCount: 1
          },
          {
            id: 'b15ZGemJ',
            name: 'Heavy Quake Cannon',
            type: 'ArmyBookWeapon',
            count: 1,
            range: 24,
            attacks: 2,
            weaponId: 'uWZ7nsBU',
            specialRules: [
              { type: 'ArmyBookRule', id: 'w_vX0mi58KKt', name: 'Blast', rating: 3, label: 'Blast(3)' },
              { type: 'ArmyBookRule', id: 'cavWDboL4ubs', name: 'Rending', label: 'Rending' }
            ],
            label: 'Heavy Quake Cannon (24", A2, Blast(3), Rending)',
            originalCount: 1,
            dependencies: [{ upgradeInstanceId: '0hciRfLyY', count: 1, variant: 'replace' }]
          }
        ],
        items: [],
        upgrades: ['D2'],
        selectedUpgrades: [
          {
            instanceId: '5aNRiO6Rx',
            upgrade: {
              id: 'UoIEmD9',
              uid: 'Q9Msl',
              label: 'Upgrade with',
              parentPackageUid: 'D2',
              type: 'ArmyBookUpgradeSection',
              variant: 'upgrade'
            },
            option: {
              uid: 'sPtME',
              cost: 25,
              type: 'ArmyBookUpgradeOption',
              costs: [{ cost: 25, unitId: 'q6fx4lG' }],
              gains: [{
                name: 'Great Grinder',
                type: 'ArmyBookItem',
                bases: null,
                label: 'Great Grinder (Impact(5))',
                content: [{
                  id: '62-mYKVM9MLd',
                  name: 'Impact',
                  type: 'ArmyBookRule',
                  rating: 5,
                  dependencies: []
                }],
                count: 1,
                dependencies: []
              }],
              label: 'Great Grinder (Impact(5))',
              parentSectionId: 'Q9Msl',
              id: 'sPtME'
            }
          },
          {
            instanceId: '0hciRfLyY',
            upgrade: {
              id: 'hC0oFvN',
              uid: 'lkbv4rH',
              label: 'Replace Heavy Quake Cannon',
              parentPackageUid: 'D2',
              type: 'ArmyBookUpgradeSection',
              variant: 'replace',
              targets: ['Heavy Quake Cannon']
            },
            option: {
              uid: 'Ijpb1fK',
              cost: 25,
              type: 'ArmyBookUpgradeOption',
              costs: [{ cost: 35, unitId: 'q6fx4lG' }],
              gains: [{
                name: 'Rapid Heavy Mining Laser',
                type: 'ArmyBookWeapon',
                count: 1,
                range: 24,
                attacks: '2',
                weaponId: 'usxbIqqy',
                specialRules: [
                  { id: '17crjK7P6_w6', name: 'AP', type: 'ArmyBookRule', rating: 3 },
                  { id: '_mrPya5SXSqW', name: 'Deadly', type: 'ArmyBookRule', rating: 3 }
                ],
                label: 'Rapid Heavy Mining Laser (24", A2, AP(3), Deadly(3))',
                dependencies: []
              }],
              label: 'Rapid Heavy Mining Laser (24", A2, AP(3), Deadly(3))',
              parentPackageUid: 'D2',
              parentSectionUid: 'lkbv4rH',
              parentSectionId: 'lkbv4rH',
              id: 'Ijpb1fK'
            }
          }
        ],
        loadout: [
          {
            id: '_OuuPXyd',
            name: 'Heavy Machinegun',
            type: 'ArmyBookWeapon',
            range: 30,
            attacks: 3,
            weaponId: '_OuuPXyd',
            specialRules: [{ type: 'ArmyBookRule', id: '17crjK7P6_w6', name: 'AP', rating: 1, label: 'AP(1)' }],
            label: 'Heavy Machinegun (30", A3, AP(1))',
            count: 1,
            originalCount: 1
          },
          {
            name: 'Great Grinder',
            type: 'ArmyBookItem',
            bases: null,
            label: 'Great Grinder (Impact(5))',
            content: [{
              id: '62-mYKVM9MLd',
              name: 'Impact',
              type: 'ArmyBookRule',
              rating: 5,
              dependencies: [],
              count: 1
            }],
            count: 1,
            dependencies: []
          },
          {
            name: 'Rapid Heavy Mining Laser',
            type: 'ArmyBookWeapon',
            count: 1,
            range: 24,
            attacks: '2',
            weaponId: 'usxbIqqy',
            specialRules: [
              { id: '17crjK7P6_w6', name: 'AP', type: 'ArmyBookRule', rating: 3 },
              { id: '_mrPya5SXSqW', name: 'Deadly', type: 'ArmyBookRule', rating: 3 }
            ],
            label: 'Rapid Heavy Mining Laser (24", A2, AP(3), Deadly(3))',
            dependencies: []
          }
        ],
        armyId: 'zz3kp5ry7ks6mxcx',
        valid: true,
        hasCustomRule: false,
        disabledSections: [],
        hasBalanceInvalid: false,
        disabledUpgradeSections: []
      };

      const mockArmy: ArmyForgeArmy = {
        id: 'IJ1JM_m-jmka',
        name: "Dev Testerson's Bullshit Army",
        description: 'An army full of bullshit units.',
        pointsLimit: 2997,
        listPoints: 2930,
        modelCount: 44,
        activationCount: 8,
        gameSystem: 'gf',
        campaignMode: true,
        units: [grinderTruckUnit],
        forceOrgErrors: []
      };

      const result = NewArmyProcessor.processArmy(mockArmy);
      
      // Verify basic army structure
      expect(result.units).toHaveLength(1);
      
      const unit = result.units[0];
      expect(unit.name).toBe('Grindr Love Truck');
      expect(unit.model_count).toBe(1);
      expect(unit.is_combined).toBe(false);
      expect(unit.is_joined).toBe(false);
      
      // Verify sub-unit
      expect(unit.sub_units).toHaveLength(1);
      const subUnit = unit.sub_units[0];
      expect(subUnit.size).toBe(1);
      
      // Verify model processing
      expect(subUnit.models).toHaveLength(1);
      const model = subUnit.models[0];
      
      // Should have Tough(9) base health
      expect(model.max_tough).toBe(9);
      expect(model.current_tough).toBe(9);
      
      // Should have correct weapons
      expect(model.weapons).toHaveLength(2);
      const weaponNames = model.weapons.map(w => w.name).sort();
      expect(weaponNames).toEqual(['Heavy Machinegun', 'Rapid Heavy Mining Laser']);
      
      // Should NOT have Heavy Quake Cannon (replaced by upgrade)
      expect(model.weapons.find(w => w.name === 'Heavy Quake Cannon')).toBeUndefined();
      
      // Should have upgrade record for Great Grinder
      expect(model.upgrades).toHaveLength(1);
      const upgrade = model.upgrades[0];
      expect(upgrade.name).toBe('Great Grinder (Impact(5))');
      expect(upgrade.rules).toHaveLength(1);
      expect(upgrade.rules[0].name).toBe('Impact');
      expect(upgrade.rules[0].rating).toBe(5);
    });

    test('should process Wall of Shame Sisters with complex multi-model upgrades', () => {
      // Mock simplified Wall of Shame Sisters data
      const destroyerSistersUnit: ArmyForgeUnit = {
        id: '1oucreF',
        selectionId: 'GRN0e',
        name: 'Destroyer Sisters',
        customName: 'Wall of Shame Sisters',
        size: 3,
        quality: 4,
        defense: 4,
        cost: 135,
        xp: 0,
        traits: [],
        bases: { round: '40', square: '40' },
        combined: false,
        joinToUnit: null,
        rules: [
          { id: '6mJw5IdqSqNC', name: 'Ambush', label: 'Ambush' },
          { id: 'j_GPMzrugrCj', name: 'Devout', additional: false, label: 'Devout' },
          { id: 'a0YtInGiUDd6', name: 'Tough', rating: 3, label: 'Tough(3)' }
        ],
        weapons: [{
          id: '1GVQ5U_c',
          name: 'CCW',
          type: 'ArmyBookWeapon',
          count: 3,
          range: 0,
          attacks: 3,
          weaponId: 'tO5jEqMO',
          specialRules: [],
          label: 'CCW (A3)',
          originalCount: 3,
          dependencies: [
            { upgradeInstanceId: 'D3rT6zU1R', count: 1, variant: 'replace' },
            { upgradeInstanceId: 'Z5YQiM-27', count: 1, variant: 'replace' },
            { upgradeInstanceId: '7z8kB7RR9', count: 1, variant: 'replace' }
          ]
        }],
        items: [{
          id: 'Q8WK1',
          name: 'Combat Shield',
          type: 'ArmyBookItem',
          bases: null,
          content: [{
            id: 'wsqfB0fq69eG',
            name: 'Shield Wall',
            type: 'ArmyBookRule'
          }],
          count: 3
        }],
        upgrades: ['M1'],
        selectedUpgrades: [
          {
            instanceId: 'D3rT6zU1R',
            upgrade: {
              id: 'enEHJVj',
              uid: 'TNUc16_',
              label: 'Replace any CCW',
              parentPackageUid: 'M1',
              type: 'ArmyBookUpgradeSection',
              variant: 'replace',
              affects: { type: 'any' },
              targets: ['CCW']
            },
            option: {
              uid: '0vd07Zg',
              cost: 15,
              type: 'ArmyBookUpgradeOption',
              costs: [{ cost: 20, unitId: '1oucreF' }],
              gains: [{
                id: 'kuBk4Uc4',
                name: 'Energy Fist',
                type: 'ArmyBookWeapon',
                range: 0,
                attacks: 3,
                weaponId: 'p2SC0q9O',
                specialRules: [{ id: '17crjK7P6_w6', name: 'AP', type: 'ArmyBookRule', rating: 4 }],
                label: 'Energy Fist (A3, AP(4))',
                count: 1,
                dependencies: []
              }],
              label: 'Energy Fist (A3, AP(4))',
              parentPackageUid: 'M1',
              parentSectionUid: 'TNUc16_',
              parentSectionId: 'TNUc16_',
              id: '0vd07Zg'
            }
          },
          {
            instanceId: 'Z5YQiM-27',
            upgrade: {
              id: 'enEHJVj',
              uid: 'TNUc16_',
              label: 'Replace any CCW',
              parentPackageUid: 'M1',
              type: 'ArmyBookUpgradeSection',
              variant: 'replace',
              affects: { type: 'any' },
              targets: ['CCW']
            },
            option: {
              uid: '0vd07Zg',
              cost: 15,
              type: 'ArmyBookUpgradeOption',
              costs: [{ cost: 20, unitId: '1oucreF' }],
              gains: [{
                id: 'kuBk4Uc4',
                name: 'Energy Fist',
                type: 'ArmyBookWeapon',
                range: 0,
                attacks: 3,
                weaponId: 'p2SC0q9O',
                specialRules: [{ id: '17crjK7P6_w6', name: 'AP', type: 'ArmyBookRule', rating: 4 }],
                label: 'Energy Fist (A3, AP(4))',
                count: 1,
                dependencies: []
              }],
              label: 'Energy Fist (A3, AP(4))',
              parentPackageUid: 'M1',
              parentSectionUid: 'TNUc16_',
              parentSectionId: 'TNUc16_',
              id: '0vd07Zg'
            }
          }
        ],
        loadout: [],
        armyId: '7oi8zeiqfamiur21',
        valid: true,
        hasCustomRule: false,
        disabledSections: [],
        hasBalanceInvalid: false,
        disabledUpgradeSections: []
      };

      const mockArmy: ArmyForgeArmy = {
        id: 'test-army',
        name: 'Test Army',
        description: 'Test',
        pointsLimit: 1000,
        listPoints: 135,
        modelCount: 3,
        activationCount: 1,
        gameSystem: 'gf',
        campaignMode: false,
        units: [destroyerSistersUnit],
        forceOrgErrors: []
      };

      const result = NewArmyProcessor.processArmy(mockArmy);
      
      expect(result.units).toHaveLength(1);
      const unit = result.units[0];
      const subUnit = unit.sub_units[0];
      
      // Should have 3 models
      expect(subUnit.models).toHaveLength(3);
      
      // All models should start with Tough(3) + Combat Shield + CCW
      subUnit.models.forEach(model => {
        expect(model.max_tough).toBe(3);
        expect(model.current_tough).toBe(3);
        
        // Should have at least 1 upgrade (Combat Shield)
        expect(model.upgrades.length).toBeGreaterThanOrEqual(1);
      });
      
      // Two models should have Energy Fists (2 upgrades applied)
      const modelsWithEnergyFist = subUnit.models.filter(model => 
        model.weapons.some(weapon => weapon.name === 'Energy Fist')
      );
      expect(modelsWithEnergyFist).toHaveLength(2);
      
      // One model should still have CCW (not replaced)
      const modelsWithCCW = subUnit.models.filter(model => 
        model.weapons.some(weapon => weapon.name === 'CCW')
      );
      expect(modelsWithCCW).toHaveLength(1);
    });

    test('should correctly handle reassignability flags', () => {
      // Test with mock unit that has reassignable upgrades
      const testUnit: ArmyForgeUnit = {
        id: 'test-unit',
        selectionId: 'test-sel',
        name: 'Test Unit',
        size: 2,
        quality: 4,
        defense: 4,
        cost: 100,
        xp: 0,
        traits: [],
        bases: { round: '25', square: '25' },
        combined: false,
        joinToUnit: null,
        rules: [],
        weapons: [{
          id: 'base-weapon',
          name: 'Base Weapon',
          type: 'ArmyBookWeapon',
          count: 2,
          range: 12,
          attacks: 1,
          weaponId: 'base-weapon-id',
          specialRules: [],
          label: 'Base Weapon (12", A1)',
          originalCount: 2,
          dependencies: [{ upgradeInstanceId: 'reassignable-upgrade', count: 1, variant: 'replace' }]
        }],
        items: [],
        upgrades: ['test-package'],
        selectedUpgrades: [{
          instanceId: 'reassignable-upgrade',
          upgrade: {
            id: 'test-upgrade-id',
            uid: 'test-uid',
            label: 'Replace Base Weapon',
            parentPackageUid: 'test-package',
            type: 'ArmyBookUpgradeSection',
            variant: 'replace',
            affects: { type: 'any' },
            targets: ['Base Weapon'],
            select: { type: 'exactly', value: 1 } // This makes it reassignable
          },
          option: {
            uid: 'option-uid',
            cost: 10,
            type: 'ArmyBookUpgradeOption',
            costs: [{ cost: 10, unitId: 'test-unit' }],
            gains: [{
              name: 'Special Weapon',
              type: 'ArmyBookWeapon',
              range: 24,
              attacks: 2,
              weaponId: 'special-weapon-id',
              specialRules: [],
              label: 'Special Weapon (24", A2)',
              count: 1,
              dependencies: []
            }],
            label: 'Special Weapon (24", A2)',
            id: 'option-uid'
          }
        }],
        loadout: [],
        armyId: 'test-army-id',
        valid: true,
        hasCustomRule: false,
        disabledSections: [],
        hasBalanceInvalid: false,
        disabledUpgradeSections: []
      };

      const mockArmy: ArmyForgeArmy = {
        id: 'test-army',
        name: 'Test Army',
        description: 'Test',
        pointsLimit: 1000,
        listPoints: 100,
        modelCount: 2,
        activationCount: 1,
        gameSystem: 'gf',
        campaignMode: false,
        units: [testUnit],
        forceOrgErrors: []
      };

      const result = NewArmyProcessor.processArmy(mockArmy);
      const subUnit = result.units[0].sub_units[0];
      
      // One model should have the special weapon upgrade marked as reassignable
      const modelWithUpgrade = subUnit.models.find(model => 
        model.weapons.some(weapon => weapon.name === 'Special Weapon')
      );
      
      expect(modelWithUpgrade).toBeDefined();
      expect(modelWithUpgrade!.upgrades).toHaveLength(1);
      expect(modelWithUpgrade!.upgrades[0].reassignable).toBe(true);
      expect(modelWithUpgrade!.upgrades[0].source).toBe('choose-model');
    });
  });
});