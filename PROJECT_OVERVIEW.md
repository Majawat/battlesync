# OPR Army Tracker - Project Overview

## Vision
A self-hosted web application for managing One Page Rules (OPR) tabletop gaming campaigns with real-time battle tracking and multi-user support.

## Current State
- Static HTML/JS application with Bootstrap 5
- Single-user, client-side only
- Session storage for caching
- Integrates with ArmyForge API for army lists
- JSON files for static game data

## Target State
- Multi-user web application with authentication
- Real-time battle tracking during games
- Persistent database storage
- Docker Compose deployment for home servers
- Mobile-first responsive design

## Core Problems Solved
1. **Campaign Management**: Track multiple ongoing OPR campaigns across gaming groups
2. **Army Tracking**: Import and sync army lists from ArmyForge automatically  
3. **Battle Recording**: Real-time wound/kill tracking during tabletop games
4. **Experience Calculation**: Calculate earned XP after battles for campaign progression
5. **Group Organization**: Manage gaming groups with proper permissions and access control

## Target Users

### Server Owner
- Runs the application on their home server
- Creates and manages gaming groups
- Has full administrative control

### Group Admins (1+ per group)
- Can create and edit campaigns within their gaming group
- Invite players to campaigns
- Manage campaign settings and missions
- Can kick players and reset campaign data

### Players
- Join gaming groups by invitation
- Import their armies from ArmyForge using personal tokens
- Participate in real-time battle tracking
- View all campaign data within their gaming groups

## Key Features

### Authentication & Access
- Simple username/password authentication
- Invite-only gaming groups
- Role-based permissions (Owner → Group Admin → Player)
- All players can see armies within their gaming groups

### Campaign Management
- Multiple concurrent campaigns per gaming group
- Customizable missions and objectives
- Campaign story and narrative tracking
- Historical campaign viewing

### Army Integration
- Automatic sync with ArmyForge API
- Personal ArmyForge token storage
- Real-time army list updates
- Support for army modifications and upgrades

### Battle Tracking
- Real-time wound and kill tracking via WebSockets
- Multiple players can update simultaneously
- Mobile-optimized interface for tableside use
- Manual wound application (no automated dice)

### Data Management
- Persistent PostgreSQL database
- Manual export functionality
- Campaign history preservation
- User data privacy within groups

## Technical Constraints
- **Deployment**: Docker Compose for easy home server setup
- **Scale**: Support up to 10 players per campaign (typically 4)
- **Devices**: Mobile and tablet first, desktop secondary
- **Connectivity**: Handle intermittent mobile connections gracefully
- **Data Retention**: Low long-term storage requirements
- **Backup**: Manual export sufficient, not mission-critical

## Success Metrics
- Easy deployment on home servers
- Smooth mobile experience during tabletop games
- Reliable real-time updates without conflicts
- Simple user onboarding and group management
- Stable integration with ArmyForge API