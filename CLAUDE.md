# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BattleSync is a self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with real-time battle tracking. The project is currently in planning/design phase with comprehensive documentation but no implementation code yet.

**Current State**: Planning/documentation phase - no actual code exists
**Target State**: Multi-user web application with real-time battle tracking

## Architecture

### Technology Stack
- **Backend**: Node.js 18+ with Express.js
- **Real-time**: WebSockets (ws library or Socket.io)
- **Database**: PostgreSQL 15+ with Prisma or TypeORM
- **Frontend**: React 18+ with TypeScript, Material-UI or Chakra UI
- **Authentication**: JWT tokens with bcrypt
- **Deployment**: Docker Compose for home servers

### Key Components
- **User Management**: Authentication, gaming groups, role-based access
- **Campaign System**: Multi-campaign support per gaming group
- **Army Integration**: ArmyForge API integration for army imports
- **Battle Tracking**: Real-time WebSocket-based battle state management
- **Database Design**: PostgreSQL with JSONB for ArmyForge data storage

## Core Features

### Real-time Battle System
- WebSocket rooms for each active battle
- Optimistic updates with conflict resolution
- State persistence during network issues
- Mobile-first interface for tableside use

### ArmyForge Integration
- Personal API token storage per user
- Automatic army list syncing
- Cached responses with smart invalidation
- Conflict resolution for army changes

### Multi-user Support
- Gaming groups with invite codes
- Role-based permissions (Server Owner → Group Admin → Player)
- Campaign isolation per gaming group
- Up to 10 players per campaign

## External APIs

### ArmyForge API
- **Army Lists**: `GET /api/tts?id={listId}` - Import complete army data
- **Army Books**: `GET /api/army-books/{factionId}` - Faction rules and spells
- **Common Rules**: `GET /api/rules/common/{gameSystemId}` - Universal game rules
- **Authentication**: Bearer tokens (user-specific)
- **Rate Limiting**: 30 requests/minute, 500 requests/hour

## Database Schema

### Core Tables
- **users**: Authentication and role management
- **gaming_groups**: Group organization with invite codes
- **campaigns**: Campaign management per group
- **armies**: ArmyForge data storage as JSONB
- **battles**: Battle sessions and state tracking
- **battle_events**: Audit log for all battle actions

### JSONB Storage
- **army_data**: Raw ArmyForge responses
- **battle_state**: Real-time unit status, wounds, kills
- **campaign_settings**: Rules, missions, point limits

## Development Guidelines

### Security Requirements
- JWT tokens with 15-minute expiry
- Encrypted storage for ArmyForge API tokens
- Row-level security for gaming group isolation
- Input validation and sanitization
- CORS configuration for known origins

### Performance Considerations
- Connection pooling for PostgreSQL
- Redis caching for active battles (optional)
- WebSocket connection management
- Efficient JSON serialization for battle state

### Mobile-First Design
- Responsive design for tablets and phones
- Touch-friendly interfaces for battle tracking
- Offline capability with service workers
- Graceful handling of intermittent connections

## Scale Targets
- 10 gaming groups maximum
- 10 players per campaign
- 5 concurrent battles
- Optimized for home server deployment

## Deployment

### Docker Compose Setup
- **nginx**: SSL termination and static assets
- **api**: Express application with WebSocket server
- **postgres**: Data persistence with automated backups
- **redis**: Optional session storage and caching

### Environment Variables
- Database connection strings
- JWT secret management
- ArmyForge API configuration
- SSL certificate paths

## Documentation Structure

The repository contains comprehensive planning documents:
- **PROJECT_OVERVIEW.md**: Vision, features, and user workflows
- **ARCHITECTURE.md**: Technical architecture and system design
- **DATA_MODELS.md**: Database schema and TypeScript interfaces
- **API_INTEGRATIONS.md**: ArmyForge API integration details
- **FEATURES.md**: Detailed feature specifications (if exists)
- **USER_WORKFLOWS.md**: User journey and interaction flows (if exists)

## Development Commands

Since no implementation exists yet, standard commands will be:
- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run test` - Run test suite
- `npm run lint` - Run linting
- `docker-compose up` - Start full stack locally

## Implementation Priority

When starting development:
1. **Database Setup**: PostgreSQL with Prisma schema from DATA_MODELS.md
2. **Authentication**: JWT-based user system with bcrypt
3. **API Foundation**: Express routes for user/group management
4. **ArmyForge Integration**: API client with rate limiting and caching
5. **Real-time System**: WebSocket implementation for battle tracking
6. **Frontend**: React app with mobile-first responsive design

## Development Notes

Since this is a planning-phase project:
1. Review existing documentation before implementing features
2. Follow the established architecture patterns
3. Implement mobile-first responsive design
4. Prioritize real-time performance for battle tracking
5. Ensure proper gaming group isolation and security