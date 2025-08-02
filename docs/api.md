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
  "version": "2.4.0"
}
```

#### `GET /health`
Health check endpoint with system status.

**Response:**
```json
{
  "status": "ok",
  "version": "2.4.0",
  "timestamp": "2025-08-02T13:22:21.393Z"
}
```

**Status Codes:**
- `200` - System healthy
- `500` - System error

## Planned Endpoints

### Battle Management *(Coming in Phase 1)*

#### `POST /battles`
Create a new battle session.

#### `GET /battles`
List user's battles.

#### `GET /battles/:id`
Get specific battle details.

#### `POST /battles/:id/events`
Add battle event (damage, etc.).

#### `DELETE /battles/:id/events/:eventId`
Undo battle event.

### Army Management *(Coming in Phase 1)*

#### `POST /armies/import`
Import army from ArmyForge.

#### `GET /armies`
List user's armies.

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
X-API-Version: 2.4.0
```

---

*API documentation is updated with each release.*