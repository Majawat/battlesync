/**
 * OPR Rules Archiver
 *
 * Fetches all official game systems and army books from the ArmyForge API
 * and saves them as versioned JSON snapshots under archives/.
 *
 * Folders are named by game system version (e.g. archives/grimdark-future/v3.1/)
 * so old rule sets are always preserved when OPR releases updates.
 *
 * Only downloads data that has changed since the last run, determined by
 * comparing game system versions against archives/manifest.json.
 *
 * Run manually:  npm run archive-rules
 * Run in CI:     see .github/workflows/archive-rules.yml
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'https://army-forge.onepagerules.com/api';
const ARCHIVES_DIR = path.join(__dirname, '..', 'archives');

// Maps the game system code returned by /game-systems to the slug used
// by /army-books?gameSystemSlug= and to the numeric ID used by
// /army-books/{uid}?gameSystem= (OPR's internal DB identifier).
// Update the numeric IDs here if the endpoint starts returning 404s.
const GAME_SYSTEM_META: Record<string, { slug: string; numericId: number }> = {
  gf:   { slug: 'grimdark-future',            numericId: 1 },
  aof:  { slug: 'age-of-fantasy',              numericId: 2 },
  ff:   { slug: 'grimdark-future-firefight',   numericId: 3 },
  wftl: { slug: 'grimdark-future-warfleet',    numericId: 4 },
};

interface ManifestEntry {
  version: string;
  archivedAt: string;
  bookCount: number;
}

interface Manifest {
  lastChecked: string;
  systems: Record<string, ManifestEntry>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function get(url: string): Promise<any> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'BattleSync/1.0' },
        timeout: 30_000,
      });
      return res.data;
    } catch (err: any) {
      if (attempt === 3) throw err;
      console.warn(`    Retry ${attempt}/3 for ${url}: ${err.message}`);
      await sleep(1000 * attempt);
    }
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/** Slugify a book name for use as a filename */
function toFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Sanitize a version string for use in a directory name */
function toVersionDir(version: string): string {
  return `v${version.replace(/[^a-z0-9._-]/gi, '-')}`;
}

// ── Manifest ─────────────────────────────────────────────────────────────────

function loadManifest(): Manifest {
  const p = path.join(ARCHIVES_DIR, 'manifest.json');
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  return { lastChecked: '', systems: {} };
}

function saveManifest(manifest: Manifest) {
  writeJson(path.join(ARCHIVES_DIR, 'manifest.json'), manifest);
}

// ── Core archiver ─────────────────────────────────────────────────────────────

async function archiveGameSystem(
  code: string,
  slug: string,
  version: string,
  gameSystemMeta: any,
): Promise<number> {
  const versionDir = toVersionDir(version);
  const dir = path.join(ARCHIVES_DIR, slug, versionDir);

  if (fs.existsSync(dir)) {
    console.log(`  Already on disk at ${slug}/${versionDir} — skipping fetch.`);
    return 0;
  }

  // Save game system metadata
  writeJson(path.join(dir, '_game-system.json'), gameSystemMeta);

  // Fetch the full army books index for this game system
  console.log(`  Fetching army books index...`);
  const books: any[] = await get(
    `${API_BASE}/army-books?filters=official&gameSystemSlug=${slug}`,
  );

  if (!Array.isArray(books) || books.length === 0) {
    console.warn(`  No books returned for ${slug} — check slug or API.`);
    return 0;
  }

  writeJson(path.join(dir, '_index.json'), books);
  console.log(`  Index saved: ${books.length} books`);

  const numericId = GAME_SYSTEM_META[code]?.numericId;
  let saved = 0;

  for (const book of books) {
    if (!book.uid) {
      console.warn(`  Skipping book with no uid: ${book.name ?? '(unnamed)'}`);
      continue;
    }

    await sleep(400); // polite pacing — don't hammer OPR's API

    try {
      const bookUrl = numericId
        ? `${API_BASE}/army-books/${book.uid}?gameSystem=${numericId}`
        : `${API_BASE}/army-books/${book.uid}`;

      const fullBook = await get(bookUrl);
      const filename = toFilename(book.name ?? book.uid) + '.json';
      writeJson(path.join(dir, filename), fullBook);
      saved++;
      console.log(`  ✓ ${book.name}`);
    } catch (err: any) {
      console.warn(`  ✗ ${book.name ?? book.uid}: ${err.message}`);
    }
  }

  return saved;
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  console.log('=== OPR Rules Archiver ===\n');

  const manifest = loadManifest();
  manifest.lastChecked = new Date().toISOString();

  console.log('Fetching game systems from ArmyForge API...');
  const raw = await get(`${API_BASE}/game-systems`);

  // ArmyForge wraps some responses in { success, data } and returns others as
  // a direct array — handle both defensively.
  const gameSystems: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);

  if (gameSystems.length === 0) {
    console.error('No game systems returned — check API connectivity.');
    process.exit(1);
  }

  console.log(`Found ${gameSystems.length} game system(s).\n`);

  let changed = 0;

  for (const gs of gameSystems) {
    // The API may use different field names — try the known ones
    const code: string = gs.gameSystemId ?? gs.id ?? gs.slug ?? '';
    const version: string = gs.version ?? gs.currentVersion ?? '';
    const meta = GAME_SYSTEM_META[code];
    const slug = meta?.slug ?? code;

    if (!version) {
      console.log(`${slug}: no version field in API response — skipping.`);
      continue;
    }

    const known = manifest.systems[slug]?.version;

    if (known === version) {
      console.log(`${slug}: v${version} — up to date, no changes.`);
      continue;
    }

    const reason = known
      ? `updated from v${known} → v${version}`
      : `first archive at v${version}`;

    console.log(`\n${slug}: ${reason}`);

    const bookCount = await archiveGameSystem(code, slug, version, gs);

    manifest.systems[slug] = {
      version,
      archivedAt: new Date().toISOString(),
      bookCount,
    };
    changed++;
  }

  saveManifest(manifest);
  console.log('\nManifest updated.');

  if (changed === 0) {
    console.log('\nAll game systems are up to date — nothing new to archive.');
  } else {
    console.log(`\n✓ Archived ${changed} updated game system(s).`);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
