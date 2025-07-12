# BattleSync

A self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with comprehensive army management and ArmyForge integration.

## Current Status

🟢 **IMPLEMENTED & TESTED**
- ✅ JWT Authentication system with role-based access control
- ✅ Gaming Groups management with invite codes
- ✅ Campaign management with configurable settings
- ✅ Mission system with objectives, special rules, and terrain
- ✅ Complete Army management system with ArmyForge integration
- ✅ Real ArmyForge API integration with intelligent faction mapping
- ✅ WebSocket real-time communication infrastructure
- ✅ React frontend with dark mode UI and responsive design
- ✅ PostgreSQL database with Prisma ORM
- ✅ Docker development environment
- ✅ RESTful API with comprehensive CRUD operations
- ✅ End-to-end army import and campaign association workflow

🟢 **BATTLE SYSTEM OPERATIONAL**
- ✅ Battle creation workflow with mission integration
- ✅ Real-time battle dashboard with WebSocket communication
- ✅ Battle state management and live updates
- ✅ Tablet-optimized battle interface

🟡 **IN PROGRESS**
- ⚠️ Advanced battle tracking features (unit cards, damage system)
- ⚠️ Army validation middleware enhancements

🔴 **PLANNED**
- ❌ Advanced battle analytics and reporting
- ❌ Production deployment configuration with SSL

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
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Gaming Groups
- `GET /api/groups` - Get user's gaming groups
- `POST /api/groups` - Create gaming group
- `GET /api/groups/:id` - Get specific group
- `POST /api/groups/join` - Join group with invite code
- `POST /api/groups/:id/leave` - Leave gaming group
- `POST /api/groups/:id/regenerate-invite` - Regenerate invite code

### Campaigns
- `GET /api/groups/:groupId/campaigns` - Get group's campaigns
- `POST /api/groups/:groupId/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get specific campaign
- `PUT /api/campaigns/:id` - Update campaign
- `POST /api/campaigns/:id/join` - Join campaign
- `POST /api/campaigns/:id/leave` - Leave campaign

### Missions
- `GET /api/campaigns/:campaignId/missions` - Get campaign missions
- `POST /api/campaigns/:campaignId/missions` - Create mission
- `GET /api/missions/:id` - Get specific mission
- `PUT /api/missions/:id` - Update mission
- `DELETE /api/missions/:id` - Delete mission

### Army Management
- `POST /api/armies/import` - Import army from ArmyForge
- `GET /api/armies` - Get user's armies (with campaign filtering)
- `GET /api/armies/:id` - Get specific army details
- `PUT /api/armies/:id/sync` - Sync army with ArmyForge
- `PUT /api/armies/:id/customizations` - Update army customizations
- `DELETE /api/armies/:id` - Delete army
- `GET /api/armies/armyforge/status` - Check ArmyForge API status

### Battle Management
- `GET /api/missions/:missionId/battles` - Get mission battles
- `POST /api/missions/:missionId/battles` - Create battle from mission
- `GET /api/battles/:id` - Get battle details and state
- `PUT /api/battles/:id` - Update battle state
- `POST /api/battles/:id/join` - Join battle as participant
- `DELETE /api/battles/:id` - Delete battle (admin only)

### WebSocket Events
- `connection` - Client connects to real-time system
- `join-room` - Join specific room (group/campaign/battle)
- `leave-room` - Leave room
- `notification` - Real-time notifications
- `battle-update` - Live battle state updates
- `heartbeat` - Connection health monitoring

## Key Features

### ✅ Complete Army Management
- **ArmyForge Integration**: Import armies directly from ArmyForge using army IDs
- **Intelligent Faction Mapping**: Automatically resolves game system codes to meaningful faction names
- **Campaign Association**: Link armies to specific campaigns with validation
- **Real-time Sync**: Keep armies updated with ArmyForge changes
- **Detailed Army Views**: View units, weapons, special rules, and army statistics

### ✅ Advanced Campaign System
- **Flexible Settings**: Configure points limits, experience systems, and game rules
- **Mission Management**: Create detailed missions with objectives, special rules, and terrain
- **Member Management**: Invite players and track campaign participation
- **Experience Tracking**: Built-in system for tracking army experience and progression

### ✅ Real-time Features
- **WebSocket Communication**: Live updates for battle tracking and notifications
- **Responsive UI**: Modern React interface optimized for desktop and mobile
- **Dark Mode**: Full dark theme support with system preference detection

## Next Steps

### High Priority
1. **Enhanced Battle Features**
   - Individual unit tracking and damage system
   - Turn-based action management
   - Battle result recording and experience updates
   - Unit status effects and modifiers

2. **Enhanced Army Features**
   - Battle honors and veteran upgrades
   - Army customization tracking
   - Comprehensive army validation
   - Unit conversion from ArmyForge format

### Medium Priority  
3. **Advanced Analytics**
   - Campaign statistics and reporting
   - Player performance tracking
   - Army usage analytics

4. **Production Features**
   - SSL/HTTPS configuration
   - Automated backup systems
   - Performance monitoring

### Low Priority
5. **Extended Integrations**
   - Additional army list providers
   - Discord bot integration
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