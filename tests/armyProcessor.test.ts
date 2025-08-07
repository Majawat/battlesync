import { ArmyProcessor } from '../src/services/armyProcessor';
import { ArmyForgeArmy } from '../src/types/armyforge';
import axios from 'axios';

describe('ArmyProcessor', () => {
  let testArmyData: ArmyForgeArmy;

  beforeAll(async () => {
    // Fetch real test army data from ArmyForge API
    const response = await axios.get<ArmyForgeArmy>('https://army-forge.onepagerules.com/api/tts?id=IJ1JM_m-jmka');
    testArmyData = response.data;
  });

  describe('processArmy', () => {
    test('should process test army IJ1JM_m-jmka correctly', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);

      // Basic army metadata
      expect(processed.armyforge_id).toBe('IJ1JM_m-jmka');
      expect(processed.name).toBe("Dev Testerson's Bullshit Army");
      expect(processed.model_count).toBe(36);

      // Should have 7 processed units (down from 9 due to merging)
      expect(processed.units).toHaveLength(7);

      // Total army cost should match ArmyForge UI (2730 pts)
      const totalCost = processed.units.reduce((sum, unit) => sum + unit.total_cost, 0);
      expect(totalCost).toBe(2730);
    });

    test('should merge Combined units correctly', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);
      
      // Find the combined Infantry Squad
      const combinedUnit = processed.units.find(u => 
        u.name === 'Infantry Squad' && u.is_combined
      );
      
      expect(combinedUnit).toBeDefined();
      expect(combinedUnit!.total_cost).toBe(475); // Combined cost from both units
      expect(combinedUnit!.model_count).toBe(20); // 10 + 10 models
      expect(combinedUnit!.custom_name).toBe('Bullshit-Squad Crews');
    });

    test('should merge Joined units correctly', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);
      
      // Find the joined unit (Minions + Mrs. Bitchtits)
      const joinedUnit = processed.units.find(u => u.is_joined);
      
      expect(joinedUnit).toBeDefined();
      expect(joinedUnit!.total_cost).toBe(355); // 140 + 215
      expect(joinedUnit!.model_count).toBe(11); // 10 + 1 models
      expect(joinedUnit!.has_hero).toBe(true);
      expect(joinedUnit!.has_caster).toBe(true);
      expect(joinedUnit!.sub_units).toHaveLength(2);
      
      // Check sub-units
      const heroSubUnit = joinedUnit!.sub_units.find(su => su.is_hero);
      const regularSubUnit = joinedUnit!.sub_units.find(su => !su.is_hero);
      
      expect(heroSubUnit).toBeDefined();
      expect(heroSubUnit!.name).toBe('Celestial High Sister');
      expect(heroSubUnit!.custom_name).toBe('Mrs. Bitchtits');
      expect(heroSubUnit!.cost).toBe(215);
      
      expect(regularSubUnit).toBeDefined();
      expect(regularSubUnit!.name).toBe('Minions');
      expect(regularSubUnit!.cost).toBe(140);
    });

    test('should calculate individual unit costs correctly', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);
      
      const expectedCosts = [
        { name: 'Elite Veteran', cost: 140 },
        { name: 'Storm Leader', customName: 'Darth Vader', cost: 145 },
        { name: 'Company Leader', customName: 'Captain Bullshit', cost: 150 },
        { name: 'Grinder Truck', customName: 'Grindr Love Truck', cost: 335 },
        { name: 'Blessed Titan', cost: 1130 }
      ];

      expectedCosts.forEach(expected => {
        const unit = processed.units.find(u => 
          u.name === expected.name && 
          (expected.customName ? u.custom_name === expected.customName : true)
        );
        
        expect(unit).toBeDefined();
        expect(unit!.total_cost).toBe(expected.cost);
      });
    });

    test('should preserve campaign data correctly', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);
      
      // Check Mrs. Bitchtits has campaign data
      const joinedUnit = processed.units.find(u => u.is_joined);
      const heroSubUnit = joinedUnit!.sub_units.find(su => su.is_hero);
      
      expect(heroSubUnit!.xp).toBe(5);
      expect(heroSubUnit!.notes).toContain("This lady is the bitch's tits");
    });

    test('should create correct battle stats for joined units', () => {
      const processed = ArmyProcessor.processArmy(testArmyData);
      
      // Joined unit should use Hero's Quality and regular unit's Defense
      const joinedUnit = processed.units.find(u => u.is_joined);
      const heroSubUnit = joinedUnit!.sub_units.find(su => su.is_hero);
      const regularSubUnit = joinedUnit!.sub_units.find(su => !su.is_hero);
      
      expect(joinedUnit!.quality).toBe(heroSubUnit!.quality); // Hero quality
      expect(joinedUnit!.defense).toBe(regularSubUnit!.defense); // Regular unit defense
    });
  });
});