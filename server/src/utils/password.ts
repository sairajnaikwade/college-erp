import bcrypt from 'bcryptjs';
import { env } from '../config/environment';

/**
 * Hashes a plaintext password using bcrypt.
 *
 * @param plaintext The plain password to hash
 * @returns The hashed password string
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = await bcrypt.genSalt(env.bcryptSaltRounds);
  return bcrypt.hash(plaintext, salt);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 *
 * @param plaintext The plain password to test
 * @param hash The stored hash
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
