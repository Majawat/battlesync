# One Page Rules Documentation

This directory contains converted OPR rules documentation for BattleSync development reference.

## Structure

- `core/` - Core game rules (Beginners Guide, Advanced Rules)
- `campaigns/` - Campaign-specific rules and mechanics
- `armies/` - Army books and faction-specific rules
- `versions/` - Version tracking for rule updates

## Version Tracking

Each rule set includes version information in the header:
- **Version**: Rule book version/date
- **Converted**: Date of markdown conversion
- **Source**: Original PDF reference

## Usage in Development

These rules serve as reference material for:
- Implementing game mechanics in BattleSync
- Validating army compositions and rules
- Understanding campaign progression systems
- Building rule enforcement features

## Updating Rules

When new OPR versions are released:
1. Convert new PDF to markdown
2. Update version information in file headers
3. Compare changes with previous versions
4. Update any affected BattleSync features