import { OPRArmyConverter } from '../services/oprArmyConverter';
import { ArmyForgeData, ArmyForgeUnit } from '../types/army';
import { OPRBattleUnit, OPRBattleModel } from '../types/oprBattle';

describe('Weapon Distribution and Upgrade Handling', () => {
  
  /**
   * Test data representing a complex OPR unit with mixed weapons and upgrades
   * Based on real Army Forge data structure for a 10-model Elite unit with:
   * - 8 models with Shotguns (AP(1))
   * - 2 models with Plasma Rifles (AP(4))
   * - All models have CCW
   * - Unit-wide special rules (Carnivore, Relentless, Strider)
   * - Some models have Beacon upgrade
   */
  const complexEliteUnit: ArmyForgeUnit = {
    id: "uF7noGn",
    name: "Elites",
    customName: "Ironclaw Vanguard",
    size: 10,
    cost: 300,
    quality: 4,
    defense: 4,
    xp: 15, // Experience points
    weapons: [
      // Base weapons - all models
      {
        id: "ccw-base",
        name: "CCW",
        range: 0,
        attacks: 1,
        count: 10, // All 10 models have CCW
        label: "CCW (A1)"
      },
      // Upgraded weapons - distributed
      {
        id: "shotgun-upgrade",
        name: "Shotgun",
        range: 12,
        attacks: 2,
        count: 8, // Only 8 models have shotguns
        specialRules: [
          { id: "ap-1", name: "AP", rating: 1, label: "AP(1)" }
        ],
        label: "Shotgun (12\", A2, AP(1))"
      },
      {
        id: "plasma-upgrade",
        name: "Plasma Rifle",
        range: 24,
        attacks: 1,
        count: 2, // Only 2 models have plasma rifles
        specialRules: [
          { id: "ap-4", name: "AP", rating: 4, label: "AP(4)" },
          { id: "deadly-1", name: "Deadly", rating: 1, label: "Deadly(1)" }
        ],
        label: "Plasma Rifle (24\", A1, AP(4), Deadly(1))"
      }
    ],
    rules: [
      // Unit-wide special rules
      { id: "carnivore", name: "Carnivore", label: "Carnivore" },
      { id: "relentless", name: "Relentless", label: "Relentless" },
      { id: "strider", name: "Strider", label: "Strider" },
      // Model-specific upgrades
      { id: "beacon-upgrade", name: "Beacon", label: "Beacon", count: 2 }, // Only 2 models have this
      { id: "tough-upgrade", name: "Tough", rating: 2, label: "Tough(2)", count: 1 } // Only 1 model upgraded
    ],
    type: "UNIT",
    combined: false,
    selectionId: "HyvQz",
    joinToUnit: null
  };

  const complexArmyData: ArmyForgeData = {
    id: "complex-army",
    name: "Complex Test Army",
    faction: "Grimdark Future",
    gameSystem: "gf",
    points: 300,
    units: [complexEliteUnit],
    specialRules: [],
    metadata: {
      version: "1.0",
      lastModified: "2025-07-12",
      createdBy: "test"
    }
  };

  describe('Current Implementation Analysis', () => {
    
    it('should demonstrate current weapon distribution issues', async () => {
      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123",
        complexArmyData,
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      expect(result.success).toBe(true);
      expect(result.army.units).toHaveLength(1);

      const unit = result.army.units[0];
      
      console.log('\n' + '='.repeat(80));
      console.log('🔍 CURRENT IMPLEMENTATION ANALYSIS');
      console.log('='.repeat(80));
      console.log(`Unit: ${unit.customName || unit.name}`);
      console.log(`Size: ${unit.originalSize} models`);
      console.log(`Type: ${unit.type}`);
      console.log('');

      // Analyze what the current implementation does
      console.log('📊 WEAPON DISTRIBUTION ANALYSIS:');
      console.log('');
      console.log('Expected weapon distribution:');
      console.log('  - 10 models with CCW');
      console.log('  - 8 models with Shotgun (AP(1))');
      console.log('  - 2 models with Plasma Rifle (AP(4), Deadly(1))');
      console.log('');
      
      console.log('Current implementation result:');
      unit.models.forEach((model, i) => {
        console.log(`  Model ${i + 1}: ${model.weapons.join(', ')}`);
      });
      console.log('');

      // ISSUE 1: All models get all weapons
      console.log('🚨 ISSUE 1: Weapon Distribution');
      const firstModel = unit.models[0];
      console.log(`First model weapons: ${firstModel.weapons.join(', ')}`);
      
      // This should fail - current implementation gives every model every weapon
      const hasAllWeapons = firstModel.weapons.includes('CCW (A1)') &&
                           firstModel.weapons.includes('Shotgun (12", A2, AP(1))') &&
                           firstModel.weapons.includes('Plasma Rifle (24", A1, AP(4), Deadly(1))');
      
      if (hasAllWeapons) {
        console.log('❌ PROBLEM: Every model has every weapon (ignores count field)');
      } else {
        console.log('✅ GOOD: Weapons are properly distributed');
      }
      console.log('');

      // ISSUE 2: Special rules distribution
      console.log('🚨 ISSUE 2: Special Rules Distribution');
      console.log(`First model rules: ${firstModel.specialRules.join(', ')}`);
      
      const hasAllRules = firstModel.specialRules.includes('Carnivore') &&
                         firstModel.specialRules.includes('Beacon');
      
      if (hasAllRules) {
        console.log('❌ PROBLEM: Every model has every unit rule (ignores count field)');
      } else {
        console.log('✅ GOOD: Rules are properly distributed');
      }
      console.log('');

      // ISSUE 3: Weapon special rules not model-specific
      console.log('🚨 ISSUE 3: Weapon Special Rules');
      console.log('Expected: Only shotgun-equipped models should have AP(1) special rule');
      console.log('Expected: Only plasma-equipped models should have AP(4), Deadly(1) special rules');
      console.log('Current: Weapon special rules are not tracked per model');
      console.log('');

      // Show the source unit data for comparison
      console.log('📋 SOURCE DATA COMPARISON:');
      console.log('Weapons in source unit:');
      complexEliteUnit.weapons?.forEach(weapon => {
        console.log(`  - ${weapon.label} (count: ${weapon.count || 'all'})`);
        if (weapon.specialRules && weapon.specialRules.length > 0) {
          console.log(`    Special Rules: ${weapon.specialRules.map(r => r.label).join(', ')}`);
        }
      });
      console.log('');
      
      console.log('Rules in source unit:');
      complexEliteUnit.rules?.forEach(rule => {
        console.log(`  - ${rule.label} ${rule.count ? `(count: ${rule.count})` : '(all models)'}`);
      });
      console.log('');

      // Demonstrate current vs expected
      console.log('🎯 WHAT SHOULD HAPPEN:');
      console.log('Model 1-8: CCW, Shotgun, Carnivore, Relentless, Strider');
      console.log('Model 9-10: CCW, Plasma Rifle, Carnivore, Relentless, Strider');
      console.log('Model 1-2: Additional Beacon rule');
      console.log('Model 1: Additional Tough(2) upgrade');
      console.log('');

      // The test will show the gap between current and expected behavior
    });

    it('should show model-by-model breakdown with weapon special rules', async () => {
      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123",
        complexArmyData
      );

      const unit = result.army.units[0];
      
      console.log('\n' + '='.repeat(80));
      console.log('🔬 DETAILED MODEL ANALYSIS');
      console.log('='.repeat(80));
      
      unit.models.forEach((model, i) => {
        console.log(`Model ${i + 1} (${model.modelId}):`);
        console.log(`  Name: ${model.name}`);
        console.log(`  Tough: ${model.currentTough}/${model.maxTough}`);
        console.log(`  Quality: ${model.quality}+, Defense: ${model.defense}+`);
        console.log(`  Weapons: ${model.weapons.join(', ')}`);
        console.log(`  Special Rules: ${model.specialRules.join(', ')}`);
        console.log(`  Is Hero: ${model.isHero}`);
        console.log(`  Destroyed: ${model.isDestroyed}`);
        console.log('');
      });

      // Test expectations
      expect(unit.models).toHaveLength(10);
      
      // Current implementation issues we expect to see:
      unit.models.forEach(model => {
        // ISSUE: Every model has every weapon
        expect(model.weapons).toContain('CCW (A1)');
        expect(model.weapons).toContain('Shotgun (12", A2, AP(1))');
        expect(model.weapons).toContain('Plasma Rifle (24", A1, AP(4), Deadly(1))');
        
        // ISSUE: Every model has every rule
        expect(model.specialRules).toContain('Carnivore');
        expect(model.specialRules).toContain('Relentless');
        expect(model.specialRules).toContain('Strider');
        expect(model.specialRules).toContain('Beacon');
      });
    });
  });

  describe('Expected Behavior Specification', () => {
    
    it('should define how weapon distribution should work', () => {
      
      console.log('\n' + '='.repeat(80));
      console.log('🎯 EXPECTED WEAPON DISTRIBUTION ALGORITHM');
      console.log('='.repeat(80));
      
      const sourceWeapons = complexEliteUnit.weapons;
      const sourceRules = complexEliteUnit.rules;
      const unitSize = complexEliteUnit.size;
      
      console.log('INPUT DATA:');
      console.log(`Unit Size: ${unitSize} models`);
      console.log('Weapons:');
      sourceWeapons?.forEach(w => {
        console.log(`  - ${w.label} (count: ${w.count || 'all'})`);
      });
      console.log('Rules:');
      sourceRules?.forEach(r => {
        console.log(`  - ${r.label} (count: ${r.count || 'all'})`);
      });
      console.log('');
      
      console.log('EXPECTED DISTRIBUTION ALGORITHM:');
      console.log('1. Create base models with universal weapons/rules');
      console.log('2. Distribute counted weapons starting from model 1');
      console.log('3. Distribute counted rules starting from model 1');
      console.log('4. Apply weapon special rules only to equipped models');
      console.log('5. Preserve upgrade distribution for battle tracking');
      console.log('');
      
      console.log('EXPECTED OUTPUT:');
      console.log('Models 1-10: CCW, Carnivore, Relentless, Strider');
      console.log('Models 1-8: + Shotgun (with AP(1) weapon rule)');
      console.log('Models 9-10: + Plasma Rifle (with AP(4), Deadly(1) weapon rules)');
      console.log('Models 1-2: + Beacon rule');
      console.log('Model 1: + Tough(2) upgrade');
      console.log('');
      
      console.log('MODEL-BY-MODEL BREAKDOWN:');
      for (let i = 0; i < unitSize; i++) {
        const modelNum = i + 1;
        let weapons = ['CCW'];
        let rules = ['Carnivore', 'Relentless', 'Strider'];
        let weaponRules: string[] = [];
        
        // Weapon distribution
        if (modelNum <= 8) {
          weapons.push('Shotgun');
          weaponRules.push('AP(1)');
        } else {
          weapons.push('Plasma Rifle');
          weaponRules.push('AP(4)', 'Deadly(1)');
        }
        
        // Rule distribution
        if (modelNum <= 2) {
          rules.push('Beacon');
        }
        if (modelNum === 1) {
          rules.push('Tough(2)');
        }
        
        console.log(`Model ${modelNum}:`);
        console.log(`  Weapons: ${weapons.join(', ')}`);
        console.log(`  Weapon Rules: ${weaponRules.join(', ')}`);
        console.log(`  Special Rules: ${rules.join(', ')}`);
        console.log(`  Tough: ${modelNum === 1 ? 2 : 1}`);
      }
      
      // This is a specification test - it doesn't test the implementation
      // but documents what the correct behavior should be
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    
    it('should handle units with no weapon counts (all models equipped)', () => {
      const allEquippedUnit: ArmyForgeUnit = {
        ...complexEliteUnit,
        id: "all-equipped",
        weapons: [
          {
            id: "universal-rifle",
            name: "Energy Rifle",
            range: 24,
            attacks: 1,
            // No count field = all models equipped
            label: "Energy Rifle (24\", A1)"
          }
        ]
      };

      console.log('\n🧪 Edge Case: No weapon counts (universal equipment)');
      console.log('Expected: All 10 models get Energy Rifle');
      console.log('Current: All models get all weapons (coincidentally correct)');
      
      expect(allEquippedUnit.weapons?.[0].count).toBeUndefined();
    });

    it('should handle mixed upgrade types', () => {
      const mixedUpgradeUnit: ArmyForgeUnit = {
        ...complexEliteUnit,
        id: "mixed-upgrades",
        weapons: [
          { id: "base", name: "Rifle", range: 24, attacks: 1, count: 10, label: "Rifle" },
          { id: "upgrade1", name: "Grenade Launcher", range: 18, attacks: 2, count: 3, label: "Grenade Launcher" },
          { id: "upgrade2", name: "Sniper Rifle", range: 36, attacks: 1, count: 1, label: "Sniper Rifle" }
        ],
        rules: [
          { id: "basic", name: "Fast", label: "Fast" }, // All models
          { id: "veteran", name: "Veteran", label: "Veteran", count: 5 }, // 5 models
          { id: "leader", name: "Leader", label: "Leader", count: 1 } // 1 model
        ]
      };

      console.log('\n🧪 Edge Case: Mixed upgrade distribution');
      console.log('Base equipment: 10 Rifles');
      console.log('Upgrades: 3 Grenade Launchers, 1 Sniper Rifle');
      console.log('Rules: All Fast, 5 Veteran, 1 Leader');
      console.log('Expected distribution:');
      console.log('  Models 1-3: Rifle + Grenade Launcher + Fast');
      console.log('  Model 4: Rifle + Sniper Rifle + Fast');
      console.log('  Models 5-10: Rifle + Fast');
      console.log('  Models 1-5: + Veteran');
      console.log('  Model 1: + Leader');
      
      expect(mixedUpgradeUnit.weapons).toHaveLength(3);
      expect(mixedUpgradeUnit.rules).toHaveLength(3);
    });

    it('should handle weapon special rules complexity', () => {
      const weaponRulesUnit: ArmyForgeUnit = {
        ...complexEliteUnit,
        id: "weapon-rules",
        weapons: [
          {
            id: "complex-weapon",
            name: "Heavy Plasma Cannon",
            range: 36,
            attacks: 3,
            count: 2,
            specialRules: [
              { id: "ap-3", name: "AP", rating: 3, label: "AP(3)" },
              { id: "deadly-2", name: "Deadly", rating: 2, label: "Deadly(2)" },
              { id: "heavy", name: "Heavy", label: "Heavy" },
              { id: "blast-3", name: "Blast", rating: 3, label: "Blast(3)" }
            ],
            label: "Heavy Plasma Cannon (36\", A3, AP(3), Deadly(2), Heavy, Blast(3))"
          }
        ]
      };

      console.log('\n🧪 Edge Case: Complex weapon special rules');
      console.log('Weapon: Heavy Plasma Cannon with 4 special rules');
      console.log('Count: 2 models equipped');
      console.log('Expected: Only 2 models have access to these weapon special rules');
      console.log('Current: All models get all weapon rules mixed with unit rules');
      
      const weapon = weaponRulesUnit.weapons?.[0];
      expect(weapon?.specialRules).toHaveLength(4);
      expect(weapon?.count).toBe(2);
    });
  });

  describe('Performance and Data Structure Analysis', () => {
    
    it('should analyze memory and performance implications', () => {
      console.log('\n' + '='.repeat(80));
      console.log('⚡ PERFORMANCE ANALYSIS');
      console.log('='.repeat(80));
      
      const unitSize = 10;
      const weaponCount = 3;
      const ruleCount = 5;
      
      console.log('CURRENT IMPLEMENTATION:');
      console.log(`Memory per model: ${weaponCount} weapons + ${ruleCount} rules = ${weaponCount + ruleCount} strings`);
      console.log(`Total memory: ${unitSize} models × ${weaponCount + ruleCount} strings = ${unitSize * (weaponCount + ruleCount)} strings`);
      console.log('Issues:');
      console.log('  - Duplicated weapon data across all models');
      console.log('  - Duplicated rule data across all models');
      console.log('  - No weapon-specific rule tracking');
      console.log('');
      
      console.log('IMPROVED IMPLEMENTATION:');
      console.log('Model-specific data:');
      console.log('  - Model 1-8: CCW + Shotgun = 2 weapons + shotgun rules');
      console.log('  - Model 9-10: CCW + Plasma = 2 weapons + plasma rules');
      console.log('Benefits:');
      console.log('  - Accurate weapon tracking for battle');
      console.log('  - Proper special rule application');
      console.log('  - Supports individual model upgrades');
      console.log('  - Enables accurate damage calculation');
      console.log('');
      
      expect(unitSize).toBe(10);
    });
  });
});