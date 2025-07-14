# AI Project Map - BattleSync

This file provides a machine-readable overview of the BattleSync codebase for AI assistants.

## 🗂️ **File Structure & Purpose**

```
src/
├── controllers/          # Express route handlers - API endpoint logic
│   ├── authController.ts       # Authentication endpoints
│   ├── armyController.ts       # Army management (12 endpoints)
│   ├── battleController.ts     # Battle management 
│   ├── campaignController.ts   # Campaign CRUD
│   ├── groupController.ts      # Gaming group management
│   └── missionController.ts    # Mission management
├── middleware/           # Express middleware functions
│   ├── auth.ts                 # JWT authentication middleware
│   ├── validation.ts           # Request validation with Joi
│   └── logging.ts              # Request/response logging
├── routes/              # API route definitions
│   ├── authRoutes.ts           # POST /api/auth/*
│   ├── armyRoutes.ts           # /api/armies/* (army management)
│   ├── battleRoutes.ts         # /api/battles/* & /api/missions/:id/battles
│   ├── campaignRoutes.ts       # /api/campaigns/* & /api/groups/:id/campaigns
│   ├── groupRoutes.ts          # /api/groups/*
│   └── missionRoutes.ts        # /api/missions/* & /api/campaigns/:id/missions
├── services/            # Business logic layer (core functionality)
│   ├── authService.ts          # User auth, JWT tokens, password hashing
│   ├── armyService.ts          # Army CRUD, ArmyForge sync, customizations
│   ├── armyForgeClient.ts      # External ArmyForge API integration
│   ├── oprArmyConverter.ts     # Complex OPR army conversion logic
│   ├── oprBattleService.ts     # Battle state management, damage tracking
│   ├── campaignService.ts      # Campaign CRUD, settings validation
│   ├── groupService.ts         # Gaming group management
│   ├── missionService.ts       # Mission CRUD, template management
│   ├── userService.ts          # User profile, preferences
│   ├── websocket.ts            # WebSocket server & room management
│   └── notificationService.ts  # User notifications
├── types/               # TypeScript interface definitions
│   ├── auth.ts                 # User, JWT, login/register types
│   ├── army.ts                 # Army, ArmyForge, customization types
│   ├── oprBattle.ts            # Battle state, units, damage types
│   ├── campaign.ts             # Campaign, settings, participation types
│   ├── group.ts                # Gaming group, membership types
│   ├── mission.ts              # Mission, objectives, terrain types
│   └── common.ts               # Shared utility types
├── utils/               # Utility functions and helpers
│   ├── database.ts             # Prisma client setup
│   ├── apiError.ts             # Custom error classes
│   ├── apiResponse.ts          # Standardized API responses
│   ├── logger.ts               # Winston logging configuration
│   ├── validation.ts           # Joi schema helpers
│   └── crypto.ts               # Password hashing, token generation
└── index.ts             # Express app entry point, WebSocket setup
```

## 🔗 **Data Flow Patterns**

### **API Request Flow**
```
Request → Route → Middleware (auth/validation) → Controller → Service → Database → Response
```

### **Army Import Flow**
```
Frontend → armyController.importArmy() → armyService.importArmyFromArmyForge() 
→ armyForgeClient.getArmy() → oprArmyConverter.convertArmyToBattle() → Database
```

### **Battle Creation Flow**
```
Frontend → battleController.createBattle() → oprBattleService.createOPRBattle()
→ armyService.getArmyById() → WebSocket broadcast → Database
```

## 📊 **Key Data Models**

### **Core Entities**
- **User** (`users` table) - Authentication, profile, preferences
- **GamingGroup** (`gaming_groups` table) - Organization unit with invite codes
- **Campaign** (`campaigns` table) - Game campaign with settings (JSON)
- **Mission** (`missions` table) - Individual game scenarios
- **Army** (`armies` table) - Player armies with ArmyForge data (JSON)
- **Battle** (`battles` table) - Active game sessions with state (JSON)

