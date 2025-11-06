/**
 * Download all official OPR army books (PDFs and JSONs)
 *
 * Usage: npx ts-node scripts/downloadArmyBooks.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Game system ID mapping from OPR API reference
const GAME_SYSTEMS: Record<number, string> = {
  2: 'GF',      // Grimdark Future
  3: 'GFF',     // GF: Firefight
  4: 'AOF',     // Age of Fantasy
  5: 'AOFS',    // AOF: Skirmish
  6: 'AOFR',    // AOF: Regiments
  7: 'AOFQ',    // AOF: Quest
  8: 'AOFQAI',  // AOF: Quest AI
  9: 'GFSQ',    // GF: Star Quest
  10: 'GFSQAI', // GF: Star Quest AI
};

const BASE_OUTPUT_DIR = './docs/rules/OPR';
const DELAY_MS = 500; // Be nice to their servers

interface ArmyBook {
  uid: string;
  enabledGameSystems: number[];
  name: string;
  versionString: string;
  official: boolean;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '-').trim();
}

/**
 * Extract filename from Content-Disposition header
 */
function extractFilename(contentDisposition: string | undefined): string | null {
  if (!contentDisposition) return null;

  const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (match && match[1]) {
    return match[1].replace(/['"]/g, '');
  }
  return null;
}

/**
 * Make a HEAD request to get file metadata without downloading
 */
async function getFileMetadata(url: string): Promise<{ filename: string | null; size: number | null }> {
  return new Promise((resolve, reject) => {
    https.request(url, { method: 'HEAD' }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        if (response.headers.location) {
          getFileMetadata(response.headers.location).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HEAD request failed: ${response.statusCode}`));
        return;
      }

      const filename = extractFilename(response.headers['content-disposition']);
      const size = response.headers['content-length'] ? parseInt(response.headers['content-length'], 10) : null;

      resolve({ filename, size });
    }).on('error', reject).end();
  });
}

/**
 * Download a file from a URL
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        if (response.headers.location) {
          file.close();
          fs.unlinkSync(outputPath);
          downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
  });
}

/**
 * Fetch JSON from a URL
 */
async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch JSON: ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Download army book PDF and JSON for a specific game system
 */
async function downloadArmyBook(
  armyBook: ArmyBook,
  gameSystemId: number
): Promise<void> {
  const gameSystemKey = GAME_SYSTEMS[gameSystemId];
  if (!gameSystemKey) {
    console.log(`  ⚠️  Unknown game system ID: ${gameSystemId}, skipping`);
    return;
  }

  const sanitizedName = sanitizeFilename(armyBook.name);
  const version = armyBook.versionString;

  // Create directory structure: /{GameSystem}/ArmyBooks/{ArmyName}/{Version}/
  const outputDir = path.join(BASE_OUTPUT_DIR, gameSystemKey, 'ArmyBooks', sanitizedName, version);
  fs.mkdirSync(outputDir, { recursive: true });

  let actualFilename: string | null = null;

  // PDF download - check metadata first
  const pdfUrl = `https://army-forge-studio.onepagerules.com/api/army-books/${armyBook.uid}~${gameSystemId}/pdf`;

  try {
    console.log(`  🔍 Checking PDF: ${gameSystemKey} - ${armyBook.name} ${version}`);

    // Get file metadata without downloading
    const metadata = await getFileMetadata(pdfUrl);
    actualFilename = metadata.filename;

    if (!actualFilename) {
      // Fallback to constructed filename if server doesn't provide one
      actualFilename = `${gameSystemKey} - ${sanitizedName} ${version}.pdf`;
    }

    const finalPdfPath = path.join(outputDir, actualFilename);

    // Check if file exists and verify size
    let needsDownload = true;
    if (fs.existsSync(finalPdfPath)) {
      const localSize = fs.statSync(finalPdfPath).size;
      if (metadata.size && localSize === metadata.size) {
        console.log(`  ✅ PDF already exists (${localSize} bytes): ${actualFilename}`);
        needsDownload = false;
      } else {
        console.log(`  ⚠️  PDF exists but size mismatch (local: ${localSize}, remote: ${metadata.size}), re-downloading`);
      }
    }

    if (needsDownload) {
      console.log(`  ⬇️  Downloading PDF: ${actualFilename}`);
      await downloadFile(pdfUrl, finalPdfPath);
      console.log(`  ✅ PDF saved: ${actualFilename}`);
    }

    await sleep(DELAY_MS);
  } catch (err: any) {
    console.log(`  ❌ PDF failed: ${err.message}`);
    return; // Don't download JSON if PDF failed
  }

  // JSON download - use same base filename as PDF
  if (!actualFilename) return;

  const baseFilename = actualFilename.replace(/\.pdf$/i, '');
  const jsonFilename = `${baseFilename}.json`;
  const jsonPath = path.join(outputDir, jsonFilename);

  if (fs.existsSync(jsonPath)) {
    console.log(`  ✅ JSON already exists: ${jsonFilename}`);
  } else {
    try {
      const jsonUrl = `https://army-forge.onepagerules.com/api/army-books/${armyBook.uid}?gameSystem=${gameSystemId}`;
      console.log(`  ⬇️  Downloading JSON: ${jsonFilename}`);
      const jsonData = await fetchJson(jsonUrl);
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
      console.log(`  ✅ JSON saved: ${jsonFilename}`);
      await sleep(DELAY_MS);
    } catch (err: any) {
      console.log(`  ❌ JSON failed: ${err.message}`);
    }
  }
}

/**
 * Download common rules for a game system
 */
async function downloadCommonRules(
  gameSystemId: number,
  version: string
): Promise<void> {
  const gameSystemKey = GAME_SYSTEMS[gameSystemId];
  if (!gameSystemKey) {
    console.log(`  ⚠️  Unknown game system ID: ${gameSystemId}, skipping common rules`);
    return;
  }

  // Create directory structure: /{GameSystem}/CommonRules/{Version}/
  const outputDir = path.join(BASE_OUTPUT_DIR, gameSystemKey, 'CommonRules', version);
  fs.mkdirSync(outputDir, { recursive: true });

  const filename = `${gameSystemKey} - Common Rules ${version}.json`;
  const filePath = path.join(outputDir, filename);

  if (fs.existsSync(filePath)) {
    console.log(`  ✅ Common rules already exist: ${filename}`);
  } else {
    try {
      const url = `https://army-forge.onepagerules.com/api/rules/common/${gameSystemId}`;
      console.log(`  ⬇️  Downloading common rules: ${filename}`);
      const rulesData = await fetchJson(url);

      fs.writeFileSync(filePath, JSON.stringify(rulesData, null, 2));
      console.log(`  ✅ Common rules saved: ${filename}`);
      await sleep(DELAY_MS);
    } catch (err: any) {
      console.log(`  ❌ Common rules failed: ${err.message}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting OPR Army Book and Common Rules download...\n');

  try {
    // Fetch official army books list
    console.log('📋 Fetching official army books list...');
    const armyBooks: ArmyBook[] = await fetchJson(
      'https://army-forge.onepagerules.com/api/army-books?filters=official'
    );
    console.log(`✅ Found ${armyBooks.length} official army books\n`);

    // Track versions for each game system
    const gameSystemVersions = new Map<number, string>();

    let totalDownloads = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Process each army book
    for (let i = 0; i < armyBooks.length; i++) {
      const armyBook = armyBooks[i];
      if (!armyBook) continue;

      console.log(`\n[${i + 1}/${armyBooks.length}] Processing: ${armyBook.name} v${armyBook.versionString}`);
      console.log(`  Game Systems: ${armyBook.enabledGameSystems.map(id => GAME_SYSTEMS[id] || `Unknown(${id})`).join(', ')}`);

      // Track version for each game system
      for (const gameSystemId of armyBook.enabledGameSystems) {
        if (!gameSystemVersions.has(gameSystemId)) {
          gameSystemVersions.set(gameSystemId, armyBook.versionString);
        }
      }

      // Download for each enabled game system
      for (const gameSystemId of armyBook.enabledGameSystems) {
        try {
          await downloadArmyBook(armyBook, gameSystemId);
        } catch (err: any) {
          console.log(`  ❌ Error processing ${GAME_SYSTEMS[gameSystemId]}: ${err.message}`);
          totalErrors++;
        }
      }
    }

    // Download common rules for each game system
    console.log('\n\n📚 Downloading common rules for each game system...\n');
    for (const [gameSystemId, version] of gameSystemVersions.entries()) {
      const gameSystemKey = GAME_SYSTEMS[gameSystemId];
      console.log(`\n[Common Rules] ${gameSystemKey} v${version}`);
      try {
        await downloadCommonRules(gameSystemId, version);
      } catch (err: any) {
        console.log(`  ❌ Error downloading common rules: ${err.message}`);
        totalErrors++;
      }
    }

    console.log('\n\n✅ Download complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Army books processed: ${armyBooks.length}`);
    console.log(`   - Total game system variants: ${armyBooks.reduce((sum, ab) => sum + ab.enabledGameSystems.length, 0)}`);
    console.log(`   - Common rules downloaded: ${gameSystemVersions.size} game systems`);
    console.log(`   - Output directory: ${path.resolve(BASE_OUTPUT_DIR)}`);

  } catch (err: any) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

// Run the script
main();
