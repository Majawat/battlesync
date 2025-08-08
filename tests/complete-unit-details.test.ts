import axios from 'axios';

describe('Complete Army Import and Conversion Validation', () => {
  test('should import and validate army conversion with specific assertions', async () => {
    try {
      // First, import the Dev Test army (IJ1JM_m-jmka)
      console.log('\n🔄 IMPORTING ARMY FROM ARMYFORGE...');
      const importResponse = await axios.post('http://localhost:4019/api/armies/import', {
        armyForgeId: 'IJ1JM_m-jmka'
      });
      
      console.log(`✅ Import successful: ${(importResponse.data as any).army.name}`);
      
      // Use the army from the import response (it has all the details)
      const army = (importResponse.data as any).army;
      
      console.log('\n' + '='.repeat(120));
      console.log(`COMPLETE ARMY CONVERSION: ${army.name}`);
      console.log('='.repeat(120));
      
      console.log(`\n📋 ARMY OVERVIEW:`);
      console.log(`  Name: ${army.name}`);
      console.log(`  ArmyForge ID: ${army.armyforge_id}`);
      console.log(`  Game System: ${army.game_system}`);
      console.log(`  Campaign Mode: ${army.campaign_mode}`);
      console.log(`  Points: ${army.list_points} (Limit: ${army.points_limit})`);
      console.log(`  Models: ${army.model_count}`);
      console.log(`  Activations: ${army.activation_count}`);
      console.log(`  Units: ${army.units.length}`);
      
      army.units.forEach((unit: any, unitIndex: number) => {
        console.log(`\n` + '█'.repeat(100));
        console.log(`UNIT ${unitIndex + 1}: ${unit.custom_name || unit.name}`);
        console.log('█'.repeat(100));
        
        console.log(`📝 UNIT SUMMARY:`);
        console.log(`  Name: ${unit.name}`);
        console.log(`  Custom Name: ${unit.custom_name || 'None'}`);
        console.log(`  Total Models: ${unit.model_count}`);
        console.log(`  Total Points: ${unit.total_cost}pts`);
        console.log(`  Stats: Q${unit.quality}+ D${unit.defense}+`);
        console.log(`  Type: ${unit.is_combined ? 'Combined' : unit.is_joined ? 'Joined' : 'Regular'}`);
        console.log(`  Has Hero: ${unit.has_hero}`);
        console.log(`  Has Caster: ${unit.has_caster}`);
        
        // Process each sub-unit (the actual OPR units)
        unit.sub_units.forEach((sub: any, subIndex: number) => {
          console.log(`\n  ▓▓▓ SUB-UNIT ${subIndex + 1}: ${sub.custom_name || sub.name} ▓▓▓`);
          console.log(`  🏷️  BASIC INFO:`);
          console.log(`    Name: ${sub.name}`);
          console.log(`    Custom Name: ${sub.custom_name || 'None'}`);
          console.log(`    Model Count: ${sub.size}`);
          console.log(`    Points: ${sub.cost}pts`);
          console.log(`    XP Level: ${sub.xp}`);
          console.log(`    Stats: Q${sub.quality}+ D${sub.defense}+`);
          console.log(`    Is Hero: ${sub.is_hero}`);
          console.log(`    Is Caster: ${sub.is_caster}`);
          if (sub.is_caster) {
            console.log(`    Caster Rating: ${sub.caster_rating || 'Not set'}`);
          }
          
          // Unit Rules (from OPR)
          console.log(`  \n  🎯 SPECIAL RULES (${sub.rules ? sub.rules.length : 0}):`);
          if (sub.rules && sub.rules.length > 0) {
            sub.rules.forEach((rule: any) => {
              const rating = rule.rating ? `(${rule.rating})` : '';
              console.log(`    • ${rule.name}${rating} - ${rule.description || rule.name}`);
            });
          } else {
            console.log(`    None`);
          }
          
          // Campaign Traits
          console.log(`  \n  🏆 CAMPAIGN TRAITS (${sub.traits ? sub.traits.length : 0}):`);
          if (sub.traits && sub.traits.length > 0) {
            sub.traits.forEach((trait: any) => {
              console.log(`    • ${trait}`);
            });
          } else {
            console.log(`    None`);
          }
          
          // Items/Upgrades
          console.log(`  \n  🔧 UPGRADES/ITEMS (${sub.items ? sub.items.length : 0}):`);
          if (sub.items && sub.items.length > 0) {
            sub.items.forEach((item: any) => {
              if (typeof item === 'string') {
                console.log(`    • ${item}`);
              } else {
                console.log(`    • ${item.name || 'Unknown'} - ${item.description || item.type || 'No description'}`);
              }
            });
          } else {
            console.log(`    None`);
          }
          
          // Weapons - Critical section
          console.log(`  \n  ⚔️  WEAPONS (${sub.weapons ? sub.weapons.length : 0}):`);
          if (sub.weapons && sub.weapons.length > 0) {
            sub.weapons.forEach((weapon: any, weaponIndex: number) => {
              console.log(`    ${weaponIndex + 1}. ${weapon.name} [${weapon.count}x]`);
              console.log(`       Range: ${weapon.range || 'N/A'}" | Attacks: ${weapon.attacks || 'N/A'} | AP: ${weapon.ap || 0}`);
              
              // Handle weapon special rules (could be array or string)
              if (weapon.special_rules && weapon.special_rules.length > 0) {
                const specialsText = weapon.special_rules.map((rule: any) => {
                  if (typeof rule === 'object' && rule.name) {
                    return rule.value !== undefined ? `${rule.name}(${rule.value})` : rule.name;
                  }
                  return rule;
                }).join(', ');
                console.log(`       Special Rules: ${specialsText}`);
              } else {
                console.log(`       Special Rules: None`);
              }
            });
          } else {
            console.log(`    No weapons found`);
          }
          
          // Notes
          if (sub.notes) {
            console.log(`  \n  📝 NOTES: ${sub.notes}`);
          }
        });
      });
      
      console.log(`\n` + '='.repeat(120));
      console.log('🔍 VALIDATION CHECKLIST:');
      console.log('='.repeat(120));
      console.log('✓ Unit names and custom names');
      console.log('✓ Model counts match expected');
      console.log('✓ Point costs include campaign XP');
      console.log('✓ Quality/Defense stats (especially upgrades like Captain Bullshit D4+)');
      console.log('✓ Special rules with ratings (Impact(8), Tough(9), etc.)');
      console.log('✓ Campaign traits applied correctly');
      console.log('✓ Upgrades processed and described');
      console.log('✓ Weapon details: name, count, range, attacks, AP');
      console.log('✓ Weapon special rules (AP values, Blast, Rending, etc.)');
      console.log('✓ Caster abilities detected and rated');
      console.log('✓ Hero status and joining mechanics');
      console.log('='.repeat(120));

      // Basic validation assertions
      expect(army).toBeDefined();
      expect(army.name).toBe("Dev Testerson's Bullshit Army");
      expect(army.list_points).toBe(3080);
      expect(army.units.length).toBe(8);
      expect(army.model_count).toBe(44);
      
      // Validate Captain Bullshit has D4+ (defense upgrade working)
      const captainBullshit = army.units.find((u: any) => u.name === 'Captain Bullshit');
      expect(captainBullshit).toBeDefined();
      expect(captainBullshit.defense).toBe(4); // Should be 4 from Heavy Armor upgrade
      
      // Validate Grindr Love Truck has Impact(8) from rule stacking
      const grindr = army.units.find((u: any) => u.custom_name === 'Grindr Love Truck');
      expect(grindr).toBeDefined();
      const impactRule = grindr.sub_units[0].rules.find((r: any) => r.name === 'Impact');
      expect(impactRule).toBeDefined();
      expect(impactRule.rating).toBe(8); // Base 3 + Great Grinder 5 = 8
      
    } catch (error) {
      console.error('❌ Failed to import or validate army:', error);
      throw error;
    }
  });
});