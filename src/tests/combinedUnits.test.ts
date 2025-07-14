import { OPRArmyConverter } from '../services/oprArmyConverter';
import { ArmyForgeData } from '../types/army';

describe('Unit Conversion - Combined Units', () => {
  
  describe('Valid Combined Units', () => {
    
    it('should combine two identical Elite units with same equipment', async () => {
      const validCombinedData: ArmyForgeData = {
        id: "test-combined-valid",
        name: "Combined Units Test",
        faction: "Test Faction",
        gameSystem: "gf",
        points: 600, // 300 + 300
        units: [
          // First Elite unit
          {
            id: "elite1",
            name: "Elites",
            customName: "Ironclaw Vanguard A",
            size: 10,
            cost: 300,
            quality: 4,
            defense: 4,
            combined: true, // Marked for combining
            selectionId: "unit1",
            joinToUnit: null,
            xp: 0,
            weapons: [
              {
                id: "ccw-1",
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
              { id: "strider", name: "Strider", label: "Strider" }
            ],
            type: "UNIT"
          },
          // Second Elite unit (identical equipment)
          {
            id: "elite2", 
            name: "Elites",
            customName: "Ironclaw Vanguard B",
            size: 10,
            cost: 300,
            quality: 4,
            defense: 4,
            combined: true, // Marked for combining
            selectionId: "unit2",
            joinToUnit: null,
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
                id: "shotgun-2",
                name: "Shotgun", 
                range: 12,
                attacks: 2,
                count: 8,
                specialRules: [{ id: "ap-1", name: "AP", rating: 1 }],
                label: "Shotgun (12\", A2, AP(1))"
              },
              {
                id: "plasma-2",
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
              { id: "strider", name: "Strider", label: "Strider" }
            ],
            type: "UNIT"
          }
        ],
        specialRules: [],
        metadata: {
          version: "1.0",
          lastModified: "2025-07-12",
          createdBy: "test"
        }
      };

      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123",
        validCombinedData,
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      console.log('\n=== VALID COMBINED UNITS TEST ===');
      console.log('BEFORE: 2 identical Elite units (10 models each)');
      console.log('- Unit A: Ironclaw Vanguard A, Size 10, Cost 300');
      console.log('- Unit B: Ironclaw Vanguard B, Size 10, Cost 300');
      console.log('- Both have identical weapons: CCW, Shotgun, Plasma');
      console.log('- Both marked as combined: true');
      console.log('');
      console.log('AFTER CONVERSION:');
      console.log(`- Success: ${result.success}`);
      console.log(`- Units count: ${result.army.units.length}`);
      console.log(`- Warnings: ${result.warnings.join(', ')}`);
      
      if (result.army.units.length > 0) {
        const combinedUnit = result.army.units[0];
        console.log(`- Combined unit type: ${combinedUnit.type}`);
        console.log(`- Combined unit size: ${combinedUnit.originalSize} (10 + 10 = 20)`);
        console.log(`- Models count: ${combinedUnit.models.length}`);
        console.log(`- Combined from: ${combinedUnit.combinedFrom?.join(' + ')}`);
      }

      expect(result.success).toBe(true);
      expect(result.army.units).toHaveLength(1);
      
      const combinedUnit = result.army.units[0];
      expect(combinedUnit.type).toBe('COMBINED');
      expect(combinedUnit.originalSize).toBe(20); // 10 + 10
      expect(combinedUnit.models).toHaveLength(20);
      expect(combinedUnit.combinedFrom).toEqual(['elite1', 'elite2']);
      // No warnings expected for successful combination - this is normal behavior
    });
  });

  describe('ArmyForge Validated Combined Units', () => {
    
    it('should combine units with different weapons when ArmyForge validates them', async () => {
      const validatedCombinedData: ArmyForgeData = {
        id: "test-combined-validated", 
        name: "ArmyForge Validated Combined Test",
        faction: "Test Faction", 
        gameSystem: "gf",
        points: 600,
        units: [
          // Elite unit with Rifles
          {
            id: "elite-rifles",
            name: "Dynasty Warriors",
            customName: "Warriors with Rifles",
            size: 10,
            cost: 300,
            quality: 4,
            defense: 4,
            combined: true,
            selectionId: "unit1",
            joinToUnit: null,
            xp: 0,
            weapons: [
              {
                id: "ccw-1",
                name: "CCW",
                range: 0,
                attacks: 1,
                count: 10,
                label: "CCW (A1)"
              },
              {
                id: "rifle-1",
                name: "Rifle",
                range: 24,
                attacks: 1,
                count: 10, // ALL models have rifles
                label: "Rifle (24\", A1)"
              }
            ],
            rules: [
              { id: "relentless", name: "Relentless", label: "Relentless" }
            ],
            type: "UNIT"
          },
          // Elite unit with Shotguns (different upgrade applied to all)
          {
            id: "elite-shotguns",
            name: "Dynasty Warriors", 
            customName: "Warriors with Shotguns",
            size: 10,
            cost: 320, // Different cost due to different weapons
            quality: 4,
            defense: 4,
            combined: true,
            selectionId: "unit2",
            joinToUnit: null,
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
                id: "shotgun-2",
                name: "Shotgun",
                range: 12,
                attacks: 2,
                count: 10, // ALL models have shotguns
                specialRules: [{ id: "ap-1", name: "AP", rating: 1 }],
                label: "Shotgun (12\", A2, AP(1))"
              }
            ],
            rules: [
              { id: "relentless", name: "Relentless", label: "Relentless" }
            ],
            type: "UNIT"
          }
        ],
        specialRules: [],
        metadata: {
          version: "1.0",
          lastModified: "2025-07-12",
          createdBy: "test"
        }
      };

      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123",
        validatedCombinedData,
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      console.log('\n=== ARMYFORGE VALIDATED COMBINED UNITS TEST ===');
      console.log('BEFORE: 2 Dynasty Warriors units with DIFFERENT weapons');
      console.log('- Unit A: All models have Rifles (applied to all)');
      console.log('- Unit B: All models have Shotguns (applied to all)');
      console.log('- Different costs: 300 vs 320');
      console.log('- Both marked as combined: true (validated by ArmyForge)');
      console.log('');
      console.log('AFTER CONVERSION:');
      console.log(`- Success: ${result.success}`);
      console.log(`- Units count: ${result.army.units.length} (combined per ArmyForge validation)`);
      console.log(`- Warnings: ${result.warnings.join(', ')}`);
      
      result.army.units.forEach((unit, i) => {
        console.log(`- Unit ${i + 1}: ${unit.customName}, Type: ${unit.type}, Size: ${unit.originalSize}`);
      });

      expect(result.success).toBe(true);
      // If ArmyForge marked them as combined: true, we trust that validation and combine them
      expect(result.army.units).toHaveLength(1); // Combined into one unit
      
      const combinedUnit = result.army.units[0];
      expect(combinedUnit.type).toBe('COMBINED');
      expect(combinedUnit.originalSize).toBe(20); // 10 + 10 combined
      expect(combinedUnit.combinedFrom).toEqual(['elite-rifles', 'elite-shotguns']);
      
      // No warnings for valid ArmyForge-validated combinations
    });
  });

  describe('Edge Cases', () => {
    
    it('should handle single unit marked as combined', async () => {
      const singleCombinedData: ArmyForgeData = {
        id: "test-single-combined",
        name: "Single Combined Test",
        faction: "Test Faction",
        gameSystem: "gf", 
        points: 300,
        units: [
          {
            id: "single-elite",
            name: "Elites",
            customName: "Lone Elite",
            size: 10,
            cost: 300,
            quality: 4,
            defense: 4,
            combined: true, // Marked as combined but no pair
            selectionId: "unit1",
            joinToUnit: null,
            xp: 0,
            weapons: [
              {
                id: "ccw-1",
                name: "CCW",
                range: 0,
                attacks: 1,
                count: 10,
                label: "CCW (A1)"
              }
            ],
            rules: [
              { id: "relentless", name: "Relentless", label: "Relentless" }
            ],
            type: "UNIT"
          }
        ],
        specialRules: [],
        metadata: {
          version: "1.0",
          lastModified: "2025-07-12",
          createdBy: "test"
        }
      };

      const result = await OPRArmyConverter.convertArmyToBattle(
        "user-123",
        "army-123", 
        singleCombinedData,
        { allowJoined: true, allowCombined: true, preserveCustomNames: true }
      );

      console.log('\n=== SINGLE COMBINED UNIT TEST ===');
      console.log('BEFORE: 1 unit marked as combined but no pair');
      console.log('AFTER: Should be treated as STANDARD unit');
      console.log(`- Units count: ${result.army.units.length}`);
      console.log(`- Unit type: ${result.army.units[0]?.type}`);
      console.log(`- Warnings: ${result.warnings.join(', ')}`);

      expect(result.success).toBe(true);
      expect(result.army.units).toHaveLength(1);
      expect(result.army.units[0].type).toBe('STANDARD');
      expect(result.army.units[0].isCombined).toBe(false);
      expect(result.warnings).toContain('Unit "Elites" marked as combined but no duplicate found - treating as standard');
    });
  });
});