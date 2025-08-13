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
  "version": "2.10.0"
}
```

#### `GET /health`
Health check endpoint with system status.

**Response:**
```json
{
  "status": "ok",
  "version": "2.10.0",
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

## Battle Management

### Battle Creation & Management

#### `POST /api/battles`
Create a new battle session.

**Request Body:**
```json
{
  "name": "Battle Name",
  "description": "Optional battle description", 
  "mission_type": "skirmish",
  "has_command_points": true,
  "command_point_mode": "fixed",
  "points_limit": 2000
}
```

**Response:**
```json
{
  "success": true,
  "battle": {
    "id": 1,
    "name": "Battle Name",
    "status": "setup",
    "current_round": 0,
    "created_at": "2025-08-10T12:00:00Z"
  }
}
```

#### `GET /api/battles`
List all battle sessions.

**Response:**
```json
{
  "success": true,
  "battles": [
    {
      "id": 1,
      "name": "Battle Name",
      "status": "setup",
      "participants": []
    }
  ]
}
```

#### `GET /api/battles/:id`
Get specific battle details with participants.

**Response:**
```json
{
  "success": true,
  "battle": {
    "id": 1,
    "name": "Battle Name",
    "status": "setup",
    "participants": [
      {
        "id": 1,
        "player_name": "Player 1",
        "army_id": 1
      }
    ]
  }
}
```

#### `POST /api/battles/:id/participants`
Add participant to battle.

**Request Body:**
```json
{
  "army_id": 1,
  "player_name": "Player 1",
  "doctrine": "aggressive"
}
```

**Response:**
```json
{
  "success": true,
  "participant": {
    "id": 1,
    "battle_id": 1,
    "army_id": 1,
    "player_name": "Player 1",
    "doctrine": "aggressive"
  }
}
```

### BattleAura Firmware Management

#### `GET /api/battleaura/firmware/latest`
Get the latest available firmware version.

**Response:**
```json
{
  "version": "0.16.7",
  "download_url": "https://battlesync.me/firmware/battleaura-0.16.7.bin",
  "changelog": "Fix artifact filename typo",
  "released": "2025-01-15T10:30:00Z",
  "file_size": 935568
}
```

**Error Response (404 when no firmware exists):**
```json
{
  "version": "",
  "download_url": "",
  "changelog": "No firmware available",
  "released": "",
  "file_size": 0
}
```

#### `GET /api/battleaura/firmware`
List all available firmware versions in reverse chronological order.

**Response:**
```json
{
  "success": true,
  "firmware": [
    {
      "version": "0.16.7",
      "download_url": "https://battlesync.me/firmware/battleaura-0.16.7.bin",
      "changelog": "Fix artifact filename typo",
      "released": "2025-01-15T10:30:00Z",
      "file_size": 935568
    },
    {
      "version": "0.16.6",
      "download_url": "https://battlesync.me/firmware/battleaura-0.16.6.bin", 
      "changelog": "Performance improvements",
      "released": "2025-01-14T10:30:00Z",
      "file_size": 934512
    }
  ]
}
```

#### `GET /api/battleaura/firmware/:version`
Get information about a specific firmware version.

**Parameters:**
- `version` (string): Semantic version (e.g., "1.2.3")

**Response:**
```json
{
  "success": true,
  "firmware": {
    "version": "0.16.6",
    "download_url": "https://battlesync.me/firmware/battleaura-0.16.6.bin",
    "changelog": "Performance improvements",
    "released": "2025-01-14T10:30:00Z",
    "file_size": 934512
  }
}
```

**Error Responses:**
```json
// 404 - Version not found
{
  "success": false,
  "error": "Firmware version 1.2.3 not found"
}

// 400 - Invalid version format
{
  "success": false,
  "error": "Invalid version format. Expected semantic version (e.g., 1.2.3)"
}
```

#### `POST /api/firmware/upload` 
Upload new firmware binary (intended for GitHub Actions CI/CD).

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` (binary): The .bin firmware file
- `version` (string): Semantic version (e.g., "1.2.3" or "v1.2.3")
- `changelog` (string, optional): Description of changes

**Example using curl:**
```bash
curl -F "file=@firmware.bin" \
     -F "version=v0.16.7" \
     -F "changelog=Fix critical bug in LED handling" \
     https://battlesync.me/api/firmware/upload
```

**Response:**
```json
{
  "success": true,
  "firmware": {
    "version": "0.16.7",
    "download_url": "https://battlesync.me/firmware/battleaura-0.16.7.bin",
    "changelog": "Fix critical bug in LED handling", 
    "released": "2025-01-15T10:30:00Z",
    "file_size": 935568
  }
}
```

**Error Responses:**
```json
// 400 - No file uploaded
{
  "success": false,
  "error": "No file uploaded"
}

// 400 - Missing version
{
  "success": false,
  "error": "Version is required"
}

// 400 - Invalid version format
{
  "success": false,
  "error": "Version must be in semantic version format (e.g., 1.2.3)"
}

// 409 - Version already exists
{
  "success": false,
  "error": "Version 1.2.3 already exists"
}
```

#### `GET /firmware/:filename`
Download firmware binary files directly.

**Response Headers:**
- `Content-Type: application/octet-stream`
- `Content-Disposition: attachment; filename="battleaura-1.2.3.bin"`

### Unit Battle State Tracking

#### `POST /api/battles/:id/start`
Start battle and initialize unit states for all participating armies.

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "battle": {
    "id": 1,
    "status": "deployment"
  },
  "unit_states": [
    {
      "id": 1,
      "battle_id": 1,
      "army_id": 1,
      "unit_path": "units.0",
      "current_health": 12,
      "max_health": 12,
      "status": "normal",
      "is_fatigued": false,
      "spell_tokens": 0,
      "activated_this_round": false,
      "participated_in_melee": false,
      "deployment_status": "standard"
    }
  ]
}
```

#### `GET /api/battles/:id/units`
Get all unit battle states for a battle.

**Response:**
```json
{
  "success": true,
  "unit_states": [
    {
      "id": 1,
      "battle_id": 1,
      "army_id": 1,
      "unit_path": "units.0",
      "current_health": 8,
      "max_health": 12,
      "status": "shaken",
      "is_fatigued": true,
      "spell_tokens": 2,
      "activated_this_round": true,
      "participated_in_melee": false,
      "deployment_status": "standard",
      "current_action": "advance"
    }
  ]
}
```

#### `PATCH /api/battles/:battleId/units/:unitStateId`
Update individual unit state properties.

**Request Body (all fields optional):**
```json
{
  "current_health": 8,
  "status": "shaken",
  "is_fatigued": true,
  "spell_tokens": 2,
  "activated_this_round": true,
  "participated_in_melee": false,
  "deployment_status": "standard",
  "current_action": "advance",
  "position_data": {"x": 10, "y": 15, "facing": "north"},
  "status_effects": ["poison", "stunned"]
}
```

**Response:**
```json
{
  "success": true,
  "unit_state": {
    "id": 1,
    "current_health": 8,
    "status": "shaken",
    "is_fatigued": true,
    "spell_tokens": 2,
    "updated_at": "2025-08-10T12:30:00Z"
  }
}
```

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