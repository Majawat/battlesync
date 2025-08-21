# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.23.0] - 2025-08-21

### Fixed
- **Identical weapon replacement upgrade distribution**: Fixed critical issue where multiple identical weapon replacement upgrades (like Beast Riders' Explosive Spear) were all being applied to the first model instead of distributing across different models
- Enhanced upgrade processing to distinguish between truly identical upgrade instances (same instanceId) that should be distributed versus individual upgrade selections that should be processed separately
- Preserved existing functionality for individual upgrades like Energy Fist on Destroyer Sisters while fixing distribution for multi-count identical upgrades

### Added
- New `processGroupedWeaponUpgrades` method for proper distribution of identical weapon replacement upgrades across multiple models
- Enhanced upgrade grouping logic to detect truly identical upgrades based on instanceId matching
- Model tracking during grouped upgrade distribution to prevent duplicate applications on the same model

### Technical Improvements
- Modified upgrade processing workflow to handle both grouped identical upgrades and individual upgrade selections correctly
- Added sophisticated upgrade categorization logic that preserves JSON processing order while enabling proper distribution
- Enhanced upgrade system to handle complex edge cases with multiple identical weapon replacements

## [2.22.0] - 2025-08-20

### Added
- **Model Renaming System**: Users can now rename individual models (e.g., "Elites 1" → "Jim Bob") using inline editing with Enter/Escape/blur-to-save functionality
- **Upgrade Reassignment System**: Users can now move reassignable upgrades between models in the same sub-unit using inline dropdown interface
- New API endpoint `PATCH /api/armies/:id/rename-model` for updating model custom names
- New API endpoint `PATCH /api/armies/:id/reassign-upgrade` for moving upgrades between models
- Visual sorting of weapons by range (melee first) and rules alphabetically in frontend display
- Combat Shield now displays associated rules in parentheses like other items

### Fixed
- **Upgrade dependency processing**: Enhanced dependency count calculation to only consider current upgrade instance instead of all dependencies, improving weapon replacement accuracy
- Item label generation for items without explicit labels now shows contained rules (e.g., "Combat Shield (Shield Wall)")

### Changed
- Army detail view now shows weapons sorted by range and rules sorted alphabetically for better readability
- Upgrade reassignment only available during army setup phase (not during battles)
- Model custom names are stored persistently and survive battle state transitions

## [2.21.0] - 2025-08-19

### Fixed
- **Infantry Squad upgrade duplication**: Fixed critical issue where paired upgrades (Field Radio, Company Standard, Medical Training) were being duplicated on multiple models instead of being distributed correctly
- Enhanced upgrade section processing to properly handle multi-option upgrade sections where each selection should go to a different model
- Fixed upgrade classification to include both ArmyBookItem and ArmyBookRule types for proper grouping

### Added
- Grouped upgrade processing system for handling upgrade sections with multiple selections
- Proper distribution logic for upgrades that affect multiple models within the same section
- Support for upgrade sections where "affects exactly N" determines section capacity rather than individual upgrade application

### Technical Improvements
- Modified `processUpgradesWithDependencies` to group multi-model non-weapon upgrades by section UID
- Enhanced `processAddUpgrade` to respect caller-specified model targeting for grouped upgrades
- Added `processGroupedItemUpgrades` method for handling upgrade section distribution logic
- Preserved weapon replacement processing order while adding support for grouped item upgrades

### Validation
- Infantry Squad combined unit now correctly shows: 2 Field Radio, 1 Company Standard, 1 Medical Training
- All existing upgrade functionality preserved (weapon chains, single upgrades, weapon replacements)
- Destroyer Sisters and other complex upgrade scenarios continue working correctly

## [2.20.0] - 2025-08-19

### Fixed
- **Base weapon distribution**: Fixed critical issue where multi-count base weapons (like 2x Hull-Flamer on Blessed Titan) were only showing 1x count instead of the correct multiple count
- **Upgrade processing order**: Fixed major issue where upgrades were processed by type grouping instead of JSON order, causing incorrect weapon distribution in units like Destroyer Sisters
- **Weapon upgrade chains**: Ensured sequential upgrade processing preserves intended weapon assignment (individual "any" upgrades before "all" upgrades)

### Changed
- **BREAKING**: Simplified upgrade processing to follow JSON order instead of complex grouping logic, ensuring proper dependency-based weapon distribution
- Removed upgrade grouping system that was interfering with correct sequential processing
- Enhanced base weapon distribution logic to properly handle single-model units with multiple weapon copies

### Technical Improvements
- Refactored `processUpgradesWithDependencies` to process upgrades in the order they appear in ArmyForge JSON
- Fixed `applyBaseWeaponsToModels` to correctly distribute weapon copies using wrap-around logic for remaining copies
- Improved weapon count handling for single-model units with multiple copies of the same weapon
- Enhanced dependency-based upgrade system to naturally limit scope to models with affected weapons

### Validation
- All comprehensive unit tests now pass with correct weapon distributions
- Verified proper handling of complex upgrade scenarios (Energy Fist → Dual Energy Claws chains)
- Confirmed base weapon count accuracy across all unit types

## [2.19.4] - 2025-08-18

### Fixed
- **Upgrade reassignability**: Fixed issue where single-model upgrades using `affects.type === 'exactly'` structure (like Satellite Backpack on regular units) were incorrectly marked as non-reassignable
- Enhanced reassignability logic to treat both `select.exactly` and `affects.exactly` with value=1 as reassignable single-model upgrades
- Satellite Backpack and similar equipment upgrades are now properly reassignable between models

### Technical Improvements
- Improved `determineReassignability` function to handle both ArmyForge upgrade structures consistently
- Added support for `upgrade.affects.type === 'exactly' && upgrade.affects.value === 1` as reassignable condition

## [2.19.3] - 2025-08-18

### Fixed
- **Weapon count display**: Frontend now properly displays weapon counts for weapons with count > 1 (e.g., "2x Hull-Flamer" instead of showing the weapon twice separately)
- Improved weapon display formatting in army detail view to show quantities correctly

### Technical Improvements
- Enhanced frontend weapon rendering logic to check weapon count and format display appropriately

## [2.19.2] - 2025-08-18

### Fixed
- **Weapon upgrade distribution**: Fixed issue where multiple identical "any" type weapon replacements (like Stormfang Riders' Explosive Spears) were all being applied to the first model instead of being distributed across available models
- Enhanced upgrade grouping system to detect and properly distribute identical upgrades with `affects.type === 'any'`
- Stormfang Riders now correctly have 1 Explosive Spear per model instead of 3 on the first model
- Preserved existing functionality for `affects.type === 'exactly'` upgrades and single upgrades

### Technical Improvements
- Improved upgrade processing logic to group similar "any" type upgrades for proper distribution
- Enhanced `processGroupedUpgrades` method to handle both `exactly` and `any` type upgrade distribution
- Added model availability tracking during upgrade distribution to prevent duplicate applications

## [2.19.1] - 2025-08-15

### Fixed
- **Sergeant weapon upgrade chains**: Fixed critical issue where Sgt. Pistol → Drum Pistol/Plasma Pistol and Sgt. Hand Weapon → Energy Axe/Energy Sword upgrade chains were not working
- Enhanced weapon ID matching in replace upgrade system to handle both `id` and `weaponId` properties from upgrade gains
- Upgrade chain processing now correctly finds weapons created by previous upgrades that have dependencies for further upgrades
- Both sergeants in combined units now properly receive their final upgraded weapons instead of stopping at intermediate sergeant weapons

### Technical Improvements
- Improved dependency-based upgrade system to handle upgrade chain weapons with different ID structures
- Added comprehensive debug logging for upgrade chain troubleshooting (removed in production)
- Enhanced weapon matching logic in `processReplaceUpgrade` function

## [2.19.0] - 2025-08-15

### Added
- Item replacement analysis system for pre-processing which models will have items replaced by upgrades
- Support for mixed weapon/item replacement upgrades using target-based matching when dependencies are not available

### Fixed
- **Base size upgrades**: ArmyBookItem upgrades with `bases` property now correctly update unit base sizes  
- Mrs. Bitchtits Combat Bike upgrade now properly changes base size from 32mm to 60x35mm

### Technical Improvements
- Enhanced `analyzeItemReplacements` method to simulate upgrade assignment for accurate item replacement tracking
- Modified `applyBaseItemsToModels` to conditionally apply items based on replacement analysis
- Improved upgrade processing workflow to handle complex edge cases with items lacking dependency information

## [2.18.0] - 2025-08-15

### Fixed
- **Campaign upgrade duplication**: Multi-model upgrades now distribute options correctly instead of duplicating
- "Upgrade two models with one" selections (Field Radio, Company Standard, Medical Training) now apply one upgrade per model
- Fixed upgrade system to group related upgrade options by section UID and distribute across affected models
- Campaign upgrades like "Medical Training" and "Field Radio" no longer appear on multiple models

### Added
- Grouped upgrade processing system for handling multi-option upgrade sections
- Support for distributing different upgrade options across multiple models from same upgrade section

## [2.17.0] - 2025-08-15

### Fixed
- **Base size upgrades**: ArmyBookItem upgrades with `bases` property now correctly update unit base sizes
- Mrs. Bitchtits Combat Bike upgrade now properly changes base size from 32mm to 60x35mm
- Base size processing works for all ArmyBookItem upgrades containing bases specification

### Added
- Base size update functionality in dependency-based upgrade system
- Support for partial base size updates (round or square independently)

## [2.16.0] - 2025-08-15

### Fixed
- **Upgrade chain processing**: Enhanced dependency-based upgrade system to handle nested upgrade dependencies
- Sergeant weapon upgrade chains now work correctly (Sgt. Pistol → Drum Pistol, Sgt. Hand Weapon → Energy Axe)
- Upgrade system now searches for dependencies in weapons added by previous upgrades, not just base unit weapons
- Improved weapon ID matching logic to handle both `id` and `weaponId` properties from upgrade gains

### Added
- Comprehensive unit tests for upgrade chain functionality
- Enhanced debug logging for upgrade chain processing and weapon dependency matching

## [2.15.0] - 2025-08-15

### Added
- Army deletion functionality with confirmation dialog in UI
- Delete button and confirmation workflow for army management

### Fixed
- Model naming in combined units - now shows "Infantry Squad 1-20" instead of duplicate "Infantry Squad 1-10" ranges
- Server-side army deletion endpoint - corrected database table reference from non-existent `army_units` to `units`
- Model naming logic moved to final processing stage for consistent sequential naming across all unit types

### Changed
- Model creation now defers naming until after all combining/joining operations complete
- Army deletion leverages existing CASCADE constraints for proper cleanup

## [2.14.0] - 2025-08-15

### Fixed
- **Weapon upgrade processing**: Replaced string-based upgrade matching with dependency-based system
- Sniper Rifle and Plasma Rifle upgrades now work correctly on Infantry Squad units
- Sergeant weapon chain dependencies (Pistol → Plasma Pistol, Hand Weapon → Energy Sword) function properly
- Combined unit weapon upgrades process correctly with dependency matching
- Eliminated string matching failures between upgrade targets ("Rifles") and weapon names ("Rifle")

### Changed  
- Upgrade system now uses `upgradeInstanceId` from weapon dependencies instead of string matching
- Both `armyProcessor.ts` and `newArmyProcessor.ts` updated to use dependency-based matching
- Improved reliability and future-proofing of weapon upgrade assignment logic

### Technical Improvements
- Added comprehensive dependency upgrade test suite
- Removed all `upgrade.targets` string-based matching from codebase
- Enhanced army data management with fetch-and-split-army.js script
- Army data now organized in persistent `/scripts/sampleArmyData/` structure

## [2.13.0] - 2025-08-14

### Added
- ESP32 web-based firmware flashing functionality 
- `/flash` page with complete ESP32 flashing interface using Web Serial API
- Integration with esptool-js for browser-based firmware flashing
- Real-time progress tracking for firmware download, preparation, flash, and reset stages
- Device detection with chip info, MAC address, and flash size identification
- Browser compatibility checks for Web Serial API support
- Enhanced firmware API endpoints with chip compatibility metadata
- Flash metadata fields in firmware table (chip_family, flash_size, flash_mode, flash_freq, partition addresses)
- Firmware download URLs now use consistent `/api/battleaura/firmware/download/*` path structure
- Navigation integration with "BattleAura" link in main menu
- Home page quick action card for ESP32 firmware flashing

### Fixed
- Firmware API endpoints now use consistent `/api/battleaura/firmware/*` namespace throughout
- GitHub Actions firmware upload workflow compatibility with standardized API paths
- Firmware flash page theming now matches existing battle design system instead of hardcoded colors
- TypeScript compilation errors in firmware flash page component

## [2.12.0] - 2025-08-13

### Added
- BattleAura firmware hosting system for ESP32-C3 device updates
- `GET /api/battleaura/firmware/latest` - Returns latest firmware version info
- `GET /api/battleaura/firmware` - Lists all available firmware versions  
- `GET /api/battleaura/firmware/:version` - Gets specific firmware version info
- `POST /api/firmware/upload` - Uploads new firmware binaries (for GitHub Actions)
- Static file serving for firmware downloads with proper MIME types
- Firmware table in database with version tracking and metadata
- Comprehensive test suite for all firmware endpoints (18 tests)
- Firmware binaries stored in `/firmware/` directory (excluded from git)
- Semantic version validation and duplicate version prevention
- Support for changelog metadata with each firmware version

### Fixed
- Complete dark mode theming implementation across all frontend pages
- BattleListPage.tsx now uses battle theme colors instead of hardcoded gray
- CreateBattlePage.tsx now uses battle theme colors instead of hardcoded gray  
- BattlePage.tsx now uses battle theme colors instead of hardcoded gray
- ArmyDetailPage.tsx validation warnings now use battle theme shaken colors instead of amber
- ArmyListPage.tsx badge colors now use battle theme colors consistently
- Dark mode is now the default to prevent white flash on page load while preserving system preference support

### Added
- CHANGELOG.md file following Keep a Changelog standard
- Test version constants for proper validation (tests/constants.ts)
- Professional changelog management in development workflow

### Changed
- Version number now managed from single source (package.json)
- Tests now validate against expected version constant instead of circular validation
- Homepage now references changelog instead of manually maintained feature lists
- Updated development workflow to include changelog maintenance

## [2.11.1] - 2025-08-12

### Added
- New logo and favicon implementation
- Centralized version management across frontend and backend
- Comprehensive dark mode as default theme
- System preference detection for automatic theme switching

### Changed
- All components now use centralized version from package.json
- Improved dark mode compatibility across all pages
- Updated theme colors for better battle visibility

### Fixed
- Hard-coded colors that broke when switching themes
- Docker workflow for consistent deployments
- Version consistency across all application components

## [2.11.0] - 2025-08-12

### Added
- Complete battle tracking system with unit health management
- Status effects tracking (fatigue, spell tokens, activation status)
- OPR ArmyForge integration with Combined/Joined unit merging
- Campaign XP cost calculations
- Model-level upgrade and weapon tracking
- Mobile-first responsive design with TailwindCSS
- Battle-optimized dark theme with custom color palette
- Comprehensive army detail pages
- Unit battle state management API endpoints

### Changed
- Complete rewrite from v1 for improved simplicity and performance
- Single port deployment (4019) serving both frontend and API
- Switched to SQLite for simpler data storage
- Improved TypeScript type safety throughout codebase

### Technical
- Express + SQLite + React stack
- Docker containerization with multi-stage builds
- Comprehensive test suite with Jest
- NewArmyProcessor for handling complex OPR unit mechanics

## [2.10.0] - Previous Archive

*Note: Previous versions (v1.x.x) were archived at git tag `v1.5.2-final-archive` as part of the v2 rewrite. See that tag for historical changelog information.*

---

## Changelog Format Guidelines

- **Added** for new features
- **Changed** for changes in existing functionality  
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for security vulnerability fixes