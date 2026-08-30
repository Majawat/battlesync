# CI, Dependencies & Security — Setup & Handoff (v2)

_Last updated: 2026-08-30._

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

Runs on every **pull request** and on **push to `main`**.

| Job | Node | Steps |
| --- | --- | --- |
| **Backend** | 20 (matches the Dockerfile's `node:20-alpine` runtime) | `npm ci` → `npm run typecheck` → `npm test` → `npm run build:backend` |
| **Frontend** | 22 | `npm ci` → `npm run lint` → `npm test` (vitest) → `npm run build` (`build` runs `tsc -b` then `vite build`) |

The frontend job runs on **Node 22** because its build/test tooling (vite 8, vitest 4,
jsdom 30, jest-dom 7) now requires Node ≥ 22. That is **dev tooling only** — the frontend
is compiled to static assets, so its build Node version is independent of the server
runtime, which stays on Node 20.

No Prisma step — v2 uses raw `sqlite3`. CI is **informational** (not a required check).

### Running the same checks locally
```bash
npm ci && npm run typecheck && npm test && npm run build:backend
cd frontend && npm ci && npm run lint && npm test && npm run build
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
  - **Watch out for `axios` in tests.** `axios` uses Node's http adapter and **bypasses
    the global-`fetch` mock**, so any test that calls `axios.get(<live URL>)` silently hits
    the network and is nondeterministic. Both `validation.test.ts` and
    `comprehensive-army-test.test.ts` now read fixtures from disk instead. When adding a
    test, grep for `axios.get(` before assuming it's offline.
- Rate limiting is **disabled when `NODE_ENV=test`** (see §5) so supertest doesn't 429.
- Frontend tests run on **vitest** (jsdom environment, configured in the `test` block of
  `frontend/vite.config.ts`; `src/setupTests.ts` registers `@testing-library/jest-dom`
  matchers). `npm test` in `frontend/` runs them and CI runs them too. Test files stay
  **excluded** from the production `tsc -b` build (`frontend/tsconfig.app.json`) — vitest
  transforms them via esbuild, so they never enter the shipped bundle.
- `npm run lint` (eslint 10, flat config in `frontend/eslint.config.js`) is **clean and
  enforced in CI**. Errors use real types / the `getApiErrorMessage` helper rather than
  `any`; keep it that way (no new `no-explicit-any`).

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
rules under `docs/rules/OPR/` with `[skip ci]`. JSON-only keeps the machine-readable
rules current without committing large PDF binaries; drop the env var to also archive
PDFs. The downloader skips versions already on disk, so runs with nothing new are no-ops.

**Layout & versioning.** v2 writes `docs/rules/OPR/<SYS>/ArmyBooks/<Book>/<ver>/` and
`.../CommonRules/<ver>/`, versioning **each army book by its own version** (books are at
3.5.0; only the common rules track 3.5.x). This differs from the retired v1 archiver,
which wrote `archives/<system-slug>/v<common-rules-ver>/<army-slug>.json` — versioning
*everything* by the common-rules version. The two formats are not interchangeable; the
v1 `archives/` tree present on `main` is a frozen historical snapshot (see the CHANGELOG
"Post-adoption" entry), not something the v2 tooling reads or updates.

**Triggering manually.** The scheduled run is the normal path. A fine-grained PAT needs
the **Actions: write** permission to POST a `workflow_dispatch`; without it, run the
script locally (`ARCHIVE_JSON_ONLY=1 npm run archive-rules`) and commit the result, which
is exactly what the workflow does.

---

## 7. Required production configuration

The server reads `PORT` (default 4019) and `NODE_ENV`. SQLite data lives in `./data/`
(gitignored; Docker mounts a volume). There are no required secrets for the core app;
if the firmware endpoints are exposed publicly, keep the rate limits (§5) in place.

---

## 8. Outstanding

- **Alerts**: Dependabot **0**, CodeQL **0**.
- **Dependencies are current** except one held major. Toolchain majors are done
  (frontend ESLint 9 → 10, `@vitejs/plugin-react` 4 → 6 with Vite 7 → 8,
  `eslint-plugin-react-hooks` 5 → 7, `globals` 16 → 17; backend `jest-dom` 6 → 7 +
  minor-patch group). **Tailwind CSS is on v4** (CSS-first `@theme`; see the CHANGELOG
  "Post-adoption" entry). `typescript` is 5.9.3, `@types/node` tracks the Node 20 runtime
  (^20), and the dead `@types/axios` stub was removed.
- **The one held major — `typescript` 5.9 → 7 (Dependabot #48, kept open as a tracker,
  blocked by the ecosystem).** TS 7 is incompatible with two pinned dev tools: `ts-jest`
  (peers `typescript <7`, would break the backend Jest transform) and `typescript-eslint`
  (peers `typescript <6.1.0`, would break frontend lint). Neither ships TS 7 support in any
  release channel yet. Revisit once both do, then bump `typescript` in the root **and**
  `frontend` workspaces together.
- **Next feature work (planned, not started): automated OPR mechanics.** Today unit state
  (`status`, `is_fatigued`) is stored but only updated manually via
  `PATCH /api/battles/:battleId/units/:unitStateId`; `battle_events` exists but is never
  written and `battles.current_round` never advances. The roadmap is M0 event-log +
  undo + round-advance → M1 fatigue automation → M2 morale tests → M3 frontend. See
  `docs/features.md` (Planned Features).
