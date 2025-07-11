# Technical Architecture

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Real-time**: WebSockets (ws library or Socket.io)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database ORM**: Prisma or TypeORM
- **API Documentation**: OpenAPI/Swagger

### Database
- **Primary**: PostgreSQL 15+
- **Justification**: 
  - Excellent concurrent write performance for real-time battles
  - Superior JSON support for ArmyForge data storage
  - Row-level locking prevents data corruption
  - ACID compliance for battle state consistency

### Frontend
- **Framework**: React 18+ with TypeScript
- **UI Library**: Material-UI or Chakra UI (mobile-first components)
- **State Management**: Redux Toolkit or Zustand
- **Real-time**: WebSocket client with reconnection handling
- **PWA**: Service workers for offline capability
- **Build Tool**: Vite

### Deployment
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (included in compose)
- **SSL**: Let's Encrypt integration
- **Environment**: Home server optimized

## System Architecture

### High-Level Structure
```
[Mobile Client] <---> [Nginx Proxy] <---> [Express API] <---> [PostgreSQL]
                                              |
                                        [WebSocket Server]
                                              |
                                        [ArmyForge API]
```

### Real-time Architecture
```
Battle Session Components:
- Battle State Manager (in-memory + DB persistence)
- WebSocket Room per battle
- Conflict Resolution Engine
- State Synchronization Service
```

## Database Design

### Core Tables
- **users** (id, username, password_hash, role, created_at)
- **gaming_groups** (id, name, description, owner_id, created_at)
- **group_memberships** (user_id, group_id, role, joined_at)
- **campaigns** (id, group_id, name, description, settings, created_by)
- **campaign_memberships** (user_id, campaign_id, army_data, joined_at)
- **battles** (id, campaign_id, status, participants, created_at)
- **battle_events** (id, battle_id, event_type, data, timestamp, user_id)

### JSON Storage
- **army_data**: Store ArmyForge imports as JSONB
- **battle_state**: Current unit status, wounds, kills
- **campaign_settings**: Rules, missions, point limits
- **mission_definitions**: Custom mission objectives and rules

### Indexing Strategy
- Primary keys and foreign keys (automatic)
- JSONB GIN indexes for army data queries
- Composite indexes for battle events by timestamp
- User lookup indexes for authentication

## API Design

### RESTful Endpoints
```
Authentication:
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh

Gaming Groups:
GET    /api/groups
POST   /api/groups
GET    /api/groups/:id
PUT    /api/groups/:id
DELETE /api/groups/:id

Campaigns:
GET    /api/groups/:groupId/campaigns
POST   /api/groups/:groupId/campaigns
GET    /api/campaigns/:id
PUT    /api/campaigns/:id

Armies:
GET    /api/campaigns/:campaignId/armies
POST   /api/armies/import-from-armyforge
PUT    /api/armies/:id/sync

Battles:
GET    /api/campaigns/:campaignId/battles
POST   /api/battles
GET    /api/battles/:id
```

### WebSocket Events
```
Connection:
- join_battle
- leave_battle
- reconnect_battle

Battle Updates:
- apply_damage
- mark_kill
- update_unit_status
- sync_battle_state

System Events:
- battle_state_changed
- player_joined
- player_disconnected
- error_occurred
```

## Real-time Requirements

### WebSocket Room Management
- One room per active battle
- Automatic cleanup of empty rooms
- Graceful handling of disconnections
- State persistence during network issues

### Conflict Resolution
- **Optimistic updates**: Apply changes immediately, resolve conflicts later
- **Last-write-wins**: For simple status updates
- **Additive operations**: For damage and kills (never subtract)
- **Admin override**: Group admins can force state resolution

### State Synchronization
```javascript
Battle State Structure:
{
  battleId: string,
  status: 'setup' | 'active' | 'completed',
  participants: Array<PlayerId>,
  units: {
    [unitId]: {
      ownerId: PlayerId,
      currentHp: number,
      maxHp: number,
      status: 'active' | 'shaken' | 'routed',
      kills: number,
      lastModified: timestamp
    }
  },
  events: Array<BattleEvent>
}
```

## Security Considerations

### Authentication
- JWT tokens with short expiry (15 minutes)
- Refresh tokens for persistent sessions
- Rate limiting on authentication endpoints
- Password strength requirements

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Gaming group isolation
- Admin override capabilities

### API Security
- Input validation and sanitization
- CORS configuration for known origins
- Request rate limiting
- SQL injection prevention (parameterized queries)

### WebSocket Security
- Token-based authentication for connections
- Room-based authorization
- Message validation and sanitization
- Connection rate limiting

## Performance Considerations

### Database Optimization
- Connection pooling
- Query optimization with EXPLAIN ANALYZE
- Appropriate indexing strategy
- Regular VACUUM and ANALYZE

### Real-time Performance
- Message batching for rapid updates
- Client-side prediction for responsiveness
- Efficient JSON serialization
- WebSocket connection pooling

### Caching Strategy
- Redis for session storage (if needed at scale)
- In-memory caching for active battles
- Browser caching for static assets
- ArmyForge API response caching

## Deployment Architecture

### Docker Compose Structure
```yaml
services:
  nginx:
    - SSL termination
    - Static asset serving
    - Request proxying
  
  api:
    - Express application
    - WebSocket server
    - Health checks
  
  postgres:
    - Data persistence
    - Automated backups
    - Connection limits
  
  redis: (optional)
    - Session storage
    - Battle state caching
```

### Environment Configuration
- Development vs production settings
- Database connection strings
- ArmyForge API configuration
- JWT secret management
- SSL certificate paths

### Health Monitoring
- API endpoint health checks
- Database connection monitoring
- WebSocket connection tracking
- Error logging and alerting

## Scalability Considerations

### Current Scale Target
- 10 gaming groups maximum
- 10 players per campaign maximum
- 5 concurrent battles maximum
- Optimized for home server deployment

### Future Scale Paths
- Horizontal scaling with load balancers
- Database read replicas
- Redis cluster for session management
- Microservice decomposition if needed