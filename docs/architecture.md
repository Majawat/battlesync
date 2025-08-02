# Architecture

BattleSync v2 technical architecture and design decisions.

## Tech Stack

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js with TypeScript
- **Database:** SQLite (simple, no ORM)
- **Testing:** Jest + ts-jest + Supertest
- **Containerization:** Docker + Docker Compose

### Frontend *(Planned)*
- **Framework:** React + Vite
- **Styling:** TailwindCSS (mobile-first)
- **State Management:** React Context/Hooks
- **Build Tool:** Vite

## Architecture Principles

### Simplicity First
- **Maximum 5 database tables** (v1 had 17)
- **No complex ORM** - Direct SQLite queries
- **Minimal dependencies** - Only what's needed
- **Clear separation of concerns**

### Performance
- **Fast startup** - Optimized Docker images
- **Efficient queries** - Direct SQL, no N+1 problems
- **Minimal overhead** - TypeScript compiled to JS
- **Health monitoring** - Built-in health checks

### Developer Experience
- **Strict TypeScript** - Full type safety
- **Hot reloading** - Fast development cycle
- **Comprehensive tests** - High confidence deployments
- **Clear documentation** - Easy onboarding

## Database Schema *(Planned)*

### Core Tables (5 max)

```sql
-- User authentication
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Imported army data
CREATE TABLE armies (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  faction TEXT NOT NULL,
  armyforge_data JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Battle sessions
CREATE TABLE battles (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, completed, abandoned
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Army participation in battles
CREATE TABLE battle_participants (
  id INTEGER PRIMARY KEY,
  battle_id INTEGER REFERENCES battles(id),
  army_id INTEGER REFERENCES armies(id),
  player_name TEXT,
  is_winner BOOLEAN DEFAULT NULL
);

-- Battle events (damage, undo, etc.)
CREATE TABLE battle_events (
  id INTEGER PRIMARY KEY,
  battle_id INTEGER REFERENCES battles(id),
  participant_id INTEGER REFERENCES battle_participants(id),
  event_type TEXT NOT NULL, -- damage, heal, destroy, undo
  event_data JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Architecture

### RESTful Design
```
GET    /api/battles           # List battles
POST   /api/battles           # Create battle
GET    /api/battles/:id       # Get battle
POST   /api/battles/:id/events # Add battle event
DELETE /api/battles/:id/events/:eventId # Undo event
```

### Error Handling
- Consistent error response format
- Proper HTTP status codes
- Detailed error messages for development
- Sanitized messages for production

### Validation
- Request validation with TypeScript interfaces
- Database constraint validation
- Business logic validation

## Docker Architecture

### Multi-stage Production Build
```dockerfile
# Stage 1: Build
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ tsconfig.json ./
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=0 /app/dist ./dist
EXPOSE 4019
CMD ["npm", "start"]
```

### Development Container
- Volume mounts for hot reloading
- All dev dependencies included
- Same port for consistency

## Security Considerations

### Current
- **No secrets in code** - Use environment variables
- **Input validation** - TypeScript interfaces
- **Health checks** - Monitor system status

### Planned
- **Authentication** - JWT tokens
- **Rate limiting** - Prevent abuse
- **Input sanitization** - SQL injection prevention
- **CORS configuration** - Secure cross-origin requests

## Deployment Strategy

### Development
```bash
npm run docker:dev    # Hot reloading
npm run dev          # Direct Node.js
```

### Production
```bash
npm run docker:up    # Docker Compose
npm run docker:build && npm run docker:run  # Single container
```

## Monitoring

### Health Checks
- **Application:** `/health` endpoint
- **Docker:** Built-in health check
- **Response time:** Sub-100ms target

### Logging *(Planned)*
- Structured JSON logs
- Request/response logging
- Error tracking
- Performance metrics

## Migration from v1

### What We Kept
- Core battle tracking concept
- OPR game focus
- Mobile-first thinking

### What We Simplified
- **17 → 5 tables** - Massive reduction
- **Complex ORM → Direct SQL** - Better performance
- **170+ files → ~20 files** - Easier maintenance
- **Multiple features → Core only** - Focused scope

---

*Architecture evolves with the project while maintaining simplicity.*