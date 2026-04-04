import { and, eq, gt, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, walletLoginChallenges } from '@/lib/db/schema';
import { createSessionForUser, updateUserLastLogin } from '@/lib/auth/session';
import { verifyWalletLoginSignature } from '@/lib/auth/wallet';

type WalletVerifyBody = {
  challengeId?: string;
  walletAddress?: string;
  signature?: string[];
};

function normalizeWallet(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WalletVerifyBody;
    const challengeId = (body.challengeId || '').trim();
    const walletAddress = normalizeWallet(body.walletAddress || '');
    const signature = Array.isArray(body.signature)
      ? body.signature.map((part) => String(part))
      : [];

    if (!challengeId || !walletAddress || signature.length === 0) {
      return NextResponse.json(
        { error: 'challengeId, walletAddress, and signature are required.' },
        { status: 400 },
      );
    }

    const challenge = await db.query.walletLoginChallenges.findFirst({
      where: and(
        eq(walletLoginChallenges.id, challengeId),
        eq(walletLoginChallenges.userId, walletAddress),
        isNull(walletLoginChallenges.usedAt),
        gt(walletLoginChallenges.expiresAt, new Date()),
      ),
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge is invalid or has expired.' },
        { status: 400 },
      );
    }

    const signatureValid = await verifyWalletLoginSignature({
      walletAddress,
      typedData: challenge.typedData as Record<string, unknown>,
      signature,
    });

    if (!signatureValid) {
      return NextResponse.json(
        { error: 'Wallet signature verification failed.' },
        { status: 401 },
      );
    }

    await db
      .update(walletLoginChallenges)
      .set({
        usedAt: new Date(),
      })
      .where(eq(walletLoginChallenges.id, challenge.id));

    await createSessionForUser(walletAddress);
    await updateUserLastLogin(walletAddress);

    const user = await db.query.users.findFirst({
      where: eq(users.contractAddress, walletAddress),
      columns: {
        contractAddress: true,
        email: true,
        displayName: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to verify wallet login.',
      },
      { status: 500 },
    );
  }
}

