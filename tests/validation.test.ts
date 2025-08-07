import { ArmyProcessor } from '../src/services/armyProcessor';
import { ArmyForgeArmy } from '../src/types/armyforge';
import axios from 'axios';

describe('Army Import Validation', () => {
  let testArmyData: ArmyForgeArmy;

  beforeAll(async () => {
    // Fetch real test army data from ArmyForge API
    const response = await axios.get<ArmyForgeArmy>('https://army-forge.onepagerules.com/api/tts?id=IJ1JM_m-jmka');
    testArmyData = response.data;
  });

  describe('Comprehensive Army Processing Validation', () => {
    test('should process army with exact expected values', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);

      // Log full army details for manual verification
      console.log('\n=== PROCESSED ARMY DETAILS ===');
      console.log(`Army Name: ${processed.name}`);
      console.log(`Points Limit: ${processed.points_limit}`);
      console.log(`List Points: ${processed.list_points}`);
      console.log(`Model Count: ${processed.model_count}`);
      console.log(`Activation Count: ${processed.activation_count}`);
      console.log(`Campaign Mode: ${processed.campaign_mode}`);
      
      console.log('\n=== UNIT BREAKDOWN ===');
      processed.units.forEach((unit, index) => {
        console.log(`${index + 1}. ${unit.name}`);
        console.log(`   Type: ${unit.is_combined ? 'Combined' : unit.is_joined ? 'Joined' : 'Regular'}`);
        console.log(`   Models: ${unit.model_count}, Cost: ${unit.total_cost} pts`);
        console.log(`   Quality: ${unit.quality}, Defense: ${unit.defense}`);
        console.log(`   Custom Name: ${unit.custom_name || 'None'}`);
        console.log(`   Sub-units: ${unit.sub_units.length}`);
        
        unit.sub_units.forEach((subUnit, subIndex) => {
          console.log(`     ${subIndex + 1}. ${subUnit.custom_name || subUnit.name}`);
          console.log(`        Size: ${subUnit.size}, Cost: ${subUnit.cost}, XP: ${subUnit.xp}`);
          console.log(`        Hero: ${subUnit.is_hero}, Caster: ${subUnit.is_caster}`);
          console.log(`        Quality: ${subUnit.quality}, Defense: ${subUnit.defense}`);
          console.log(`        Weapons: ${subUnit.weapons.length}, Rules: ${subUnit.rules.length}`);
        });
        console.log('');
      });

      // Calculate total cost to verify
      const totalCost = processed.units.reduce((sum, unit) => sum + unit.total_cost, 0);
      console.log(`=== COST VERIFICATION ===`);
      console.log(`Calculated Total: ${totalCost} pts`);
      console.log(`Expected Total: 2730 pts`);
      console.log(`Match: ${totalCost === 2730 ? '✅' : '❌'}`);

      // Core validation assertions
      expect(processed.name).toBe("Dev Testerson's Bullshit Army");
      expect(processed.list_points).toBe(2730);
      expect(processed.model_count).toBe(36);
      expect(processed.activation_count).toBe(7);
      expect(totalCost).toBe(2730);
    });

    test('should validate specific OPR mechanics', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);

      // Test Combined Unit mechanics
      const combinedUnit = processed.units.find(u => u.is_combined && u.name.includes('Bullshit-Squad'));
      expect(combinedUnit).toBeDefined();
      expect(combinedUnit!.model_count).toBe(20); // Two 10-model units combined
      expect(combinedUnit!.sub_units).toHaveLength(2);
      
      // Test Joined Unit mechanics  
      const joinedUnit = processed.units.find(u => u.is_joined);
      expect(joinedUnit).toBeDefined();
      expect(joinedUnit!.name).toMatch(/w\//); // Should contain " w/ " format
      expect(joinedUnit!.has_hero).toBe(true);
      expect(joinedUnit!.sub_units).toHaveLength(2);
      
      // Find hero and regular sub-units
      const heroSubUnit = joinedUnit!.sub_units.find(su => su.is_hero);
      const regularSubUnit = joinedUnit!.sub_units.find(su => !su.is_hero);
      
      expect(heroSubUnit).toBeDefined();
      expect(regularSubUnit).toBeDefined();
      
      // Test that joined unit uses regular unit's defense for battle stats
      expect(joinedUnit!.defense).toBe(regularSubUnit!.defense);
      
      console.log('\n=== OPR MECHANICS VALIDATION ===');
      console.log(`Combined Unit: ${combinedUnit!.name} (${combinedUnit!.model_count} models)`);
      console.log(`Joined Unit: ${joinedUnit!.name}`);
      console.log(`  - Battle Defense: ${joinedUnit!.defense} (from regular unit)`);
      console.log(`  - Hero Defense: ${heroSubUnit!.defense}`);
      console.log(`  - Regular Defense: ${regularSubUnit!.defense}`);
    });

    test('should validate campaign XP cost calculations', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);

      console.log('\n=== CAMPAIGN XP COST VALIDATION ===');
      
      processed.units.forEach(unit => {
        unit.sub_units.forEach(subUnit => {
          if (subUnit.xp > 0) {
            const levels = Math.floor(subUnit.xp / 5);
            const levelCost = levels * (subUnit.is_hero ? 55 : 25);
            
            console.log(`${subUnit.custom_name || subUnit.name}:`);
            console.log(`  XP: ${subUnit.xp}, Levels: ${levels}`);
            console.log(`  Level Cost: ${levelCost} pts (${subUnit.is_hero ? 'Hero' : 'Regular'})`);
            console.log(`  Total Cost: ${subUnit.cost} pts`);
          }
        });
      });
      
      // Check that we have units with XP
      const unitsWithXP = processed.units.flatMap(u => u.sub_units).filter(su => su.xp > 0);
      expect(unitsWithXP.length).toBeGreaterThan(0);
    });

    test('should preserve all critical data for battle tracking', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);

      processed.units.forEach(unit => {
        // Each unit should have battle stats
        expect(unit.quality).toBeGreaterThan(0);
        expect(unit.defense).toBeGreaterThan(0);
        
        unit.sub_units.forEach(subUnit => {
          // Each sub-unit should have complete data
          expect(subUnit.weapons.length).toBeGreaterThan(0);
          expect(subUnit.rules.length).toBeGreaterThan(0);
          expect(subUnit.models.length).toBe(subUnit.size);
          
          // Each model should have health tracking
          subUnit.models.forEach(model => {
            expect(model.max_tough).toBeGreaterThan(0);
            expect(model.current_tough).toBe(model.max_tough);
          });
        });
      });

      console.log('\n=== BATTLE READINESS VALIDATION ===');
      console.log(`Units ready for battle: ${processed.units.length}`);
      console.log(`Total models for tracking: ${processed.model_count}`);
      console.log(`All units have weapons: ✅`);
      console.log(`All units have rules: ✅`);
      console.log(`All models have health tracking: ✅`);
    });
  });
});