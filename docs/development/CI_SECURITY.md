# CI, Dependencies & Security — Setup & Handoff

_Last updated: 2026-08-28._

This document describes the automated quality/security tooling on the BattleSync
repository, how it works, what was changed, and the current state of outstanding
dependency updates. It is intended as a standalone handoff — someone new should be
able to read only this file and understand the CI/security posture.

---

## 1. GitHub-native security features (enabled)

All of these are turned **on** for the repository (Settings → Code security):

| Feature | What it does |
| --- | --- |
| **Dependabot alerts** | Flags known-vulnerable dependencies. |
| **Dependabot security updates** | Auto-opens PRs that bump vulnerable deps to a fixed version. |
| **Secret scanning** + **push protection** | Detects committed secrets and blocks pushes that introduce them. |
| **CodeQL code scanning** | Static analysis for security bugs; runs on every PR and on `main`. |
| **Dependabot version updates** | Routine weekly dependency-bump PRs (config below). |

> These are repo **settings**, not files. Toggling them requires a token/user with
> **Administration**, **Dependabot alerts**, and **Code scanning alerts** write
> permission (or the repo owner clicking through Settings → Code security).

---

## 2. Continuous Integration — `.github/workflows/ci.yml`

Runs on every **pull request** and on **push to `main`**.

| Job | Steps |
| --- | --- |
| **Backend** | `npm ci` → `npx prisma generate` → `npm run typecheck` → `npm test` → `npm run build` |
| **Frontend** | `npm ci` → `npm run typecheck` → `npm run build` (in `frontend/`) |

Notes:
- Uses Node 20. Tests need **no** database or network (see §4).
- `prisma generate` is required before typecheck/build because the backend imports
  `@prisma/client`.
- CI is currently **informational** — it reports pass/fail on PRs but does not
  *block* merges (no required-status branch protection). This is deliberate: the
  `archive-rules` bot pushes directly to `main`, and requiring checks there would
  break it. To make CI blocking, add branch protection that requires the `Backend`
  and `Frontend` checks **and** exempts the archive bot / uses a PR-only flow.

### Running the same checks locally
```bash
npm ci
npx prisma generate
npm run typecheck && npm test && npm run build
cd frontend && npm ci && npm run typecheck && npm run build
```

---

## 3. Dependabot — `.github/dependabot.yml`

Weekly updates for five ecosystems: **npm** (`/` and `/frontend`), **docker**
(`/` and `/frontend`), and **github-actions** (`/`).

**Grouping** (reduces PR noise and avoids broken partial upgrades):
- `backend-minor-patch` / `frontend-minor-patch`: all **minor/patch** bumps batched
  into a single PR per ecosystem.
- `react`: `react`, `react-dom`, `@types/react`, `@types/react-dom` always travel
  together (react and react-dom **must** share a major version).
- `github-actions`: all action bumps in one PR.
- **Major** version bumps still arrive as **individual** PRs so they get scrutiny.

---

## 4. Test suite notes

- Tests live in `src/tests/` and run via `jest` + `ts-jest`.
- `jest.config.js` `roots` must point only at `src/` (an old stray `tests/` entry
  made `npm test` fail to start — fixed).
- Tests must be **deterministic and offline**. `conversionDataStructures.test.ts`
  previously fetched a live army from the ArmyForge API
  (`GET https://army-forge.onepagerules.com/api/tts?id=…` plus a chained
  `/army-books` call) and timed out against jest's 5s limit in CI. It now uses an
  in-memory fixture. **Do not reintroduce live network calls into unit tests** —
  mock `armyForgeClient` instead.
- `weaponDistribution.test.ts` asserts the **correct** per-model distribution
  (weapons/rules split by `count`, not copied to every model). The converter
  (`distributeWeaponsToModel` / `distributeRulesToModel`) was already correct; the
  test had been written against older buggy behavior.

---

## 5. Security hardening (merged)

The following review findings were fixed (`src/utils/crypto.ts`,
`src/utils/validateEnv.ts`, `src/index.ts`, `src/services/userService.ts`):

