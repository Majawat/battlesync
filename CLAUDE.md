# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the BattleSync codebase.

## Project Overview

BattleSync is a self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with real-time battle tracking. 

**Current State**: Production-ready multi-user application (v1.3.4) - Complete battle system with deployment phase management, functional trait mechanics, turn/round management, ArmyForge metadata integration, and enhanced unit displays  
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

### ✅ **Critical Bug Fixes (v1.2.4)** - FULLY IMPLEMENTED
- **Army Conversion Bug Fix**: Fixed critical bug where `army.id` (database ID) was incorrectly passed instead of `army.armyForgeId` (ArmyForge ID) during army conversion
- **TypeScript Safety Improvements**: Made `army` property optional in `ArmyConversionResult` with proper null checks throughout codebase
- **Parameter Validation**: Added comprehensive validation to prevent null armyForgeId values from reaching the converter
- **Database Schema Consistency**: Aligned Prisma schema with TypeScript interfaces for better type safety
- **Test Suite Updates**: Updated all test files to handle optional army properties correctly

### ✅ **ArmyForge Notes Integration (v1.2.6+)** - FULLY IMPLEMENTED
- **Notes Field Support**: Unit notes from ArmyForge now display in battle view under unit names
- **Frontend/Backend Type Sync**: Added `notes?: string | null` to frontend ArmyForgeUnit interface
- **Battle Card Display**: Notes appear in blue italic text below unit names in BattleUnitCard component
- **Seamless Integration**: Notes are automatically captured during army conversion via `sourceUnit` field
- **Mobile Responsive**: Notes display properly on all screen sizes with responsive text styling

### ✅ **Extended ArmyForge Metadata Capture (v1.2.6+)** - FULLY IMPLEMENTED
- **Complete Metadata Storage**: Now capturing all available ArmyForge fields for future use
- **Army Descriptions**: Display army backstory/notes in army detail view with blue-bordered styling
- **Version Tracking**: Capture `lastModified` timestamps for sync management
- **Battle Validation**: Store `modelCount` and `activationCount` for turn order and victory conditions
- **Campaign Features**: Capture `campaignMode`, `narrativeMode`, and `traits` for future campaign integration
- **Quality Assurance**: All fields stored but selectively displayed to avoid UI clutter

### ✅ **OPR Turn and Round Management System (v1.2.7)** - FULLY IMPLEMENTED
- **Complete OPR Rules Implementation**: Proper rounds, turns, and activation system per OPR rules
- **Round Start Events**: Caster token refresh, command point management, fatigue clearing, random events (campaigns)
- **Round End Events**: Objective checking, morale tests, army statistics, victory conditions
- **Turn Notifications**: Non-obtrusive "Your Turn" indicator with animated dot for active players
- **Activation Tracking**: Full validation of unit activations with proper sequencing
- **Campaign Integration**: Random events (5+ on D6) and command point method support
- **WebSocket Sync**: Real-time turn notifications and round progression for all players
- **Mobile Responsive**: Turn indicators work seamlessly on all screen sizes

### ✅ **Complete Melee System (v1.2.3)** - FULLY IMPLEMENTED
- **5-Phase Melee Workflow**: Target selection → Attacker melee → Defender choice → Defender melee → Resolution
- **Victim Notification System**: Clear notifications to defenders about incoming attacks and options
- **Strike Back Mechanics**: Defenders choose whether to strike back with full weapon display
- **Automatic Winner Determination**: Based on wounds caused with proper tie handling
- **Comprehensive Morale Tests**: Melee losers and units under half strength both trigger tests
- **Special Rules Integration**: 80+ OPR special rules documented with edge case handling
- **Weapon Summary Display**: Clear melee weapon breakdowns with attack calculations
- **Mobile-Responsive Design**: Full tablet/mobile optimization with progressive scaling

**Key Files:**
- `/frontend/src/components/MeleeAttackModal.tsx` - Complete 5-phase melee system with victim notifications
- `/frontend/src/components/BattleDashboard.tsx` - Integrated charge action routing to melee modal
- `/docs/rules/opr/` - Comprehensive OPR special rules documentation for edge cases

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

### ✅ **Complete Deployment System (v1.3.3-v1.3.4)** - FULLY IMPLEMENTED
- **OPR-Compliant Deployment Phase**: Roll-off → Unit Placement → Battle Start transition system
- **Alternating Unit Placement**: Players take turns deploying units within 12" of table edge
- **Ambush Reserve System**: Units with Ambush-granting rules (Hidden Route, etc.) can be placed in reserves
- **Deployment Modal Interface**: Mobile-responsive unit deployment interface with action buttons
- **Turn Order Inheritance**: Deployment roll-off winner determines first player in battle rounds
- **Status-Only Tracking**: Tracks deployment status without coordinate enforcement (player agency maintained)

