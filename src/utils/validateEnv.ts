import { logger } from './logger';

/**
 * Known insecure default values that ship in the repo/compose files. If any of
 * these (or an unset value) reach a production process, secrets are guessable and
 * JWTs are forgeable, so we refuse to start. In non-production we only warn.
 */
const KNOWN_DEFAULTS: Record<string, string[]> = {
  JWT_SECRET: [
    'your-development-jwt-secret',
    'your-development-jwt-secret-change-in-production',
    'your-super-secret-jwt-key-change-this-in-production',
  ],
  ENCRYPTION_KEY: ['your-32-char-encryption-key-here'],
};

export function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const problems: string[] = [];

  for (const key of Object.keys(KNOWN_DEFAULTS)) {
    const value = process.env[key];
    if (!value) {
      problems.push(`${key} is not set`);
    } else if (KNOWN_DEFAULTS[key].includes(value)) {
      problems.push(`${key} is set to a known default value`);
    }
  }

  if (problems.length === 0) return;

  const message = `Insecure configuration: ${problems.join('; ')}.`;

  if (isProduction) {
    // Fail fast — never run production with guessable secrets.
    throw new Error(
      `${message} Refusing to start in production. Set strong, unique values for these variables.`
    );
  }

  logger.warn(`${message} Using insecure development defaults — do not use in production.`);
}
