import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { hashPassword, verifyPassword } from './password';

const DEFAULT_APP_URL = 'http://localhost:3000';

function resolveBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    DEFAULT_APP_URL
  );
}

function serializePasswordHash(password: string) {
  const { hashHex, saltHex } = hashPassword(password);
  return `${saltHex}:${hashHex}`;
}

function validatePasswordHash(
  password: string,
  serializedPasswordHash: string,
) {
  const [saltHex, hashHex] = serializedPasswordHash.split(':');
  if (!saltHex || !hashHex) return false;
  return verifyPassword(password, saltHex, hashHex);
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  plugins: [nextCookies()],
  baseURL: resolveBaseUrl(),
  basePath: '/api/auth',
  secret:
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.AUTH_PASSWORD_PEPPER?.trim() ||
    'dev-only-better-auth-secret-change-me',
  user: {
    modelName: 'AuthUser',
    additionalFields: {
      walletAddress: {
        type: 'string',
        required: false,
        fieldName: 'walletAddress',
        unique: true,
      },
    },
  },
  session: {
    modelName: 'AuthSessionV2',
  },
  account: {
    modelName: 'AuthAccountV2',
  },
  verification: {
    modelName: 'AuthVerificationV2',
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    password: {
      hash: async (password) => serializePasswordHash(password),
      verify: async ({ hash, password }) => validatePasswordHash(password, hash),
    },
    sendResetPassword: async ({ user, token, url }) => {
      console.log('[better-auth:password-reset-link]', {
        userId: user.id,
        email: user.email,
        token,
        url,
      });
    },
  },
});