**Supported Special Rules:**
- **Ambush/Hidden Route/Surprise Attack**: Units deploy in reserves until round 2+
- **Dynamic Rule Detection**: Intelligent detection of rules that grant deployment abilities
- **Reserve Validation**: Units in reserves cannot activate until deployed on battlefield

**Key Files:**
- `/src/services/deploymentService.ts` - Core deployment logic with rule detection
- `/frontend/src/components/DeploymentModal.tsx` - Complete unit deployment interface
- `/src/services/oprBattleService.ts` - Battle phase transition management

### ✅ **Enhanced Turn System (v1.3.4)** - FULLY IMPLEMENTED  
- **Proper Phase Transitions**: Seamless flow from deployment completion to battle rounds
- **Activation Order Generation**: Correct alternating turn pattern based on deployment roll-off
- **Unit Activation Validation**: Comprehensive validation preventing activation of reserve/routed units
- **Real-time Notifications**: Clear turn progression notifications via WebSocket system
- **Round Start Events**: Automatic caster token refresh and command point management
- **Reserve Unit Exclusion**: Only deployed units count toward activation slots

**Technical Improvements:**
- Fixed deployment to battle transition with proper turn initialization
- Enhanced activation validation to prevent reserve unit activation
- Improved notification system replacing problematic WebSocket broadcasts
- Consistent API integration between frontend ActivationPanel and backend services

**Key Files:**
- `/src/services/activationService.ts` - Complete turn and activation management
- `/frontend/src/components/ActivationPanel.tsx` - Turn-based activation interface
- `/src/controllers/activationController.ts` - API endpoints with proper notifications

### ✅ **Functional Trait System (v1.2.9)** - FULLY IMPLEMENTED
- **Intelligent Trait Analysis**: Automatic detection of functional vs cosmetic traits from ArmyForge metadata
- **Game Mechanics Integration**: Traits like "Agile", "Hardy", "Veteran" provide actual gameplay benefits
- **Movement Calculation**: Traits affect movement distances (Fast/Swift +1", Slow -1", stackable with special rules)
- **Visual Distinction**: Functional traits displayed with green highlighting and effect descriptions
- **Comprehensive Coverage**: 20+ functional trait types with specific game effects
- **Hover Tooltips**: Cosmetic traits show descriptions on hover for lore context

**Key Functional Traits:**
- **Agile**: +1" Advance, may ignore first melee hit
- **Hardy**: Ignores first wound on 4+
- **Veteran**: +1 to quality tests, reroll failed morale
- **Elite**: Reroll one failed die per activation
- **Stealth/Camo**: Enemy shooting -1 to hit beyond 12"
- **Flying/Jump**: Ignores terrain, moves over units
- **Fearless/Brave**: Immune to fear/terror, +1 morale
- **Strider**: Ignores difficult terrain penalties
- **Poison**: Ignores Regeneration, target re-rolls Defense 6s
- **Rending**: Hit 6s get AP(4), ignores Regeneration
- **Regeneration**: 5+ to ignore wounds
- **Relentless**: Hit 6s deal extra hit on Hold actions
- **Reliable**: Attacks hit on 2+ regardless of Quality
- **Sniper**: Shoots at 2+, may target specific models
- **Lock-On**: Ignores cover and negative modifiers
- **Entrenched**: Enemies -2 to hit from 9"+ if unit hasn't moved
- **Immobile**: May only use Hold actions

**Key Files:**
- `/frontend/src/components/BattleUnitCard.tsx` - Trait analysis and display system with functional mechanics

## New TypeCheck Scripts Added (v1.2.1)
- `npm run typecheck` - Backend TypeScript checking without build
- `npm run frontend:typecheck` - Frontend TypeScript checking without build  
- These complement existing build commands for faster development iteration

## Core Design Philosophy

### Positioning and Spatial Awareness
**IMPORTANT**: BattleSync is a battle tracker, NOT a virtual tabletop. The system intentionally does NOT track unit positions, coordinates, or battlefield layout.

- **Players Handle Positioning**: All unit placement, movement, line-of-sight, and range measurements are handled by players on their physical tabletop
- **No Coordinate System**: Units have no x/y coordinates or battlefield positions in the database
- **Deployment Status Only**: The deployment system tracks deployment STATUS (deployed/reserves/embarked) but not WHERE units are placed
- **Range Display Only**: Weapon ranges are displayed for reference but not enforced
- **Player Agency**: This design maintains player control over the physical game while BattleSync handles bookkeeping

When implementing deployment features:
- Track which units are deployed vs in reserves
- Handle special deployment rules (Ambush, Scout, Transport)
- Provide deployment zone DESCRIPTIONS ("within 12\" of your table edge")
- Never implement coordinate systems or positioning validation

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