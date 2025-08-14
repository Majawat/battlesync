# Dependency-Based Upgrade System Analysis

## Problem Summary
The current upgrade system in `armyProcessor.ts` line 862 uses string matching that fails:
```typescript
!upgrade.targets.includes(weapon.name)  // "Rifles" ≠ "Rifle"
```

## Key Discovery: Base Weapons Have Dependencies
ArmyForge provides dependency data that maps weapons to upgrade instanceIds. **We can eliminate string matching entirely.**

### Example from Infantry Squad (Unit ID: `_nbz3zj`)
```json
{
  "id": "ar_e50-g",
  "name": "Rifle",
  "dependencies": [
    {"upgradeInstanceId": "EI48BYNDI", "count": 1, "variant": "replace"},
    {"upgradeInstanceId": "GthK1AMc7", "count": 1, "variant": "replace"},
    {"upgradeInstanceId": "N8P9pbPmx", "count": 1, "variant": "replace"},
    {"upgradeInstanceId": "HY7mAnJ5G", "count": 1, "variant": "replace"}
  ]
}
```

### Upgrade Instance Mappings
- `"HY7mAnJ5G"` → Sniper Rifle upgrade (`bmibqI_CT` in our test files)
- `"N8P9pbPmx"` → Plasma Rifle upgrade 
- `"EI48BYNDI"` → Weapon Team (Autocannon) upgrade
- `"GthK1AMc7"` → Sergeant Pistol upgrade

## Current vs Proposed Logic

### Current (Broken)
```typescript
// Line 862 in armyProcessor.ts
model.weapons = model.weapons.filter(weapon => 
  !upgrade.targets.includes(weapon.name)  // String matching fails
);
```

### Proposed (Dependency-Based)
```typescript
const affectedWeapons = unit.weapons.filter(weapon => 
  weapon.dependencies?.some(dep => dep.upgradeInstanceId === selectedUpgrade.instanceId)
);
```

## Implementation Plan

### Files to Modify
- `/home/cody/battlesync/src/services/armyProcessor.ts` - Line 859-863 (applyUpgradePathToModel function)

### Changes Needed
1. **Replace string-based filtering** with dependency-based filtering
2. **Use `selectedUpgrade.instanceId`** to match against `weapon.dependencies[].upgradeInstanceId`
3. **Remove reliance on `upgrade.targets`** entirely
4. **Use dependency `count` and `variant`** fields for proper replacement logic

### Code Pattern Already Exists
Found in compiled TypeScript:
```javascript
const affectedWeapons = unit.weapons.filter(weapon => 
  weapon.dependencies?.some(dep => dep.upgradeInstanceId === instanceId)
);
```

## Test Cases to Validate
1. **Sniper Rifle**: instanceId `"HY7mAnJ5G"` should match Rifle weapon with that dependency
2. **Plasma Rifle**: instanceId `"N8P9pbPmx"` should match Rifle weapon with that dependency
3. **Sergeant Weapons**: Chain dependencies (Pistol → Plasma Pistol, Hand Weapon → Energy Sword)
4. **Combined Units**: Ensure dependency matching works with doubled weapons

## Benefits
- **Eliminates string matching issues** (plural/singular, case sensitivity)
- **Uses official ArmyForge data structure** (more reliable)
- **Handles complex dependency chains** (sergeant weapons)
- **Future-proof** against naming changes in ArmyForge

## Data Source
- Raw ArmyForge API: `https://army-forge.onepagerules.com/api/tts?id=IJ1JM_m-jmka`
- **NEW LOCATION**: `/home/cody/battlesync/scripts/sampleArmyData/IJ1JM_m-jmka/`
- Raw data: `armyforge_raw.json`
- Individual units: `_nbz3zj.json` (Infantry Squad), `t2ehUmj.json` (Minions), etc.
- Upgrade data: `_nbz3zj_upgrades.json`, etc.
- Test files: `sniper_upgrade.json`, `wolf_dog_upgrade.json`, `heavy_armor_upgrade.json`

## Script for Data Management
- **Fetch script**: `/home/cody/battlesync/scripts/fetch-and-split-army.js`
- **Usage**: `cd scripts && node fetch-and-split-army.js IJ1JM_m-jmka`
- **Features**: Downloads raw data, splits into individual unit files, extracts upgrade data

## Next Steps
1. Modify `applyUpgradePathToModel()` function to use dependency matching
2. Remove `upgrade.targets` usage completely  
3. Test with various upgrade types (replace, upgrade, model-specific)
4. Verify count doubling issues are resolved
5. Update TypeScript types if needed (`ArmyForgeWeapon.dependencies`)