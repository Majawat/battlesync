# Features

BattleSync v2 is designed around simplicity and core battle tracking functionality for OPR (One Page Rules) games.

## 🎯 Core Philosophy

- **Simple**: Maximum 5 database tables (v1 had 17)
- **Fast**: Express + SQLite + React with no complex ORM
- **Focused**: Battle tracking only, avoiding premature features
- **Mobile**: Mobile-first design with TailwindCSS

## ✅ Current Features (v2.6.1)

### Backend Infrastructure
- [x] **TypeScript Backend** - Fully typed Express.js server with SQLite
- [x] **Health Monitoring** - `/health` endpoint with version info
- [x] **Docker Support** - Production and development containers
- [x] **Testing Suite** - Jest + Supertest with 17 comprehensive tests
- [x] **Port 4019** - Warhammer 40k + Horus Heresy themed port
- [x] **Database Schema** - Complete SQLite schema for army/battle tracking

### Army Management 
- [x] **ArmyForge Integration** - Import armies from ArmyForge API
- [x] **OPR Unit Processing** - Handle Combined/Joined units correctly
- [x] **Campaign Support** - XP costs and campaign traits preserved
- [x] **Army Storage** - Full SQLite storage with relationships
- [x] **Custom Naming** - "Hero w/ Unit" format for joined units

### API Endpoints
- [x] `GET /` - API information and version
- [x] `GET /health` - Health check with timestamp  
- [x] `POST /api/armies/import` - Import army from ArmyForge
- [x] `GET /api/armies` - List all stored armies
- [x] `GET /api/armies/:id` - Get army with full unit details

## 🚧 Planned Features

### Phase 1: Battle Tracking *(In Progress)*
- [x] **Army Import** - Import armies from ArmyForge ✅
- [ ] **Battle Setup** - Create new battles with army selection
- [ ] **Damage Tracking** - Track unit damage during battles  
- [ ] **Basic Undo** - Undo last action for mistake correction
- [ ] **React Frontend** - User interface for battle tracking

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