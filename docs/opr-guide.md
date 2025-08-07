# OPR Grimdark Future Guide

Understanding One Page Rules' Grimdark Future system for proper battle tracking.

## Army Structure

### Unit Types

**Regular Units**
- Standard units (single or multi-model)
- Use base stats and rules as-is

**Combined Units** 
- Doubled model count from regular units
- Appears as 2 separate units in ArmyForge with different stats
- Must carefully merge during import (not just double)
- Often have different upgrade combinations

**Joined Units**
- Hero attached to regular unit  
- Hero uses unit's Defense stat until last model
- Damage allocated to regular models first (unless Sniper rule)
- Special naming format: "Hero w/ Unit Name"

## Battle Flow

### Setup Phase
- Determine turn order
- Choose doctrines/special rules
- Set up terrain and objectives

### Deployment Phase
- **Standard**: Deploy normally
- **Ambush**: Deploy later via special rule
- **Scout**: Deploy after others, can move
- **Transport**: Deploy inside vehicles

### Game Rounds
Players alternate activating units with actions:

- **Hold**: Stay in place, can shoot
- **Advance**: Move 6", can shoot
- **Rush**: Move 12", no shooting  
- **Charge**: Move 12" into melee combat

### End Game
- Predetermined number of rounds OR
- Mission-specific victory conditions

## Critical Tracking Requirements

### Unit Health
- **Model Casualties**: Track individual model removal
- **Wounds**: Track damage on tough models

### Unit States
- **Normal**: Can act normally
- **Shaken**: Idle, can't contest objectives, can't advance  
- **Routed**: Removed from play permanently

### Special Conditions
- **Fatigue**: After melee participation, only hit on 6s until round end
- **Damage Allocation**: Regular models first, then Heroes (unless Sniper)
- **Defense Stats**: Joined units use base unit Defense until Hero is last model

### Tests and Actions
- **Morale Tests**: When unit drops to half size or loses melee
- **Action History**: Track for undo functionality and battle reports

## ArmyForge Integration

### Import Process
- **Share Links**: https://army-forge.onepagerules.com/share?id=...
- **API Endpoint**: https://army-forge.onepagerules.com/api/tts?id=...
- **Data Trust**: ArmyForge handles validation - trust their structure
- **Upgrade Handling**: Process all upgrade/trait edge cases from JSON

### Special Cases
- **Combined Units**: Merge 2 ArmyForge units with "join to" field
- **Campaign XP**: Calculate level costs (25pts regular, 55pts hero per 5XP)
- **Transport Capacity**: Not implemented - users handle manually

## Battle Tracking Features

### Required Tracking
- Unit health and casualties
- Unit states (Normal/Shaken/Routed)  
- Fatigue status after melee
- Action history for undo
- Morale test results

### Planned Features
- Basic undo for last action
- Battle history and reports
- Export capabilities
- Multi-round game management

---

*This guide ensures BattleSync properly handles all OPR Grimdark Future mechanics.*