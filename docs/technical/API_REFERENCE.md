# BattleSync API Reference

This document provides a comprehensive reference for all BattleSync API endpoints.

## Base URL

- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All protected endpoints require a JWT Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes. Use the refresh token to obtain new access tokens.

## Response Format

All API responses follow this format:

```json
{
  "status": "success" | "error",
  "data": <response_data>,
  "message": "Optional message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string", 
  "password": "string"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "string"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "string",
  "preferences": {}
}
```

### Gaming Groups

#### Get User's Groups
```http
GET /api/groups
Authorization: Bearer <token>
```

#### Create Group
```http
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string"
}
```

#### Get Specific Group
```http
GET /api/groups/:id
Authorization: Bearer <token>
```

#### Join Group
```http
POST /api/groups/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "inviteCode": "string"
}
```

#### Leave Group
```http
POST /api/groups/:id/leave
Authorization: Bearer <token>
```

#### Regenerate Invite Code
```http
POST /api/groups/:id/regenerate-invite
Authorization: Bearer <token>
```

### Campaigns

#### Get Group's Campaigns
```http
GET /api/groups/:groupId/campaigns
Authorization: Bearer <token>
```

#### Create Campaign
```http
POST /api/groups/:groupId/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "settings": {
    "gameSystem": "grimdark-future" | "age-of-fantasy" | "firefight" | "warfleets-ftl",
    "pointsLimit": "number (100-10000)",
    "experiencePerWin": "number",
    "experiencePerLoss": "number", 
    "experiencePerKill": "number",
    "allowMultipleArmies": "boolean",
    "requireArmyForgeIntegration": "boolean",
    "customRules": "string[]"
  }
}
```

#### Get Campaign
```http
GET /api/campaigns/:id
Authorization: Bearer <token>
```

#### Update Campaign
```http
PUT /api/campaigns/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "settings": { /* same as create */ }
}
```

#### Join Campaign
```http
POST /api/campaigns/:id/join
Authorization: Bearer <token>
```

#### Leave Campaign
```http
POST /api/campaigns/:id/leave
Authorization: Bearer <token>
```

### Missions

#### Get Campaign Missions
```http
GET /api/campaigns/:campaignId/missions
Authorization: Bearer <token>
```

#### Create Mission
```http
POST /api/campaigns/:campaignId/missions
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "objectives": "string[]",
  "specialRules": "string[]",
  "terrain": "string",
  "pointsLimit": "number",
  "timeLimit": "number"
}
```

#### Get Mission
```http
GET /api/missions/:id
Authorization: Bearer <token>
```

#### Update Mission
```http
PUT /api/missions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "objectives": "string[]",
  "specialRules": "string[]",
  "terrain": "string"
}
```

#### Delete Mission
```http
DELETE /api/missions/:id
Authorization: Bearer <token>
```

### Army Management

#### Import Army from ArmyForge
```http
POST /api/armies/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "armyForgeId": "string",
  "campaignId": "string (optional)",
  "customName": "string (optional)"
}
```

#### Get User's Armies
```http
GET /api/armies
Authorization: Bearer <token>

Query Parameters:
- campaignId: string (optional)
- faction: string (optional)
- gameSystem: string (optional)
- sortBy: "name" | "faction" | "points" | "lastModified"
- sortOrder: "asc" | "desc"
- limit: number
- offset: number
```

#### Get Army Details
```http
GET /api/armies/:id
Authorization: Bearer <token>
```

#### Sync Army with ArmyForge
```http
PUT /api/armies/:id/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "forceSync": "boolean (optional)",
  "preserveCustomizations": "boolean (optional)"
}
```

#### Update Army Customizations
```http
PUT /api/armies/:id/customizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string (optional)",
  "notes": "string (optional)",
  "tags": "string[] (optional)"
}
```

#### Delete Army
```http
DELETE /api/armies/:id?force=true
Authorization: Bearer <token>

Query Parameters:
- force: boolean (optional) - Force delete even if army has battle participants
```

#### Update Army Campaign Association
```http
PUT /api/armies/:id/campaign
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaignId": "string | null"
}
```

#### Convert Army to Battle Format
```http
GET /api/armies/:id/convert
Authorization: Bearer <token>
```

#### Add Battle Honor
```http
POST /api/armies/:id/battle-honors
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "effect": "string"
}
```

#### Add Veteran Upgrade
```http
POST /api/armies/:id/veteran-upgrades
Authorization: Bearer <token>
Content-Type: application/json

{
  "unitId": "string",
  "unitName": "string", 
  "upgradeName": "string",
  "upgradeEffect": "string",
  "experienceCost": "number"
}
```

#### Get Army Statistics
```http
GET /api/armies/statistics
Authorization: Bearer <token>
```

#### Validate Army Composition
```http
GET /api/armies/:id/validate
Authorization: Bearer <token>
```

#### Get ArmyForge Integration Status
```http
GET /api/armies/armyforge/status
Authorization: Bearer <token>
```

#### Clear ArmyForge Cache
```http
DELETE /api/armies/armyforge/cache?armyId=:id
Authorization: Bearer <token>
```

### Battle Management

#### Get Mission's Battles
```http
GET /api/missions/:missionId/battles
Authorization: Bearer <token>
```

#### Create Battle from Mission
```http
POST /api/missions/:missionId/battles
Authorization: Bearer <token>
Content-Type: application/json

{
  "participants": [
    {
      "userId": "string",
      "armyId": "string"
    }
  ]
}
```

#### Get Battle Details
```http
GET /api/battles/:id
Authorization: Bearer <token>
```

#### Update Battle State
```http
PUT /api/battles/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "phase": "GAME_SETUP" | "DEPLOYMENT" | "BATTLE_ROUNDS" | "GAME_END",
  "currentRound": "number",
  "status": "SETUP" | "ACTIVE" | "COMPLETED"
}
```

#### Join Battle as Participant
```http
POST /api/battles/:id/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "armyId": "string"
}
```

#### Delete Battle
```http
DELETE /api/battles/:id
Authorization: Bearer <token>
```

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001');

// Authenticate
ws.send(JSON.stringify({
  type: 'authenticate',
  token: 'your_jwt_token'
}));
```

### Room Management
```javascript
// Join a room
ws.send(JSON.stringify({
  type: 'join-room',
  roomId: 'battles:battle-id'
}));

// Leave a room
ws.send(JSON.stringify({
  type: 'leave-room', 
  roomId: 'battles:battle-id'
}));
```

### Battle Events
- `battle_created` - Battle was created
- `battle_updated` - Battle state changed
- `damage_applied` - Damage applied to unit
- `phase_changed` - Battle phase transition
- `hero_joined` - Hero joined unit
- `battle_completed` - Battle finished

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error
- `503` - Service Unavailable

## Rate Limiting

- **General API**: 100 requests per minute per user
- **Authentication**: 10 requests per minute per IP
- **ArmyForge Sync**: 30 requests per minute per user

## Data Models

For detailed information about data structures and TypeScript interfaces, see [DATA_MODELS.md](./DATA_MODELS.md).