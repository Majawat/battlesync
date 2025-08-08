const axios = require('axios');

async function displayArmy(armyId = 'IJ1JM_m-jmka') {
  try {
    console.log('🔄 Importing army from ArmyForge...');
    const response = await axios.post('http://localhost:4019/api/armies/import', {
      armyForgeId: armyId
    });
    
    const army = response.data.army;
    
    console.log('✅ Import successful!\n');
    console.log('═'.repeat(120));
    console.log(`COMPLETE ARMY CONVERSION: ${army.name}`);
    console.log('═'.repeat(120));
    
    console.log(`\n📋 ARMY OVERVIEW:`);
    console.log(`  Name: ${army.name}`);
    console.log(`  ArmyForge ID: ${army.armyforge_id}`);
    console.log(`  Game System: ${army.game_system}`);
    console.log(`  Campaign Mode: ${army.campaign_mode}`);
    console.log(`  Points: ${army.list_points} (Limit: ${army.points_limit})`);
    console.log(`  Models: ${army.model_count}`);
    console.log(`  Activations: ${army.activation_count}`);
    console.log(`  Units: ${army.units.length}`);
    
    army.units.forEach((unit, unitIndex) => {
      console.log(`\n${'█'.repeat(100)}`);
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
      
      unit.sub_units.forEach((sub, subIndex) => {
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
        
        // Special Rules
        console.log(`  \n  🎯 SPECIAL RULES (${sub.rules ? sub.rules.length : 0}):`);
        if (sub.rules && sub.rules.length > 0) {
          sub.rules.forEach(rule => {
            const rating = rule.rating ? `(${rule.rating})` : '';
            console.log(`    • ${rule.name}${rating} - ${rule.description || rule.name}`);
          });
        } else {
          console.log(`    None`);
        }
        
        // Campaign Traits
        console.log(`  \n  🏆 CAMPAIGN TRAITS (${sub.traits ? sub.traits.length : 0}):`);
        if (sub.traits && sub.traits.length > 0) {
          sub.traits.forEach(trait => console.log(`    • ${trait}`));
        } else {
          console.log(`    None`);
        }
        
        // Upgrades/Items
        console.log(`  \n  🔧 UPGRADES/ITEMS (${sub.items ? sub.items.length : 0}):`);
        if (sub.items && sub.items.length > 0) {
          sub.items.forEach(item => {
            if (typeof item === 'string') {
              console.log(`    • ${item}`);
            } else {
              console.log(`    • ${item.name || 'Unknown'} - ${item.description || item.type || 'No description'}`);
            }
          });
        } else {
          console.log(`    None`);
        }
        
        // Weapons
        console.log(`  \n  ⚔️  WEAPONS (${sub.weapons ? sub.weapons.length : 0}):`);
        if (sub.weapons && sub.weapons.length > 0) {
          sub.weapons.forEach((weapon, weaponIndex) => {
            console.log(`    ${weaponIndex + 1}. ${weapon.name} [${weapon.count}x]`);
            console.log(`       Range: ${weapon.range || 'N/A'}" | Attacks: ${weapon.attacks || 'N/A'} | AP: ${weapon.ap || 0}`);
            
            if (weapon.special_rules && weapon.special_rules.length > 0) {
              const specialsText = weapon.special_rules.map(rule => {
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
        
        // Individual Models
        console.log(`  \n  👥 INDIVIDUAL MODELS (${sub.models ? sub.models.length : 0}):`);
        if (sub.models && sub.models.length > 0) {
          sub.models.forEach((model, modelIndex) => {
            console.log(`    ${modelIndex + 1}. ${model.name}`);
            console.log(`       Health: ${model.current_tough}/${model.max_tough} | Hero: ${model.is_hero}`);
            if (model.weapons && model.weapons.length > 0) {
              console.log(`       Weapons: ${model.weapons.map(w => `${w.name} (${w.range}", A${w.attacks}, AP${w.ap})`).join(', ')}`);
            } else {
              console.log(`       Weapons: None`);
            }
          });
        } else {
          console.log(`    No individual models found`);
        }

        // Notes
        if (sub.notes) {
          console.log(`  \n  📝 NOTES: ${sub.notes}`);
        }
      });
    });
    
    console.log(`\n${'═'.repeat(120)}`);
    console.log('🔍 VALIDATION SUMMARY:');
    console.log('═'.repeat(120));
    
    // Key validations
    const captainBullshit = army.units.find(u => u.name === 'Captain Bullshit');
    const grindr = army.units.find(u => u.custom_name === 'Grindr Love Truck');
    const impactRule = grindr?.sub_units[0]?.rules?.find(r => r.name === 'Impact');
    
    console.log(`✓ Defense Upgrades: Captain Bullshit D${captainBullshit?.defense}+ (should be D4+)`);
    console.log(`✓ Rule Stacking: Grindr Love Truck Impact(${impactRule?.rating}) (should be Impact(8))`);
    console.log(`✓ Army Points: ${army.list_points}pts (should be 2940pts)`);
    console.log(`✓ Total Models: ${army.model_count} (should be 39)`);
    console.log(`✓ Total Units: ${army.units.length} (should be 8)`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  displayArmy().catch(console.error);
}

module.exports = { displayArmy };