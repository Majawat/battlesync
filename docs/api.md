# API Reference

BattleSync v2 REST API documentation.

## Base URL

```
http://localhost:4019
```

## Authentication

*Authentication will be implemented in Phase 2.*

## Endpoints

### System Endpoints

#### `GET /`
Get API information and version.

**Response:**
```json
{
  "message": "BattleSync v2 API",
  "version": "2.9.0"
}
```

#### `GET /health`
Health check endpoint with system status.

**Response:**
```json
{
  "status": "ok",
  "version": "2.9.0",
  "timestamp": "2025-08-07T13:22:21.393Z"
}
```

**Status Codes:**
- `200` - System healthy
- `500` - System error

### Army Management

#### `POST /api/armies/import`
Import army from ArmyForge by share ID.

**Request Body:**
```json
{
  "armyForgeId": "IJ1JM_m-jmka"
}
```

**Response:**
```json
{
  "success": true,
  "army": {
    "id": "1",
    "armyforge_id": "IJ1JM_m-jmka",
    "name": "Dev Testerson's Bullshit Army",
    "description": "An army full of bullshit units.",
    "validation_errors": ["May not bring any single unit worth more than 35% of total points (1045pts)."],
    "points_limit": 2997,
    "list_points": 3075,
    "model_count": 44,
    "activation_count": 8,
    "game_system": "gf",
    "campaign_mode": true,
    "units": [...],
    ...
  }
}
```

**Status Codes:**
- `200` - Army imported successfully
- `400` - Missing armyForgeId
- `404` - ArmyForge ID not found
- `500` - Server error

#### `GET /api/armies`
List all stored armies.

**Response:**
```json
{
  "success": true,
  "armies": [
    {
      "id": 1,
      "armyforge_id": "IJ1JM_m-jmka",
      "name": "Dev Testerson's Bullshit Army",
      "description": "An army full of bullshit units.",
      "validation_errors": ["May not bring any single unit worth more than 35% of total points (1045pts)."],
      "points_limit": 2997,
      "list_points": 3075,
      "model_count": 44,
      "activation_count": 8,
      "created_at": "2025-08-07T13:22:21.393Z",
      "updated_at": "2025-08-07T13:22:21.393Z"
    }
  ]
}
```

#### `GET /api/armies/:id`
Get specific army with full details including units, sub-units, and models.

**Response:**
```json
{
  "success": true,
  "army": {
    "id": "1",
    "name": "Dev Testerson's Bullshit Army",
    "units": [
      {
        "id": "1",
        "name": "Combined Grunts",
        "is_combined": true,
        "sub_units": [...],
        ...
      }
    ],
    ...
  }
}
```

**Status Codes:**
- `200` - Army found
- `400` - Invalid army ID  
- `404` - Army not found
- `500` - Server error

## Planned Endpoints

### Battle Management *(Coming Soon)*

#### `POST /api/battles`
Create a new battle session with selected armies.

#### `GET /api/battles`
List user's battle sessions.

#### `GET /api/battles/:id`
Get specific battle details with current state.

#### `POST /api/battles/:id/events`
Add battle event (damage, morale test, etc.).

#### `DELETE /api/battles/:id/events/:eventId`
Undo battle event for mistake correction.

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-08-02T13:22:21.393Z"
}
```

## Rate Limiting

*Rate limiting will be implemented in Phase 2.*

## Versioning

API version is included in response headers:
```
X-API-Version: 2.6.1
```

---

*API documentation is updated with each release.*