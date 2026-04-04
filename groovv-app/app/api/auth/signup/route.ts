import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userPreferences, users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import {
  createSessionForUser,
  updateUserLastLogin,
} from '@/lib/auth/session';
import { serializeGenres } from '@/lib/profile/genres';

type SignupBody = {
  email?: string;
  password?: string;
  displayName?: string;
  walletAddress?: string;
  likedGenres?: string[];
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeWallet(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SignupBody;
    const email = normalizeEmail(body.email || '');
    const password = (body.password || '').trim();
    const displayName = body.displayName?.trim() || null;
    const walletAddress = normalizeWallet(body.walletAddress || '');
    const likedGenres = Array.isArray(body.likedGenres)
      ? Array.from(
          new Set(
            body.likedGenres
              .map((genre) => String(genre).trim())
              .filter(Boolean),
          ),
        )
      : [];

    if (!email || !password || !walletAddress) {
      return NextResponse.json(
        { error: 'Email, password, and walletAddress are required.' },
        { status: 400 },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (!walletAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid wallet address format.' },
        { status: 400 },
      );
    }

    const existingByEmail = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (
      existingByEmail &&
      existingByEmail.contractAddress.toLowerCase() !== walletAddress
    ) {
      return NextResponse.json(
        { error: 'Email is already in use.' },
        { status: 409 },
      );
    }

    const existingByWallet = await db.query.users.findFirst({
      where: eq(users.contractAddress, walletAddress),
    });

    if (existingByWallet?.email && existingByWallet.email !== email) {
      return NextResponse.json(
        { error: 'This wallet is already linked to another account.' },
        { status: 409 },
      );
    }

    if (
      existingByWallet?.passwordHash &&
      existingByWallet?.passwordSalt &&
      existingByWallet.email === email
    ) {
      return NextResponse.json(
        { error: 'Account already exists. Please sign in.' },
        { status: 409 },
      );
    }

    const { hashHex, saltHex } = hashPassword(password);

    if (existingByWallet) {
      await db
        .update(users)
        .set({
          email,
          passwordHash: hashHex,
          passwordSalt: saltHex,
          displayName: displayName ?? existingByWallet.displayName,
        })
        .where(and(eq(users.contractAddress, walletAddress)));
    } else {
      await db.insert(users).values({
        contractAddress: walletAddress,
        email,
        passwordHash: hashHex,
        passwordSalt: saltHex,
        displayName,
      });
    }

    if (likedGenres.length > 0) {
      await db
        .insert(userPreferences)
        .values({
          userId: walletAddress,
          likedGenres: serializeGenres(likedGenres),
        })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: {
            likedGenres: serializeGenres(likedGenres),
          },
        });
    }

    await createSessionForUser(walletAddress);
    await updateUserLastLogin(walletAddress);

    const signedUpUser = await db.query.users.findFirst({
      where: eq(users.contractAddress, walletAddress),
      columns: {
        contractAddress: true,
        email: true,
        displayName: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user: signedUpUser,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to complete sign-up.',
      },
      { status: 500 },
    );
  }
}
