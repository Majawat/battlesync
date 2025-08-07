import { ArmyProcessor } from '../src/services/armyProcessor';
import { ArmyForgeArmy } from '../src/types/armyforge';
import axios from 'axios';

describe('Updated Cody\'s Army - With Brutus', () => {
  let armyForgeData: ArmyForgeArmy;

  beforeAll(async () => {
    try {
      console.log('Fetching updated army data...');
      const response = await axios.get<ArmyForgeArmy>('https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv');
      armyForgeData = response.data;
    } catch (error) {
      console.error('Failed to fetch updated army:', error);
      throw error;
    }
  });

  test('should show updated army with Brutus', () => {
    console.log('\n' + '='.repeat(80));
    console.log('UPDATED ARMY DATA ANALYSIS');
    console.log('='.repeat(80));
    
    console.log(`\nRAW ARMYFORGE DATA:`);
    console.log(`- Name: ${armyForgeData.name}`);
    console.log(`- List Points: ${armyForgeData.listPoints}`);
    console.log(`- Model Count: ${armyForgeData.modelCount}`);
    console.log(`- Raw Unit Count: ${armyForgeData.units.length}`);
    
    console.log(`\nRAW UNITS (All ${armyForgeData.units.length}):`);
    armyForgeData.units.forEach((unit, index) => {
      console.log(`${index + 1}. "${unit.name}" (${unit.customName}) - ${unit.cost}pts, Size: ${unit.size}`);
      
      // Look for high-cost units that might be Brutus
      if (unit.cost > 1000) {
        console.log(`   *** HIGH COST UNIT - LIKELY BRUTUS! ***`);
        console.log(`   Combined: ${unit.combined}, JoinToUnit: ${unit.joinToUnit || 'null'}`);
        console.log(`   Traits: ${unit.traits.join(', ')}`);
        console.log(`   Rules: ${unit.rules.map(r => r.name).join(', ')}`);
      }
    });
    
    // Process with our system
    const processed = ArmyProcessor.processArmy(armyForgeData);
    
    console.log(`\n` + '='.repeat(80));
    console.log('PROCESSED DATA');
    console.log('='.repeat(80));
    
    console.log(`- Processed List Points: ${processed.list_points}`);
    console.log(`- Processed Model Count: ${processed.model_count}`);
    console.log(`- Processed Unit Count: ${processed.units.length}`);
    
    const calculatedCost = processed.units.reduce((sum, unit) => sum + unit.total_cost, 0);
    console.log(`- Calculated Total: ${calculatedCost}`);
    
    console.log(`\nPROCESSED UNITS:`);
    processed.units.forEach((unit, index) => {
      console.log(`${index + 1}. "${unit.custom_name}" - ${unit.total_cost}pts, ${unit.model_count} models`);
      
      // Look for high-cost units
      if (unit.total_cost > 1000) {
        console.log(`   *** BRUTUS FOUND! ***`);
        console.log(`   Type: ${unit.is_combined ? 'Combined' : unit.is_joined ? 'Joined' : 'Regular'}`);
        console.log(`   Stats: Q${unit.quality}+ D${unit.defense}+`);
        console.log(`   Sub-units: ${unit.sub_units.length}`);
        unit.sub_units.forEach(sub => {
          console.log(`     - ${sub.name} "${sub.custom_name}": ${sub.cost}pts, ${sub.size} models, XP:${sub.xp}`);
        });
      }
    });
    
    console.log(`\n` + '='.repeat(80));
    console.log(`COMPARISON:`);
    console.log(`Expected from UI: 3990pts`);
    console.log(`Raw ArmyForge JSON: ${armyForgeData.listPoints}pts`);
    console.log(`Our Processed: ${processed.list_points}pts`);
    console.log(`Difference: ${armyForgeData.listPoints - 2605}pts (from old version)`);
    
    if (armyForgeData.listPoints > 3000) {
      console.log(`✅ BRUTUS FOUND! Army now shows ${armyForgeData.listPoints}pts`);
    } else {
      console.log(`❌ Still missing Brutus. Points unchanged at ${armyForgeData.listPoints}pts`);
    }
    
    console.log('='.repeat(80));

    // Basic assertions
    expect(armyForgeData.listPoints).toBeGreaterThan(3000); // Should include Brutus now
    expect(processed.list_points).toBeGreaterThan(3000);
  });
});