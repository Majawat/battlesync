# BattleSync - Project Overview

## Vision
A self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with real-time battle tracking and multi-user support.

## Current State (January 2025)
🟢 **OPERATIONAL FEATURES**
- ✅ Multi-user web application with JWT authentication
- ✅ Real-time WebSocket communication infrastructure  
- ✅ PostgreSQL database with persistent storage
- ✅ Docker Compose deployment ready
- ✅ Mobile-first responsive React frontend with dark mode
- ✅ Gaming groups with invite code system
- ✅ Campaign management with comprehensive settings
- ✅ Mission system with auto-numbering and templates
- ✅ RESTful API with role-based access control

🟡 **PARTIALLY IMPLEMENTED**
- ⚠️ Army management system (90% complete, compilation errors blocking deployment)
- ⚠️ ArmyForge integration (implemented but disabled due to technical issues)

🔴 **PLANNED FEATURES**
- ❌ Real-time battle tracking during games
- ❌ Army validation and rules enforcement  
- ❌ Production deployment configuration

## Target State
- ✅ Multi-user web application with authentication *(COMPLETE)*
- ❌ Real-time battle tracking during games *(IN DEVELOPMENT)*
- ✅ Persistent database storage *(COMPLETE)*
- ✅ Docker Compose deployment for home servers *(COMPLETE)*
- ✅ Mobile-first responsive design *(COMPLETE)*

## Core Problems Solved

### ✅ IMPLEMENTED
1. **Campaign Management**: Track multiple ongoing OPR campaigns across gaming groups
   - Complete campaign CRUD with settings validation
   - Status tracking (PLANNING, ACTIVE, COMPLETED, ON_HOLD)
   - Experience system configuration (win/loss/kill XP)
   - Game system support (Grimdark Future, Age of Fantasy, Firefight, Warfleets FTL)

2. **Group Organization**: Manage gaming groups with proper permissions and access control
   - Invite code system for easy joining
   - Role-based access (SERVER_OWNER → GROUP_ADMIN → MEMBER)
   - Group isolation for campaigns and data

3. **Mission Management**: Structured mission tracking within campaigns
   - Auto-numbered mission creation
   - Built-in templates (Patrol Clash, Control Zones, Breakthrough)
   - Mission objectives and special rules management

### ⚠️ IN PROGRESS  
4. **Army Tracking**: Import and sync army lists from ArmyForge automatically
   - TypeScript interfaces for army data (40+ interfaces)
   - ArmyForge API client with caching and rate limiting
   - Army CRUD operations and management system
   - *BLOCKED: TypeScript compilation errors preventing deployment*

### ❌ PENDING
5. **Battle Recording**: Real-time wound/kill tracking during tabletop games
6. **Experience Calculation**: Calculate earned XP after battles for campaign progression

## Target Users

### Server Owner ✅
- Runs the application on their home server
- Creates and manages gaming groups  
- Has full administrative control (`SERVER_OWNER` role)
- **Implementation Status**: Complete with admin user setup

### Group Admins ✅
- Can create and edit campaigns within their gaming group
- Invite players to campaigns using invite codes
- Manage campaign settings and missions
- Can manage group membership and permissions
- **Implementation Status**: Complete with role-based permissions

### Players ✅  
- Join gaming groups by invitation codes
- View all campaign and mission data within their gaming groups
- Participate in campaign activities
- **Implementation Status**: Basic functionality complete
- **Pending**: Army import from ArmyForge, battle participation

## Key Features

### Authentication & Access ✅
- JWT-based authentication with refresh tokens
- Role-based access control system
- Secure password hashing
- **Status**: Production ready

### Gaming Groups ✅
- Invite-only gaming groups with unique codes
- Member management and role assignment
- Group isolation for data security
- No capacity limits (removed per user feedback)
- **Status**: Production ready

### Campaign Management ✅
- Multiple campaigns per gaming group
- Comprehensive campaign settings:
  - Points limits (100-10,000)
  - Game system selection
  - Experience configuration (win/loss/kill XP)
  - Multiple armies and ArmyForge integration flags
- Campaign status tracking and member management
- **Status**: Production ready

### Mission System ✅
- Auto-numbered mission tracking
- Mission templates for quick setup
- Objectives, special rules, and terrain features
- Mission scheduling and status management
- **Status**: Production ready

### Army Management ⚠️
- ArmyForge integration for army import
- Army customization and battle honors
- Veteran upgrades and experience tracking
- Army validation for One Page Rules
- **Status**: 90% complete, blocked by compilation errors

### Real-time Battle Tracking ❌
- WebSocket-based battle rooms
- Live unit status tracking (wounds, kills, status effects)
- Turn progression and phase management
- Mobile-optimized battle interface
- **Status**: Infrastructure ready, implementation pending

