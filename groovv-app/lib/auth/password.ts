import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const PASSWORD_MIN_LENGTH = 8;

function getPasswordPepper() {
  return process.env.AUTH_PASSWORD_PEPPER?.trim() || '';
}

function normalizeInput(password: string) {
  return `${password}${getPasswordPepper()}`;
}

export function validatePasswordStrength(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error('Password must be at least 8 characters long.');
  }
}

export function hashPassword(password: string, saltHex?: string) {
  validatePasswordStrength(password);
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : randomBytes(SALT_BYTES);
  const hash = scryptSync(normalizeInput(password), salt, KEY_LENGTH);
  return {
    hashHex: hash.toString('hex'),
    saltHex: salt.toString('hex'),
  };
}

export function verifyPassword(
  password: string,
  saltHex: string,
  expectedHashHex: string,
) {
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(expectedHashHex, 'hex');
  const actual = scryptSync(normalizeInput(password), salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

