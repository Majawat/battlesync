# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the BattleSync codebase.

## Project Overview

BattleSync is a self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with real-time battle tracking. 

**Current State**: Core systems completed and tested - Army management fully operational
**Target State**: Production-ready multi-user application with real-time battle tracking

## Current Implementation Status

### ✅ COMPLETED (Functional & Tested)
- **Authentication System**: JWT-based auth with role-based access control
- **Gaming Groups**: Full CRUD with invite codes, member management
- **Campaign Management**: Creation, settings, member management with comprehensive validation
- **Mission System**: Auto-numbered missions with objectives, special rules, and terrain
- **Army Management System**: Complete implementation with ArmyForge integration
  - ✅ TypeScript interfaces (40+ interfaces defined)
  - ✅ Real ArmyForge API integration with intelligent faction mapping
  - ✅ Complete CRUD operations in service layer
  - ✅ Army controller with 12 API endpoints
  - ✅ Campaign-army association workflow
  - ✅ End-to-end testing completed successfully
- **WebSocket Infrastructure**: Real-time communication system with room management
- **React Frontend**: Dark mode UI with responsive design, TailwindCSS
- **Database**: PostgreSQL with Prisma ORM, complete schema implementation
- **API Layer**: RESTful endpoints with proper error handling and validation
- **Docker Environment**: Full development setup with hot reload

### ⚠️ IN PROGRESS
- **Battle Tracking**: Real-time WebSocket battle state management (infrastructure complete)
- **Army Validation**: Enhanced Joi middleware for army endpoints (basic validation implemented)

### ❌ PENDING (Not Started)
- **Advanced Battle Features**: Mobile-optimized battle interface, battle analytics
- **Production Configuration**: SSL, monitoring, automated backups

## Architecture

### Technology Stack
- **Backend**: Node.js 18+ with Express.js and TypeScript
- **Frontend**: React 18+ with TypeScript, TailwindCSS, Vite
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Real-time**: WebSockets (ws library) with room management
- **Authentication**: JWT tokens with bcrypt password hashing
- **Deployment**: Docker Compose for development and production

### Directory Structure
```
src/                    # Backend TypeScript source
├── controllers/        # Express route handlers (auth, groups, campaigns, missions, army)
├── middleware/         # Auth, validation, logging middleware
├── routes/            # API route definitions
├── services/          # Business logic (userService, gamingGroupService, etc.)
├── types/             # TypeScript interfaces for all entities
├── utils/             # Database, crypto, validation, logging utilities
└── index.ts           # Express app entry point with WebSocket server

frontend/src/          # React TypeScript frontend
├── components/        # React components (modals, cards, forms)
├── hooks/             # Custom React hooks (useAuth)
├── services/          # API client and utilities
├── types/             # Frontend TypeScript types
└── App.tsx            # Main app with routing

prisma/
├── schema.prisma      # Database schema with all tables
└── seed.ts            # Demo data seeding
```

### Key Components

#### Authentication & Authorization
- JWT access tokens (15 min expiry) + refresh tokens (7 days)
- Role-based access: `SERVER_OWNER` → `GROUP_ADMIN` → `MEMBER`
- Middleware: `authenticate` for protected routes
- Password hashing with bcrypt (temporary base64 in demo)

#### Gaming Groups
- Invite code system for easy joining (`generateInviteCode()`)
- Member capacity removed per user request
- Owner management and role assignment
- Group isolation for campaigns and data

#### Campaign Management  
- Comprehensive settings validation:
  - Points limit (100-10,000)
  - Game systems: grimdark-future, age-of-fantasy, firefight, warfleets-ftl
  - Experience system: experiencePerWin, experiencePerLoss, experiencePerKill
  - Boolean flags: allowMultipleArmies, requireArmyForgeIntegration
  - Custom rules array
- Status tracking: PLANNING, ACTIVE, COMPLETED, ON_HOLD

#### WebSocket System
- Room-based communication (`groups:${id}`, `campaigns:${id}`, `battles:${id}`)
- Heartbeat system for connection management
- JWT authentication for WebSocket connections
- Event types: join-room, leave-room, notification, presence-update

