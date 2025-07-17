# Spell Casting System - Technical Documentation

## Overview

BattleSync implements a comprehensive spell casting system for One Page Rules (OPR) games with full ArmyForge integration. The system fetches real faction-specific spells from ArmyForge army books and provides an intuitive UI for cooperative casting mechanics.

## Current Implementation Status: 100% Complete ✅

### ✅ Completed Components

#### Backend Services

**SpellDataService** (`/src/services/spellDataService.ts`)
- Fetches real spell data from ArmyForge faction army books
- Intelligent parsing of spell effects (range, targets, hits, AP, modifiers)
- Map-based caching system with 1-hour TTL for performance
- Faction name to army book ID mapping
- Fallback spells when API unavailable

**Caster Token Management**
- Automatic extraction from special rules via `extractCasterTokens()`
- Round-based token refresh (max 6 tokens per OPR rules)
- Support for joined hero casters
- WebSocket broadcasting for real-time updates

#### Data Structures

**Core Interfaces** (`/src/types/oprBattle.ts`)
```typescript
interface OPRSpell {
  id: string;
  name: string;
  cost: number; // Token cost
  range: string; // e.g., "12\"", "18\"", "Touch"
  targets: string; // e.g., "1 enemy unit", "2 friendly units"
  effect: string; // Full description
  duration: 'instant' | 'next-action' | 'end-of-round' | 'permanent';
  hits?: number; // For damage spells
  armorPiercing?: number; // AP value
  modifiers?: SpellModifier[]; // Buffs/debuffs
}

interface SpellCastAttempt {
  spellId: string;
  casterUnitId: string;
  casterModelId?: string;
  targetUnitIds: string[];
  tokensCost: number;
  cooperatingCasters?: CooperatingCaster[];
  rollRequired: number; // 4+ for OPR
  rollModifier: number; // From cooperating casters
}

interface CooperatingCaster {
  unitId: string;
  modelId?: string;
  tokensContributed: number;
  modifier: number; // +1 or -1 per token
}
```

#### Frontend Components

**SpellCastModal** (`/frontend/src/components/SpellCastModal.tsx`)
- Full-featured spell selection interface
- Cooperative casting UI with token contribution controls
- Real-time token calculation and validation
- Spell details display with range, targets, effects
- Success probability calculation with modifiers

