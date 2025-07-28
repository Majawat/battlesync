import { BattleSyncConverter } from '../services/battleSyncConverter';
import { armyForgeClient } from '../services/armyForgeClient';
import { BattleSyncUnit } from '../types/battleSync';

describe('BattleSyncConverter', () => {
  
  it('should convert army to BattleSync format with joined units', async () => {
    
    try {
      console.log('Fetching army data...');
      const rawArmyForgeData = await armyForgeClient.getArmy('', 'IJ1JM_m-jmka');
      
      console.log('Converting to BattleSync format...');
      const conversionResult = await BattleSyncConverter.convertArmyToBattleSync(
        'test-user-id',
        rawArmyForgeData.id,
        rawArmyForgeData,
        {
          allowCombined: true,
          allowJoined: true,
          preserveCustomNames: true
        }
      );
      
      if (conversionResult.success && conversionResult.army) {
        console.log('\n=== BATTLESYNC CONVERSION RESULT ===');
        console.log(`✅ Success: ${conversionResult.success}`);
        console.log(`⚠️ Warnings: ${conversionResult.warnings.length}`);
        console.log(`❌ Errors: ${conversionResult.errors.length}`);
        
        const army = conversionResult.army;
        console.log('\n🏛️ ARMY OVERVIEW:');
        console.log(`   Army: ${army.armyName}`);
        console.log(`   Points: ${army.totalPoints}`);
        console.log(`   Command Points: ${army.currentCommandPoints}/${army.maxCommandPoints}`);
        console.log(`   Container Units: ${army.units.length}`);
        console.log(`   Factions: ${army.factions.length}`);
        
        console.log('\n🎭 FACTIONS:');
        army.factions.forEach((faction, i) => {
          console.log(`   ${i + 1}. ${faction.factionName} (${faction.armyId})`);
        });
        
        console.log('\n⚔️ CONTAINER UNITS:');
        army.units.forEach((unit, i) => {
          console.log(`\n📦 Container ${i + 1}: ${unit.name}`);
          console.log(`   - ID: ${unit.battleSyncUnitId}`);
          console.log(`   - Joined: ${unit.isJoined}`);
          console.log(`   - Size: ${unit.currentSize}/${unit.originalSize}`);
          console.log(`   - Tough Total: ${unit.currentToughTotal}/${unit.originalToughTotal}`);
          console.log(`   - Subunits: ${unit.subunits.length}`);
          console.log(`   - Deployment: ${unit.deploymentState.deploymentMethod}`);
          
          console.log('\n   🔫 WEAPON SUMMARY:');
          unit.weaponSummary.forEach(weapon => {
            const rulesText = weapon.rules.length > 0 
              ? `, ${weapon.rules.map(r => r.value ? `${r.name}(${r.value})` : r.name).join(', ')}`
              : '';
            const rangeText = weapon.melee ? 'Melee' : `${weapon.range}"`;
            console.log(`      ${weapon.quantity}x ${weapon.name} (${rangeText}, A${weapon.attacks}${weapon.ap > 0 ? `, AP(${weapon.ap})` : ''}${rulesText})`);
          });
          
          console.log('\n   📋 SUBUNITS:');
          unit.subunits.forEach((subunit, si) => {
            console.log(`      ${si + 1}. ${subunit.customName || subunit.name}`);
            console.log(`         - Hero: ${subunit.isHero}, Combined: ${subunit.isCombined}`);
            console.log(`         - Quality: ${subunit.quality}+, Defense: ${subunit.defense}+`);
            console.log(`         - Models: ${subunit.models.length}`);
            console.log(`         - Faction: ${subunit.factionId}`);
            
            // Show caster models
            const casters = subunit.models.filter(m => m.isCaster);
            if (casters.length > 0) {
              console.log(`         - Casters: ${casters.length} (${casters.map(c => `${c.name}: ${c.casterTokens} tokens`).join(', ')})`);
            }
            
            console.log(`         - Weapons: ${subunit.weapons.length} types`);
            console.log(`         - Rules: ${subunit.specialRules.join(', ')}`);
          });
        });
        
        // Show specifically joined units
        const joinedUnits = army.units.filter((u: BattleSyncUnit) => u.isJoined);
        if (joinedUnits.length > 0) {
          console.log('\n🤝 JOINED UNITS DETAIL:');
          joinedUnits.forEach(unit => {
            console.log(`\n${unit.name}:`);
            console.log(`   Regular Unit: ${unit.subunits[0].customName || unit.subunits[0].name} (${unit.subunits[0].models.length} models)`);
            console.log(`   Joined Hero: ${unit.subunits[1].customName || unit.subunits[1].name} (${unit.subunits[1].models.length} models)`);
          });
        }
        
        console.log('\n📊 CONVERSION SUMMARY:');
        console.log(`   Original ArmyForge Units: ${rawArmyForgeData.units.length}`);
        console.log(`   BattleSync Container Units: ${army.units.length}`);
        console.log(`   Total Subunits: ${army.units.reduce((sum, u) => sum + u.subunits.length, 0)}`);
        console.log(`   Joined Units: ${army.units.filter(u => u.isJoined).length}`);
        console.log(`   Standard Units: ${army.units.filter(u => !u.isJoined).length}`);
        
        if (conversionResult.warnings.length > 0) {
          console.log('\n⚠️ WARNINGS:');
          conversionResult.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        
        if (conversionResult.errors.length > 0) {
          console.log('\n❌ ERRORS:');
          conversionResult.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        // Basic validation
        expect(army.units.length).toBeGreaterThan(0);
        expect(army.factions.length).toBeGreaterThan(0);
        expect(army.totalPoints).toBeGreaterThan(0);
        expect(army.armyName).toBeTruthy();
        
        // Validate joined units have 2 subunits
        const joinedUnitsTest = army.units.filter(u => u.isJoined);
        joinedUnitsTest.forEach(unit => {
          expect(unit.subunits.length).toBe(2);
          expect(unit.subunits.some(s => s.isHero)).toBe(true);
        });
        
      } else {
        console.log('❌ Conversion failed:', conversionResult.errors);
        fail('Conversion should have succeeded');
      }
      
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
    
  }, 30000);
});