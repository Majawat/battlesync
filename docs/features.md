# Features

BattleSync v2 is designed around simplicity and core battle tracking functionality for OPR (One Page Rules) games.

## 🎯 Core Philosophy

- **Simple**: Maximum 5 database tables (v1 had 17)
- **Fast**: Express + SQLite + React with no complex ORM
- **Focused**: Battle tracking only, avoiding premature features
- **Mobile**: Mobile-first design with TailwindCSS

## ✅ Current Features (v2.12.0)

### Backend Infrastructure
- [x] **TypeScript Backend** - Fully typed Express.js server with SQLite
- [x] **Health Monitoring** - `/health` endpoint with version info
- [x] **Docker Support** - Production and development containers
- [x] **Testing Suite** - Jest + Supertest with comprehensive test coverage
- [x] **Port 4019** - Warhammer 40k + Horus Heresy themed port
- [x] **Database Schema** - Complete SQLite schema for army/battle tracking

### Army Management 
- [x] **ArmyForge Integration** - Import armies from ArmyForge API
- [x] **OPR Unit Processing** - Handle Combined/Joined units correctly
- [x] **Campaign Support** - XP costs and campaign traits preserved
- [x] **Army Storage** - Full SQLite storage with relationships
- [x] **Custom Naming** - "Hero w/ Unit" format for joined units
- [x] **Validation Handling** - Separate army validation errors from description

### API Endpoints
- [x] `GET /` - API information and version
- [x] `GET /health` - Health check with timestamp  
- [x] `POST /api/armies/import` - Import army from ArmyForge
- [x] `GET /api/armies` - List all stored armies
- [x] `GET /api/armies/:id` - Get army with full unit details
- [x] `POST /api/battles` - Create new battle session
- [x] `GET /api/battles` - List all battles
- [x] `GET /api/battles/:id` - Get battle details with participants
- [x] `POST /api/battles/:id/participants` - Add participant to battle
- [x] `POST /api/battles/:id/start` - Start battle and initialize unit states
- [x] `GET /api/battles/:id/units` - Get all unit battle states
- [x] `PATCH /api/battles/:battleId/units/:unitStateId` - Update unit state

### BattleAura Firmware Management
- [x] **Firmware Hosting System** - Host and serve ESP32 firmware binaries  
- [x] **Web-based Flashing** - Flash ESP32 devices directly from browser using Web Serial API
- [x] **Device Detection** - Automatic chip identification and flash memory detection
- [x] **Progress Tracking** - Real-time progress for download, preparation, flash, and reset stages
- [x] **Version Management** - Semantic versioning with changelog support
- [x] **GitHub Actions Integration** - Automated firmware upload via CI/CD
- [x] **Flash Metadata** - Chip compatibility and flash configuration parameters
- [x] `GET /api/battleaura/firmware/latest` - Get latest firmware version
- [x] `GET /api/battleaura/firmware` - List all firmware versions  
- [x] `GET /api/battleaura/firmware/:version` - Get specific firmware version
- [x] `POST /api/battleaura/firmware/upload` - Upload firmware binary (CI/CD)
- [x] `GET /api/battleaura/firmware/download/:filename` - Download firmware files
- [x] `DELETE /api/battleaura/firmware/admin/clear` - Clear firmware data (admin)

### Battle Management System
- [x] **Battle Sessions** - Create and manage battle sessions
- [x] **Participant Management** - Add armies as participants with doctrines
- [x] **Battle State Tracking** - Track battle phases (setup -> deployment -> active)
- [x] **Unit State Initialization** - Auto-calculate and initialize unit health from models

### Unit Battle State Tracking
- [x] **Health Management** - Track current/max health per unit
- [x] **OPR Status System** - Normal, Shaken, Routed unit states
- [x] **Fatigue Tracking** - Track unit fatigue from melee combat
- [x] **Spell Token Management** - Track caster spell tokens
- [x] **Activation Tracking** - Track which units have activated each round
- [x] **Action History** - Record current unit actions (hold/advance/rush/charge)
- [x] **Position Data** - Store unit position and facing
- [x] **Status Effects** - Track temporary effects (poison, stunned, etc.)
- [x] **Deployment States** - Standard, Ambush, Scout, Embarked deployment

### Frontend Application 
- [x] **React Frontend** - Complete React + Vite frontend application
- [x] **Dark Mode System** - Battle-optimized dark theme with localStorage persistence
- [x] **Mobile-First Design** - TailwindCSS responsive design for mobile devices
- [x] **Army Management UI** - Import, list, and view detailed army information
- [x] **Battle Management UI** - Create and manage battle sessions
- [x] **Army Detail Pages** - Comprehensive unit breakdowns with models, weapons, upgrades
- [x] **Single Port Deployment** - Frontend and API served from single port (4019)

## 🚧 Planned Features

### Phase 2: Advanced Battle Mechanics *(Next)*
- [ ] **Battle Setup** - Create new battles with army selection
- [ ] **Damage Tracking** - Track unit damage during battles  
- [ ] **Basic Undo** - Undo last action for mistake correction

### Phase 2: Enhanced Features  
- [ ] **Battle History** - View and replay past battles
- [ ] **User Authentication** - Simple user accounts
- [ ] **Battle Statistics** - Win/loss tracking
- [ ] **Export Battles** - Export battle data

### Phase 3: Polish & Mobile
- [ ] **Mobile Optimization** - Touch-friendly interface
- [ ] **Offline Support** - Work without internet
- [ ] **Performance Tuning** - Optimize for speed
- [ ] **Advanced Undo** - Multi-step undo/redo

## 🎮 Target Use Cases

1. **Quick Battle Setup** - Get into battle tracking fast
2. **Damage Management** - Track unit health easily
3. **Mistake Recovery** - Undo accidents without hassle
4. **Battle Records** - Keep history of games played

## 🚫 Explicitly NOT Planned

- Complex army builders (use ArmyForge instead)
- Rule lookup tools (use official OPR rules)
- Social features (chat, forums, etc.)
- Multiple game system support (OPR only)

## 📊 Database Design (Simple SQLite Schema)

### Army Storage
1. **armies** - Army definitions from ArmyForge
2. **units** - Battle activation units (Combined/Joined processing)
3. **sub_units** - Component parts maintaining original identity
4. **models** - Individual model health tracking

### Battle Tracking *(Coming Soon)*
5. **battles** - Battle sessions and settings
6. **battle_armies** - Army participation in battles
7. **battle_units** - Unit state during battles (shaken, routed, etc.)
8. **battle_models** - Individual model health in battles
9. **battle_events** - Event log for undo functionality

---

*This document reflects our commitment to simplicity and focused functionality.*