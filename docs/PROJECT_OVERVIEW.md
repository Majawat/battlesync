# BattleSync - Project Overview

## Vision
A self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with real-time battle tracking and multi-user support.

## Current State (July 2025) - Production Ready v1.1.3
🟢 **PRODUCTION FEATURES - FULLY OPERATIONAL**
- ✅ **Multi-user Web Application**: Complete JWT authentication system with role-based access
- ✅ **Real-time Infrastructure**: WebSocket communication with room management
- ✅ **Database System**: PostgreSQL with Prisma ORM and persistent storage
- ✅ **Docker Deployment**: Production-ready Docker Compose configuration
- ✅ **Mobile-First Frontend**: React with TypeScript, TailwindCSS, dark mode
- ✅ **Gaming Group Management**: Invite codes, member management, role assignment
- ✅ **Campaign System**: Comprehensive settings, validation, status tracking
- ✅ **Mission Management**: Auto-numbering, templates, objectives, special rules
- ✅ **RESTful API**: 50+ endpoints with proper error handling and validation
- ✅ **Army Management**: Complete ArmyForge integration with import/sync
- ✅ **Battle System**: Creation, tracking, real-time dashboard with WebSocket updates
- ✅ **Spell Casting System**: Complete OPR spell casting with ArmyForge integration and cooperative casting
- ✅ **Command Point System**: All 6 OPR command point calculation methods with automatic refresh

🟡 **ENHANCEMENT FEATURES - IN PROGRESS**
- ⚠️ **OPR Army Conversion**: Advanced unit combining and weapon distribution logic
- ⚠️ **Enhanced Battle Tracking**: Individual unit damage and status management
- ⚠️ **Army Validation**: Advanced rule enforcement and composition checking

🔴 **PLANNED FEATURES**
- ❌ Advanced battle analytics and reporting
- ❌ Production deployment configuration with SSL
- ❌ Mobile app development

## Target State
- ✅ Multi-user web application with authentication *(COMPLETE)*
- ✅ Real-time battle tracking during games *(COMPLETE)*
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

### ✅ COMPLETED  
4. **Army Management**: Import and sync army lists from ArmyForge automatically
   - ✅ TypeScript interfaces for army data (40+ interfaces)
   - ✅ ArmyForge API client with caching and rate limiting
   - ✅ Army CRUD operations and management system
   - ✅ Campaign association and army filtering
   - ⚠️ ENHANCEMENT: Advanced OPR army conversion system in development

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
- **Pending**: Enhanced battle participation features

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

### Army Management ✅
- ArmyForge integration for army import
- Army customization and battle honors
- Veteran upgrades and experience tracking
- Army validation for One Page Rules
- **Status**: Complete and operational

### Real-time Battle Tracking ✅
- WebSocket-based battle rooms
- Live battle state management
- Battle creation from missions
- Mobile-optimized battle interface
- **Status**: Core features operational, enhanced features in development

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

### Current Sprint Focus (v1.1.0)
- **Enhancement**: Advanced OPR army conversion system (unit combining, weapon merging)
- **Enhancement**: Individual battle unit tracking and damage management
- **Enhancement**: Advanced army validation and rule enforcement

### Recent Achievements (v1.0.0 → v1.1.0)
- ✅ **Army System Complete**: Full ArmyForge integration operational
- ✅ **Battle System Operational**: Real-time WebSocket battle tracking
- ✅ **Production Architecture**: Complete Docker deployment ready
- ✅ **Comprehensive Documentation**: 10+ MD files with complete specifications
- ✅ **TypeScript Foundation**: 40+ interfaces, full type safety
- ✅ **End-to-End Workflows**: All core user workflows functional

### Next Milestones (v1.2.0+)
1. **OPR Conversion Enhancement**: Smart unit combining and weapon distribution
2. **Advanced Battle Features**: Individual model tracking, damage visualization
3. **Production Features**: SSL configuration, monitoring, backup automation
4. **Mobile Optimization**: Enhanced tablet interface for tableside use

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