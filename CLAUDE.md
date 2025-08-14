# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BattleSync v2 is a clean rewrite of an OPR (One Page Rules) battle tracker application, focused on simplicity and core functionality. This is a fresh start from a more complex v1 (170+ files) that has been archived.

## Architecture Goals

- **Simple**: Minimuze complexity as needed
- **Fast**: Express + SQLite + React stack with no complex ORM
- **Focused**: Battle tracking only, avoiding premature features
- **Mobile**: Mobile-first design using TailwindCSS

## Current State

Complete full-stack application with TypeScript backend + React frontend. Express server with SQLite storage serves React UI in production mode (single port deployment). Comprehensive army import system, battle management, and unit state tracking. ArmyProcessor handles complex OPR unit merging (Combined/Joined units) with campaign XP cost calculations and model-specific upgrade assignments. Battle system supports unit state tracking with health, fatigue, spell tokens, activation status, and all OPR battle mechanics. React frontend provides mobile-first UI with TailwindCSS and complete dark mode implementation optimized for battle visibility. Army detail pages show comprehensive unit breakdowns with all models, weapons, and upgrades. Production deployment serves both frontend and API from single port (4019). All code uses strict TypeScript for type safety.

## Tech Stack

- **Backend**: Node.js + Express + SQLite + TypeScript
- **Frontend**: React + Vite + React Router + dark mode system
- **Styling**: TailwindCSS v3 (mobile-first, battle-optimized dark theme)
- **Database**: SQLite (simple, no ORM)
- **Testing**: Jest + ts-jest + Supertest
- **Containerization**: Docker + Docker Compose with Node.js 20 LTS

## Development Phases

When implementing features, follow this planned progression:
1. Set up basic Node.js + Express backend
2. Set up React + Vite frontend
3. Implement authentication + army import from ArmyForge
4. Build core battle tracking functionality
5. Add polish + mobile optimization

## OPR Grimdark Future Game System

BattleSync tracks battles for One Page Rules' Grimdark Future system. Key concepts:

