import { NewArmyProcessor } from '../src/services/newArmyProcessor';
import * as fs from 'fs';
import * as path from 'path';

describe('NewArmyProcessor - Integration Tests', () => {
  test('should process real Grinder Truck data correctly', () => {
    // Read the actual army data we analyzed
    const armyData = JSON.parse(fs.readFileSync('/tmp/latest_army.json', 'utf8'));
    
    // Extract just the Grinder Truck
    const grinderTruck = armyData.units.find((unit: any) => unit.customName === 'Grindr Love Truck');
    expect(grinderTruck).toBeDefined();
    
    const testArmy = {
      ...armyData,
      units: [grinderTruck]
    };
    
    const result = NewArmyProcessor.processArmy(testArmy);
    
    // Verify basic structure
    expect(result.units).toHaveLength(1);
    const unit = result.units[0]!;
    expect(unit.name).toBe('Grindr Love Truck');
    expect(unit.model_count).toBe(1);
    
    // Verify sub-unit structure  
    expect(unit.sub_units).toHaveLength(1);
    const subUnit = unit.sub_units[0]!;
    expect(subUnit.models).toHaveLength(1);
    
    const model = subUnit.models[0]!;
    
    // Should have Tough(9) base health
    expect(model.max_tough).toBe(9);
    expect(model.current_tough).toBe(9);
    
    // Should have correct weapons (not checking loadout, but our algorithm results)
    expect(model.weapons.length).toBeGreaterThan(0);
    
    // Should have upgrade records
    expect(model.upgrades.length).toBeGreaterThan(0);
    
    console.log('Grinder Truck Model Analysis:');
    console.log(`- Tough: ${model.max_tough}`);
    console.log(`- Weapons: ${model.weapons.map(w => w.name).join(', ')}`);
    console.log(`- Upgrades: ${model.upgrades.map(u => u.name).join(', ')}`);
    console.log(`- Reassignable upgrades: ${model.upgrades.filter(u => u.reassignable).map(u => u.name).join(', ')}`);
  });

  test('should process real Wall of Shame Sisters correctly', () => {
    const armyData = JSON.parse(fs.readFileSync('/tmp/latest_army.json', 'utf8'));
    
    // Extract Wall of Shame Sisters (Destroyer Sisters)
    const wallOfShame = armyData.units.find((unit: any) => unit.customName === 'Wall of Shame Sisters');
    expect(wallOfShame).toBeDefined();
    
    const testArmy = {
      ...armyData,
      units: [wallOfShame]
    };
    
    const result = NewArmyProcessor.processArmy(testArmy);
    
    expect(result.units).toHaveLength(1);
    const unit = result.units[0]!;
    expect(unit.name).toBe('Wall of Shame Sisters');
    expect(unit.model_count).toBe(3);
    
    const subUnit = unit.sub_units[0]!;
    expect(subUnit.models).toHaveLength(3);
    
    console.log('Wall of Shame Sisters Analysis:');
    subUnit.models.forEach((model, index) => {
      console.log(`Model ${index + 1}:`);
      console.log(`  - Tough: ${model.max_tough}`);
      console.log(`  - Weapons: ${model.weapons.map(w => w.name).join(', ')}`);
      console.log(`  - Upgrades: ${model.upgrades.map(u => u.name).join(', ')}`);
      console.log(`  - Reassignable: ${model.upgrades.filter(u => u.reassignable).map(u => u.name).join(', ')}`);
    });
    
    // All models should have Tough(3) base health
    subUnit.models.forEach(model => {
      expect(model.max_tough).toBeGreaterThanOrEqual(3);
    });
  });

  test('should process combined Infantry Squad correctly', () => {
    const armyData = JSON.parse(fs.readFileSync('/tmp/latest_army.json', 'utf8'));
    
    // Extract combined Infantry Squad
    const combinedSquads = armyData.units.filter((unit: any) => 
      unit.customName === 'Bullshit-Squad Crews' && unit.combined === true
    );
    expect(combinedSquads).toHaveLength(2);
    
    const testArmy = {
      ...armyData,
      units: combinedSquads
    };
    
    const result = NewArmyProcessor.processArmy(testArmy);
    
    // Should merge into 1 combined unit
    expect(result.units).toHaveLength(1);
    const unit = result.units[0]!;
    expect(unit.name).toBe('Bullshit-Squad Crews');
    expect(unit.model_count).toBe(20); // Combined 10+10
    expect(unit.is_combined).toBe(true);
    
    const subUnit = unit.sub_units[0]!;
    expect(subUnit.models).toHaveLength(20);
    
    console.log('Combined Infantry Squad Analysis:');
    console.log(`- Total models: ${subUnit.models.length}`);
    console.log(`- Total cost: ${unit.total_cost}`);
    
    // Sample first few models
    subUnit.models.slice(0, 5).forEach((model, index) => {
      console.log(`Model ${index + 1}:`);
      console.log(`  - Tough: ${model.max_tough}`);
      console.log(`  - Weapons: ${model.weapons.map(w => w.name).join(', ')}`);
      console.log(`  - Upgrades: ${model.upgrades.map(u => u.name).join(', ')}`);
    });
  });
});