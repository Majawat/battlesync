# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Complete dark mode theming implementation across all frontend pages
- BattleListPage.tsx now uses battle theme colors instead of hardcoded gray
- CreateBattlePage.tsx now uses battle theme colors instead of hardcoded gray  
- BattlePage.tsx now uses battle theme colors instead of hardcoded gray
- ArmyDetailPage.tsx validation warnings now use battle theme shaken colors instead of amber
- ArmyListPage.tsx badge colors now use battle theme colors consistently

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