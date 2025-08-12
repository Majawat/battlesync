import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Get the application version from package.json
 * This is the single source of truth for version information
 */
export function getVersion(): string {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('Failed to read version from package.json:', error);
    return 'unknown';
  }
}

/**
 * Application version - use this throughout the backend
 */
export const VERSION = getVersion();