import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { authSessions, users } from '@/lib/db/schema';
import { createOpaqueToken, sha256Hex } from './token';

export const SESSION_COOKIE_NAME = 'groovv_session';
const DEFAULT_SESSION_TTL_DAYS = 30;

function sessionTtlDays() {
  const parsed = Number(process.env.AUTH_SESSION_TTL_DAYS || DEFAULT_SESSION_TTL_DAYS);
  if (!Number.isFinite(parsed)) return DEFAULT_SESSION_TTL_DAYS;
  return Math.max(1, Math.min(90, Math.trunc(parsed)));
}

function now() {
  return new Date();
}

function getExpiryDate() {
  const expiresAt = new Date(now());
  expiresAt.setDate(expiresAt.getDate() + sessionTtlDays());
  return expiresAt;
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function createSessionForUser(userId: string) {
  const { token, tokenHash } = createOpaqueToken();
  const expiresAt = getExpiryDate();

  await db.insert(authSessions).values({
    userId,
    sessionTokenHash: tokenHash,
    expiresAt,
  });

  await setSessionCookie(token, expiresAt);
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (!sessionToken) {
    await clearSessionCookie();
    return;
  }

  const sessionTokenHash = sha256Hex(sessionToken);
  await db
    .delete(authSessions)
    .where(eq(authSessions.sessionTokenHash, sessionTokenHash));

  await clearSessionCookie();
}

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (!sessionToken) return null;

  const sessionTokenHash = sha256Hex(sessionToken);
  const currentTime = now();

  const session = await db.query.authSessions.findFirst({
    where: and(
      eq(authSessions.sessionTokenHash, sessionTokenHash),
      gt(authSessions.expiresAt, currentTime),
    ),
    with: {
      user: true,
    },
  });

  if (!session?.user) {
    await clearSessionCookie();
    return null;
  }

  await db
    .update(authSessions)
    .set({
      lastSeenAt: currentTime,
    })
    .where(eq(authSessions.id, session.id));

  return session.user;
}

export async function revokeAllUserSessions(userId: string) {
  await db.delete(authSessions).where(eq(authSessions.userId, userId));
}

export async function updateUserLastLogin(userId: string) {
  await db
    .update(users)
    .set({
      lastLoginAt: now(),
    })
    .where(eq(users.contractAddress, userId));
}

