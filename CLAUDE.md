# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the BattleSync codebase.

## Project Overview

BattleSync is a self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with real-time battle tracking. 

**Current State**: Production-ready multi-user application (v1.2.2) - Simplified shooting system with natural action integration  
**Target State**: Enhanced battle features with advanced OPR conversion and analytics

## Recent Major Completions

### ✅ **Comprehensive Undo System (v1.2.0)** - FULLY IMPLEMENTED
- **8 Action Types**: Complete undo support for all battle actions (damage, spells, status, phases, etc.)
- **Battle Action History**: Full tracking with before/after state snapshots for reliable rollback
- **Smart Undo UI**: Quick suggestions, recent actions view, and full history export
- **Export Functionality**: Complete battle history available in JSON/CSV for battle reports
- **Database Integration**: Optimized schema with proper indexing and cascade relationships

### ✅ **Mobile UI Optimization (v1.2.1)** - FULLY IMPLEMENTED
- **Comprehensive Modal Responsiveness**: All modals optimized for tablet and mobile devices
- **Progressive Width Scaling**: Smart modal sizing from mobile (max-w-sm) to desktop (max-w-4xl)
- **Mobile-First Button Design**: Full-width buttons on mobile with stacked layouts
- **Responsive Grid Systems**: Adaptive layouts (grid-cols-1 sm:grid-cols-2) across all components
- **Touch-Friendly UI**: Larger touch targets and optimized spacing for mobile interaction
- **Cross-Device Compatibility**: Seamless experience from mobile phones (320px+) to desktop
- **Remote Access Health Check**: Dynamic URL generation for reverse proxy compatibility

### ✅ **Poker-Style Cooperative Casting (v1.2.0)** - FULLY IMPLEMENTED  
- **Real ArmyForge Integration**: Dynamic spell fetching from faction army books
- **Poker-Style Workflow**: Hidden simultaneous contributions with 15-second timer
- **Three-Modal System**: SpellCastModal → CooperativeContributionModal → SpellResultModal
- **Manual Dice Rolling**: Player agency maintained with manual result reporting
- **Backend Session Management**: Complete API endpoints with timeout handling
- **Real-time WebSocket Updates**: Live notifications and battle state synchronization
- **armyId Architecture**: Eliminates hardcoded faction mappings for dynamic spell resolution

**Key Files:**
- `/src/controllers/spellController.ts` - Poker-style cooperative casting API endpoints
- `/src/services/spellDataService.ts` - ArmyForge integration with intelligent parsing  
- `/frontend/src/components/SpellCastModal.tsx` - Mobile-optimized spell + target selection
- `/frontend/src/components/CooperativeContributionModal.tsx` - Hidden simultaneous contributions
- `/frontend/src/components/SpellResultModal.tsx` - Manual dice roll result reporting
- `/frontend/src/components/SetupBattleModal.tsx` - Mobile-responsive battle setup

### ✅ **Command Point System** - FULLY IMPLEMENTED
- All 6 OPR command point calculation methods (Fixed, Growing, Temporary, Random variants)
- Automatic CP refresh integrated into phase transitions and round advancement
- Mathematical calculations with proper ceiling rounding for fractional CP
- Campaign settings support for CP method selection

### ✅ **Simplified Shooting System (v1.2.2)** - FULLY IMPLEMENTED
- **Integrated Action Flow**: Shooting integrated into Hold/Advance actions (no standalone buttons)
- **Player Agency Maintained**: No line of sight/range tracking - players handle tabletop positioning
- **Weapon Summary Display**: Clear "5x Shotguns (15 attacks)" instead of complex individual selection
- **Simplified Workflow**: Target selection + wound input instead of complex 4-step dice rolling
- **Natural UX**: UnitActionModal appears only for units with ranged weapons
- **Reduced Book-keeping**: Minimal hand-holding focused on essential battle tracking

**Key Files:**
- `/frontend/src/components/UnitActionModal.tsx` - Simplified shooting integrated with actions
- `/frontend/src/components/BattleUnitCard.tsx` - Smart action button logic (modal vs direct)
- `/frontend/src/components/BattleDashboard.tsx` - Modal state management and handlers

### ✅ **OPR Army Conversion System** - PRODUCTION READY
- Smart unit combining logic with weapon summary merging
- Tough value distribution and hero joining mechanics
- Defense upgrade processing and weapon count accuracy
- Complex upgrade scenarios and edge case handling

## New TypeCheck Scripts Added (v1.2.1)
- `npm run typecheck` - Backend TypeScript checking without build
- `npm run frontend:typecheck` - Frontend TypeScript checking without build  
- These complement existing build commands for faster development iteration

## Development Practices
- While coding, update our version numbers to accurately describe what we are doing and where the app is

### Code Standards
- Use TypeScript strict mode
- Follow ESLint configuration
- Implement proper error handling with ApiError classes
- Use Prisma for all database operations
- Validate all inputs with Joi or custom validation
- **ALWAYS use correct TypeScript syntax**
- Always verify functionality through the webapp's api to ensure it's working as expected
- Commit with comments and push to github when appropriate while developing