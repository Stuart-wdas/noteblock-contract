import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { passwordResetTokens, users } from '@/lib/db/schema';
import { createOpaqueToken } from '@/lib/auth/token';

type ForgotPasswordBody = {
  email?: string;
};

const RESET_TOKEN_TTL_MINUTES = 30;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function buildResetLink(token: string) {
  const appBaseUrl = process.env.APP_BASE_URL?.trim() || 'http://localhost:3000';
  return `${appBaseUrl.replace(/\/$/, '')}/?resetToken=${encodeURIComponent(token)}`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ForgotPasswordBody;
  const email = normalizeEmail(body.email || '');

  if (!email) {
    return NextResponse.json(
      { error: 'Email is required.' },
      { status: 400 },
    );
  }

  const genericResponse = {
    ok: true,
    message: 'If an account exists, a reset link has been generated.',
  };

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: {
      contractAddress: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(genericResponse);
  }

  const { token, tokenHash } = createOpaqueToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.contractAddress));

  await db.insert(passwordResetTokens).values({
    userId: user.contractAddress,
    tokenHash,
    expiresAt,
  });

  const resetLink = buildResetLink(token);
  console.log('[auth:password-reset-link]', {
    user: user.contractAddress,
    email: user.email,
    resetLink,
    expiresAt: expiresAt.toISOString(),
  });

  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.json({
      ...genericResponse,
      devResetToken: token,
      devResetLink: resetLink,
    });
  }

  return NextResponse.json(genericResponse);
}

