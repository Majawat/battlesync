# Test Armies for Validation

Collection of army list IDs for testing various OPR mechanics and edge cases.

## Test Army Collection

| Army Name | Owner | ArmyForge ID | Purpose | Notes |
|-----------|-------|--------------|---------|--------|
| **Dev Test Army** | Dev Testerson | `IJ1JM_m-jmka` | Primary test case | Combined units, Joined units, Campaign XP |
| **Cody's Army** | Cody | `vMzljLVC6ZGv` | Real user army | Production validation |
| **Alex's Army** | Alex | `Xo19MAwQPGbs` | Real user army | Edge case testing |
| **Claire's Army** | Claire | `Un3_pRTu2xBO` | Real user army | Different faction testing |
| **Victoria's Army** | Victoria | `OKOrilTDQs6P` | Real user army | Additional validation |

## Test Coverage

### Dev Test Army (IJ1JM_m-jmka)
- ✅ **Combined Units**: Multiple Infantry Squad units that merge
- ✅ **Joined Units**: Hero attached to regular unit  
- ✅ **Campaign XP**: Various XP levels and costs
- ✅ **Custom Names**: Mixed custom and default naming
- ✅ **Multiple Factions**: Complex army composition

**Expected Results**:
- Army Name: "Dev Testerson's Bullshit Army"
- Total Points: 2730 pts
- Model Count: 36 models  
- Activation Count: 7 units
- Combined Unit: "Bullshit-Squad Crews" (20 models, 475 pts)
- Joined Unit: "Mrs. Bitchtits w/ Minions" (11 models, 355 pts)

### Real User Armies (Production Validation)
These armies represent actual player usage and help validate:
- Different factions and game systems
- Various army compositions and sizes
- Edge cases in unit configurations
- Real-world naming patterns
- Different upgrade combinations

## Usage in Testing

### Unit Tests
```typescript
describe('Multiple Army Validation', () => {
  const testArmies = [
    { id: 'IJ1JM_m-jmka', name: 'Dev Test Army' },
    { id: 'vMzljLVC6ZGv', name: "Cody's Army" },
    { id: 'Xo19MAwQPGbs', name: "Alex's Army" },
    { id: 'Un3_pRTu2xBO', name: "Claire's Army" },
    { id: 'OKOrilTDQs6P', name: "Victoria's Army" }
  ];

  testArmies.forEach(army => {
    test(`should process ${army.name} correctly`, async () => {
      const response = await axios.get(
        `https://army-forge.onepagerules.com/api/tts?id=${army.id}`
      );
      const processed = ArmyProcessor.processArmy(response.data);
      
      // Validate basic structure
      expect(processed.armyforge_id).toBe(army.id);
      expect(processed.units.length).toBeGreaterThan(0);
      expect(processed.model_count).toBeGreaterThan(0);
      expect(processed.list_points).toBeGreaterThan(0);
    });
  });
});
```

### API Testing
```bash
# Test each army import
curl -X POST http://localhost:4019/api/armies/import \
  -H "Content-Type: application/json" \
  -d '{"armyForgeId": "IJ1JM_m-jmka"}'

curl -X POST http://localhost:4019/api/armies/import \
  -H "Content-Type: application/json" \
  -d '{"armyForgeId": "vMzljLVC6ZGv"}'

# Continue for all armies...
```

### Manual Validation Checklist
For each army, verify:
- [ ] Import succeeds without errors
- [ ] Total points match ArmyForge UI
- [ ] Model count is accurate
- [ ] Unit names use proper custom naming
- [ ] Combined/Joined mechanics work correctly
- [ ] Campaign XP costs are included
- [ ] Database storage is complete
- [ ] Retrieval returns same data

## ArmyForge Links

**Direct Links for Manual Verification**:
- [Dev Test Army](https://army-forge.onepagerules.com/share?id=IJ1JM_m-jmka)
- [Cody's Army](https://army-forge.onepagerules.com/share?id=vMzljLVC6ZGv)
- [Alex's Army](https://army-forge.onepagerules.com/share?id=Xo19MAwQPGbs)  
- [Claire's Army](https://army-forge.onepagerules.com/share?id=Un3_pRTu2xBO)
- [Victoria's Army](https://army-forge.onepagerules.com/share?id=OKOrilTDQs6P)

**API Endpoints**:
- `https://army-forge.onepagerules.com/api/tts?id=IJ1JM_m-jmka`
- `https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv`
- `https://army-forge.onepagerules.com/api/tts?id=Xo19MAwQPGbs`
- `https://army-forge.onepagerules.com/api/tts?id=Un3_pRTu2xBO`
- `https://army-forge.onepagerules.com/api/tts?id=OKOrilTDQs6P`

---

*This collection provides comprehensive test coverage for army import functionality across different use cases and edge scenarios.*