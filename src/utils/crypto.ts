import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here';
const ALGORITHM = 'aes-256-cbc';

// Password hashing parameters (scrypt is part of Node's stdlib — no native build
// required, so it works on Alpine where the previous bcrypt attempt did not).
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;
const PASSWORD_PREFIX = 'scrypt';

export class CryptoUtils {
  /**
   * Hash a password using scrypt with a unique random salt.
   * Output format: "scrypt:<saltHex>:<hashHex>"
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(SCRYPT_SALT_BYTES).toString('hex');
    const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
    return `${PASSWORD_PREFIX}:${salt}:${derived.toString('hex')}`;
  }

  /**
   * Verify a password against a stored hash.
   * Handles both current scrypt hashes and legacy pre-scrypt hashes, so existing
   * accounts can still authenticate once and be transparently re-hashed on login
   * (see UserService.authenticateUser and needsRehash below).
   */
  static async comparePassword(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash) return false;

    if (storedHash.startsWith(`${PASSWORD_PREFIX}:`)) {
      const [, salt, keyHex] = storedHash.split(':');
      if (!salt || !keyHex) return false;
      try {
        const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
        const stored = Buffer.from(keyHex, 'hex');
        // timingSafeEqual throws if lengths differ, so guard first.
        return stored.length === derived.length && crypto.timingSafeEqual(stored, derived);
      } catch {
        return false;
      }
    }

    // Legacy fallback: the old (insecure) base64 scheme. Kept only so pre-existing
    // accounts are not locked out; never produced for new passwords.
    const legacy = Buffer.from(password + 'salt').toString('base64');
    return storedHash === legacy;
  }

  /**
   * True if a stored hash is not in the current scrypt format and should be
   * re-hashed the next time the user successfully authenticates.
   */
  static needsRehash(storedHash: string): boolean {
    return !storedHash?.startsWith(`${PASSWORD_PREFIX}:`);
  }

  // ArmyForge token encryption (for sensitive data)
  static encryptToken(token: string): string {
    if (!token) return '';

    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch {
      return token; // Return original token if encryption fails
    }
  }

  static decryptToken(encryptedToken: string): string {
    if (!encryptedToken) return '';

    try {
      const parts = encryptedToken.split(':');
      if (parts.length !== 2) return encryptedToken; // Return as-is if not encrypted

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      return encryptedToken; // Return as-is if decryption fails
    }
  }

  // Generate secure random strings
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate invite codes using a cryptographically secure RNG
  static generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(crypto.randomInt(chars.length));
    }
    return result;
  }
}
