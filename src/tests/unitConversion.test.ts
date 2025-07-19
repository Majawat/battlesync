import { OPRArmyConverter } from '../services/oprArmyConverter';
import { ArmyForgeData } from '../types/army';
import { OPRBattleUnit, OPRBattleModel } from '../types/oprBattle';

describe('Unit Conversion - Hero Joining', () => {
  
  // Test data based on real Army Forge JSON
  const mockArmyForgeData: ArmyForgeData = {
    id: "test-army",
    name: "Test Army",
    faction: "Test Faction",
    gameSystem: "gf",
    points: 385, // 85 + 300
    units: [
      // Hero unit (Zarek Thal)
      {
        id: "Nzc4pM6",
        name: "Elite Veteran",
        customName: "Zarek Thal",
        size: 1,
        cost: 85,
        quality: 4,
        defense: 4,
        joinToUnit: "HyvQz", // <-- Key field: joins to Ironclaw Vanguard
        selectionId: "vaQwO",
        xp: 0,
        weapons: [
          {
            id: "ccw-1",
            name: "CCW",
            range: 0,
            attacks: 1,
            label: "CCW (A1)"
          },
          {
            id: "rifle-1", 
            name: "Elite Energy Rifle",
            range: 24,
            attacks: 2,
            specialRules: [{ id: "ap-1", name: "AP", rating: 1 }],
            label: "Elite Energy Rifle (24\", A2, AP(1))"
          }
        ],
        rules: [
          { id: "carnivore", name: "Carnivore", label: "Carnivore" },
          { id: "hero", name: "Hero", label: "Hero" },
          { id: "relentless", name: "Relentless", label: "Relentless" },
          { id: "strider", name: "Strider", label: "Strider" },
          { id: "tough", name: "Tough", rating: 3, label: "Tough(3)" },
          { id: "hidden", name: "Hidden Route", label: "Hidden Route" }
        ],
        type: "HERO",
        combined: false
      },
      // Target unit (Ironclaw Vanguard)
      {
        id: "uF7noGn",
        name: "Elites", 
        customName: "Ironclaw Vanguard",
        size: 10,
        cost: 300,
        quality: 4,
        defense: 4,
        joinToUnit: null, // <-- Not joining anyone
        selectionId: "HyvQz", // <-- Hero joins to this ID
        xp: 0,
        weapons: [
          {
            id: "ccw-2",
            name: "CCW",
            range: 0,
            attacks: 1,
            count: 10,
            label: "CCW (A1)"
          },
          {
            id: "shotgun-1",
            name: "Shotgun", 
            range: 12,
            attacks: 2,
            count: 8,
            specialRules: [{ id: "ap-1", name: "AP", rating: 1 }],
            label: "Shotgun (12\", A2, AP(1))"
          },
          {
            id: "plasma-1",
            name: "Plasma Rifle",
            range: 24, 
            attacks: 1,
            count: 2,
            specialRules: [{ id: "ap-4", name: "AP", rating: 4 }],
            label: "Plasma Rifle (24\", A1, AP(4))"
          }
        ],
        rules: [
          { id: "carnivore", name: "Carnivore", label: "Carnivore" },
          { id: "relentless", name: "Relentless", label: "Relentless" },
          { id: "strider", name: "Strider", label: "Strider" },
          { id: "beacon-1", name: "Beacon", label: "Beacon", count: 2 }
        ],
        type: "UNIT",
        combined: false
      }
    ],
    specialRules: [],
    metadata: {
      version: "1.0",
      lastModified: "2025-07-12",
      createdBy: "test"
    }
  };

  describe('Hero Joining Conversion', () => {
    
    it('should properly join hero to target unit', async () => {
      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123", 
        mockArmyForgeData,
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      // Should have only 1 unit after joining (not 2 separate units)
      expect(result.army!.units).toHaveLength(1);
      
      const joinedUnit = result.army!.units[0];
      
      // Unit should be marked as JOINED type
      expect(joinedUnit.type).toBe('JOINED');
      expect(joinedUnit.name).toBe('Elites'); // Base unit name
      expect(joinedUnit.customName).toBe('Ironclaw Vanguard'); // Base unit custom name
      
      // Size should be 11 (10 + 1 hero)
      expect(joinedUnit.originalSize).toBe(11);
      expect(joinedUnit.currentSize).toBe(11);
      
      // Should have joinedHero field populated
      expect(joinedUnit.joinedHero).toBeDefined();
      expect(joinedUnit.joinedHero?.name).toBe('Zarek Thal');
      expect(joinedUnit.joinedHero?.isHero).toBe(true);
      expect(joinedUnit.joinedHero?.maxTough).toBe(3);
      expect(joinedUnit.joinedHero?.quality).toBe(4);
      expect(joinedUnit.joinedHero?.defense).toBe(4);
      
      // Hero should have separate weapons
      expect(joinedUnit.joinedHero?.weapons).toContain('CCW (A1)');
      expect(joinedUnit.joinedHero?.weapons).toContain('Elite Energy Rifle (24", A2, AP(1))');
      
      // Hero should have separate special rules
      expect(joinedUnit.joinedHero?.specialRules).toContain('Hero');
      expect(joinedUnit.joinedHero?.specialRules).toContain('Tough(3)');
      expect(joinedUnit.joinedHero?.specialRules).toContain('Hidden Route');
      
      // Unit should have 10 regular models (not including hero)
      expect(joinedUnit.models).toHaveLength(10); // Regular models only
      
      // Regular models should have unit stats
      joinedUnit.models.forEach(model => {
        expect(model.isHero).toBe(false);
        expect(model.quality).toBe(4);
        expect(model.defense).toBe(4);
        expect(model.maxTough).toBe(1); // Regular models have Tough(1)
      });
    });

    it('should preserve experience points when joining', async () => {
      // Test with XP on both units
      const dataWithXP = {
        ...mockArmyForgeData,
        units: mockArmyForgeData.units.map(unit => ({
          ...unit,
          xp: unit.id === "Nzc4pM6" ? 5 : 10 // Hero: 5 XP, Unit: 10 XP
        }))
      };

      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123",
        dataWithXP,
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      expect(result.success).toBe(true);
      const joinedUnit = result.army!.units[0];
      
      // XP should be combined or tracked separately
      // This depends on how we want to implement XP for joined units
      expect(joinedUnit.sourceUnit.xp).toBeDefined();
    });

    it('should not join heroes with Tough > 6', async () => {
      // Test hero with Tough(7) - should not join
      const dataWithToughHero = {
        ...mockArmyForgeData,
        units: mockArmyForgeData.units.map(unit => 
          unit.id === "Nzc4pM6" 
            ? {
                ...unit,
                rules: unit.rules?.map(rule => 
                  rule.name === "Tough" 
                    ? { ...rule, rating: 7, label: "Tough(7)" }
                    : rule
                ) || []
              }
            : unit
        )
      };

      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123", 
        "army-123",
        dataWithToughHero,
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      expect(result.success).toBe(true);
      
      // Should have 2 separate units (hero shouldn't join)
      expect(result.army!.units).toHaveLength(2);
      
      // Neither unit should be JOINED type
      result.army!.units.forEach(unit => {
        expect(unit.type).not.toBe('JOINED');
        expect(unit.joinedHero).toBeUndefined();
      });
    });

    it('should handle units without joinToUnit field', async () => {
      // Test when joinToUnit is null/undefined (no joining specified)
      const dataNoJoining = {
        ...mockArmyForgeData,
        units: mockArmyForgeData.units.map(unit => ({
          ...unit,
          joinToUnit: null // No joining
        }))
      };

      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123", 
        dataNoJoining,
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      expect(result.success).toBe(true);
      
      // Should have 2 separate units
      expect(result.army!.units).toHaveLength(2);
      
      // No units should be joined
      result.army!.units.forEach(unit => {
        expect(unit.type).not.toBe('JOINED');
        expect(unit.joinedHero).toBeUndefined();
      });
    });

    it('should handle missing target unit gracefully', async () => {
      // Test when hero tries to join non-existent unit
      const dataInvalidJoin = {
        ...mockArmyForgeData,
        units: [
          {
            ...mockArmyForgeData.units[0], // Hero only
            joinToUnit: "NonExistentId" // Invalid target
          }
        ]
      };

      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123",
        dataInvalidJoin, 
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      expect(result.success).toBe(true);
      
      // Should have 1 unit (hero alone)
      expect(result.army!.units).toHaveLength(1);
      
      // Should have warning about failed join
      expect(result.warnings[0]).toMatch(/could not find target unit/i);
    });
  });

  describe('Current Implementation Test', () => {
    
    it('should show what current converter actually does', async () => {
      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123",
        mockArmyForgeData,
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      console.log('=== CURRENT CONVERSION RESULT ===');
      console.log('Success:', result.success);
      console.log('Units count:', result.army!.units.length);
      console.log('Warnings:', result.warnings);
      console.log('Errors:', result.errors);
      
      result.army!.units.forEach((unit, i) => {
        console.log(`\nUnit ${i + 1}:`);
        console.log('- Name:', unit.customName || unit.name);
        console.log('- Type:', unit.type);
        console.log('- Size:', `${unit.currentSize}/${unit.originalSize}`);
        console.log('- Joined Hero:', unit.joinedHero?.name || 'None');
        console.log('- Models:', unit.models.length);
      });

      // This test will show us what's actually happening
      // vs. what should happen
    });
  });
});