import { ArmyProcessor } from '../src/services/armyProcessor';
import { ArmyForgeArmy } from '../src/types/armyforge';
import { ProcessedArmy, ProcessedUnit, ProcessedSubUnit } from '../src/types/internal';
import axios from 'axios';

describe('Comprehensive Army Import Testing', () => {
  const testArmies = [
    { id: 'IJ1JM_m-jmka', name: 'Dev Test Army' },
    { id: 'vMzljLVC6ZGv', name: "Cody's Army" },
    { id: 'Xo19MAwQPGbs', name: "Alex's Army" },
    { id: 'Un3_pRTu2xBO', name: "Claire's Army" },
    { id: 'OKOrilTDQs6P', name: "Victoria's Army" }
  ];

  // Let's start with Cody's Army for detailed breakdown
  describe("Cody's Army (vMzljLVC6ZGv) - Detailed Analysis", () => {
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

    test('should provide complete army breakdown', () => {
      console.log('\n' + '='.repeat(80));
      console.log(`COMPREHENSIVE ARMY ANALYSIS: ${processedArmy.name}`);
      console.log('='.repeat(80));
      
      // Army Overview
      console.log('\n🏛️  ARMY OVERVIEW');
      console.log(`Name: ${processedArmy.name}`);
      console.log(`ArmyForge ID: ${processedArmy.armyforge_id}`);
      console.log(`Game System: ${processedArmy.game_system}`);
      console.log(`Campaign Mode: ${processedArmy.campaign_mode}`);
      console.log(`Points Limit: ${processedArmy.points_limit}`);
      console.log(`List Points: ${processedArmy.list_points}`);
      console.log(`Model Count: ${processedArmy.model_count}`);
      console.log(`Activation Count: ${processedArmy.activation_count}`);
      console.log(`Description: ${processedArmy.description || 'None'}`);

      // Unit Breakdown
      console.log('\n⚔️  UNIT BREAKDOWN');
      processedArmy.units.forEach((unit, unitIndex) => {
        console.log(`\n${unitIndex + 1}. ${unit.name}`);
        console.log(`   Type: ${getUnitType(unit)}`);
        console.log(`   Custom Name: ${unit.custom_name || 'None'}`);
        console.log(`   Models: ${unit.model_count}`);
        console.log(`   Total Cost: ${unit.total_cost} pts`);
        console.log(`   Battle Stats: Q${unit.quality}+ D${unit.defense}+`);
        console.log(`   Flags: ${getUnitFlags(unit)}`);
        console.log(`   Notes: ${unit.notes || 'None'}`);

        // Sub-unit Details
        console.log(`   Sub-units (${unit.sub_units.length}):`);
        unit.sub_units.forEach((subUnit, subIndex) => {
          console.log(`\n     ${subIndex + 1}. ${subUnit.name}`);
          console.log(`        Custom Name: ${subUnit.custom_name || 'None'}`);
          console.log(`        Size: ${subUnit.size} models`);
          console.log(`        Cost: ${subUnit.cost} pts`);
          console.log(`        Stats: Q${subUnit.quality}+ D${subUnit.defense}+`);
          console.log(`        Tough: ${getToughValue(subUnit)}`);
          console.log(`        XP: ${subUnit.xp}`);
          console.log(`        Base Size: ${formatBaseSize(subUnit.base_sizes)}`);
          console.log(`        Type: ${subUnit.is_hero ? 'Hero' : 'Regular'}${subUnit.is_caster ? ' Caster' : ''}`);
          
          // Weapons
          if (subUnit.weapons.length > 0) {
            console.log(`        Weapons (${subUnit.weapons.length}):`);
            subUnit.weapons.forEach(weapon => {
              const specialRules = weapon.special_rules.map(r => 
                r.rating ? `${r.name}(${r.rating})` : r.name
              ).join(', ');
              console.log(`          • ${weapon.name} [${weapon.count}x] - Range ${weapon.range}", A${weapon.attacks}, AP${weapon.ap}${specialRules ? `, ${specialRules}` : ''}`);
            });
          }

          // Special Rules & Traits
          if (subUnit.rules.length > 0) {
            console.log(`        Special Rules (${subUnit.rules.length}):`);
            subUnit.rules.forEach(rule => {
              const ruleText = rule.rating ? `${rule.name}(${rule.rating})` : rule.name;
              console.log(`          • ${ruleText}${rule.description ? ` - ${rule.description}` : ''}`);
            });
          }

          if (subUnit.traits.length > 0) {
            console.log(`        Campaign Traits (${subUnit.traits.length}):`);
            subUnit.traits.forEach(trait => {
              console.log(`          • ${trait}`);
            });
          }

          if (subUnit.items.length > 0) {
            console.log(`        Items (${subUnit.items.length}):`);
            subUnit.items.forEach(item => {
              const itemText = item.rating ? `${item.name}(${item.rating})` : item.name;
              console.log(`          • ${itemText}${item.description ? ` - ${item.description}` : ''}`);
            });
          }

          console.log(`        Notes: ${subUnit.notes || 'None'}`);
        });
      });

      // Cost Verification
      console.log('\n💰 COST VERIFICATION');
      const calculatedTotal = processedArmy.units.reduce((sum, unit) => sum + unit.total_cost, 0);
      console.log(`Calculated Total: ${calculatedTotal} pts`);
      console.log(`Expected Total: ${processedArmy.list_points} pts`);
      console.log(`Match: ${calculatedTotal === processedArmy.list_points ? '✅' : '❌'}`);

      // Model Count Verification  
      console.log('\n🪖 MODEL COUNT VERIFICATION');
      const calculatedModels = processedArmy.units.reduce((sum, unit) => sum + unit.model_count, 0);
      console.log(`Calculated Models: ${calculatedModels}`);
      console.log(`Expected Models: ${processedArmy.model_count}`);
      console.log(`Match: ${calculatedModels === processedArmy.model_count ? '✅' : '❌'}`);

      // OPR Mechanics Summary
      console.log('\n🎯 OPR MECHANICS SUMMARY');
      const combinedUnits = processedArmy.units.filter(u => u.is_combined);
      const joinedUnits = processedArmy.units.filter(u => u.is_joined);
      const regularUnits = processedArmy.units.filter(u => !u.is_combined && !u.is_joined);
      
      console.log(`Regular Units: ${regularUnits.length}`);
      console.log(`Combined Units: ${combinedUnits.length}`);
      console.log(`Joined Units: ${joinedUnits.length}`);
      
      if (combinedUnits.length > 0) {
        console.log('\nCombined Unit Details:');
        combinedUnits.forEach(unit => {
          console.log(`  • ${unit.name}: ${unit.model_count} models, ${unit.total_cost} pts`);
        });
      }
      
      if (joinedUnits.length > 0) {
        console.log('\nJoined Unit Details:');
        joinedUnits.forEach(unit => {
          console.log(`  • ${unit.name}: ${unit.model_count} models, ${unit.total_cost} pts`);
          console.log(`    Battle Defense: ${unit.defense} (from regular unit)`);
        });
      }

      console.log('\n' + '='.repeat(80));
      console.log('ANALYSIS COMPLETE');
      console.log('='.repeat(80) + '\n');

      // Basic assertions to ensure test passes
      expect(processedArmy.armyforge_id).toBe('vMzljLVC6ZGv');
      expect(processedArmy.units.length).toBeGreaterThan(0);
      expect(processedArmy.model_count).toBeGreaterThan(0);
      expect(processedArmy.list_points).toBeGreaterThan(0);
      expect(calculatedTotal).toBe(processedArmy.list_points);
      expect(calculatedModels).toBe(processedArmy.model_count);
    });
  });

  // Helper functions
  function getUnitType(unit: ProcessedUnit): string {
    if (unit.is_combined) return 'Combined';
    if (unit.is_joined) return 'Joined';
    return 'Regular';
  }

  function getUnitFlags(unit: ProcessedUnit): string {
    const flags = [];
    if (unit.has_hero) flags.push('Hero');
    if (unit.has_caster) flags.push('Caster');
    if (unit.is_combined) flags.push('Combined');
    if (unit.is_joined) flags.push('Joined');
    return flags.length > 0 ? flags.join(', ') : 'None';
  }

  function getToughValue(subUnit: ProcessedSubUnit): string {
    const toughRule = subUnit.rules.find(r => r.name.toLowerCase() === 'tough');
    return toughRule?.rating?.toString() || '1';
  }

  function formatBaseSize(baseSizes: { round?: string; square?: string }): string {
    const sizes = [];
    if (baseSizes.round) sizes.push(`Round: ${baseSizes.round}mm`);
    if (baseSizes.square) sizes.push(`Square: ${baseSizes.square}mm`);
    return sizes.length > 0 ? sizes.join(', ') : 'Standard';
  }

  // Quick validation tests for all armies
  describe('All Army Quick Validation', () => {
    testArmies.forEach(army => {
      test(`should import ${army.name} successfully`, async () => {
        try {
          const response = await axios.get<ArmyForgeArmy>(`https://army-forge.onepagerules.com/api/tts?id=${army.id}`);
          const processed = ArmyProcessor.processArmy(response.data);
          
          expect(processed.armyforge_id).toBe(army.id);
          expect(processed.units.length).toBeGreaterThan(0);
          expect(processed.model_count).toBeGreaterThan(0);
          expect(processed.list_points).toBeGreaterThan(0);
          
          // Verify cost calculation matches
          const calculatedTotal = processed.units.reduce((sum, unit) => sum + unit.total_cost, 0);
          expect(calculatedTotal).toBe(processed.list_points);

          console.log(`✅ ${army.name}: ${processed.list_points} pts, ${processed.model_count} models, ${processed.activation_count} units`);
        } catch (error) {
          console.error(`❌ Failed to process ${army.name}:`, error);
          throw error;
        }
      }, 30000); // 30 second timeout for API calls
    });
  });
});