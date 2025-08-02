# BattleSync

## Project Context
 - Goal: Simple OPR battle tracker, not enterprise software
 - Users: 10-50 tabletop games
 - Core Scope: battle tracking of armies from ArmyForge
 - End Scope:
    - Optional Campaign management (listing of missions, tracking of leaderboards, etc)
    - Battle report repository
    - Rules reference
## Key Constraints
- Must work on Mobile (players use tablets at the table, or phones)
- Must pull data from ArmyForge (official army creator, users already have armies there), no in-BattleSync app configuration/changing of Army data besides lore
- Must be self-hosted in docker (users aren't developers, should be easy to deploy), privacy option for gaming groups

## Technical stack (undecided)
- Backend: Node.js + Express + SQLite?
- Frontend: React + Vite + TailwindCSS
- Auth: JWT tokens?
- Real-Time: server-sent events? (understand difference between this and websocket)
- Deployment: Docker

## User workflows (priority order)
1. Import army from ArmyForge
    - Convert that army to a BattleSync compatible format
    - Understand that ArmyForge is correct, rarely will we need to do validation
    - ensure all upgrades/traits are handled (many "edge" cases)
    - understand each feature in the json to ensure we handle those cases later
    - key understanding: the basic unit configs:
        - Regular: just a simple unit, may be of multi-model, or one model
        - Combined: a regular unit with increased numbers of models (usualy double # of models, but upgrades do not double, so not a simple 2x of everything, must add upgades as given). In the json from ArmyForge, it's listed as 2 units (one of which has a "join to" field), but we'll need to combine, as needed
        - Joined: units with Hero upgrade are able to Join a unit. Officially, they're one unit after that, so most things happen to "both" sub-units, but they should be kept "separate" for a few other purposes
2. Start battle with other players
    - base game implies 2 players, however, no technical limit to how many players per-battle.
    - Our group plays with 4 in a narrative campaign
3. Track damaage and statuses of units
4. Undo mistakes, keep record of what happened, and when
5. View battle summary

## Complete, end-goal Feature list (no particular order)
1. Register/login as the admin of the site. Server Admin can create other user accounts, and give permissions. Server Admin has all permissions
2. Admins can create 1+ gaming groups
3. Admins Can give permissions to users to gaming groups. This is a role based permissions setup. That is: any one user may have different roles based on different scopes
    - Example: ServerAdmin creates a group: Group1. Creates a user: Player1. Gives Player1 the "GroupOrganizer" role for Group1. Then Player1, with Organizer permission, can go and create/invite/permission users to their group. By default, players have view and join-battle. Group organizers can also create Campaigns, which users can be added to, and given rights.
2. Import army from ArmyForge based on Share as Link link, ex: https://army-forge.onepagerules.com/share?id=vMzljLVC6ZGv&name=The_Ashen%20Pact
3. ArmyForge has a loosely documented API for migrating to TableTop Simulator
    - The AF TTS endpoint is here: https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv (for example) and is in json format
    - Info: someone built an AF to TTS tool: https://opr-af-to-tts.netlify.app/. Their github is here: https://github.com/thomascgray/opr-af-to-tts.
4. Allow user to see their army, make any lore changes as needed, just for flavor. 

### Battles
1. Use armies imported, users can enter battles. Core function: just join, and use state management, turn order.
