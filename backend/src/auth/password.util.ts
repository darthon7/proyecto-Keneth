import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const SCRYPT_PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

export interface PasswordVerificationResult {
  valid: boolean;
  needsRehash: boolean;
}

export async function hashPassword(plainPassword: string): Promise<string> {
  const saltHex = randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = await scryptAsync(plainPassword, saltHex, KEY_LENGTH);
  return `${SCRYPT_PREFIX}$${saltHex}$${derivedKey.toString('hex')}`;
}

export function isScryptHash(storedPassword: string): boolean {
  if (typeof storedPassword !== 'string') {
    return false;
  }
  const parts = storedPassword.split('$');
  if (parts.length !== 3) {
    return false;
  }
  const [prefix, saltHex, keyHex] = parts;
  return (
    prefix === SCRYPT_PREFIX &&
    saltHex.length > 0 &&
    keyHex.length > 0 &&
    /^[0-9a-f]+$/i.test(saltHex) &&
    /^[0-9a-f]+$/i.test(keyHex) &&
    keyHex.length % 2 === 0
  );
}

export async function verifyPassword(
  plainPassword: string,
  storedPassword: string,
): Promise<PasswordVerificationResult> {
  if (
    typeof plainPassword !== 'string' ||
    typeof storedPassword !== 'string' ||
    plainPassword.length === 0 ||
    storedPassword.length === 0
  ) {
    return { valid: false, needsRehash: false };
  }

  if (storedPassword.startsWith(`${SCRYPT_PREFIX}$`)) {
    if (!isScryptHash(storedPassword)) {
      return { valid: false, needsRehash: false };
    }
    const [, saltHex, keyHex] = storedPassword.split('$');
    const expectedKey = Buffer.from(keyHex, 'hex');
    const derivedKey = await scryptAsync(
      plainPassword,
      saltHex,
      expectedKey.length,
    );
    if (derivedKey.length !== expectedKey.length) {
      return { valid: false, needsRehash: false };
    }
    return {
      valid: timingSafeEqual(derivedKey, expectedKey),
      needsRehash: false,
    };
  }

  // Migración transparente de contraseñas legacy en texto plano usando comparación en tiempo constante
  const plainDigest = createHash('sha256').update(plainPassword).digest();
  const storedDigest = createHash('sha256').update(storedPassword).digest();
  const valid = timingSafeEqual(plainDigest, storedDigest);
  return {
    valid,
    needsRehash: valid,
  };
}

