# CI, Dependencies & Security — Setup & Handoff (v2)

_Last updated: 2026-08-29._

This document describes the automated quality/security tooling on the BattleSync
repository and the state of the v1 → v2 adoption. It is a standalone handoff: someone
new should be able to read only this file and understand the CI/security posture.

---

## 0. v2 is now the mainline

As of 2026-08-29, `main` **is** the v2 codebase (the clean rewrite: Express 5 + raw
SQLite + React 19 / Router 7, single-port on 4019). The previous v1 line is preserved
and fully recoverable via tags:

| Tag | What |
| --- | --- |
| `v1.5.2-final-archive` | v1 at 1.5.2 (the original archive point). |
| `v1-final` | v1's final tip, including its 2026-08 security hardening. |

There is no `v2-clean` branch anymore — it became `main`.

---

## 1. GitHub-native security features (enabled)

Repo settings (Settings → Code security), unaffected by the branch swap:

| Feature | What it does |
| --- | --- |
| **Dependabot alerts** | Flags known-vulnerable dependencies. |
| **Dependabot security updates** | Auto-opens PRs bumping vulnerable deps. |
| **Secret scanning** + **push protection** | Detects/blocks committed secrets. |
| **CodeQL code scanning** | Static analysis on every PR and on `main`. |
| **Dependabot version updates** | Weekly dependency-bump PRs (config in §3). |

---

## 2. Continuous Integration — `.github/workflows/ci.yml`

Runs on every **pull request** and on **push to `main`**. Node 20 (matches the
Dockerfile's `node:20-alpine`).

| Job | Steps |
| --- | --- |
| **Backend** | `npm ci` → `npm run typecheck` → `npm test` → `npm run build:backend` |
| **Frontend** | `npm ci` → `npm run build` (`build` runs `tsc -b` then `vite build`) |

No Prisma step — v2 uses raw `sqlite3`. CI is **informational** (not a required check).

### Running the same checks locally
```bash
npm ci && npm run typecheck && npm test && npm run build:backend
cd frontend && npm ci && npm run build
```

---

## 3. Dependabot — `.github/dependabot.yml`

Weekly updates: **npm** (`/` and `/frontend`), **docker** (`/`), **github-actions**.
Minor/patch batched per workspace; `react`/`react-dom` kept together; majors arrive as
individual PRs.

---

## 4. Test suite notes

- Backend tests: `jest` + `ts-jest` + `supertest` under `tests/`.
- Tests are **deterministic and offline**. The import route fetches ArmyForge via the
  global `fetch`; `tests/setup/fetchMock.ts` (a `setupFilesAfterEnv` file) serves frozen
  fixtures from `tests/fixtures/` instead of the network, and returns 404 for unknown
  ids. `validation.test.ts` reads the fixture from disk directly.
  **Do not reintroduce live network calls into tests** — add a fixture and route it
  through the mock. `IJ1JM_m-jmka` uses the committed `scripts/sampleArmyData` snapshot;
  golden totals in the tests are pinned to that frozen fixture.
- Rate limiting is **disabled when `NODE_ENV=test`** (see §5) so supertest doesn't 429.
- The frontend has two orphaned test-scaffold files (`src/setupTests.ts`,
  `src/hooks/useDarkMode.test.ts`) with no runner wired up; they're **excluded** from the
  production `tsc -b` build (`frontend/tsconfig.app.json`). A frontend test runner
  (vitest) could be added later.

---

## 5. Security hardening (done during adoption)

Both scanners were run against v2 and remediated:

- **Dependencies (Dependabot: 100 → 0).** `npm audit fix` in both workspaces plus
  `sqlite3` 5 → 6 (the critical node-tar chain came from sqlite3@5's build-time
  `node-gyp` toolchain).
- **Firmware path traversal (CodeQL `js/path-injection`).** The multer `filename`
  callback built the on-disk name from the user-supplied `req.body.version` before the
  route validated it; a crafted `version` could traverse out of `./firmware/`. It now
  requires a strict semver to be embedded in the path (otherwise a safe temp name).
- **Rate limiting (CodeQL `js/missing-rate-limiting`).** Added `express-rate-limit`: a
  generous general limiter app-wide plus a stricter one on the firmware upload / admin
  clear endpoints. Skipped under `NODE_ENV=test`.
- **Build correctness.** `build:backend` now copies `src/database/schema.sql` into
  `dist/` (`copy:assets`), so `npm start` works outside Docker.
- **Re-import bug.** `storeArmyInDatabase` updates the army row in place instead of
  `INSERT OR REPLACE`, so re-importing an army already used in a battle no longer fails
  the `battle_participants` foreign key (and the army's id stays stable).

---

## 6. Archive-rules bot — `.github/workflows/archive-rules.yml`

Weekly (Mondays 08:00 UTC, + manual dispatch). Runs `npm run archive-rules`
(`scripts/downloadArmyBooks.ts`) with `ARCHIVE_JSON_ONLY=1` and commits any new OPR
rules under `docs/rules/` with `[skip ci]`. JSON-only keeps the machine-readable rules
current without committing large PDF binaries; drop the env var to also archive PDFs.
The downloader skips versions already on disk, so runs with nothing new are no-ops.

---

## 7. Required production configuration

The server reads `PORT` (default 4019) and `NODE_ENV`. SQLite data lives in `./data/`
(gitignored; Docker mounts a volume). There are no required secrets for the core app;
if the firmware endpoints are exposed publicly, keep the rate limits (§5) in place.

---

## 8. Outstanding

- **Alerts**: Dependabot **0**; CodeQL down to the last firmware alert, whose fix is
  merged (`path.basename` confinement) and just awaits CodeQL's next scan of `main`.
- **Held Dependabot PRs (breaking / dev majors, need a manual pass):**
  `typescript` 5.9 → 7, `eslint` 9 → 10, `@vitejs/plugin-react` 4 → 6 (all fail CI as-is),
  plus dev-only `globals` 16 → 17 and `@testing-library/jest-dom` 6 → 7. The
  `backend-minor-patch` group PR needs a rebase (it mis-grouped a `jest` 29 → 30 major).
  The React frontend majors (`plugin-react` 6 / `eslint` 10 / `typescript` 7) are best
  done together as one deliberate toolchain upgrade.
- A **frontend test runner** (vitest) could be wired up for the two orphaned test files
  (`src/setupTests.ts`, `src/hooks/useDarkMode.test.ts`), currently excluded from the build.