### Database Schema

**Core Tables:**
- `users` - Authentication and profile data
- `gaming_groups` - Group organization with invite codes  
- `campaigns` - Campaign data with JSONB settings
- `missions` - Mission management with templates
- `armies` - Army data storage (JSONB from ArmyForge)
- `battles` - Battle sessions and state tracking

**Key Relationships:**
- Users belong to multiple gaming groups (many-to-many)
- Gaming groups have multiple campaigns (one-to-many)
- Campaigns have multiple missions (one-to-many)
- Users have multiple armies per campaign

## Recent Fixes & Improvements

### Army System Compilation Resolved ✅
All TypeScript compilation errors have been resolved and the army management system is fully operational:

1. **Express Router Type Issues**: Fixed by updating AuthenticatedRequest handling
2. **Missing Dependencies**: Resolved axios and service import/export issues  
3. **ArmyForge Integration**: Successfully tested with real API endpoints
4. **Faction Mapping**: Implemented intelligent faction name resolution (e.g., "gf" → "Grimdark Future")

### Files Restored to Active Use
- `src/services/armyService.ts` - Fully operational
- `src/services/armyForgeClient.ts` - Integrated with real API
- `src/controllers/armyController.ts` - All 12 endpoints working
- `src/routes/armyRoutes.ts` - Active in routing system

### End-to-End Testing Completed ✅
Complete workflow tested successfully:
- User registration and authentication
- Gaming group creation
- Campaign creation with full settings validation
- Mission creation with objectives and special rules
- Army import from ArmyForge with campaign association
- Data persistence and retrieval across all systems

## Development Commands

### Backend Development
```bash
npm run dev          # Start with nodemon hot reload
npm run build        # TypeScript compilation
npm run lint         # ESLint checking
npm run db:studio    # Prisma database GUI
npm run db:seed      # Reset with demo data
```

### Frontend Development  
```bash
cd frontend
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # Frontend linting
```

### Docker Operations
```bash
docker-compose up -d              # Start all services
docker logs battlesync-app-1 -f   # Backend logs
docker logs battlesync-frontend-1 -f  # Frontend logs
```

### Testing
```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Test campaign creation (requires token)
curl -X POST http://localhost:3001/api/groups/{groupId}/campaigns \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "settings": {...}}'
```

## Implementation Priorities

### High Priority (Current Focus)
1. **Group Membership Management** (In Progress)
   - GroupMembersModal component implementation
   - Enhanced group controller with membership endpoints  
   - Role-based member management features
   - Member invitation and removal workflows

2. **Battle Tracking System**
   - WebSocket battle rooms
   - Real-time unit state management
   - Turn tracking and battle progression
   - Mobile-optimized battle interface

### Medium Priority
3. **Army Validation Middleware**
   - Joi schemas for army data validation
   - One Page Rules points validation
   - Army composition rule checking

4. **Production Features**
   - HTTPS/SSL configuration
   - Database backup automation
   - Application monitoring and logging
   - Performance optimization

### Future Enhancements
5. **Advanced Features**
   - Campaign statistics and analytics
   - Advanced mission templates and scenarios
   - Mobile app (React Native)
   - Integration with other army builders

## Development Guidelines

### Code Standards
- Use TypeScript strict mode
- Follow ESLint configuration
- Implement proper error handling with ApiError classes
- Use Prisma for all database operations
- Validate all inputs with Joi or custom validation

### Security Requirements
- JWT tokens with proper expiry
- Input sanitization and validation
- Role-based access control enforcement
- Gaming group data isolation
- Secure ArmyForge token storage

### Performance Considerations
- Database connection pooling
- WebSocket connection management
- Efficient JSONB queries for army data
- Caching for ArmyForge API responses
- Mobile-first responsive design

## API Documentation

### Authentication Endpoints
```
POST /api/auth/login       # User login
POST /api/auth/register    # User registration
POST /api/auth/refresh     # Token refresh
POST /api/auth/logout      # User logout
```

### Gaming Groups
```
GET    /api/groups              # User's groups
POST   /api/groups              # Create group
GET    /api/groups/:id          # Group details
POST   /api/groups/join         # Join with invite code
DELETE /api/groups/:id          # Delete group (owner only)
```

