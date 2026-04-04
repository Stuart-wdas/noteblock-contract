import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userTransactions } from '@/lib/db/schema';
import { guardUserAccess } from '@/lib/auth/guards';

const allowedDirections = new Set([
  'purchase',
  'sale',
  'listing_created',
  'listing_removed',
  'mint',
  'album_created',
]);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')?.trim();
  const guard = await guardUserAccess(userId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const resolvedUserId = guard.userId;

  const direction = req.nextUrl.searchParams.get('direction')?.trim() || '';
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? 100);
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(300, Math.trunc(limitParam)))
    : 100;

  const whereClause =
    direction && allowedDirections.has(direction)
      ? and(
          eq(userTransactions.userId, resolvedUserId),
          eq(userTransactions.direction, direction),
        )
      : eq(userTransactions.userId, resolvedUserId);

  const rows = await db.query.userTransactions.findMany({
    where: whereClause,
    with: {
      song: {
        columns: {
          id: true,
          title: true,
          artist: true,
          cover: true,
          genre: true,
        },
      },
    },
    orderBy: [desc(userTransactions.createdAt)],
    limit,
  });

  return NextResponse.json({
    userId: resolvedUserId,
    count: rows.length,
    transactions: rows.map((row) => ({
      id: row.id,
      txHash: row.txHash,
      blockNumber: row.blockNumber,
      eventType: row.eventType,
      direction: row.direction,
      listingId: row.listingId,
      counterparty: row.counterparty,
      unitPrice: row.unitPrice,
      copies: row.copies,
      totalAmount: row.totalAmount,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      song: row.song
        ? {
            id: row.song.id,
            title: row.song.title,
            artist: row.song.artist,
            cover: row.song.cover,
            genre: row.song.genre,
          }
        : null,
      metadata: row.metadata ?? null,
    })),
  });
}
