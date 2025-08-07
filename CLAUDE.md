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

TypeScript backend with Docker containerization, army import system, and SQLite storage implemented. Express server with health endpoints, army import/retrieval API, comprehensive test suite, and full Docker development/production setup. ArmyProcessor handles complex OPR unit merging (Combined/Joined units) with campaign XP cost calculations. All code uses strict TypeScript for type safety.

## Tech Stack

- **Backend**: Node.js + Express + SQLite + TypeScript
- **Frontend**: React + Vite (planned)
- **Styling**: TailwindCSS (mobile-first, planned)
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

**ALWAYS follow this workflow for any changes:**
1. **Ask clarifying questions** before writing code if requirements are unclear
2. **Write unit tests** as you develop features (test-driven development)
3. Write/modify TypeScript code with proper types
4. Run `npm run typecheck` to ensure TypeScript compilation
5. Run `npm test` to ensure all tests pass
6. Update version numbers in package.json and code
7. Update documentation (CLAUDE.md, comments)
8. Commit with descriptive messages and push

## API Endpoints

- `GET /` - API info and version
- `GET /health` - Health check endpoint
- `POST /api/armies/import` - Import army from ArmyForge by ID
- `GET /api/armies` - List all stored armies
- `GET /api/armies/:id` - Get specific army with full details

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