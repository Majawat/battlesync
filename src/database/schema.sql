-- BattleSync Database Schema
-- SQLite database for OPR army and battle tracking

-- Army definitions (persistent)
CREATE TABLE IF NOT EXISTS armies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    armyforge_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    points_limit INTEGER,
    list_points INTEGER,
    model_count INTEGER,
    activation_count INTEGER,
    game_system TEXT DEFAULT 'gf',
    campaign_mode BOOLEAN DEFAULT FALSE,
    raw_armyforge_data TEXT NOT NULL, -- Original ArmyForge JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Main activation units (what gets activated in battle)
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    army_id INTEGER NOT NULL REFERENCES armies(id) ON DELETE CASCADE,
    armyforge_unit_ids TEXT NOT NULL, -- JSON array of source ArmyForge unit IDs
    name TEXT NOT NULL,
    custom_name TEXT,
    total_cost INTEGER NOT NULL,
    model_count INTEGER NOT NULL,
    
    -- Calculated stats for battle (from hero if joined, etc.)
    quality INTEGER NOT NULL,
    defense INTEGER NOT NULL,
    
    -- Unit type flags
    is_combined BOOLEAN DEFAULT FALSE,
    is_joined BOOLEAN DEFAULT FALSE,
    has_hero BOOLEAN DEFAULT FALSE,
    has_caster BOOLEAN DEFAULT FALSE,
    
    -- Notes and metadata
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Component parts of units (sub-units maintain original identity)
CREATE TABLE IF NOT EXISTS sub_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    armyforge_unit_id TEXT NOT NULL,
    name TEXT NOT NULL,
    custom_name TEXT,
    
    -- Original stats from ArmyForge
    quality INTEGER NOT NULL,
    defense INTEGER NOT NULL,
    size INTEGER NOT NULL,
    cost INTEGER NOT NULL,
    
    -- Sub-unit flags
    is_hero BOOLEAN DEFAULT FALSE,
    is_caster BOOLEAN DEFAULT FALSE,
    caster_rating INTEGER,
    
    -- Campaign data
    xp INTEGER DEFAULT 0,
    traits TEXT, -- JSON array of campaign traits
    
    -- Base sizes and equipment data
    base_sizes TEXT, -- JSON: {"round": "32mm", "square": "25mm"}
    weapons TEXT NOT NULL, -- JSON array of weapons
    rules TEXT NOT NULL, -- JSON array of rules with ratings
    items TEXT, -- JSON array of equipment/items
    
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual model tracking for wound allocation
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub_unit_id INTEGER NOT NULL REFERENCES sub_units(id) ON DELETE CASCADE,
    model_index INTEGER NOT NULL, -- Position in sub-unit (0-based)
    name TEXT, -- Auto-generated or custom name
    custom_name TEXT,
    
    -- Health tracking
    max_tough INTEGER NOT NULL,
    current_tough INTEGER NOT NULL,
    
    -- Model-specific rules/upgrades
    special_rules TEXT, -- JSON array of model-specific rules
    weapons TEXT, -- JSON array of model weapons
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique model positions within sub-unit
    UNIQUE(sub_unit_id, model_index)
);

-- Battle instances (when armies fight)
CREATE TABLE IF NOT EXISTS battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    points_limit INTEGER,
    
    -- Battle settings
    has_command_points BOOLEAN DEFAULT FALSE,
    has_underdog_bonus BOOLEAN DEFAULT FALSE,
    is_campaign_battle BOOLEAN DEFAULT FALSE,
    
    -- Battle state
    current_round INTEGER DEFAULT 1,
    current_turn INTEGER DEFAULT 1,
    status TEXT DEFAULT 'setup', -- setup, deployment, active, ended
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
);

-- Army participation in battles
CREATE TABLE IF NOT EXISTS battle_armies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    army_id INTEGER NOT NULL REFERENCES armies(id),
    player_name TEXT,
    turn_order INTEGER,
    
    -- Battle-specific army state
    underdog_points INTEGER DEFAULT 0,
    victory_points INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(battle_id, army_id)
);

-- Unit state during battles (copies from units + battle-specific state)
CREATE TABLE IF NOT EXISTS battle_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    battle_army_id INTEGER NOT NULL REFERENCES battle_armies(id) ON DELETE CASCADE,
    source_unit_id INTEGER NOT NULL REFERENCES units(id),
    
    -- Current battle state
    is_routed BOOLEAN DEFAULT FALSE,
    is_shaken BOOLEAN DEFAULT FALSE,
    is_fatigued BOOLEAN DEFAULT FALSE,
    
    -- Current action/deployment
    current_action TEXT, -- hold, advance, rush, charge
    deployment_status TEXT DEFAULT 'standard', -- standard, ambush, scout, embarked
    
    -- Combat tracking
    activated_this_round BOOLEAN DEFAULT FALSE,
    participated_in_melee BOOLEAN DEFAULT FALSE,
    
    -- Kill tracking
    kills_data TEXT, -- JSON array of kills made
    killed_by_data TEXT, -- JSON object of what killed this unit
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual model health tracking during battles  
CREATE TABLE IF NOT EXISTS battle_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_unit_id INTEGER NOT NULL REFERENCES battle_units(id) ON DELETE CASCADE,
    source_model_id INTEGER NOT NULL REFERENCES models(id),
    
    -- Current health state
    current_tough INTEGER NOT NULL,
    is_alive BOOLEAN DEFAULT TRUE,
    
    -- Caster-specific state
    caster_tokens_remaining INTEGER,
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Battle event log for undo functionality and reports
CREATE TABLE IF NOT EXISTS battle_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    turn_number INTEGER NOT NULL,
    event_order INTEGER NOT NULL,
    
    event_type TEXT NOT NULL, -- activation, damage, morale, etc.
    unit_id INTEGER REFERENCES battle_units(id),
    event_data TEXT NOT NULL, -- JSON with event details
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_armies_armyforge_id ON armies(armyforge_id);
CREATE INDEX IF NOT EXISTS idx_units_army_id ON units(army_id);
CREATE INDEX IF NOT EXISTS idx_sub_units_unit_id ON sub_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_models_sub_unit_id ON models(sub_unit_id);
CREATE INDEX IF NOT EXISTS idx_battle_units_battle_id ON battle_units(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_battle_id ON battle_events(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_round_turn ON battle_events(battle_id, round_number, turn_number);