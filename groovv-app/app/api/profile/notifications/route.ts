import { and, desc, eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userNotifications } from '@/lib/db/schema';
import { guardUserAccess } from '@/lib/auth/guards';

type UpdateNotificationBody = {
  userId?: string;
  ids?: string[];
  markAllRead?: boolean;
};

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')?.trim();
  const guard = await guardUserAccess(userId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const resolvedUserId = guard.userId;

  const unreadOnlyParam = req.nextUrl.searchParams.get('unreadOnly')?.trim();
  const unreadOnly =
    unreadOnlyParam === '1' || unreadOnlyParam?.toLowerCase() === 'true';
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? 60);
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(300, Math.trunc(limitParam)))
    : 60;

  const whereClause = unreadOnly
    ? and(
        eq(userNotifications.userId, resolvedUserId),
        eq(userNotifications.isRead, false),
      )
    : eq(userNotifications.userId, resolvedUserId);

  const rows = await db.query.userNotifications.findMany({
    where: whereClause,
    with: {
      song: {
        columns: {
          id: true,
          title: true,
          artist: true,
          cover: true,
        },
      },
    },
    orderBy: [desc(userNotifications.createdAt)],
    limit,
  });

  return NextResponse.json({
    userId: resolvedUserId,
    unreadCount: rows.filter((row) => !row.isRead).length,
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      txHash: row.txHash,
      blockNumber: row.blockNumber,
      listingId: row.listingId,
      transactionId: row.transactionId,
      isRead: row.isRead,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      song: row.song
        ? {
            id: row.song.id,
            title: row.song.title,
            artist: row.song.artist,
            cover: row.song.cover,
          }
        : null,
      metadata: row.metadata ?? null,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as UpdateNotificationBody;
  const userId = body.userId?.trim();
  const guard = await guardUserAccess(userId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const resolvedUserId = guard.userId;

  const ids = Array.isArray(body.ids)
    ? body.ids
        .map((id) => String(id).trim())
        .filter(Boolean)
    : [];

  if (!body.markAllRead && ids.length === 0) {
    return NextResponse.json(
      { error: 'Provide notification ids or markAllRead=true' },
      { status: 400 },
    );
  }

  const whereClause = body.markAllRead
    ? and(
        eq(userNotifications.userId, resolvedUserId),
        eq(userNotifications.isRead, false),
      )
    : and(
        eq(userNotifications.userId, resolvedUserId),
        inArray(userNotifications.id, ids),
      );

  const updated = await db
    .update(userNotifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(whereClause)
    .returning({
      id: userNotifications.id,
    });

  return NextResponse.json({
    ok: true,
    updatedCount: updated.length,
    updatedIds: updated.map((row) => row.id),
  });
}
