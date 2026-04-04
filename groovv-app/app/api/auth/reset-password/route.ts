import { and, eq, gt, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { passwordResetTokens, users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { sha256Hex } from '@/lib/auth/token';
import { revokeAllUserSessions } from '@/lib/auth/session';

type ResetPasswordBody = {
  token?: string;
  newPassword?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ResetPasswordBody;
    const token = (body.token || '').trim();
    const newPassword = (body.newPassword || '').trim();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and newPassword are required.' },
        { status: 400 },
      );
    }

    const tokenHash = sha256Hex(token);
    const now = new Date();

    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Reset token is invalid or has expired.' },
        { status: 400 },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.contractAddress, resetToken.userId),
      columns: {
        contractAddress: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User account no longer exists.' },
        { status: 404 },
      );
    }

    const { hashHex, saltHex } = hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: hashHex,
        passwordSalt: saltHex,
      })
      .where(eq(users.contractAddress, user.contractAddress));

    await db
      .update(passwordResetTokens)
      .set({
        usedAt: now,
      })
      .where(eq(passwordResetTokens.id, resetToken.id));

    await revokeAllUserSessions(user.contractAddress);

    return NextResponse.json({
      ok: true,
      message: 'Password reset successful. Please sign in again.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reset password.',
      },
      { status: 500 },
    );
  }
}

