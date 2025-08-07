# Army Import Validation Guide

This guide helps verify that our army import system is working correctly by comparing our processed data against the expected ArmyForge values.

## Test Army: IJ1JM_m-jmka

**ArmyForge Link**: https://army-forge.onepagerules.com/share?id=IJ1JM_m-jmka

### Expected Values (from ArmyForge UI)

- **Army Name**: "Dev Testerson's Bullshit Army"
- **Points Limit**: 2500 pts
- **List Points**: 2730 pts (exceeds limit due to campaign XP)
- **Model Count**: 36 models total
- **Activation Count**: 7 units (after merging)

### Unit Breakdown (Expected)

| Unit Name | Type | Models | Cost | Notes |
|-----------|------|--------|------|-------|
| Elite Veteran | Regular | 5 | 140 | Standard unit |
| Darth Vader | Regular | 1 | 145 | Custom name |
| Captain Bullshit | Regular | 1 | 150 | Custom name |
| Grindr Love Truck | Regular | 1 | 335 | Custom name |
| Bullshit-Squad Crews | Combined | 20 | 475 | 2 units merged |
| Mrs. Bitchtits w/ Minions | Joined | 11 | 355 | Hero + Unit |
| Combined Assault Troops | Combined | 6 | 1120 | 2 units merged |

### Critical OPR Mechanics to Verify

#### 1. Combined Units
- **Original ArmyForge**: 2 separate "Infantry Squad" entries with same base name but different upgrades
- **Expected Result**: Single "Bullshit-Squad Crews" unit with 20 models, 475 pts
- **Key Check**: Stats are merged correctly, not just doubled

#### 2. Joined Units  
- **Original ArmyForge**: "Celestial High Sister" (Mrs. Bitchtits) + "Minions" with `joinToId`
- **Expected Result**: "Mrs. Bitchtits w/ Minions" with 11 models, 355 pts
- **Key Check**: Hero uses unit's Defense until last model, proper damage allocation

#### 3. Campaign XP Costs
- **Level Calculation**: XP ÷ 5 = levels
- **Cost Addition**: +25 pts per level (regular units), +55 pts per level (heroes)
- **Key Check**: Total cost includes base + upgrades + campaign levels

## Manual Validation Steps

### Step 1: Start the Server
```bash
npm run dev
# Server should start on http://localhost:4019
```

### Step 2: Import the Test Army
```bash
curl -X POST http://localhost:4019/api/armies/import \
  -H "Content-Type: application/json" \
  -d '{"armyForgeId": "IJ1JM_m-jmka"}'
```

### Step 3: Verify Response
Check that the response contains:
- `success: true`
- `army.name: "Dev Testerson's Bullshit Army"`
- `army.list_points: 2730`
- `army.model_count: 36`
- `army.activation_count: 7`

### Step 4: List All Armies
```bash
curl http://localhost:4019/api/armies
```

### Step 5: Get Full Army Details
```bash
curl http://localhost:4019/api/armies/1
```

### Step 6: Verify Database Storage
Check that all units, sub-units, and models are properly stored with correct relationships.

## Common Issues to Check

### 1. Cost Calculation Errors
- **Symptom**: Total doesn't match ArmyForge UI (should be 2730)
- **Cause**: Missing campaign XP level costs
- **Fix**: Ensure `calculateUnitCost` includes level bonuses

### 2. Unit Merging Problems
- **Combined Units**: Should merge units with same ID but different upgrades
- **Joined Units**: Should combine hero with base unit, maintain separate sub-unit identity

### 3. Naming Issues
- **Custom Names**: Should take priority over base names
- **Joined Units**: Should use "Hero w/ Unit" format
- **Display Names**: Should match user expectations

### 4. Database Integrity
- **Foreign Keys**: All relationships should be properly maintained
- **Model Tracking**: Individual models created for health tracking
- **Sub-unit Preservation**: Original unit identity maintained

## Validation Checklist

- [ ] Army totals match ArmyForge (2730 pts, 36 models, 7 units)
- [ ] Combined units properly merged (not just doubled)
- [ ] Joined units use correct naming format
- [ ] Campaign XP costs included in calculations
- [ ] All database relationships intact
- [ ] API endpoints return correct data structure
- [ ] Error handling works for invalid inputs
- [ ] Data consistency between import and retrieval

## Debugging Tips

### View Raw ArmyForge Data
```bash
curl https://army-forge.onepagerules.com/api/tts?id=IJ1JM_m-jmka
```

### Check Database Contents
```sql
SELECT name, list_points, model_count, activation_count FROM armies;
SELECT u.name, u.total_cost, u.model_count, u.is_combined, u.is_joined FROM units u;
SELECT su.name, su.custom_name, su.cost, su.size, su.is_hero FROM sub_units su;
```

### Run Specific Tests
```bash
npm test -- armyProcessor.test.ts
npm test -- armyImport.test.ts
```

---

*This validation ensures our army import system correctly handles all OPR mechanics and edge cases.*