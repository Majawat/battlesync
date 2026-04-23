/**
 * OPR Rules Archiver
 *
 * Fetches all official army books from the ArmyForge API and saves them as
 * versioned JSON snapshots under archives/.
 *
 * Folders are named by the version string found in the API response
 * (e.g. archives/grimdark-future/v3.1/). When no version is available the
 * archive date is used as the folder name instead.
 *
 * Change detection: the army books index for each game system is hashed on
 * every run. Only when the hash differs from the stored manifest value are
 * the full books re-fetched and saved. This keeps no-op runs cheap.
 *
 * Run manually:  npm run archive-rules
 * Run in CI:     see .github/workflows/archive-rules.yml
 */

import axios from 'axios';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'https://army-forge.onepagerules.com/api';
const ARCHIVES_DIR = path.join(__dirname, '..', 'archives');

// Known game systems — the /game-systems endpoint returns 404 publicly,
// so we enumerate slugs directly.
// Confirmed slugs are verified from gameSystemSlug fields in archived book data.
// Guessed slugs follow OPR naming conventions — if wrong the index returns
// empty and the system is silently skipped.
// The ?gameSystem= parameter for full book fetches is taken from each book's
// own enabledGameSystems[0] field, so no hardcoded numeric IDs are needed.
const GAME_SYSTEMS = [
  // Grimdark Future — IDs 2, 3, 9, 10 (slugs for 9 & 10 unconfirmed)
  { slug: 'grimdark-future' },            // ID 2, key GF  — confirmed
  { slug: 'grimdark-future-firefight' },  // ID 3, key GFF — confirmed
  { slug: 'grimdark-future-warfleet' },   // confirmed
  { slug: 'grimdark-future-epic' },       // ID 9 or 10 — guessed
  { slug: 'grimdark-future-conquest' },   // ID 9 or 10 — guessed
  // Age of Fantasy — IDs 4, 5, 6, 7, 8 (slugs for 6 & 8 unconfirmed)
  { slug: 'age-of-fantasy' },             // ID 4, key AOF  — confirmed
  { slug: 'age-of-fantasy-skirmish' },    // ID 5, key AOFS — confirmed
  { slug: 'age-of-fantasy-quest' },       // ID 7, key AOFQ — confirmed
  { slug: 'age-of-fantasy-regiments' },   // ID 6 or 8 — guessed
  { slug: 'age-of-fantasy-epic' },        // ID 6 or 8 — guessed
];

interface ManifestEntry {
  fingerprint: string;   // SHA-256 hash of the index response (change detection)
  version: string;       // version string from API, or archive date as fallback
  archivePath: string;   // relative path where this version is stored
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

function toFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** SHA-256 of the index (sorted by uid for stability) truncated to 8 chars */
function fingerprint(books: any[]): string {
  const stable = [...books].sort((a, b) =>
    String(a.uid ?? '').localeCompare(String(b.uid ?? '')),
  );
  return createHash('sha256')
    .update(JSON.stringify(stable))
    .digest('hex')
    .slice(0, 8);
}

/**
 * Try to extract a human-readable version string from the index response.
 * OPR may expose this as versionString, version, gameSystemVersion, etc.
 * Falls back to today's date so folders are always meaningful.
 */
function extractVersion(books: any[]): string {
  const first = books[0] ?? {};
  const candidate =
    first.versionString ??
    first.gameSystemVersion ??
    first.version ??
    first.gameVersion ??
    '';
  if (candidate && String(candidate).trim()) return String(candidate).trim();
  // Fallback: use archive date
  return new Date().toISOString().slice(0, 10);
}

// ── Manifest ─────────────────────────────────────────────────────────────────

function loadManifest(): Manifest {
  const p = path.join(ARCHIVES_DIR, 'manifest.json');
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  return { lastChecked: '', systems: {} };
}

function saveManifest(manifest: Manifest) {
  writeJson(path.join(ARCHIVES_DIR, 'manifest.json'), manifest);
}

// ── Core archiver ─────────────────────────────────────────────────────────────

async function archiveSystem(
  slug: string,
  books: any[],
  version: string,
): Promise<number> {
  const folderName = `v${version}`.replace(/[^a-z0-9._-]/gi, '-');
  const dir = path.join(ARCHIVES_DIR, slug, folderName);

  fs.mkdirSync(dir, { recursive: true });

  // Save the raw index
  writeJson(path.join(dir, '_index.json'), books);
  console.log(`  Saved index: ${books.length} books → ${slug}/${folderName}/`);

  let saved = 0;

  for (const book of books) {
    if (!book.uid) {
      console.warn(`  Skipping book with no uid: ${book.name ?? '(unnamed)'}`);
      continue;
    }

    await sleep(400); // polite pacing

    try {
      // Use the book's own enabledGameSystems[0] — the API returns this field
      // so we never have to guess the numeric game system ID.
      const gameSystemId = book.enabledGameSystems?.[0] ?? 2;
      const url = `${API_BASE}/army-books/${book.uid}?gameSystem=${gameSystemId}`;
      const fullBook = await get(url);
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

  let changed = 0;
  let errors = 0;

  for (const gs of GAME_SYSTEMS) {
    const { slug } = gs;

    try {
      console.log(`\nChecking ${slug}...`);
      const books: any[] = await get(
        `${API_BASE}/army-books?filters=official&gameSystemSlug=${slug}`,
      );

      if (!Array.isArray(books) || books.length === 0) {
        console.warn(`  No books returned — skipping.`);
        continue;
      }

      const fp = fingerprint(books);
      const known = manifest.systems[slug];

      if (known?.fingerprint === fp) {
        console.log(`  No changes (fingerprint ${fp} matches stored).`);
        continue;
      }

      const version = extractVersion(books);
      const reason = known
        ? `fingerprint changed (${known.fingerprint} → ${fp})`
        : `first archive`;

      console.log(`  ${reason} — version: ${version}`);

      const bookCount = await archiveSystem(slug, books, version);
      const folderName = `v${version}`.replace(/[^a-z0-9._-]/gi, '-');

      manifest.systems[slug] = {
        fingerprint: fp,
        version,
        archivePath: `${slug}/${folderName}`,
        archivedAt: new Date().toISOString(),
        bookCount,
      };
      changed++;
    } catch (err: any) {
      console.error(`  Error processing ${slug}: ${err.message}`);
      errors++;
    }
  }

  saveManifest(manifest);
  console.log('\nManifest updated.');

  if (changed === 0 && errors === 0) {
    console.log('\nAll game systems are up to date — nothing new to archive.');
  } else {
    if (changed > 0) console.log(`\n✓ Archived ${changed} updated game system(s).`);
    if (errors > 0) {
      console.error(`\n✗ ${errors} game system(s) failed.`);
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
