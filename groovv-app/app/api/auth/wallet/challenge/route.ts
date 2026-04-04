import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, walletLoginChallenges } from '@/lib/db/schema';
import { buildWalletLoginChallenge } from '@/lib/auth/wallet';

type WalletChallengeBody = {
  walletAddress?: string;
};

function normalizeWallet(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as WalletChallengeBody;
  const walletAddress = normalizeWallet(body.walletAddress || '');

  if (!walletAddress || !walletAddress.startsWith('0x')) {
    return NextResponse.json(
      { error: 'Valid walletAddress is required.' },
      { status: 400 },
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.contractAddress, walletAddress),
    columns: {
      contractAddress: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'No account found for this wallet. Please sign up first.' },
      { status: 404 },
    );
  }

  const challenge = buildWalletLoginChallenge(walletAddress);

  const [savedChallenge] = await db
    .insert(walletLoginChallenges)
    .values({
      userId: walletAddress,
      nonce: challenge.nonce,
      typedData: challenge.typedData,
      expiresAt: challenge.expiresAt,
    })
    .returning({
      id: walletLoginChallenges.id,
      expiresAt: walletLoginChallenges.expiresAt,
    });

  return NextResponse.json({
    ok: true,
    challengeId: savedChallenge.id,
    typedData: challenge.typedData,
    expiresAt: savedChallenge.expiresAt.toISOString(),
  });
}

