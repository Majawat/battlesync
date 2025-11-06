# BattleSync Scripts

Utility scripts for maintaining and developing BattleSync.

## downloadArmyBooks.ts

Downloads all official OPR army books (PDFs and JSONs) and common rules from ArmyForge.

### Usage

```bash
npx ts-node scripts/downloadArmyBooks.ts
```

### What it does

1. Fetches the list of all official army books from ArmyForge API
2. For each army book:
   - For each enabled game system (GF, GFF, AOF, etc.):
     - Downloads the PDF from army-forge-studio
     - Downloads the JSON from army-forge API (includes unit stats, upgrades, faction-specific rules)
     - Saves both to organized folder structure
3. Downloads common rules for each game system:
   - Fetches rules and traits that apply across all factions
   - Saves with version number matching the army books

### Output Structure

```
docs/rules/OPR/
├── GF/
│   ├── CommonRules/
│   │   └── 3.5.0/
│   │       └── GF - Common Rules 3.5.0.json
│   └── ArmyBooks/
│       ├── Alien Hives/
│       │   └── 3.5.0/
│       │       ├── GF - Alien Hives 3.5.0.pdf
│       │       └── GF - Alien Hives 3.5.0.json
│       └── Blessed Sisters/
│           └── 3.5.0/
│               ├── GF - Blessed Sisters 3.5.0.pdf
│               └── GF - Blessed Sisters 3.5.0.json
├── GFF/
│   ├── CommonRules/
│   │   └── 3.5.0/
│   │       └── GFF - Common Rules 3.5.0.json
│   └── ArmyBooks/
│       └── ...
└── AOF/
    ├── CommonRules/
    │   └── 3.5.0/
    │       └── AOF - Common Rules 3.5.0.json
    └── ArmyBooks/
        └── ...
```

### Features

- **Comprehensive download** - Army books (PDF + JSON) + Common rules (JSON)
- **Smart file checking** - Uses HEAD requests to check filename and size before downloading
- **Skips existing files** - Won't re-download if file already exists and matches expected size
- **Rate limiting** - 500ms delay between requests to be nice to OPR servers
- **Error handling** - Continues on errors, logs failures
- **Progress tracking** - Shows detailed progress for each download
- **Version tracking** - Automatically uses version from army books for common rules

### Game Systems Supported

- GF - Grimdark Future
- GFF - GF: Firefight
- AOF - Age of Fantasy
- AOFS - AOF: Skirmish
- AOFR - AOF: Regiments
- AOFQ - AOF: Quest
- AOFQAI - AOF: Quest AI
- GFSQ - GF: Star Quest
- GFSQAI - GF: Star Quest AI

### Notes

- Only downloads **official** army books (filters=official)
- Creates nested folder structure automatically
- Sanitizes filenames to avoid filesystem issues
- Common rules include both `rules` (special abilities) and `traits` (campaign traits)
- All JSONs are saved exactly as returned from the API (no modifications)
- Run periodically to get latest versions when OPR updates army books or rules
