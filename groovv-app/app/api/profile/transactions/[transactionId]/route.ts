import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { marketListings, userTransactions } from '@/lib/db/schema';
import { guardUserAccess } from '@/lib/auth/guards';

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params:
      | { transactionId: string }
      | Promise<{ transactionId: string }>;
  },
) {
  const { transactionId: rawTransactionId } = await params;
  const transactionId = decodeURIComponent(rawTransactionId || '').trim();
  const userId = req.nextUrl.searchParams.get('userId')?.trim();

  if (!transactionId) {
    return NextResponse.json(
      { error: 'Missing transaction id' },
      { status: 400 },
    );
  }
  const guard = await guardUserAccess(userId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const resolvedUserId = guard.userId;

  const transaction = await db.query.userTransactions.findFirst({
    where: and(
      eq(userTransactions.id, transactionId),
      eq(userTransactions.userId, resolvedUserId),
    ),
    with: {
      song: {
        columns: {
          id: true,
          title: true,
          artist: true,
          genre: true,
          cover: true,
          cid: true,
          releaseDate: true,
        },
      },
    },
  });

  if (!transaction) {
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 },
    );
  }

  const listing =
    transaction.listingId?.trim()
      ? await db.query.marketListings.findFirst({
          where: eq(marketListings.listingId, transaction.listingId),
          columns: {
            listingId: true,
            seller: true,
            price: true,
            copies: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : null;

  return NextResponse.json({
    transaction: {
      id: transaction.id,
      txHash: transaction.txHash,
      blockNumber: transaction.blockNumber,
      eventType: transaction.eventType,
      direction: transaction.direction,
      listingId: transaction.listingId,
      counterparty: transaction.counterparty,
      unitPrice: transaction.unitPrice,
      copies: transaction.copies,
      totalAmount: transaction.totalAmount,
      status: transaction.status,
      metadata: transaction.metadata ?? null,
      createdAt: transaction.createdAt.toISOString(),
      song: transaction.song
        ? {
            id: transaction.song.id,
            title: transaction.song.title,
            artist: transaction.song.artist,
            genre: transaction.song.genre,
            cover: transaction.song.cover,
            url: transaction.song.cid,
            releaseDate: transaction.song.releaseDate.toISOString(),
          }
        : null,
      listing: listing
        ? {
            listingId: listing.listingId,
            seller: listing.seller,
            price: listing.price,
            copies: listing.copies,
            isActive: listing.isActive,
            createdAt: listing.createdAt.toISOString(),
            updatedAt: listing.updatedAt.toISOString(),
          }
        : null,
    },
  });
}