### Campaigns
```
GET    /api/groups/:groupId/campaigns        # Group's campaigns
POST   /api/groups/:groupId/campaigns        # Create campaign
GET    /api/campaigns/:id                    # Campaign details
PUT    /api/campaigns/:id                    # Update campaign
DELETE /api/campaigns/:id                    # Delete campaign
```

### Missions
```
GET    /api/campaigns/:campaignId/missions   # Campaign missions
POST   /api/campaigns/:campaignId/missions   # Create mission
GET    /api/missions/:id                     # Mission details
PUT    /api/missions/:id                     # Update mission
GET    /api/templates                        # Mission templates
```

### Army Management ✅
```
POST   /api/armies/import                    # Import from ArmyForge
GET    /api/armies                           # User's armies (with campaign filtering)
GET    /api/armies/:id                       # Army details with full data
PUT    /api/armies/:id/sync                  # Sync with ArmyForge
PUT    /api/armies/:id/customizations        # Update army customizations
DELETE /api/armies/:id                       # Delete army
GET    /api/armies/armyforge/status          # ArmyForge integration status
POST   /api/armies/:id/battle-honors         # Add battle honors
POST   /api/armies/:id/veteran-upgrades      # Add veteran upgrades
GET    /api/armies/statistics                # Army usage statistics
GET    /api/armies/:id/validate              # Validate army composition
DELETE /api/armies/armyforge/cache           # Clear ArmyForge cache
```

## External Integrations

### ArmyForge API ✅
- **Base URL**: `https://army-forge.onepagerules.com/api`
- **Authentication**: Public API, no authentication required
- **Rate Limiting**: 60 requests/minute with intelligent backoff
- **Endpoints**:
  - `GET /tts?id={listId}` - Import army list (✅ tested)
  - `GET /game-systems` - Available game systems
  - `GET /game-systems/{id}/factions` - Faction data
  - `GET /game-systems/{id}/factions/{factionId}/books` - Army books

### Integration Features
- **Intelligent Caching**: 10-minute TTL for army data, 1-hour for metadata
- **Faction Mapping**: Resolves game system codes to meaningful names
- **Error Handling**: Comprehensive retry logic with exponential backoff
- **Validation**: Army data validation against campaign requirements

### Caching Strategy
- ArmyForge responses cached for 1 hour
- Cache invalidation on manual sync
- User-specific cache keys
- Redis optional for production

## Deployment Notes

### Environment Variables
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:3002
```

### Docker Compose Services
- `db`: PostgreSQL 15 with persistent volume
- `app`: Node.js backend with TypeScript compilation
- `frontend`: React app with Vite dev server

### Production Considerations
- Use production database with backups
- Configure SSL certificates
- Set up monitoring and logging
- Optimize build sizes and caching
- Configure proper CORS origins

## Debugging Tips

### Common Issues
1. **TypeScript Errors**: Run `npm run build` to check compilation
2. **Database Issues**: Check `docker logs battlesync-db-1`
3. **WebSocket Problems**: Verify JWT token authentication
4. **CORS Errors**: Ensure CORS_ORIGIN matches frontend URL

### Development Tools
- Prisma Studio: Database GUI at generated URL
- Docker logs: Real-time application logging
- Browser DevTools: Network tab for API debugging
- WebSocket testing: Use browser console or tools like Postman

## Testing Strategy

### Manual Testing Checklist
- [x] User registration and login ✅
- [x] Gaming group creation and joining ✅
- [x] Campaign creation with all settings ✅
- [x] Mission creation and management ✅
- [x] WebSocket real-time functionality ✅
- [x] Army import from ArmyForge ✅
- [x] Campaign-army association ✅
- [x] Faction name resolution ✅
- [ ] Battle tracking (infrastructure complete)
- [ ] Advanced army features (battle honors, veterans)
- [ ] Mobile interface optimization

### Automated Testing (Future)
- Unit tests for services and utilities
- Integration tests for API endpoints
- End-to-end tests for user workflows
- WebSocket connection testing