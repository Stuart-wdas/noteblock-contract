import { eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playlistItems, playlists, songs, users } from '@/lib/db/schema';
import { guardUserAccess } from '@/lib/auth/guards';

type CreatePlaylistPayload = {
  title?: string;
  userId?: string;
  songIds?: string[];
  isPublic?: boolean;
  coverSongId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreatePlaylistPayload;
    const title = body.title?.trim();
    const userId = body.userId?.trim();

    if (!title) {
      return NextResponse.json(
        { error: 'Playlist title is required' },
        { status: 400 },
      );
    }

    const guard = await guardUserAccess(userId);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const resolvedUserId = guard.userId;

    const uniqueSongIds = Array.from(
      new Set(
        (body.songIds ?? []).map((songId) => songId.trim()).filter(Boolean),
      ),
    );

    const existingSongRows =
      uniqueSongIds.length === 0
        ? []
        : await db
            .select({ id: songs.id })
            .from(songs)
            .where(inArray(songs.id, uniqueSongIds));

    const existingSongIdSet = new Set(existingSongRows.map((song) => song.id));
    const validSongIds = uniqueSongIds.filter((songId) =>
      existingSongIdSet.has(songId),
    );
    const skippedSongIds = uniqueSongIds.filter(
      (songId) => !existingSongIdSet.has(songId),
    );

    const requestedCoverSongId = body.coverSongId?.trim();
    const coverSongId =
      requestedCoverSongId && existingSongIdSet.has(requestedCoverSongId)
        ? requestedCoverSongId
        : validSongIds[0];

    const playlist = await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({
          contractAddress: resolvedUserId,
        })
        .onConflictDoNothing();

      const [createdPlaylist] = await tx
        .insert(playlists)
        .values({
          title,
          userId: resolvedUserId,
          isPublic: Boolean(body.isPublic),
          coverSongId,
        })
        .returning();

      if (validSongIds.length > 0) {
        await tx.insert(playlistItems).values(
          validSongIds.map((songId) => ({
            playlistId: createdPlaylist.id,
            songId,
          })),
        );
      }

      return createdPlaylist;
    });

    const createdPlaylistItems = await db.query.playlistItems.findMany({
      where: eq(playlistItems.playlistId, playlist.id),
      with: {
        song: {
          with: {
            album: true,
          },
        },
      },
    });

    return NextResponse.json({
      playlist: {
        ...playlist,
        playlistItems: createdPlaylistItems,
      },
      addedSongIds: validSongIds,
      skippedSongIds,
    });
  } catch (error) {
    console.error('Failed to create playlist', error);
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as CreatePlaylistPayload;
    const title = body.title?.trim();
    const userId = body.userId?.trim();

    if (!title) {
      return NextResponse.json(
        { error: 'Playlist title is required' },
        { status: 400 },
      );
    }

    const guard = await guardUserAccess(userId);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const resolvedUserId = guard.userId;

    await db
      .update(playlists)
      .set({
        title: title,
      })
      .where(eq(playlists.userId, resolvedUserId));

    return NextResponse.json({ message: 'Playlist updated' }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: 'Error Updating Playlist' },
      { status: 500 },
    );
  }
}
