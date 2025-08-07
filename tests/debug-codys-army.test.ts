import { ArmyProcessor } from '../src/services/armyProcessor';
import { ArmyForgeArmy } from '../src/types/armyforge';
import axios from 'axios';

describe('Debug Cody\'s Army Issues', () => {
  let armyForgeData: ArmyForgeArmy;

  beforeAll(async () => {
    const response = await axios.get<ArmyForgeArmy>('https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv');
    armyForgeData = response.data;
  });

  test('should identify all discrepancies', () => {
    console.log('\n' + '='.repeat(60));
    console.log('RAW ARMYFORGE DATA ANALYSIS');
    console.log('='.repeat(60));
    
    // Army-level data
    console.log(`Army Name: ${armyForgeData.name}`);
    console.log(`List Points: ${armyForgeData.listPoints}`);
    console.log(`Model Count: ${armyForgeData.modelCount}`);
    console.log(`Activation Count: ${armyForgeData.activationCount}`);
    console.log(`Unit Count in Raw Data: ${armyForgeData.units.length}`);
    
    // Process with our system
    const processed = ArmyProcessor.processArmy(armyForgeData);
    
    console.log('\n' + '='.repeat(60));
    console.log('PROCESSED DATA COMPARISON');
    console.log('='.repeat(60));
    
    console.log(`Processed List Points: ${processed.list_points}`);
    console.log(`Processed Model Count: ${processed.model_count}`);
    console.log(`Processed Activation Count: ${processed.activation_count}`);
    console.log(`Processed Unit Count: ${processed.units.length}`);
    
    // Cost verification
    const calculatedCost = processed.units.reduce((sum, unit) => sum + unit.total_cost, 0);
    console.log(`Calculated Total Cost: ${calculatedCost}`);
    console.log(`Matches Processed: ${calculatedCost === processed.list_points}`);
    console.log(`Matches ArmyForge: ${calculatedCost === armyForgeData.listPoints}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('RAW UNITS DETAILED ANALYSIS');
    console.log('='.repeat(60));
    
    armyForgeData.units.forEach((unit, index) => {
      console.log(`\n${index + 1}. "${unit.name}" (${unit.customName || 'No Custom Name'})`);
      console.log(`   ID: ${unit.id}`);
      console.log(`   Cost: ${unit.cost}`);
      console.log(`   Size: ${unit.size}`);
      console.log(`   Combined: ${unit.combined}`);
      console.log(`   JoinToUnit: ${unit.joinToUnit || 'null'}`);
      console.log(`   XP: ${unit.xp}`);
      console.log(`   Traits: ${unit.traits.join(', ') || 'none'}`);
      
      // Weapons analysis
      console.log(`   Weapons (${unit.weapons.length}):`);
      unit.weapons.forEach(weapon => {
        console.log(`     • ${weapon.name} [${weapon.count}x] - Range ${weapon.range || 'melee'}", A${weapon.attacks}, AP${weapon.weaponId ? weapon.specialRules?.find(r => r.name === 'AP')?.rating || 0 : 0}`);
        if (weapon.specialRules?.length > 0) {
          const rules = weapon.specialRules.map(r => r.rating ? `${r.name}(${r.rating})` : r.name).join(', ');
          console.log(`       Special: ${rules}`);
        }
      });
      
      // Loadout analysis (upgrades applied)
      if (unit.loadout && unit.loadout.length > 0) {
        console.log(`   Loadout Items (${unit.loadout.length}):`);
        unit.loadout.forEach(item => {
          if (item.type === 'ArmyBookWeapon') {
            console.log(`     • ${item.name} [${item.count}x] - Range ${item.range || 'melee'}", A${item.attacks}, AP${item.specialRules?.find(r => r.name === 'AP')?.rating || 0}`);
          } else if (item.type === 'ArmyBookItem') {
            console.log(`     • ${item.name} (Item)`);
          }
        });
      }
      
      // Rules analysis
      console.log(`   Rules (${unit.rules.length}):`);
      unit.rules.forEach(rule => {
        const ruleText = rule.rating ? `${rule.name}(${rule.rating})` : rule.name;
        console.log(`     • ${ruleText}`);
      });
      
      // Items analysis  
      if (unit.items.length > 0) {
        console.log(`   Items (${unit.items.length}):`);
        unit.items.forEach(item => {
          console.log(`     • ${item.name}`);
        });
      }
      
      // Disabled sections
      if (unit.disabledSections && unit.disabledSections.length > 0) {
        console.log(`   DISABLED SECTIONS: ${unit.disabledSections.join(', ')}`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('PROCESSED UNITS ANALYSIS');
    console.log('='.repeat(60));
    
    processed.units.forEach((unit, index) => {
      console.log(`\n${index + 1}. "${unit.name}" (${unit.custom_name || 'No Custom Name'})`);
      console.log(`   Total Cost: ${unit.total_cost}`);
      console.log(`   Model Count: ${unit.model_count}`);
      console.log(`   Type: ${unit.is_combined ? 'Combined' : unit.is_joined ? 'Joined' : 'Regular'}`);
      console.log(`   Sub-units: ${unit.sub_units.length}`);
      
      unit.sub_units.forEach((subUnit, subIndex) => {
        console.log(`     ${subIndex + 1}. ${subUnit.custom_name || subUnit.name}`);
        console.log(`        Cost: ${subUnit.cost}, Size: ${subUnit.size}, XP: ${subUnit.xp}`);
        console.log(`        Weapons: ${subUnit.weapons.length}, Rules: ${subUnit.rules.length}, Items: ${subUnit.items.length}`);
        
        // Check for missing upgrades
        if (subUnit.weapons.length === 0) {
          console.log(`        ⚠️  NO WEAPONS FOUND!`);
        }
        if (subUnit.rules.length === 0) {
          console.log(`        ⚠️  NO RULES FOUND!`);
        }
      });
    });

    // Basic test assertions
    expect(armyForgeData.units.length).toBeGreaterThan(0);
    expect(processed.units.length).toBeGreaterThan(0);
    
    // Cost assertion - use ArmyForge as source of truth
    expect(calculatedCost).toBe(processed.list_points);
  });
});