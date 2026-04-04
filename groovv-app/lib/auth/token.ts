import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueToken(bytes = 32) {
  const token = randomBytes(bytes).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

