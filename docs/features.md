# Features

BattleSync v2 is designed around simplicity and core battle tracking functionality for OPR (One Page Rules) games.

## 🎯 Core Philosophy

- **Simple**: Maximum 5 database tables (v1 had 17)
- **Fast**: Express + SQLite + React with no complex ORM
- **Focused**: Battle tracking only, avoiding premature features
- **Mobile**: Mobile-first design with TailwindCSS

## ✅ Current Features (v2.4.0)

### Backend Infrastructure
- [x] **TypeScript Backend** - Fully typed Express.js server
- [x] **Health Monitoring** - `/health` endpoint with version info
- [x] **Docker Support** - Production and development containers
- [x] **Testing Suite** - Jest + Supertest for API testing
- [x] **Port 4019** - Warhammer 40k + Horus Heresy themed port

### API Endpoints
- [x] `GET /` - API information and version
- [x] `GET /health` - Health check with timestamp

## 🚧 Planned Features

### Phase 1: Basic Battle Tracking
- [ ] **Army Import** - Import armies from ArmyForge
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

## 📊 Database Design (Max 5 Tables)

1. **users** - User authentication
2. **armies** - Imported army data
3. **battles** - Battle sessions
4. **battle_events** - Battle actions/damage
5. **battle_participants** - Army-battle relationships

---

*This document reflects our commitment to simplicity and focused functionality.*