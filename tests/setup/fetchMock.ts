/**
 * Global test setup: intercept outbound ArmyForge calls so the suite is
 * deterministic and offline.
 *
 * The import route (`src/server.ts`) fetches
 * `https://army-forge.onepagerules.com/api/tts?id=<armyForgeId>` directly via the
 * global `fetch`. Hitting the live API made tests flaky and pinned assertions to a
 * mutable, user-editable army. Here we serve frozen fixtures captured under
 * `tests/fixtures/` instead. Unknown IDs return a 404-style response so the
 * "invalid ArmyForge ID" cases still behave correctly.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures');

function loadFixture(id: string): unknown | null {
  const file = join(FIXTURE_DIR, `armyforge-${id}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function extractArmyForgeId(url: string): string | null {
  const match = url.match(/[?&]id=([^&]+)/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

const realFetch = global.fetch;

beforeAll(() => {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch {
      /* non-absolute URL: leave hostname empty */
    }

    if (hostname === 'army-forge.onepagerules.com') {
      const id = extractArmyForgeId(url);
      const fixture = id ? loadFixture(id) : null;
      if (fixture) {
        return new Response(JSON.stringify(fixture), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Unknown / invalid army id -> mimic ArmyForge's not-found behaviour.
      return new Response('Not Found', { status: 404 });
    }

    // Any other host is not expected in tests; fail loudly rather than hit the network.
    throw new Error(`Unexpected network call in tests: ${url}`);
  }) as typeof fetch;
});

afterAll(() => {
  global.fetch = realFetch;
});
