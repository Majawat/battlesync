# OPR ArmyForge API Enhancement Proposal

## Current Limitations

The current ArmyForge API provides rule data primarily as free-text descriptions:

```json
{
  "id": "4Nay818dLPu2",
  "name": "Poison Mist", 
  "description": "Once per this unit's activation, before attacking, roll one die. On a 4+ two enemy units within 6\" take 1 hit with Blast(6) and Poison.",
  "hasRating": null,
  "coreType": null,
  "targetType": 1
}
```

This requires brittle regex parsing to extract mechanical information.

## Proposed Enhanced Structure

### Special Rules with Structured Metadata

```json
{
  "id": "4Nay818dLPu2",
  "name": "Poison Mist",
  "description": "Once per this unit's activation, before attacking, roll one die. On a 4+ two enemy units within 6\" take 1 hit with Blast(6) and Poison.",
  "hasRating": false,
  "coreType": "activation_ability",
  "targetType": 1,
  "mechanics": {
    "triggerPhase": "before_attacking",
    "frequency": "once_per_activation",
    "rollRequired": {
      "dice": 1,
      "threshold": 4,
      "modifier": null
    },
    "effects": [
      {
        "type": "damage",
        "targets": {
          "type": "enemy_units",
          "count": 2,
          "range": "6\"",
          "selection": "any"
        },
        "damage": {
          "hits": 1,
          "specialRules": ["Blast(6)", "Poison"]
        }
      }
    ]
  },
  "gameplayTags": ["area_effect", "poison", "activation_ability"]
}
```

### Spells with Enhanced Metadata

```json
{
  "id": "spell123",
  "name": "Holy Tears",
  "type": "blessing",
  "threshold": 1,
  "effect": "Target 2 friendly units within 12\" get Poison next time they fight in melee.",
  "mechanics": {
    "costType": "spell_points", 
    "cost": 1,
    "castingRoll": {
      "baseTarget": 4,
      "modifiable": true
    },
    "effects": [
      {
        "type": "buff",
        "targets": {
          "type": "friendly_units",
          "count": 2,
          "range": "12\"",
          "selection": "any"
        },
        "duration": "next_melee",
        "buff": {
          "specialRules": ["Poison"]
        }
      }
    ]
  },
  "gameplayTags": ["blessing", "melee_enhancement", "multi_target"]
}
```

### Weapons with Structured Data

```json
{
  "id": "weapon456",
  "name": "Heavy Rifle", 
  "profile": {
    "range": "24\"",
    "attacks": 1,
    "specialRules": ["AP(1)"]
  },
  "mechanics": {
    "weaponType": "ranged",
    "attackProfile": {
      "range": {
        "value": 24,
        "unit": "inches"
      },
      "attacks": {
        "base": 1,
        "modifiers": []
      },
      "toHit": {
        "baseQuality": true,
        "modifiers": []
      },
      "damage": {
        "wounds": 1,
        "armorPenetration": 1,
        "specialEffects": []
      }
    }
  },
  "compatibleWith": ["infantry", "vehicles"],
  "gameplayTags": ["assault_weapon", "armor_piercing"]
}
```

## Benefits for Game Developers

### 1. Automated Rule Enforcement
- No regex parsing required
- Direct mechanical interpretation
- Consistent rule application

### 2. Better AI Integration  
- Structured data for decision making
- Clear effect categorization
- Automated combo detection

### 3. Enhanced Validation
- Rule conflict detection
- Balance analysis
- Mechanical completeness checking

### 4. Easier Translations
- Mechanics separate from flavor text
- Consistent rule naming
- Language-independent game logic

## Implementation Strategy

### Phase 1: Backwards Compatible Addition
- Add `mechanics` field to existing structures
- Keep current `description` field intact
- Populate both during rule creation

### Phase 2: Gradual Migration
- Build tools to auto-populate mechanics from descriptions
- Allow manual overrides for complex cases  
- Validate consistency between description and mechanics

### Phase 3: Enhanced Features
- Rule combination validation
- Automated balance checking
- Enhanced search and filtering

## Data Analysis Tools

We could help create tools to:
1. **Parse existing descriptions** into structured format
2. **Validate consistency** between description and mechanics  
3. **Generate test cases** for rule interactions
4. **Analyze balance patterns** across factions

## Community Contribution

The structured format would enable:
- **Community rule validation** through automated checks
- **Consistent homebrew rules** using the same structure
- **Enhanced army builders** with better rule awareness
- **Tutorial systems** that understand rule mechanics

This enhancement would significantly improve the developer experience while maintaining full backwards compatibility for existing integrations.