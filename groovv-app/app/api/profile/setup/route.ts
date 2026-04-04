import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userPreferences, users } from '@/lib/db/schema';
import { guardUserAccess } from '@/lib/auth/guards';
import { serializeGenres } from '@/lib/profile/genres';

type SetupBody = {
  userId?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  likedGenres?: string[];
};

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as SetupBody;
  const userId = body.userId?.trim();

  const guard = await guardUserAccess(userId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const resolvedUserId = guard.userId;

  const displayName = body.displayName?.trim();
  const bio = body.bio?.trim();
  const avatarUrl = body.avatarUrl?.trim();
  const likedGenres = Array.isArray(body.likedGenres)
    ? Array.from(
        new Set(
          body.likedGenres
            .map((genre) => String(genre).trim())
            .filter(Boolean),
        ),
      )
    : [];

  await db
    .update(users)
    .set({
      displayName: displayName || null,
      bio: bio || null,
      avatarUrl: avatarUrl || null,
    })
    .where(eq(users.contractAddress, resolvedUserId));

  await db
    .insert(userPreferences)
    .values({
      userId: resolvedUserId,
      likedGenres: serializeGenres(likedGenres),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        likedGenres: serializeGenres(likedGenres),
      },
    });

  return NextResponse.json({
    ok: true,
    userId: resolvedUserId,
    likedGenres,
  });
}

