import { OPRArmyConverter } from '../services/oprArmyConverter';
import { ArmyForgeData } from '../types/army';

describe('Unit Conversion - Data Structures', () => {
  
  it('should show raw vs converted data structures', async () => {
    
    // ============================================
    // 🔸 FETCH REAL ARMY FORGE DATA
    // ============================================
    console.log('Fetching real Army Forge data for ID: IJ1JM_m-jmka...');
    
    let rawArmyForgeData: ArmyForgeData;
    try {
      // Import the real army using our ArmyForge client
      const { armyForgeClient } = await import('../services/armyForgeClient');
      rawArmyForgeData = await armyForgeClient.getArmy('', 'IJ1JM_m-jmka');
      console.log(`✅ Successfully fetched army: "${rawArmyForgeData.name}"`);
      console.log(`   Faction: ${rawArmyForgeData.faction}`);
      console.log(`   Points: ${rawArmyForgeData.points}`);
      console.log(`   Units: ${rawArmyForgeData.units.length}`);
    } catch (error) {
      console.error('❌ Failed to fetch Army Forge data:', error);
      // Fallback to mock data if API fails
      rawArmyForgeData = {
        id: "IJ1JM_m-jmka",
        name: "Test Army (Offline)",
        faction: "Test Faction",
        gameSystem: "gf",
        points: 1000,
        units: [],
        specialRules: [],
        metadata: {
          version: "1.0",
          lastModified: "2025-07-12",
          createdBy: "test"
        }
      };
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔸 RAW ARMY FORGE DATA STRUCTURE');
    console.log('='.repeat(80));
    console.log('Army:', rawArmyForgeData.name);
    console.log('Total Points:', rawArmyForgeData.points);
    console.log('Units Count:', rawArmyForgeData.units.length);
    console.log('');
    
    rawArmyForgeData.units.forEach((unit, i) => {
      console.log(`📋 Unit ${i + 1}: ${unit.customName || unit.name}`);
      console.log(`   - ID: ${unit.id}`);
      console.log(`   - Selection ID: ${unit.selectionId}`);
      console.log(`   - Join To Unit: ${unit.joinToUnit || 'null'}`);
      console.log(`   - Size: ${unit.size}`);
      console.log(`   - Cost: ${unit.cost} pts`);
      console.log(`   - Quality: ${unit.quality}+, Defense: ${unit.defense}+`);
      console.log(`   - Type: ${unit.type}`);
      console.log(`   - XP: ${unit.xp}`);
      console.log(`   - Weapons: ${unit.weapons?.map(w => w.label || w.name).join(', ')}`);
      console.log(`   - Rules: ${unit.rules?.map(r => r.label || r.name).join(', ')}`);
      console.log('');
    });

    // ============================================
    // 🔄 CONVERT TO OPR BATTLE FORMAT
    // ============================================
    const conversionResult = await OPRArmyConverter.convertArmyToBattle(
      "user-123",
      rawArmyForgeData.id, 
      rawArmyForgeData,
      { allowJoined: true, allowCombined: true, preserveCustomNames: true }
    );

    console.log('='.repeat(80));
    console.log('🔄 CONVERSION PROCESS');
    console.log('='.repeat(80));
    console.log('Success:', conversionResult.success);
    console.log('Warnings:', conversionResult.warnings);
    console.log('Errors:', conversionResult.errors);
    console.log('');

    // ============================================
    // 🔸 CONVERTED OPR BATTLE DATA STRUCTURE
    // ============================================
    console.log('='.repeat(80));
    console.log('🔸 CONVERTED OPR BATTLE DATA STRUCTURE');
    console.log('='.repeat(80));
    
    const battleArmy = conversionResult.army;
    console.log('🏛️ BATTLE ARMY:');
    console.log(`   - Army ID: ${battleArmy.armyId}`);
    console.log(`   - Army Name: ${battleArmy.armyName}`);
    console.log(`   - Faction: ${battleArmy.faction}`);
    console.log(`   - Total Points: ${battleArmy.totalPoints}`);
    console.log(`   - Command Points: ${battleArmy.currentCommandPoints}/${battleArmy.maxCommandPoints}`);
    console.log(`   - Underdog Points: ${battleArmy.currentUnderdogPoints}/${battleArmy.maxUnderdogPoints}`);
    console.log(`   - Battle Units: ${battleArmy.units.length}`);
    console.log(`   - Kill Count: ${battleArmy.killCount}`);
    console.log('');

    battleArmy.units.forEach((unit, i) => {
      console.log(`⚔️ BATTLE UNIT ${i + 1}: ${unit.customName || unit.name}`);
      console.log(`   - Unit ID: ${unit.unitId}`);
      console.log(`   - Type: ${unit.type}`); // Should be 'JOINED'
      console.log(`   - Size: ${unit.currentSize}/${unit.originalSize}`);
      console.log(`   - Action: ${unit.action || 'none'}`);
      console.log(`   - Status: Fatigued=${unit.fatigued}, Shaken=${unit.shaken}, Routed=${unit.routed}`);
      console.log(`   - Kills: ${unit.kills}`);
      console.log(`   - Is Combined: ${unit.isCombined}`);
      console.log('');
      
      // 👥 REGULAR MODELS
      console.log(`   👥 REGULAR MODELS (${unit.models.length}):`);
      unit.models.slice(0, 3).forEach((model, mi) => {
        console.log(`      Model ${mi + 1}: ${model.name}`);
        console.log(`         - ID: ${model.modelId}`);
        console.log(`         - Is Hero: ${model.isHero}`);
        console.log(`         - Tough: ${model.currentTough}/${model.maxTough}`);
        console.log(`         - Quality: ${model.quality}+, Defense: ${model.defense}+`);
        console.log(`         - Weapons: ${model.weapons.join(', ')}`);
        console.log(`         - Special Rules: ${model.specialRules.join(', ')}`);
        console.log(`         - Destroyed: ${model.isDestroyed}`);
      });
      if (unit.models.length > 3) {
        console.log(`      ... and ${unit.models.length - 3} more models`);
      }
      console.log('');
      
      // 🦸 JOINED HERO
      if (unit.joinedHero) {
        console.log(`   🦸 JOINED HERO:`);
        console.log(`      - Name: ${unit.joinedHero.name}`);
        console.log(`      - ID: ${unit.joinedHero.modelId}`);
        console.log(`      - Is Hero: ${unit.joinedHero.isHero}`);
        console.log(`      - Tough: ${unit.joinedHero.currentTough}/${unit.joinedHero.maxTough}`);
        console.log(`      - Quality: ${unit.joinedHero.quality}+, Defense: ${unit.joinedHero.defense}+`);
        console.log(`      - Weapons: ${unit.joinedHero.weapons.join(', ')}`);
        console.log(`      - Special Rules: ${unit.joinedHero.specialRules.join(', ')}`);
        console.log(`      - Destroyed: ${unit.joinedHero.isDestroyed}`);
        console.log('');
      } else {
        console.log(`   🦸 JOINED HERO: None`);
        console.log('');
      }
      
      // 📊 SOURCE UNIT DATA
      console.log(`   📊 SOURCE UNIT (Original Army Forge Data):`);
      console.log(`      - ID: ${unit.sourceUnit.id}`);
      console.log(`      - Name: ${unit.sourceUnit.name} → ${unit.sourceUnit.customName}`);
      console.log(`      - Selection ID: ${unit.sourceUnit.selectionId}`);
      console.log(`      - Join To Unit: ${unit.sourceUnit.joinToUnit || 'null'}`);
      console.log(`      - Original Size: ${unit.sourceUnit.size}`);
      console.log(`      - Cost: ${unit.sourceUnit.cost} pts`);
      console.log(`      - XP: ${unit.sourceUnit.xp}`);
      console.log('');
    });

    // ============================================
    // 📊 COMPARISON SUMMARY
    // ============================================
    console.log('='.repeat(80));
    console.log('📊 CONVERSION SUMMARY');
    console.log('='.repeat(80));
    console.log('BEFORE CONVERSION:');
    console.log(`  - ${rawArmyForgeData.units.length} units from Army Forge`);
    rawArmyForgeData.units.forEach(unit => {
      console.log(`  - ${unit.customName || unit.name}: Size ${unit.size}, Cost ${unit.cost}pts, Combined: ${!!unit.combined}, JoinTo: ${unit.joinToUnit || 'none'}`);
    });
    console.log('');
    console.log('AFTER CONVERSION:');
    console.log(`  - ${battleArmy.units.length} battle units created`);
    battleArmy.units.forEach(unit => {
      console.log(`  - ${unit.customName || unit.name}: Type ${unit.type}, Size ${unit.currentSize}, Models: ${unit.models.length}, Hero: ${unit.joinedHero?.name || 'none'}`);
    });
    console.log('');
    
    // Count different unit types
    const unitTypes = battleArmy.units.reduce((acc, unit) => {
      acc[unit.type] = (acc[unit.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('✅ CONVERSION RESULTS:');
    Object.entries(unitTypes).forEach(([type, count]) => {
      console.log(`  - ${type} units: ${count}`);
    });
    console.log(`  - Total warnings: ${conversionResult.warnings.length}`);
    console.log(`  - Total errors: ${conversionResult.errors.length}`);
    console.log('');

    // Verify the conversion worked correctly
    expect(conversionResult.success).toBe(true);
    expect(battleArmy.units.length).toBeGreaterThan(0);
    
    // Check that we have examples of different unit types
    const hasJoined = battleArmy.units.some(u => u.type === 'JOINED');
    const hasCombined = battleArmy.units.some(u => u.type === 'COMBINED');
    const hasStandard = battleArmy.units.some(u => u.type === 'STANDARD');
    
    console.log('✅ UNIT TYPE COVERAGE:');
    console.log(`  - Has JOINED units: ${hasJoined ? '✅' : '❌'}`);
    console.log(`  - Has COMBINED units: ${hasCombined ? '✅' : '❌'}`);
    console.log(`  - Has STANDARD units: ${hasStandard ? '✅' : '❌'}`);
    
    // Basic validation that conversion works
    expect(hasStandard).toBe(true); // Should have some standard units
    expect(conversionResult.errors.length).toBe(0); // No errors
  });
});