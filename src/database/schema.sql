-- BattleSync Database Schema
-- SQLite database for OPR army and battle tracking

-- Army definitions (persistent)
CREATE TABLE IF NOT EXISTS armies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    armyforge_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    validation_errors TEXT, -- JSON array of validation errors from ArmyForge
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
    upgrades TEXT, -- JSON array of model-specific upgrades
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique model positions within sub-unit
    UNIQUE(sub_unit_id, model_index)
);

-- Battle instances (when armies fight)
CREATE TABLE IF NOT EXISTS battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    mission_type TEXT NOT NULL DEFAULT 'skirmish',
    game_system TEXT NOT NULL DEFAULT 'grimdark-future',
    
    -- Battle settings
    points_limit INTEGER,
    has_command_points BOOLEAN DEFAULT FALSE,
    command_point_mode TEXT DEFAULT 'fixed', -- fixed, growing, temporary, etc.
    has_underdog_bonus BOOLEAN DEFAULT FALSE,
    is_campaign_battle BOOLEAN DEFAULT FALSE,
    
    -- Battle state
    status TEXT NOT NULL DEFAULT 'setup', -- setup, deployment, active, completed, abandoned
    current_round INTEGER DEFAULT 1,
    current_player_turn INTEGER, -- army ID whose turn it is
    turn_sequence TEXT, -- JSON array of army turn order
    
    -- Mission and game data
    mission_data TEXT, -- JSON: objectives, deployment zones, special rules
    command_points TEXT, -- JSON: {army_id: {current: X, spent: Y, total_earned: Z}}
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
);

-- Army participation in battles
CREATE TABLE IF NOT EXISTS battle_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    army_id INTEGER NOT NULL REFERENCES armies(id),
    player_name TEXT NOT NULL,
    
    -- Deployment and doctrine
    deployment_zone TEXT, -- JSON: coordinates or zone identifier
    doctrine TEXT, -- Selected command point doctrine
    turn_order INTEGER,
    
    -- Battle-specific army state
    underdog_points INTEGER DEFAULT 0,
    victory_points INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- active, conceded, eliminated
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(battle_id, army_id)
);

-- Unit state during battles (references original units by path)
CREATE TABLE IF NOT EXISTS unit_battle_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    army_id INTEGER NOT NULL REFERENCES armies(id),
    unit_path TEXT NOT NULL, -- JSON path to unit in army data (e.g., "units.0.sub_units.1")
    
    -- Current health and status
    current_health INTEGER NOT NULL,
    max_health INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'normal', -- normal, shaken, routed
    
    -- Battle state flags
    is_fatigued BOOLEAN DEFAULT FALSE,
    spell_tokens INTEGER DEFAULT 0,
    activated_this_round BOOLEAN DEFAULT FALSE,
    participated_in_melee BOOLEAN DEFAULT FALSE,
    
    -- Position and deployment
    position_data TEXT, -- JSON: {x, y, facing} or zone reference
    deployment_status TEXT DEFAULT 'standard', -- standard, ambush, scout, embarked
    current_action TEXT, -- last action: hold, advance, rush, charge
    
    -- Temporary effects
    status_effects TEXT, -- JSON array of temporary effects
    
    -- Kill tracking
    kills_data TEXT, -- JSON array of kills made
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE,
    FOREIGN KEY (army_id) REFERENCES armies(id),
    UNIQUE(battle_id, army_id, unit_path)
);

-- Battle event log for undo functionality and replay (Event Sourcing)
CREATE TABLE IF NOT EXISTS battle_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    sequence_number INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- unit_action, state_change, phase_change, etc.
    actor_unit_id TEXT, -- Which unit performed action (unit path reference)
    target_unit_id TEXT, -- Target of action if applicable (unit path reference)
    event_data TEXT NOT NULL, -- JSON payload specific to event type
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(battle_id, round_number, sequence_number)
);

-- BattleAura firmware hosting
CREATE TABLE IF NOT EXISTS firmware (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    changelog TEXT,
    file_size INTEGER NOT NULL,
    
    -- Flash metadata
    chip_family TEXT DEFAULT 'esp32c3', -- esp32, esp32s2, esp32s3, esp32c3, esp32c6, etc.
    flash_size TEXT DEFAULT '4MB', -- 2MB, 4MB, 8MB, 16MB
    flash_mode TEXT DEFAULT 'dio', -- qio, qout, dio, dout
    flash_freq TEXT DEFAULT '80m', -- 20m, 26m, 40m, 80m
    partition_table TEXT, -- JSON: partition layout info
    bootloader_addr TEXT DEFAULT '0x0', -- bootloader address
    partition_addr TEXT DEFAULT '0x8000', -- partition table address  
    app_addr TEXT DEFAULT '0x10000', -- application address
    
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_armies_armyforge_id ON armies(armyforge_id);
CREATE INDEX IF NOT EXISTS idx_units_army_id ON units(army_id);
CREATE INDEX IF NOT EXISTS idx_sub_units_unit_id ON sub_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_models_sub_unit_id ON models(sub_unit_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle_id ON battle_participants(battle_id);
CREATE INDEX IF NOT EXISTS idx_unit_battle_state_battle_id ON unit_battle_state(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_battle_id ON battle_events(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_round_sequence ON battle_events(battle_id, round_number, sequence_number);
CREATE INDEX IF NOT EXISTS idx_firmware_version ON firmware(version);
CREATE INDEX IF NOT EXISTS idx_firmware_uploaded_at ON firmware(uploaded_at);