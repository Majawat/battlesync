# OPR API Reference

Complete documentation of One Page Rules API endpoints for army data, game systems, and faction information.

## Core Concepts

### Versioning Strategy
- All API responses include version information
- Player army lists have specific versions that must match referenced data
- OPR updates data occasionally, but old versions become unavailable
- **BattleSync Strategy**: Cache data locally with version tracking, use HEAD requests to check for updates, maintain historical versions when possible

## Game Systems Reference

| Game | gameSystemSlug | ID | Key | Description |
|------|-----------------|----|----|-------------|
| **Grimdark Future** | `grimdark-future` | 2 | GF | Main 40k-style game |
| **GF: Firefight** | `grimdark-future-firefight` | 3 | GFF | Small-scale skirmish |
| **Age of Fantasy** | `age-of-fantasy` | 4 | AOF | Fantasy mass battles |
| **AOF: Skirmish** | `age-of-fantasy-skirmish` | 5 | AOFS | Small fantasy battles |
| **AOF: Regiments** | `age-of-fantasy-regiments` | 6 | AOFR | Large fantasy armies |
| **AOF: Quest** | `age-of-fantasy-quest` | 7 | AOFQ | Fantasy RPG-style |
| **AOF: Quest AI** | `age-of-fantasy-quest-ai` | 8 | AOFQAI | Solo fantasy RPG |
| **GF: Star Quest** | `grimdark-future-star-quest` | 9 | GFSQ | Sci-fi RPG-style |
| **GF: Star Quest AI** | `grimdark-future-star-quest-ai` | 10 | GFSQAI | Solo sci-fi RPG |

### Special Case: Warfleets
| Game | gameSystemSlug | Key | Notes |
|------|-----------------|-----|-------|
| **GF: Warfleets** | `grimdark-future-warfleet` | GFWF | Space combat system |

## API Endpoints

### 1. Army List Data (Currently Implemented)
**Purpose**: Get complete army list with units, upgrades, and campaign data

```
GET https://army-forge.onepagerules.com/api/tts?id={listId}
```

**Parameters**:
- `listId` - Army share ID (e.g., "IJ1JM_m-jmka")

**Returns**:
- Complete army structure with units, weapons, rules, upgrades
- Campaign XP and level data
- Custom names and unit modifications
- Version information for data consistency

**BattleSync Usage**: Primary endpoint for army import functionality

### 2. Game System Information
**Purpose**: Get faction lists and common rules for each game system

```
GET https://army-forge.onepagerules.com/api/{gameSystemKey}
```

**Example**:
```
GET https://army-forge.onepagerules.com/api/gf  # Grimdark Future
GET https://army-forge.onepagerules.com/api/aof # Age of Fantasy
```

**Returns**:
- Available factions for the game system
- Common rules and mechanics
- System-specific data structures

### 3. Army Books - Official Factions
**Purpose**: Get list of all official faction army books

```
GET https://army-forge.onepagerules.com/api/army-books?filters=official
```

**Game-Specific**:
```
GET https://army-forge.onepagerules.com/api/army-books?filters=official&gameSystemSlug={gameSystemSlug}
```

**Returns**:
- List of all official faction army books
- Faction names, IDs, and metadata
- Version information for each book

### 4. Army Books - Community Content
**Purpose**: Search community-created faction content

```
GET https://army-forge.onepagerules.com/api/army-books?filters=community&gameSystemSlug={gameSystemSlug}&searchText={query}&page={pageNumber}
```

**Parameters**:
- `gameSystemSlug` - Game system identifier
- `query` - Search terms for faction names
- `pageNumber` - Pagination support

**Returns**:
- Community-created army books
- Creator information
- Download counts and ratings

### 5. Partner Content
**Purpose**: Get available partner creators for a game system

```
GET https://army-forge.onepagerules.com/api/partners/?gameSystem={gameSystemId}
```

**Partner Army Books**:
```
GET https://army-forge.onepagerules.com/api/army-books/user?gameSystemSlug={gameSystemSlug}&username={partnerName}
```

**Returns**:
- List of partner content creators
- Their available army books
- Partnership status and verification

### 6. Specific Army Book Data
**Purpose**: Get complete faction data including units, spells, and special rules

```
GET https://army-forge.onepagerules.com/api/army-books/{armyBookId}?gameSystem={gameSystemId}
```

**Example**:
```
GET https://army-forge.onepagerules.com/api/army-books/7oi8zeiqfamiur21?gameSystem=2
# Blessed Sisters army book for Grimdark Future
```

**Returns**:
- Complete unit roster with stats and costs
- Available upgrades and custom weapons
- Faction spells (typically 6 spells per caster faction)
- Faction-specific special rules
- Unit organization and restrictions

### 7. Warfleets Special API
**Purpose**: Warfleets uses different API structure

```
GET https://army-forge.onepagerules.com/api/army-books?filters=official&gameSystemSlug=grimdark-future-warfleet
```

**Specific Warfleets Book**:
```
GET https://army-forge.onepagerules.com/api/gfwf/{armyBookId}
```

**Example**:
```
GET https://army-forge.onepagerules.com/api/gfwf/0Yn4iw9zrhHLt3fE
```

## Intelligent Caching Strategy

### Smart Fetch Process
1. **HEAD-First Validation**: Always check if data changed before full fetch
2. **On-Demand Updates**: Refresh cache when army lists reference newer versions
3. **Efficient Storage**: SQLite with JSON columns for flexibility + performance
4. **Version-Driven**: Update only when version mismatches detected

### Cache Flow
```
Request OPR Data → Check Cache → HEAD Request → 304 Not Modified? → Use Cache
                                              ↓ 200 OK
                                         Fetch Full Data → Update Cache → Return Data
```

### Storage Architecture
- **Primary Cache**: `opr_cache` table with version/etag metadata + JSON data
- **Historical Versions**: `opr_cache_history` for backwards compatibility  
- **Cache Keys**: Consistent patterns like `game_system:gf`, `army_book:7oi8zeiq`
- **Multi-Game Ready**: Designed for OPR + future game systems (40K, Trench Crusade)

### Automatic Version Management
- Army import triggers version checks against referenced data
- Updates cache automatically when newer versions detected
- Maintains historical versions for compatibility
- Graceful fallback when OPR API unavailable

**See [Caching Strategy](caching-strategy.md) for complete implementation details.**

## Data Relationships

```
Army List (TTS API)
├── References: Game System (by ID)
├── References: Army Book (by faction)
├── Units with upgrades
├── Custom weapons from Army Book
├── Spells from Army Book (if caster faction)
└── Campaign data with XP levels

Army Book Data
├── Base unit statistics
├── Available upgrades per unit
├── Custom weapons and equipment
├── Faction spells (6 typical)
├── Special rules and abilities
└── Organization restrictions
```

## Future Integration Points

### Phase 1: Reference Data
- Cache game system definitions
- Store official army books for validation
- Implement version checking system

### Phase 2: Enhanced Validation
- Cross-reference army lists against current army books
- Validate unit upgrades and custom weapons
- Check spell availability for caster units

### Phase 3: Battle Integration
- Use faction spells during battle tracking
- Apply faction-specific special rules
- Validate army organization rules

---

*This API reference enables BattleSync to fully integrate with the OPR ecosystem while maintaining data consistency and handling version changes gracefully.*