### **Relationship Patterns**
```
User → GamingGroupMembership → GamingGroup → Campaign → Mission → Battle
User → Army → BattleParticipant → Battle
```

## 🎯 **Critical Business Logic**

### **Army Conversion (src/services/oprArmyConverter.ts)**
- **Input**: ArmyForge JSON data
- **Output**: OPRBattleArmy with trackable units/models
- **Complex Logic**: Combined units, hero joining, weapon distribution, tough values
- **Status**: ✅ Production ready, comprehensive test coverage

### **WebSocket System (src/services/websocket.ts)**
- **Rooms**: `groups:${id}`, `campaigns:${id}`, `battles:${id}`
- **Events**: join-room, leave-room, notification, battle updates
- **Authentication**: JWT token validation on connection

### **Campaign Settings Validation**
```typescript
{
  gameSystem: "grimdark-future" | "age-of-fantasy" | "firefight" | "warfleets-ftl",
  pointsLimit: 100-10000,
  experiencePerWin/Loss/Kill: number,
  allowMultipleArmies: boolean,
  requireArmyForgeIntegration: boolean,
  customRules: string[]
}
```

## 🚀 **Integration Points**

### **ArmyForge API** (src/services/armyForgeClient.ts)
- **Base URL**: `https://army-forge.onepagerules.com/api`
- **Key Endpoint**: `GET /tts?id={listId}` - Import army data
- **Rate Limit**: 60 req/min with exponential backoff
- **Caching**: 10min TTL for army data, 1hr for metadata

### **Database** (Prisma ORM)
- **Schema**: `prisma/schema.prisma`
- **Migrations**: Automatic via Prisma
- **Seeding**: `prisma/seed.ts` with demo data

## 🧪 **Testing Strategy**

### **Test Locations**
- **Unit Tests**: `src/tests/` (army conversion, weapon distribution)
- **Integration Tests**: End-to-end workflows
- **Test Data**: Realistic ArmyForge JSON in test files

### **Key Test Files**
- `src/tests/unitConversion.test.ts` - Hero joining mechanics
- `src/tests/combinedUnits.test.ts` - Unit combination logic
- `src/tests/weaponDistribution.test.ts` - Weapon allocation
- `src/tests/conversionDataStructures.test.ts` - Data structure validation

## ⚡ **Performance Considerations**

### **Database Queries**
- Army data stored as JSONB for flexible schema
- Indexes on userId, campaignId, armyForgeId
- Connection pooling via Prisma

### **WebSocket Management**
- Room-based message routing
- Heartbeat system for connection health
- JWT token refresh handling

### **Caching Strategy**
- ArmyForge API responses cached 10min-1hr
- User-specific cache keys
- Redis optional for production

## 🔧 **Development Patterns**

### **Error Handling**
- Custom `ApiError` class with HTTP status codes
- Consistent error response format
- Service layer throws, controller layer catches

### **Validation**
- Joi schemas for request validation
- TypeScript interfaces for compile-time safety
- Database constraints for data integrity

### **Code Organization**
- Services contain business logic (no Express dependencies)
- Controllers handle HTTP concerns only
- Types define data contracts between layers

## 📝 **AI Assistant Guidance**

### **When Making Changes**
1. **Read CLAUDE.md first** - Comprehensive project context
2. **Check types/**.ts files** - Understand data structures
3. **Review tests** - See expected behavior and edge cases
4. **Follow existing patterns** - Consistent service/controller architecture
5. **Update documentation** - Keep status indicators current

### **Common Tasks**
- **New API endpoint**: Route → Controller → Service → Types
- **Database changes**: Update Prisma schema → migration → types
- **Business logic**: Add to appropriate service, test thoroughly
- **Frontend integration**: Update API client, handle WebSocket events

### **File Modification Frequency**
- **High**: services/, controllers/, types/ (active development)
- **Medium**: routes/, utils/ (stable, occasional updates)
- **Low**: middleware/, index.ts (infrastructure, rarely changed)