1. **Password hashing (was CRITICAL).** Passwords were stored as
   `base64(password + "salt")` — reversible, constant salt, not hashing at all.
   Replaced with **scrypt** (Node stdlib — no native build, which is why the
   previous bcrypt attempt was abandoned on Alpine). Format `scrypt:<salt>:<hash>`,
   compared with `timingSafeEqual`.
   - **Backward compatible:** legacy base64 hashes still verify **once** so existing
     accounts aren't locked out, then are transparently re-hashed to scrypt on that
     login (`UserService.authenticateUser` + `CryptoUtils.needsRehash`).
2. **Production secret fail-fast (was HIGH).** `validateEnv()` runs at startup and,
   in production, **throws** if `JWT_SECRET` or `ENCRYPTION_KEY` is unset or equal to
   a known repo/compose default (dev only warns). See §6.
3. **Invite codes (was MEDIUM).** `generateInviteCode()` now uses `crypto.randomInt`
   instead of `Math.random()`.

### Still open (deferred security follow-ups)
- **Token encryption**: `CryptoUtils.encryptToken` uses AES-256-**CBC** with a fixed
  scrypt salt and no integrity/MAC, and silently returns the plaintext on failure.
  Move to **AES-256-GCM** with a random salt — needs a migration for already-stored
  ArmyForge tokens.
- **Login brute-force**: there is no dedicated throttle on `/auth/login`; the global
  rate limiter is disabled outside production (`src/middleware/rateLimiter.ts`). Add
  a stricter per-account/IP limiter for auth routes.
- **CBC/plaintext fallback**: encrypt/decrypt currently swallow errors and return the
  original value — remove the silent fallback once GCM lands.

---

## 6. Required production configuration

The app will **refuse to boot in production** (`NODE_ENV=production`) unless these are
set to strong, unique values (not the shipped defaults):

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs/verifies access & refresh JWTs. A default here = forgeable tokens. |
| `ENCRYPTION_KEY` | Key material for ArmyForge token encryption. |

The committed `docker-compose.yml` is a **development** config (`NODE_ENV=development`,
known `JWT_SECRET`). A production deployment needs its own compose/Dockerfile with
`NODE_ENV=production` and secrets from the environment / a secret store.

---

## 7. Outstanding dependency PRs (triage)

State as of 2026-08-28. CI (§2) reports pass/fail on each once Dependabot rebases it
onto current `main`.

### Merge when green (low risk)
- **npm_and_yarn security groups** (frontend, includes `axios` + ~10 pkgs) — these
  close actual Dependabot **alerts**; highest priority once CI is green.
- `@babel/core` (dev), `rollup` (frontend, minor).

### Blocked — needs work
- **`uuid` 11 → 14**: CI-confirmed failure. uuid v14 is **ESM-only**; `ts-jest`
  (CommonJS) throws `Unexpected token 'export'`. Requires jest ESM config
  (e.g. `transformIgnorePatterns` to transform `uuid`, or an ESM jest preset) before
  it can be merged. Do **not** merge as-is.

### Test manually before merging (breaking majors)
- **Node 18-alpine → 26-alpine** (`Dockerfile.dev` root + frontend): 8 major Node
  versions; verify Prisma 5.7 / native modules build and the container boots.
- **`joi` 17 → 18**: major bump of the request-validation library — run the suite and
  exercise auth/campaign/mission validation.
- **React 18 → 19** (`react` + `react-dom`, PRs must merge **together**): removed
  string refs / function `defaultProps`, new JSX transform. Test the frontend.
- **`@types/node` 20 → 26**: only take this if you also move the runtime to Node 26,
  otherwise the types describe APIs the runtime lacks.

---

## 8. Quick reference — how to re-check / re-enable

```bash
# Re-check a stale Dependabot PR (rebases onto main, re-runs CI):
#   comment on the PR:  @dependabot rebase

# Verify native security settings (needs an admin-scoped token):
curl -s -H "Authorization: Bearer <PAT>" \
  https://api.github.com/repos/Majawat/battlesync | \
  python -c "import sys,json;print(json.load(sys.stdin)['security_and_analysis'])"

# CodeQL default-setup state:
curl -s -H "Authorization: Bearer <PAT>" \
  https://api.github.com/repos/Majawat/battlesync/code-scanning/default-setup
```
