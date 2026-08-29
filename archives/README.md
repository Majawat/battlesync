# Legacy v1 rules archive (historical snapshot)

This folder holds **v1-format** JSON snapshots of the official One Page Rules army
books at version **3.5.2**, preserved from the v1 line before BattleSync v2 became the
repository mainline.

## Why it exists

ArmyForge only serves the **current** rules version. The v2 archiver
(`scripts/downloadArmyBooks.ts`, run weekly by `.github/workflows/archive-rules.yml`)
therefore keeps only the latest version current under `docs/rules/OPR/` (v2 format).
Version **3.5.2** is no longer downloadable, so this historical snapshot is retained
here so the data is not lost.

> The full v1 archive (both 3.5.2 **and** 3.5.3, 1,359 files) also remains permanently
> available in the git tags `v1-final` and `v1.5.2-final-archive`
> (`git show v1-final:archives/...`). Only the 3.5.2 subset is copied onto `main`.

## Format note — this is NOT the v2 layout

These files use the **v1 archiver's** directory scheme and are **not read by the v2
application or archiver**. They are inert reference data only.

| | v1 (this folder) | v2 (`docs/rules/OPR/`) |
| --- | --- | --- |
| Path | `archives/<game-system-slug>/v<ver>/<army-slug>.json` | `docs/rules/OPR/<SYS>/ArmyBooks/<Book Name>/<ver>/<SYS> - <Book> <ver>.json` |
| System id | full slug (`grimdark-future`) | abbreviation (`GF`) |
| Army id | kebab slug (`alien-hives`) | proper name (`Alien Hives`) |
| Assets | JSON only | JSON + PDF |

Current, machine-readable rules for the app live under **`docs/rules/OPR/`**.
