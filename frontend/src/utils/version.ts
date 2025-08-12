/**
 * Application version utility for frontend
 * Gets version from the root package.json (single source of truth)
 */

// Import the version from the root package.json
import packageJson from '../../../package.json';

/**
 * Application version - use this throughout the frontend
 */
export const VERSION = packageJson.version;

/**
 * Get the application version
 */
export function getVersion(): string {
  return VERSION;
}