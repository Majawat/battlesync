# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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