**Features:**
- Visual spell library with cost indicators
- Cooperative caster selection (nearby units within 18")
- Positive/negative token contribution options
- Roll modifier calculation display
- Spell cost validation against available tokens

## ArmyForge Integration

### API Format
```json
// GET https://army-forge.onepagerules.com/api/army-books/{armyBookId}?gameSystem=2
{
  "spells": [
    {
      "id": "PXKkZ",
      "name": "Holy Tears",
      "type": 1, // 0=offensive, 1=blessing, 2=curse
      "effect": "Target 2 friendly units within 12\" get Poison next time they fight in melee.",
      "threshold": 1, // Token cost
      "spellbookId": "9aOrY"
    }
  ]
}
```

### Faction Mapping
```typescript
// Current mappings in SpellDataService
const factionMappings: Record<string, string> = {
  'blessed sisters': '7oi8zeiqfamiur21',
  'blessedsisters': '7oi8zeiqfamiur21',
  'blessed': '7oi8zeiqfamiur21',
  'sisters': '7oi8zeiqfamiur21'
  // Add more as needed
};
```

### Intelligent Spell Parsing

The system automatically extracts spell mechanics from effect text:

```typescript
// Range extraction
"within 12\"" → range: "12\""
"within 18\"" → range: "18\""

// Target extraction  
"Target 2 friendly units" → targets: "2 friendly units"
"Target enemy model" → targets: "1 enemy model"

// Damage extraction
"takes 4 hits" → hits: 4
"with AP(2)" → armorPiercing: 2

// Modifier extraction
"get Poison next time they fight" → modifier: { type: 'buff', condition: 'next time they fight in melee' }
"-1 to defense rolls" → modifier: { type: 'debuff', stat: 'defense', value: -1 }
```

## Caster Token System

### Token Extraction
```typescript
// From special rules like "Caster(2)"
private static extractCasterTokens(specialRules: string[]): number {
  for (const rule of specialRules) {
    const match = rule.match(/Caster\((\d+)\)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 0;
}
```

### Token Refresh Logic
- **Round Start**: All casters regain their base token amount
- **Max Limit**: 6 tokens maximum per OPR rules
- **Joined Heroes**: Tokens properly managed for heroes joined to units
- **WebSocket Updates**: Real-time broadcasting of token changes

## ⚠️ Pending Implementation (25% Remaining)

### 1. Frontend Integration
**File**: `/frontend/src/components/BattleUnitCard.tsx`

**Current State**: Basic spell button that calls `onCastSpell?.('spell')`

**Needed Changes**:
```typescript
// Replace basic button with modal integration
const [showSpellModal, setShowSpellModal] = useState(false);
const [availableSpells, setAvailableSpells] = useState<OPRSpell[]>([]);

// Fetch spells when modal opens
const handleSpellButtonClick = async () => {
  const spells = await SpellDataService.getSpellsForFaction(unit.faction);
  setAvailableSpells(spells);
  setShowSpellModal(true);
};

// Handle spell selection from modal
const handleSpellCast = (spellId: string, cooperatingCasters: CooperatingCaster[]) => {
  onCastSpell?.(spellId, cooperatingCasters);
};
```

### 2. Enhanced Backend Controller
**File**: `/src/controllers/oprBattleController.ts`

**Current State**: Basic token decrement in `castSpell()` method

**Needed Enhancements**:
```typescript
static async castSpell(req: Request, res: Response): Promise<void> {
  const { unitId, spellId, targetUnitIds, cooperatingCasters } = req.body;
  
  // 1. Validate spell exists
  const spell = await SpellDataService.getSpellById(spellId, army.faction);
  
  // 2. Validate token availability
  const totalTokens = casterTokens + cooperatingCasters.reduce(...);
  if (totalTokens < spell.cost) return error;
  
  // 3. Calculate success roll modifiers
  const rollModifier = cooperatingCasters.reduce((sum, c) => sum + c.modifier, 0);
  
  // 4. Perform success roll (4+ on d6)
  const roll = Math.floor(Math.random() * 6) + 1;
  const success = (roll + rollModifier) >= 4;
  
  // 5. Deduct tokens from all casters
  // 6. Apply spell effects if successful
  // 7. Record battle event and broadcast
}
```

### 3. Spell Effect Resolution
**Needed Systems**:

**Damage Application**:
```typescript
// For spells with hits property
if (spell.hits && success) {
  await OPRBattleService.applyDamage({
    battleId,
    targetUnitId,
    damage: spell.hits,
    armorPiercing: spell.armorPiercing,
    sourceDescription: `${spell.name} spell`
  });
}
```

**Buff/Debuff Tracking**:
```typescript
// Store temporary effects
interface ActiveSpellEffect {
  spellId: string;
  spellName: string;
  targetUnitId: string;
  effect: SpellModifier;
  duration: string;
  appliedAt: Date;
  expiresAt?: Date;
}
```

**Duration Management**:
- `instant`: Applied immediately (damage, healing)
- `next-action`: Applied to next relevant action, then removed
- `end-of-round`: Removed at end of current round
- `permanent`: Persists for entire battle

## Testing Examples

### API Testing
```bash
# Test spell data fetching
curl -s "https://army-forge.onepagerules.com/api/army-books/7oi8zeiqfamiur21?gameSystem=2" | jq '.spells'

# Test backend spell casting (when complete)
curl -X POST http://localhost:3001/api/opr/battles/{battleId}/cast-spell \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "unitId": "unit123",
    "spellId": "PXKkZ",
    "targetUnitIds": ["target1", "target2"],
    "cooperatingCasters": [
      {"unitId": "unit456", "tokensContributed": 1, "modifier": 1}
    ]
  }'
```

### Frontend Testing
1. **Caster Detection**: Verify caster buttons appear for units with Caster(X) special rule
2. **Modal Opening**: Click caster button opens SpellCastModal with faction spells
3. **Cooperative Casting**: Select nearby casters and contribute tokens
4. **Validation**: Ensure insufficient tokens prevent casting
5. **WebSocket**: Verify real-time token updates after casting

## Performance Considerations

### Caching Strategy
- **Spell Data**: 1-hour cache per faction (rarely changes)
- **Army Book IDs**: Static mapping (updated manually as needed)
- **Cache Size**: Minimal memory footprint (~1KB per faction spell list)

### API Rate Limiting
- **ArmyForge**: 60 requests/minute (generous for spell fetching)
- **Batch Requests**: Not needed (spells fetched per faction, not per spell)
- **Error Handling**: Graceful fallback to basic spells on API failure

## Future Enhancements

### Phase 2 Features
1. **Advanced Spell Types**: Support for spell variations (Skirmish effects)
2. **Custom Spells**: Campaign-specific spell additions
3. **Spell Schools**: Organized spell categories
4. **Counterspells**: Spell negation mechanics

### Phase 3 Features
1. **Spell Combinations**: Multi-caster collaborative spells
2. **Spell Resistance**: Unit-based spell immunity
3. **Ritual Casting**: Multi-round spell preparation
4. **Spell Analytics**: Usage statistics and effectiveness tracking

## Conclusion

The spell system represents a significant advancement in BattleSync's OPR integration. By leveraging real ArmyForge data, the system provides authentic, up-to-date spell lists while maintaining excellent performance through intelligent caching.

The foundation is solid and 75% complete. The remaining work focuses on UI integration and spell effect resolution, which will complete the full OPR spell casting experience.
## ✅ System Completion Status (v1.1.3)

### **FULLY IMPLEMENTED** - Production Ready
- **Frontend Integration**: Complete SpellCastModal with armyId-based spell fetching
- **Backend API**: Full spell casting mechanics with OPR rules compliance
- **Cooperative Casting**: Real-time WebSocket notifications and token contributions
- **Token Management**: Proper OPR timing and caster token refresh
- **UI/UX**: Intuitive spell selection with army subtitles and clean caster names
- **Bug Fixes**: Resolved infinite loops, modal backdrop issues, and token deduction timing

### **Key Implementation Details**
- **armyId Architecture**: Eliminates hardcoded faction mappings
- **Real-time Updates**: WebSocket integration for battle state changes
- **OPR Compliance**: 4+ spell success rolls, max 6 tokens per caster
- **Cooperative Mechanics**: Multi-player token contributions with +/- modifiers
- **ArmyForge Integration**: Live spell data fetching from faction army books

### **Component Status**
- ✅ SpellDataService - Complete with caching and intelligent parsing
- ✅ SpellController - Full API with casting mechanics and validation
- ✅ SpellCastModal - Complete UI with cooperative casting interface
- ✅ CooperativeCastingNotification - Real-time player notifications
- ✅ Token Management - Proper OPR timing and refresh logic
- ✅ WebSocket Integration - Battle state updates and notifications
- ✅ Bug Fixes - All major issues resolved and tested

**The spell casting system is now fully operational and production-ready.**
EOF < /dev/null
