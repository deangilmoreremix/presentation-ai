import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Master key generation (for production setup):
 *   Base64: require('crypto').randomBytes(32).toString('base64')
 *   Hex:    require('crypto').randomBytes(32).toString('hex')
 * Store in env var: API_KEY_ENCRYPTION_MASTER_KEY
 */

/**
 * Derives a 256-bit key encryption key (KEK) from the master key and user ID.
 * Uses scrypt for key derivation with the userId as salt.
 */
function deriveKek(masterKey: string, userId: string): Buffer {
  const masterKeyBuffer = Buffer.from(masterKey, 'base64');
  if (masterKeyBuffer.length === 32) {
    return scryptSync(masterKeyBuffer, userId, 32);
  }
  // Try hex decoding (64 hex chars -> 32 bytes)
  const hexBuffer = Buffer.from(masterKey, 'hex');
  if (hexBuffer.length === 32) {
    return scryptSync(hexBuffer, userId, 32);
  }
  throw new Error('API_KEY_ENCRYPTION_MASTER_KEY must be 32 bytes (base64-decoded or 64-char hex)');
}

/**
 * Validates OpenAI API key format using regex: ^sk-[A-Za-z0-9_-]{32,}$
 */
export function validateKeyFormat(key: string): boolean {
  const regex = /^sk-[A-Za-z0-9_-]{32,}$/;
  return regex.test(key);
}

/**
 * Encrypts an OpenAI API key using AES-256-GCM.
 * Returns base64-encoded ciphertext (with auth tag) and IV.
 */
export async function encryptApiKey(
  plaintext: string,
  userId: string
): Promise<{ encrypted: string; iv: string }> {
  const masterKey = process.env.API_KEY_ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('API_KEY_ENCRYPTION_MASTER_KEY environment variable is required');
  }

  const kek = deriveKek(masterKey, userId);
  const iv = randomBytes(16); // 128-bit IV for AES-GCM
  const cipher = createCipheriv('aes-256-gcm', kek, iv, { authTagLength: 16 });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Package ciphertext with authTag (required for GCM authentication)
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    encrypted: combined.toString('base64'),
    iv: iv.toString('base64'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted API key using stored IV and ciphertext.
 */
export async function decryptApiKey(
  encrypted: string,
  userId: string,
  iv: string
): Promise<string> {
  const masterKey = process.env.API_KEY_ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('API_KEY_ENCRYPTION_MASTER_KEY environment variable is required');
  }

  const kek = deriveKek(masterKey, userId);
  const ivBuffer = Buffer.from(iv, 'base64');

  // Split combined buffer: ciphertext || authTag (16 bytes)
  const combined = Buffer.from(encrypted, 'base64');
  const authTag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);

  const decipher = createDecipheriv('aes-256-gcm', kek, ivBuffer, { authTagLength: 16 });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

