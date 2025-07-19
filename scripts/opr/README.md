# OPR Data Collection Scripts

This directory contains scripts for collecting and analyzing data from One Page Rules (OPR) army books via the ArmyForge API.

## Scripts

### `get_opr_data.py`

Comprehensive data collection script that fetches:
- **Spells**: All spells from every official OPR army book
- **Special Rules**: All faction-specific and universal special rules

#### Usage
```bash
cd scripts/opr
python get_opr_data.py
```

#### Output Files
All output files are saved to `/data/opr/`:
- `spells.json` / `spells.csv` - All spell data
- `special_rules.json` / `special_rules.csv` - All special rules data

#### Game Systems Covered
- Grimdark Future
- Grimdark Future: Firefight  
- Age of Fantasy
- Age of Fantasy: Skirmish
- Age of Fantasy: Regiments
- Age of Fantasy: Quest
- Grimdark Future: Star Quest

#### Data Structure

**Spells**:
```json
{
  "faction": "Blessed Sisters",
  "gameSystem": "grimdark-future", 
  "armyUid": "7oi8zeiqfamiur21",
  "spellId": "abc123",
  "name": "Holy Tears",
  "type": "blessing",
  "threshold": 1,
  "effect": "Target 2 friendly units within 12\" get Poison next time they fight in melee.",
  "effectSkirmish": null,
  "spellbookId": "def456"
}
```

**Special Rules**:
```json
{
  "faction": "Soul-Snatcher Cults",
  "gameSystem": "grimdark-future",
  "armyUid": "zz3kp5ry7ks6mxcx", 
  "ruleId": "4Nay818dLPu2",
  "name": "Poison Mist",
  "aliasedRuleId": null,
  "description": "Once per this unit's activation, before attacking, roll one die. On a 4+ two enemy units within 6\" take 1 hit with Blast(6) and Poison.",
  "hasRating": null,
  "coreType": null,
  "targetType": 1
}
```

## Purpose

This data is used for:
- Understanding OPR rule mechanics and special abilities
- Implementing spell systems in BattleSync
- Analyzing rule complexity and edge cases
- Building comprehensive rule databases
- Validating game mechanics in battle simulations

## Rate Limiting

The script includes a 0.5-second delay between API requests to be respectful to OPR's servers. Collection typically takes 2-3 minutes for all factions.