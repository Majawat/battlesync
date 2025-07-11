# BattleSync Polish TODO List

This document tracks identified polish items and UI/UX improvements needed across the BattleSync application.

## High Priority Issues

### Mission System
- **Mission card display issues** - Mission number shows as "Mission #" instead of actual number
- **Mission card titles** - Mission Title not displaying on cards
- **Mission card refresh bug** - Type and created date disappear after page refresh
- **Mission View Details** - Button is non-functional
- **Campaign dropdown** - Not populating with actual campaigns, selection failures

### Army Management
- **ArmyForge modal UX** - Modal doesn't fit screen properly, no close/scroll functionality

## Medium Priority Issues

### Group Management
- **Group Settings** - Settings button on group card is non-functional

### Campaign Configuration
- **Points limit flexibility** - Make optional or add "starting points" with 1000 default
- **Mission reward defaults** - Set Army Mission Rewards (Win: 2VP + 150pts, Loss: 0VP + 300pts)
- **Unit experience defaults** - Set Unit Experience rules (+1XP not casualty, +1XP kill unit, +2XP kill hero, +3XP kill hero+joined unit)
- **Special objectives** - Add default Special Objectives with 1D6 roll table
- **Mission editing** - Add ability to edit missions after creation

### Army System
- **Import method** - Change to use Share Link format instead of TTS API directly
- **Unit count display** - Currently always shows 0 on armies page
- **Faction detection** - Use ArmyIds from JSON with official faction list API
- **Points calculation** - Use listPoints or pointsLimit from JSON

## Low Priority Issues

### Campaign Features
- **Campaign length types** - Add Game-Limited, Point-Limited, Time-Limited, Endless options (D6+4 formula)
- **Underdog bonus** - Add default: 1pt per 50pts difference from highest army value
- **Army stats** - Add win/loss rate tracking for armies

### Army System Cleanup
- **Description handling** - Handle null Description field from ArmyForge JSON
- **Unit parsing** - Redesign army unit JSON parsing for complex structures
- **Feature cleanup** - Remove references to 'private army support'

## Special Objectives Reference

Default Special Objectives (Roll 1D6):

| Result | Objective |
|--------|-----------|
| 1 | Mastery - One friendly unit in each table quarter at the end |
| 2 | Honor - No enemy units in own deployment zone at the end |
| 3 | Casting - At least one attempt to cast a spell per round |
| 4 | Recovery - First player to stop a unit from being shaken |
| 5 | First player to destroy an enemy unit |
| 6 | Most expensive enemy unit destroyed |

## API References

- **Faction List API**: `https://army-forge.onepagerules.com/api/army-books?filters=official&gameSystemSlug=grimdark-future&searchText=&page=1&unitCount=0&balanceValid=false&customRules=true&fans=false&sortBy=null`
- **Share Link Format**: `https://army-forge.onepagerules.com/share?id=vMzljLVC6ZGv&name=The_Ashen%20Pact`
- **TTS API Format**: `https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv`

## Campaign Membership Management (New)

### High Priority
- **Campaign membership management system** - Currently no way to manage who's in campaigns
- **Campaign member list view** - Show members, roles, join dates, and management options

### Medium Priority  
- **Invite users to campaigns** - By username/email with pending invitations
- **Remove members from campaigns** - Creator/admin ability to manage membership

### Low Priority
- **Campaign roles system** - Admin/moderator roles beyond just creator

## Notes

- Focus on high priority items first as they affect core functionality
- Medium priority items improve user experience significantly
- Low priority items are nice-to-have enhancements
- Some issues may be related (e.g., mission card display problems)
- Army unit parsing redesign should be tackled as a separate major task
- **Campaign membership management is now a critical missing feature** - users can't manage who's in their campaigns