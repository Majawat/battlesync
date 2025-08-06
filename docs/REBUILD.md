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
- Must pull data from ArmyForge (official army creator, users already have armies there), no in-BattleSync app configuration/changing of Army data besides additional lore
- Must be self-hosted in docker (users aren't developers, should be easy to deploy), privacy option for gaming groups
- Must not remove player agency, all rolls will be done by the player and we'll ask for number results or pass/fail etc from the players.
- We will not keep track of unit positions, that's for the board; we'll only track unit stats, states, and abilities

## Technical stack (undecided)
- Backend: Node.js + Express + SQLite?
- Frontend: React + Vite + TailwindCSS
- Auth: JWT tokens?
- Real-Time: server-sent events? (understand difference between this and websocket)
- Deployment: Docker

## User workflows (priority order)
1. Import army from ArmyForge
    - Convert that army to a BattleSync compatible format
    - Understand that ArmyForge is correct, rarely will we need to do validation, as ArmyForge does it
    - Ensure all upgrades/traits are handled (many "edge" cases)
    - understand each feature in the ArmyForge jsons to ensure we handle those cases later
    - key understanding: the basic unit configs:
        - Regular: just a simple unit, may be of multi-model, or one model
        - Combined: a regular unit with increased numbers of models (usualy double # of models, but upgrades do not double, so not a simple 2x of everything, must add upgades as given). In the json from ArmyForge, it's listed as 2 units (one of which has a "join to" field), but we'll need to combine, as needed
        - Joined: units with Hero upgrade are able to Join a unit. Officially, they're one unit after that, so most things happen to "both" sub-units, but they should be kept "separate" for a few other purposes
            - Hero - Heroes with up to Tough(6) may deploy as part of one multi-model unit without another Hero. The hero may take morale tests on behalf of the unit, but must use the unit’s Defense until all other models have been killed. Note that when a Hero joins a unit, they count as part of that unit, so the unit’s size is increased by 1, and even if the hero is the last model remaining, it takes morale tests as the unit. This also means that a hero may never leave its unit or join another one. Example: A Hero joins a unit of [5] models, so the unit’s size is [6]. Once all other models have been killed, the Hero must take a morale test whenever it takes wounds, and if it fails a morale test in melee it will Rout, because it’s a unit with half or less of its starting size. 
2. Start battle with other players
    - base game implies 2 players, however, no technical limit to how many players per-battle.
    - Our group plays with 4 in a narrative campaign
3. Track damaage and statuses of units
4. Undo mistakes, keep record of what happened, and when for battle report summaries
5. View battle summary

## Complete, end-goal Feature list (no particular order)
1. Register/login as the admin of the site. Server Admin can create other user accounts, and give permissions. Server Admin has all permissions. ServerAdmin can allow users to sign up on their own, or create users themselves. 
2. Admins can create gaming groups
3. Admins can give permissions to users to gaming groups. This is a role based permissions setup. That is: any one user may have different roles based on different scopes/needs
    - Different roles a user on a server can have are (initial list): ServerAdmin, GroupOrganizer, Player, CampaignManager, etc.
    - Example:
        - ServerAdmin creates a group: Group1.
        - Creates a user, or allows user to sign up on their own: Player1.
        - ServerAdmin gives Player1 the "GroupOrganizer" role for Group1.
        - Player1 creates a Campaign with 6 missions and a One-Off Battle.
        - Then Player1, with GroupOrganizer permission, can go and create/invite/permission users to join their group, and assign them to the Campaign and One-Off Battles as needed.
        - By default, users with Player role have view access and ability to join a battle with their army.
        - Group organizers can also create Campaigns, which users can be added to, and given rights.
        - Group organizers can also assign other users/players to Campaigns as CampaignManagers that can set campaign missions/battles, settings, etc.
2. Import army from ArmyForge based on Share as Link link, ex: https://army-forge.onepagerules.com/share?id=vMzljLVC6ZGv&name=The_Ashen%20Pact that the player provides
3. ArmyForge has a loosely documented API for migrating to TableTop Simulator
    - The AF TTS endpoint is here: https://army-forge.onepagerules.com/api/tts?id=vMzljLVC6ZGv (for example) and is in json format
    - Info: someone built an AF to TTS tool: https://opr-af-to-tts.netlify.app/. Their github is here: https://github.com/thomascgray/opr-af-to-tts.
4. Allow user to see their army, make any lore changes as needed, just for flavor. 

### Campaigns
1. Can create a campaign with multiple battles with an overarching story structure. Units gain XP and traits which are tracked in ArmyForge, not in our app.
2. Each campaign has multiple mission.
3. Each campaign mission has a story overview, an objective (primary, may be multiple), and potentially secondary objectives. May have special rules, scoring, terrain setups, and/or victory conditions, etc.
4. Campaign Length:
    - Campaign Length: Campaigns are played with two or more players, and you must pick one of these campaign types:
        - Game-Limited: Play D6+4 missions, and after the last match the player with most VP wins.
        - Point-Limited: The campaign ends when one player has earned D6+4 VP after a match, who wins.
        - Time-Limited: The campaign ends after D6+4 weeks, and the player with most VP at the end wins.
        - Endless: The campaign never ends, but instead players keep track of how many VPs they earned on an ongoing campaign leaderboard.

### Battles
1. Using armies imported, users can enter battles. Core function: just join, and use state management, turn order.
2. Battle creation: set date/time, number of points for armies (guideline, not a hard limit), set terrain, set objectives, set optional rules: Command Points, etc.
    * For campaign games, determine underdog bonus points, and special objectives. 
        * Underdog Bonus: Any army that has a point value lower than at least one other gets an underdog bonus. You get 1 underdog point for every 50pts difference between your army and the one with the highest value. Each underdog point can be spent to modify all dice in a friendly or enemy roll by +1 or -1, but only one point can be spent per roll.
        * Special Objectives: In addition to the mission objectives, players may earn a bonus of 75pts by completing special objectives. Roll one die each to see which objective you get, If you roll an objective which can’t be completed, then you must re-roll:
            1. Mastery - One friendly unit in each table quarter at the end.
            2. Honor - No enemy units in own deployment zone at the end.
            3. Casting - At least one attempt to cast a spell per round.
            4. Recovery - First player to stop a unit from being shaken.
            5. Rage - First player to destroy an enemy unit.
            6. Destruction - Most expensive enemy unit destroyed.

#### Battle/Missions phases
1. **Setup Phase**: Players set up their armies. If the battle/campaign is enabled for Campaign Points, players choose which Doctrine to use. Player turn order is determined by dice roll.
2. **Deployment Phase**: Players deploy their armies on the battlefield. They have 2 options by default: deploying normally or deploying embarked into an available Transport. But some special rules for a unit may (like from an uprade, etc) allow for Ambushing or Scouting.
    * Ambush: May be set aside before deployment. At the start of any round after the first, may be deployed anywhere over 9” away from enemy units. Players alternate in placing Ambushers, starting with the player that activates next. Units that deploy via Ambush can’t seize or contest objectives on the round they deploy.
    * Scout: May be set aside before deployment. After all other units are deployed, must be deployed and may then be placed anywhere within 12” of their position. Players alternate in placing Scout units, starting with the player that activates next.
    * Transport(X): May transport up to X models or Heroes with up to Tough(6), and non-Heroes with up to Tough(3) which occupy 3 spaces each.Transports may deploy with units inside, and units may enter/exit by using any move action, but must stay fully within 6” of it when exiting. When a transport is destroyed, units inside must take a dangerous terrain test, are Shaken, and must be placed fully within 6” of the transport before removal. Note that units inside Transports are deployed at the same time as the Transport, and units can’t both embark/disembark as part of the same activation. Units inside/outside of Transports don’t have line of sight to the outside/inside, so they can’t target each other for shooting, spells, etc. (but units inside can target other units inside, and the Transport itself). Units may use Charge actions to disembark, and they ignore the 1” move restriction when embarking (only one model needs to reach the Transport for everyone to embark). 
    *Example: Regular models and Heroes with Tough(3) or Tough(6) occupy 1 space, Tough(3) models occupy 3 spaces, and models with Tough(6) or higher can’t be transported. This means that a unit of 10 regular models with a Tough(3) Hero occupy 11 spaces in total.*
3. After each player deploys their units via standard deployment by turn, them ambushing starts by turn order, then units that are scouting.
4. **Game Rounds**: The game progresses through rounds, with each player taking a turn. Each turn is by activating a unit, chosing an action available.
    * For campaigns, at the beginning of each round a roll for a Random Event occurs: Random Events: At the beginning of each round players must roll one die, and on a 5+ a random event happens.
        - Rolling for Random Events: When rolling for random events, roll two separate dice one at a time, where the first one represents the first number, whilst the second one represents the second number, and resolve that event. *Example: A player rolls two dice, with the first result being a 2 and the rescond result being a 1. This would mean that event 21 is chosen.*
    * Activiation/Actions
        * Hold: Unit stays in place, can shoot
        * Advance: May move 6" (+/- modifiers), can shoot
        * Rush: May move 12" (+/- modifiers), cannot shoot
        * Charge: May move 12" into melee
    * Shooting: When taking a Shooting action, a unit must pick one valid target and all models in the unit may shoot at it.
        * Who can shoot: All models in a unit with line of sight to the target, and that have a weapon that is within range of it, may fire at it. Note that models may always ignore friendly models from their own unit when determining line of sight.
        * Multiple Weapon Types: If a unit is firing multiple weapon types, then you may separate each weapon type into its own weapon group. Each group may be fired at a different target, however you may fire only at up to two different targets, and all weapons from the same group must fire at the same target. Note that the target for each weapon group must be declared before rolling, and all weapons are fired simultaneously.
    * Melee: When taking a Charge action, a unit must pick one valid target and all models in the unit must charge it.
        * Who can Strike: All models that are within 2” horizontally and 4” vertically of an enemy model from the target unit, may attack it. Models must strike with all of their melee weapons, and may only strike at models from the target unit.
        * Determine Attacks: Sum the Attack value from the weapons of all models that can strike at the target to determine how many attacks the unit has in total for this melee.
        * Return Strikes: Once all charging models have attacked, the defending unit may choose to strike back (following the melee sequence again), but doesn’t have to. Note that striking back does not count as its activation, and activated units may strike back.
        * Fatigue: After attacking in melee for the first time during a round, either by charging or by striking back, units only hit on unmodified rolls of 6 in melee until the end of that round.
        * Melee Resolution: Sum the total number of wounds that each unit caused, and compare the two. If one unit caused more wounds than the other, then it counts as the winner, and the opposing unit must take a morale test. Note that in melee only the loser takes a morale test, regardless of casualties. If the units are tied for how many wounds they caused, or neither unit caused any wounds, then the melee is a tie and neither unit must take a morale test. This means that if a unit didn’t strike back in melee, then it must only take a morale test if it suffered at least one wound.
    * Morale Tests: At the end of any activation (whether it's their turn or another player's) in which a unit takes wounds that leave it with half or less of its starting size or tough value (for units with a single model), it must take a morale test. Note that starting size is counted at the beginning of the game.
        * To take a morale test, the affected unit must simply take one regular Quality test, and see what happens:
            * If the test is passed, nothing happens.
            * If the test is failed, the unit is Shaken.
        * Melee Morale Tests: Units that were in melee don’t take morale tests from wounds at the end of an activation, but must compare the number of wounds each unit caused instead. The unit with the lowest total loses, and must take a morale test. Note that units that are destroyed in melee always count as having lost, and their opponent doesn’t have to take a morale test, even if it dealt less wounds, or it previously took wounds that would have otherwise caused a morale test.
            * To take a morale test, the affected unit must simply take one regular Quality test, and see what happens:
                * If the test is passed, nothing happens.
                * If the test is failed, and the unit still has over half or more of its starting size or tough value (for units with a single model), then the unit is Shaken.
                * If the test is failed, and the unit only has half or less of its starting size or tough value (for units with a single model), then the unit Routs.
    * Shaken units must stay idle, always count as fatigued, always fail morale tests, and can’t contest or seize objectives. When activated, Shaken units must spend their activation being idle and doing nothing, which stops them from being Shaken at the end of their activation.
    * Routed units have lost all hope and are taken captive, flee the battle, or are otherwise rendered ineffective. Simply remove the entire unit from the game as a casualty

5. **Game End**: the game ends after a predetirmined number of rounds, or other conditions specified in the mission. Players will have an "End Game" button to finish the game, we will not keep track of objectives currently as we're not tracking locations of units and different missions will have different objectives.
    - For campaign games, at the end of the game, all units that were destroyed or routed count as "casualties". 
        - For every Regular unit that is a casualty roll 1D6 to see what happens:            
            1. Dead - Remove the unit from your army sheet. 
            2. Recovered - Unit recovers and may be used without penalties. 
            3. Recovered - Unit recovers and may be used without penalties. 
            4. Recovered - Unit recovers and may be used without penalties. 
            5. Recovered - Unit recovers and may be used without penalties. 
            6. Natural Talent - Unit recovers and earns +1 XP.
        - Hero Units: Follow the same rules as above, however on a 1 it becomes 5pts cheaper and gets an Injury trait, and on a 6 it becomes 5pts more expensive and gains a Talent trait. Each trait can only be gained once, so if you roll the same result simply re-roll. 
        - Hero Unit Injury
            1. Dead - Remove the hero from your army sheet. 
            2. Chest Wound - Gets -1 to rolls when blocking hits. 
            3. Blinded Eye - Gets -1 to rolls when shooting. 
            4. Arm Injury - Gets -1 to rolls when in melee. 
            5. Traumatized - Gets -1 to rolls when taking morale tests. 
            6. Smashed Leg - Moves -1” on advance and -2” on rush and charge actions.
        - Hero Talent Traits
            1. Natural Talent - The hero recovers and gets +1 XP. 
            2. Motivated - Always passes the first morale test of the match. 
            3. Crazed - Gets +1 attack in melee when charging. 
            4. Bitter Rivalry - Gets +1 to hit against enemy heroes. 
            5. Horrible Scars - Enemy units get -1 to hit when in melee against the hero. 
            6. Toughened - Gets Tough(+1).
    - Mission Goals: The winning army gets 2 VP and 150pts, whilst all losing armies get 300pts
    - Earning XP: Units earn XP at the end of battle for each of the following things:
        - +1 XP: Not a casualty
        - +1 XP: Killed a unit
        - +2 XP: Killed a hero unit
        - +3 XP: Killed a hero and its unit