### Frontend Application ✅
- React 18+ with TypeScript
- TailwindCSS dark mode design
- Mobile-first responsive interface
- Component library with modals, cards, and forms
- Real-time WebSocket integration
- **Status**: Production ready

### Database & API ✅
- PostgreSQL with Prisma ORM
- RESTful API with comprehensive endpoints
- Real-time WebSocket communication
- Proper error handling and validation
- **Status**: Production ready

## Technical Architecture

### Technology Stack ✅
- **Backend**: Node.js 18+ with Express.js and TypeScript
- **Frontend**: React 18+ with TypeScript, TailwindCSS, Vite  
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Real-time**: WebSockets with room-based communication
- **Authentication**: JWT tokens with role-based access control
- **Deployment**: Docker Compose for development and production

### Scale Targets ✅
- 10+ gaming groups (no enforced limit)
- 10+ players per campaign (no enforced limit) 
- Multiple concurrent campaigns per group
- Real-time WebSocket support for active battles
- Optimized for home server deployment

### Security Model ✅
- JWT access tokens (15 minute expiry) + refresh tokens (7 days)
- Role-based permissions with group isolation
- Input validation and sanitization
- Secure password storage
- CORS configuration for known origins

## User Workflows

### Getting Started ✅
1. **Server Owner Setup**: Deploy with Docker Compose, access admin account
2. **Gaming Group Creation**: Create group, share invite code with players
3. **Player Onboarding**: Register account, join group with invite code
4. **Campaign Setup**: Create campaign with settings, invite group members

### Campaign Management ✅
1. **Campaign Creation**: Set points limit, game system, experience rules
2. **Member Management**: Invite players, assign primary armies
3. **Mission Planning**: Create missions with objectives and special rules
4. **Progress Tracking**: Monitor campaign status and member participation

### Army Management ⚠️ (Pending Fix)
1. **ArmyForge Integration**: Link personal ArmyForge account
2. **Army Import**: Import army lists from ArmyForge API
3. **Army Customization**: Add battle honors, veteran upgrades
4. **Army Validation**: Ensure armies meet campaign requirements

### Battle Management ❌ (Not Implemented)
1. **Battle Setup**: Create battle from mission, assign participants
2. **Real-time Tracking**: Track wounds, kills, objectives during game
3. **Battle Resolution**: Record results, calculate experience gained
4. **Campaign Updates**: Update army status, progression tracking

## Development Status

### Current Sprint Focus
- **Critical**: Fix army management TypeScript compilation errors
- **High Priority**: Re-enable army system functionality  
- **Medium Priority**: Complete battle tracking system implementation

### Recent Achievements
- ✅ Updated campaign creation UI with all required fields
- ✅ Fixed frontend-backend type compatibility
- ✅ Comprehensive documentation updates
- ✅ Working Docker development environment

### Next Milestones
1. **Army System Deployment**: Fix compilation errors, test army workflows
2. **Battle Tracking MVP**: Basic real-time battle state management
3. **Army Validation**: Joi middleware for army data validation
4. **Production Readiness**: SSL, monitoring, backup configuration

## User Feedback Integration

### Implemented Changes
- **Gaming Group Capacity**: Removed 10-member limit per user feedback
- **Campaign Settings**: Enhanced with comprehensive configuration options  
- **Mission Templates**: Added built-in templates for common scenarios
- **UI/UX Improvements**: Mobile-first design with dark mode

### User Priorities
- **Army Management**: High priority feature for campaign participation
- **Battle Tracking**: Identified as most complex but essential feature
- **Mobile Experience**: Critical for tableside use during games

## Success Metrics

### Technical Metrics ✅
- Application successfully deploys with Docker Compose
- Authentication and authorization working correctly
- Database operations performing efficiently
- WebSocket connections stable and responsive

### User Experience Metrics
- Gaming groups can be created and managed easily
- Campaigns can be configured and tracked effectively  
- Mission management streamlines game preparation
- Mobile interface usable during tabletop games

### Future Metrics (Pending Implementation)
- Army import success rate from ArmyForge
- Real-time battle tracking performance
- User engagement and session duration
- Campaign completion and progression rates

## Deployment and Maintenance

### Development Environment ✅
- Docker Compose with hot reload
- Separate frontend and backend containers
- PostgreSQL with persistent volumes
- Environment variable configuration

### Production Deployment ✅
- Docker Compose production configuration
- Database backup and recovery procedures
- SSL/HTTPS certificate management
- Application monitoring and logging

### Maintenance Requirements
- Regular database backups
- Application log monitoring
- Security updates and patches
- Performance optimization and tuning