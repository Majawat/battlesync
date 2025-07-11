# BattleSync

A self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with real-time battle tracking.

## Current Status

🟢 **IMPLEMENTED**
- ✅ JWT Authentication system with role-based access control
- ✅ Gaming Groups management with invite codes
- ✅ Campaign management with configurable settings
- ✅ Mission system with templates and auto-numbering
- ✅ WebSocket real-time communication infrastructure
- ✅ React frontend with dark mode UI
- ✅ PostgreSQL database with Prisma ORM
- ✅ Docker development environment
- ✅ RESTful API with comprehensive CRUD operations

🟡 **IN PROGRESS**
- ⚠️ Army management system (90% complete, fixing TypeScript compilation errors)
- ⚠️ ArmyForge integration (implemented but disabled due to compilation issues)

🔴 **PENDING**
- ❌ Battle tracking system (complex real-time implementation)
- ❌ Army validation middleware
- ❌ Production deployment configuration

## Quick Start

1. **Clone and setup**:
```bash
git clone <repository-url>
cd battlesync
cp .env.example .env
```

2. **Start with Docker Compose**:
```bash
docker-compose up -d
```

3. **Access the application**:
- Frontend: http://localhost:3002
- API: http://localhost:3001
- Health check: http://localhost:3001/health
- Database: PostgreSQL on localhost:5433

## Demo Credentials

After starting the containers, you can log in with:
- Username: `admin`
- Password: `admin123`
- Role: `SERVER_OWNER`

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (recommended)

### Local Development Setup

1. **Install dependencies**:
```bash
npm install
cd frontend && npm install
```

2. **Start development environment**:
```bash
docker-compose up -d
```

3. **Access development tools**:
```bash
# Prisma Studio (database GUI)
npm run db:studio

# Backend logs
docker logs battlesync-app-1 -f

# Frontend logs  
docker logs battlesync-frontend-1 -f
```

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript for production
- `npm run start` - Start production server
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with demo data

**Frontend:**
- `cd frontend && npm run dev` - Start frontend development server
- `cd frontend && npm run build` - Build frontend for production
- `cd frontend && npm run lint` - Run frontend linting

## Architecture

This is a full-stack TypeScript application with:
- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React 18+ with TypeScript, TailwindCSS, Vite
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Real-time**: WebSockets for live battle tracking
- **Authentication**: JWT tokens with role-based access control
- **API**: RESTful endpoints + WebSocket events
- **Deployment**: Docker Compose ready

## Project Structure

```
src/                    # Backend source code
├── controllers/        # Express route handlers
├── middleware/         # Authentication, validation, logging
├── routes/            # API route definitions
├── services/          # Business logic layer
├── types/             # TypeScript type definitions
├── utils/             # Utility functions and helpers
└── index.ts           # Application entry point

frontend/              # React frontend application
├── src/
│   ├── components/    # React components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API client and utilities
│   ├── types/         # Frontend TypeScript types
│   └── App.tsx        # Main application component
└── package.json

prisma/
├── schema.prisma      # Database schema
└── seed.ts            # Database seeding

docker/
└── init-db.sql        # Database initialization
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Gaming Groups
- `GET /api/groups` - Get user's gaming groups
- `POST /api/groups` - Create gaming group
- `GET /api/groups/:id` - Get specific group
- `POST /api/groups/join` - Join group with invite code

### Campaigns
- `GET /api/groups/:groupId/campaigns` - Get group's campaigns
- `POST /api/groups/:groupId/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get specific campaign
- `PUT /api/campaigns/:id` - Update campaign

### Missions
- `GET /api/campaigns/:campaignId/missions` - Get campaign missions
- `POST /api/campaigns/:campaignId/missions` - Create mission
- `GET /api/missions/:id` - Get specific mission

### WebSocket Events
- `connection` - Client connects to real-time system
- `join-room` - Join specific room (group/campaign/battle)
- `leave-room` - Leave room
- `notification` - Real-time notifications

## Known Issues

### Army Management System
The army management system is implemented but currently disabled due to TypeScript compilation errors:
- Express router type compatibility issues with `AuthenticatedRequest`
- Missing axios dependency in Docker environment
- Service export/import inconsistencies

**Temporary workaround**: Army routes are disabled in `/src/routes/index.ts`

## Next Steps

### High Priority
1. **Fix Army Management Compilation Errors**
   - Resolve TypeScript router compatibility 
   - Add missing dependencies to Docker
   - Test complete army workflow

2. **Battle Tracking System**
   - Real-time WebSocket battle rooms
   - Turn-based state management
   - Mobile-optimized battle UI

### Medium Priority  
3. **Army Validation Middleware**
   - Joi schema validation for army endpoints
   - One Page Rules validation logic
   - Points limit enforcement

4. **Production Features**
   - SSL/HTTPS configuration
   - Environment-based configuration
   - Backup and monitoring setup

### Low Priority
5. **Enhanced Features**
   - Campaign statistics and reporting
   - Advanced mission templates
   - User profile management
   - Mobile app (React Native)

## Contributing

1. Read the architecture documentation in `CLAUDE.md`
2. Check current todos in the codebase
3. Follow TypeScript best practices
4. Ensure all tests pass before submitting
5. Update documentation for new features

## Deployment

The application is designed for self-hosted deployment using Docker Compose. See the docker-compose.yml for the complete production-ready setup including database, backend API, and frontend.

For production deployment:
1. Update environment variables in `.env`
2. Configure SSL certificates
3. Set up database backups
4. Monitor application logs

## Support

This is a self-hosted application designed for tabletop gaming groups. For technical issues:
1. Check Docker container logs
2. Verify database connectivity
3. Review API endpoint documentation
4. Check WebSocket connection status