### Army Structure
- **Regular Units**: Standard units (single or multi-model)
- **Combined Units**: Doubled model count (appears as 2 units in ArmyForge with different stats - must carefully merge, not just double)
- **Joined Units**: Hero attached to regular unit (Hero uses unit's Defense stat until last model, damage allocated to regular models first unless Sniper rule)

### Battle Flow
1. **Setup Phase**: Determine turn order, choose doctrines
2. **Deployment Phase**: Standard, Ambush, Scout, or Transport deployment
3. **Game Rounds**: Players alternate activating units with actions:
   - Hold (stay, can shoot)
   - Advance (move 6", can shoot) 
   - Rush (move 12", no shooting)
   - Charge (move 12" into melee)
4. **End Game**: Predetermined rounds or mission conditions

### Critical Tracking Requirements
- **Unit Health**: Model casualties and wounds
- **Unit States**: Normal, Shaken (idle, can't contest objectives), Routed (removed)
- **Fatigue**: After participating in melee attack (charging or striking back), only hit on 6s until round end
- **Damage Allocation**: Regular models first, then Heroes (unless Sniper special rule)
- **Defense Stats**: Joined units use base unit's Defense until Hero is last model
- **Morale Tests**: When unit drops to half size or loses melee
- **Action History**: For undo functionality and battle reports

### ArmyForge Integration
- Import via share links (https://army-forge.onepagerules.com/share?id=...)
- API endpoint: https://army-forge.onepagerules.com/api/tts?id=...
- ArmyForge handles validation - trust their data structure
- Handle all upgrade/trait edge cases from their JSON
- Combined units appear as 2 separate units with "join to" field - merge carefully as stats differ
- Transport capacity tracking not implemented - users handle manually

## Core Features to Implement

- Import armies from ArmyForge (handle Combined/Joined unit merging)
- Track unit health, states, and battle actions
- Basic undo functionality for mistakes
- View battle history and reports

## Database Design

Keep database schema simple with maximum 5 tables. Consider tables for:
- Users/Authentication
- Armies
- Battles
- Battle Events/Actions
- Possibly army units or battle participants

## Legacy Reference

Previous v1.5.2 implementation is archived at git tag `v1.5.2-final-archive` and can be referenced for feature ideas, but avoid complexity patterns from v1.

## Development Commands

- `npm install` - Install dependencies
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server from built files (port 4019)
- `npm run dev` - Start development server with ts-node-dev
- `npm test` - Run test suite with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run typecheck` - Check TypeScript types without building

### Docker Commands

- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container directly
- `npm run docker:up` - Start with Docker Compose (production)
- `npm run docker:down` - Stop Docker Compose
- `npm run docker:dev` - Start development environment with hot reload
- `npm run docker:logs` - View container logs

## Development Workflow

**ALWAYS follow this comprehensive workflow for any changes:**

### Phase 1: Planning & Development
1. **Ask clarifying questions** before writing code if requirements are unclear
2. **Write unit tests** as you develop features (test-driven development)
3. Write/modify TypeScript code with proper types
4. Run `npm run typecheck` to ensure TypeScript compilation
5. Run `npm test` to ensure all tests pass

### Phase 1.5: Comprehensive Testing (MANDATORY)
6. **Start server using Docker** (`npm run docker:dev` for development, or `docker compose build && docker compose up -d` to restart with fresh changes)
7. **Test all basic functionality** with actual HTTP requests
8. **Verify all endpoints work** as expected with real data
9. **Test edge cases** and error conditions
10. **Confirm all features work end-to-end** before proceeding

### Phase 2: Version & Documentation Updates  
11. **Update version numbers** in package.json (single source) and tests/constants.ts (for validation)
12. **Update CHANGELOG.md** with new features, changes, and fixes:
    - Follow [Keep a Changelog](https://keepachangelog.com/) format
    - Add entries under "Unreleased" during development
    - Move to versioned section when releasing
    - Use categories: Added, Changed, Deprecated, Removed, Fixed, Security
13. **Update all documentation** to reflect current state:
   - Update CLAUDE.md with new features/endpoints
   - Update docs/api.md with new endpoints and examples
   - Update docs/features.md with completed features
   - Update README.md current status section
   - Update docs/README.md version history

### Phase 3: Codebase Maintenance
13. **Clean up technical debt**:
   - Remove temporary/test files (test_*.ts, *.tmp files)
   - Remove unused imports, variables, or functions
   - Remove outdated comments or TODO items
   - Consolidate duplicate code if found
14. **Update configuration files as needed**:
   - Add new file patterns to .gitignore if needed
   - Update .dockerignore for new file types
   - Update tsconfig.json if new paths added

### Phase 4: Final Verification & Commit
15. **Final checks**:
    - Run `npm run typecheck` again after all changes
    - Run `npm test` to ensure all tests still pass
    - Verify documentation accuracy matches implementation
16. **Git workflow**:
    - Stage all changes with `git add .`
    - Commit with descriptive message using established format
    - Include 🤖 Generated with Claude Code footer

**Example commit message format:**
```
feat: implement [feature name] with [key capabilities]

- Brief bullet point of main changes
- Include any breaking changes
- Note documentation updates
- Mention cleanup performed

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Never skip steps** - This comprehensive workflow ensures code quality, documentation accuracy, and maintainable codebase.

## Code Quality Standards

### File Organization
- Remove any temporary files (test_*.ts, *.tmp, debug files) before commits  
- Keep only production-ready code in the repository
- Organize imports: built-in modules, external packages, then internal modules
- Use consistent naming conventions throughout

### Configuration Maintenance
- **`.gitignore`**: Keep updated with patterns for temporary files, build artifacts, secrets
- **`.dockerignore`**: Exclude development files, documentation, tests from production images  
- **`tsconfig.json`**: Update paths and includes as project structure evolves
- **`package.json`**: Keep dependencies up-to-date and remove unused packages

### Documentation Standards  
- All API endpoints must be documented with request/response examples
- Version number managed centrally in package.json (automatically used by all components)
- Feature documentation must accurately reflect implementation status
- Include clear examples and usage patterns
- Remove outdated information promptly

### Technical Debt Management
- Address TypeScript warnings and errors immediately
- Remove unused code during each development cycle
- Consolidate duplicate logic when found  
- Update comments to match current implementation
- Maintain consistent error handling patterns

## API Endpoints

### Core API
- `GET /` - API info and version
- `GET /health` - Health check endpoint

### Army Management
- `POST /api/armies/import` - Import army from ArmyForge by ID
- `GET /api/armies` - List all stored armies
- `GET /api/armies/:id` - Get specific army with full details

### Battle Management
- `POST /api/battles` - Create a new battle
- `GET /api/battles` - List all battles
- `GET /api/battles/:id` - Get battle details with participants
- `POST /api/battles/:id/participants` - Add participant to battle

### Unit Battle State Tracking
- `POST /api/battles/:id/start` - Start battle and initialize all unit states
- `GET /api/battles/:id/units` - Get all unit battle states for a battle
- `PATCH /api/battles/:battleId/units/:unitStateId` - Update individual unit state (health, fatigue, tokens, etc.)

### BattleAura Firmware Management
- `GET /api/battleaura/firmware/latest` - Get latest firmware version info
- `GET /api/battleaura/firmware` - List all available firmware versions
- `GET /api/battleaura/firmware/:version` - Get specific firmware version info  
- `POST /api/battleaura/firmware/upload` - Upload new firmware binary (for GitHub Actions)
- `DELETE /api/battleaura/firmware/admin/clear` - Clear all firmware data (admin only)
- `GET /firmware/:filename` - Download firmware binary files

## Project Structure

```
src/
  server.ts           # Main Express server (TypeScript)
tests/
  server.test.ts      # API tests (TypeScript)
dist/                 # Compiled JavaScript (generated)
tsconfig.json         # TypeScript configuration
jest.config.js        # Jest configuration with ts-jest
package.json          # Dependencies and scripts
Dockerfile            # Production Docker image
Dockerfile.dev        # Development Docker image
docker-compose.yml    # Production Docker Compose
docker-compose.dev.yml # Development Docker Compose
```

## Docker Setup

### Production
- Uses Node.js 20 LTS Alpine image
- Multi-stage build for optimized image size
- Health checks included
- Runs on port 4019 (Warhammer 40k + Horus Heresy reference)

### Development
- Separate development Dockerfile for hot reloading
- Volume mounts for live code changes
- All dev dependencies included