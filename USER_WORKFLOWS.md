# User Workflows ✅ PRODUCTION READY v1.1.0

## Server Owner Workflows

### Initial Setup
1. Deploy application via Docker Compose
2. Create server owner account during first run
3. Configure basic server settings (name, description)
4. Create first gaming group

### Gaming Group Management
1. Create new gaming group
   - Set group name and description
   - Choose initial group admins from registered users
   - Generate invite codes or links
2. Manage existing groups
   - Add/remove group admins
   - View group activity and campaigns
   - Delete groups if needed

### User Management
1. View all registered users
2. Deactivate problematic accounts
3. View system-wide activity logs

## Group Admin Workflows

### Campaign Creation
1. Navigate to gaming group dashboard
2. Create new campaign
   - Set campaign name, description, and narrative
   - Choose point limits and game settings
   - Create or import mission definitions
   - Set campaign rules and special mechanics
3. Invite players to campaign
   - Send invite links to group members
   - Manage player roster
   - Set player-specific permissions if needed

### Campaign Management
1. Monitor active campaigns
   - View current standings and statistics
   - Track mission progress and completion
   - Review battle reports and outcomes
2. Modify campaign settings
   - Add new missions or modify existing ones
   - Adjust campaign rules mid-campaign
   - Update narrative and story elements
3. Handle disputes
   - Reset battle data if needed
   - Modify player armies if necessary
   - Remove players from campaigns

### Mission Management
1. Create custom missions
   - Set objectives and victory conditions
   - Define special rules and terrain effects
   - Set point values and restrictions
2. Schedule mission events
   - Set recommended dates/times
   - Notify players of upcoming missions
   - Track mission completion status

## Player Workflows

### Account Setup
1. Receive gaming group invite
2. Register account with username/password
3. Join gaming group via invite code
4. Configure ArmyForge integration
   - Enter personal ArmyForge API token
   - Test connection and import access

### Army Management
1. Import army from ArmyForge
   - Select army list from personal ArmyForge account
   - Confirm import and sync settings
   - Set army nickname and campaign notes
2. Manage multiple armies
   - Switch between different army lists
   - Track army progression and experience
   - View army statistics and battle history
3. Sync army updates
   - Manual refresh from ArmyForge
   - Automatic sync notifications
   - Handle sync conflicts or errors

### Campaign Participation
1. Join campaign
   - Accept campaign invitation
   - Select primary army for campaign
   - Review campaign rules and objectives
2. View campaign status
   - Check current standings and leaderboard
   - Review mission objectives and deadlines
   - See other players' armies and progress

### Battle Session (Real-time)
1. **Pre-Battle Setup**
   - Navigate to active battle session
   - Confirm army list and starting conditions
   - Wait for all players to join session

2. **During Battle**
   - **Wound Tracking**
     - Select enemy unit to damage
     - Apply wounds in real-time
     - See immediate updates across all devices
   - **Kill Recording**
     - Mark when units are destroyed
     - Track kill counts for experience calculation
     - Update unit status (shaken, routed, etc.)
   - **Status Updates**
     - Apply temporary effects and conditions
     - Track spell tokens and command points
     - Note special rule activations

3. **Post-Battle**
   - Confirm final battle state
   - Review experience point calculations
   - Submit battle report and narrative
   - Sync updated army status to ArmyForge (if applicable)

### Battle History
1. View completed battles
   - Access detailed battle reports
   - Review personal performance statistics
   - See army progression over time
2. Export personal data
   - Download army progression data
   - Export battle history for external use

## Real-time Battle Interaction Flows

### Damage Application
```
Player A -> Selects Enemy Unit -> Applies Damage -> WebSocket Broadcast
All Players -> Receive Update -> UI Updates Instantly
Player B (Unit Owner) -> Reviews Damage -> Applies Wounds -> Marks Casualties
```

### Kill Confirmation
```
Player A -> Destroys Enemy Unit -> Marks Kill
System -> Calculates XP Value -> Updates Kill Count
All Players -> See Unit Status Change -> Updated Leaderboard
```

### Simultaneous Updates
```
Multiple Players -> Apply Wounds Simultaneously
Database -> Handles Concurrent Updates -> Resolves Conflicts
WebSocket -> Broadcasts Final State -> All UIs Sync
```

## Error Handling Workflows

### Connection Loss During Battle
1. Client detects disconnection
2. Show "reconnecting" status
3. Queue local changes
4. Reconnect and sync queued changes
5. Resolve any conflicts with server state

### ArmyForge Sync Failures
1. Display sync error to user
2. Show last successful sync timestamp
3. Offer manual retry option
4. Allow continue with cached data
5. Queue sync for later retry

### Permission Changes
1. User loses access to gaming group
2. Gracefully redirect to available groups
3. Show appropriate error message
4. Maintain access to personal data export

## Mobile-Specific Workflows

### Tableside Usage
1. Quick army selection from favorites
2. Large touch targets for wound application
3. Swipe gestures for common actions
4. Offline mode for intermittent connectivity
5. Auto-save all changes locally

### Quick Actions
1. One-tap unit selection
2. Hold gesture for unit details
3. Shake to undo last action
4. Quick access to frequently used units