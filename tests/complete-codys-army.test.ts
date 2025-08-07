import { ArmyProcessor } from '../src/services/armyProcessor';
import { ArmyForgeArmy } from '../src/types/armyforge';
import { ProcessedArmy } from '../src/types/internal';
import axios from 'axios';

describe('Complete Cody\'s Army Output - No Truncation', () => {
  let armyForgeData: ArmyForgeArmy;
  let processedArmy: ProcessedArmy;

  beforeAll(async () => {
    try {
      const response = await axios.get<ArmyForgeArmy>('https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv');
      armyForgeData = response.data;
      processedArmy = ArmyProcessor.processArmy(armyForgeData);
    } catch (error) {
      console.error('Failed to fetch Cody\'s Army:', error);
      throw error;
    }
  });

  test('should show complete army breakdown - ALL UNITS', () => {
    console.log('\n' + '='.repeat(80));
    console.log(`COMPLETE ARMY: ${processedArmy.name}`);
    console.log('='.repeat(80));
    
    // Key Totals
    console.log(`\nARMY TOTALS:`);
    console.log(`- Points: ${processedArmy.list_points} (Expected: 3990 from UI)`);
    console.log(`- Models: ${processedArmy.model_count}`);
    console.log(`- Activations: ${processedArmy.activation_count}`);
    console.log(`- Units: ${processedArmy.units.length}`);
    console.log(`- Points Limit: ${processedArmy.points_limit}`);
    console.log(`- Campaign Mode: ${processedArmy.campaign_mode}`);

    console.log(`\nALL UNITS:`);
    
    processedArmy.units.forEach((unit, index) => {
      console.log(`\n${index + 1}. ${unit.name}`);
      console.log(`   Custom: "${unit.custom_name}"`);
      console.log(`   Type: ${unit.is_combined ? 'Combined' : unit.is_joined ? 'Joined' : 'Regular'}`);
      console.log(`   Models: ${unit.model_count} | Cost: ${unit.total_cost}pts | Q${unit.quality}+ D${unit.defense}+`);
      
      console.log(`   Sub-units (${unit.sub_units.length}):`);
      unit.sub_units.forEach((sub, subIdx) => {
        console.log(`     ${subIdx + 1}. ${sub.name} "${sub.custom_name}"`);
        console.log(`        Size: ${sub.size} | Cost: ${sub.cost}pts | XP: ${sub.xp} | Q${sub.quality}+ D${sub.defense}+`);
        console.log(`        Weapons: ${sub.weapons.length} | Rules: ${sub.rules.length} | Items: ${sub.items.length} | Traits: ${sub.traits.length}`);
        
        // Show first few weapons/rules for context
        if (sub.weapons.length > 0) {
          const weaponSummary = sub.weapons.slice(0, 2).map(w => `${w.name}[${w.count}x]`).join(', ');
          console.log(`        Top Weapons: ${weaponSummary}${sub.weapons.length > 2 ? '...' : ''}`);
        }
        
        if (sub.rules.length > 0) {
          const ruleSummary = sub.rules.slice(0, 3).map(r => r.rating ? `${r.name}(${r.rating})` : r.name).join(', ');
          console.log(`        Key Rules: ${ruleSummary}${sub.rules.length > 3 ? '...' : ''}`);
        }
      });
    });

    // Cost breakdown
    console.log(`\n` + '='.repeat(80));
    console.log('COST ANALYSIS');
    console.log('='.repeat(80));
    
    const calculatedTotal = processedArmy.units.reduce((sum, unit) => sum + unit.total_cost, 0);
    console.log(`Processed Army Points: ${processedArmy.list_points}`);
    console.log(`Calculated Sum: ${calculatedTotal}`);
    console.log(`ArmyForge JSON: ${armyForgeData.listPoints}`);
    console.log(`Expected from UI: 3990`);
    console.log(`DISCREPANCY: ${3990 - processedArmy.list_points} points missing`);

    // Show unit cost breakdown
    console.log(`\nUnit Cost Breakdown:`);
    processedArmy.units.forEach((unit, index) => {
      console.log(`${index + 1}. ${unit.custom_name}: ${unit.total_cost}pts`);
    });

    console.log('\n' + '='.repeat(80));

    // Basic assertions
    expect(processedArmy.armyforge_id).toBe('vMzljLVC6ZGv');
    expect(processedArmy.units.length).toBe(10);
    expect(calculatedTotal).toBe(processedArmy.list_points);
  });

  test('should show raw ArmyForge unit count vs processed', () => {
    console.log(`\nRAW vs PROCESSED COMPARISON:`);
    console.log(`Raw ArmyForge Units: ${armyForgeData.units.length}`);
    console.log(`Processed Units: ${processedArmy.units.length}`);
    console.log(`Raw Points: ${armyForgeData.listPoints}`);
    console.log(`Processed Points: ${processedArmy.list_points}`);
    
    console.log(`\nRaw unit names:`);
    armyForgeData.units.forEach((unit, idx) => {
      console.log(`${idx + 1}. "${unit.name}" (${unit.customName}) - ${unit.cost}pts, Size: ${unit.size}`);
    });
  });
});