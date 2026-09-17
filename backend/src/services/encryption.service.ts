import { env } from '../config/env';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function deriveKey(): Buffer {
  return crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();
}

export function encrypt(text: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = deriveKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted text format');
  const [ivHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
