# BattleSync

A self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with real-time battle tracking.

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

3. **Initialize database**:
```bash
# The database will be automatically created when the app starts
# Run migrations and seed data
npm run db:migrate
npm run db:seed
```

4. **Access the application**:
- API: http://localhost:3001
- Health check: http://localhost:3001/health
- Database: PostgreSQL on localhost:5433

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (recommended)

### Local Development Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Start PostgreSQL** (if not using Docker):
```bash
# Using Docker
docker run -d \
  --name battlesync-db \
  -e POSTGRES_DB=battlesync \
  -e POSTGRES_USER=battlesync \
  -e POSTGRES_PASSWORD=battlesync \
  -p 5433:5432 \
  postgres:15-alpine
```

3. **Setup database**:
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

4. **Start development server**:
```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run linting
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with demo data

### Demo Credentials

After seeding, you can use these credentials:
- Username: `admin`
- Password: `admin123`
- Gaming group invite code: `DEMO2024`

## Architecture

This is a Node.js/Express application with:
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSockets for battle tracking
- **Authentication**: JWT tokens
- **API**: RESTful endpoints + WebSocket events
- **Deployment**: Docker Compose ready

## Project Structure

```
src/
├── controllers/     # Route handlers
├── middleware/      # Express middleware
├── routes/         # Route definitions
├── services/       # Business logic
├── types/          # TypeScript types
├── utils/          # Utility functions
└── index.ts        # Application entry point

prisma/
├── schema.prisma   # Database schema
└── seed.ts         # Database seeding

docker/
└── init-db.sql     # Database initialization
```

## Next Steps

1. Implement authentication routes
2. Add campaign management endpoints
3. Build ArmyForge integration
4. Create real-time battle system
5. Add frontend application

See the project documentation for detailed implementation guidance.