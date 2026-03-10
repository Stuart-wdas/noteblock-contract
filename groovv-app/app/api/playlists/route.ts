import {eq, inArray} from 'drizzle-orm';
import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {playlistItems, playlists, songs, users} from '@/lib/db/schema';

type CreatePlaylistPayload = {
  title?: string;
  userId?: string;
  songIds?: string[];
  isPublic?: boolean;
  coverSongId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePlaylistPayload;
    const title = body.title?.trim();
    const userId = body.userId?.trim();

    if (!title) {
      return NextResponse.json({error: 'Playlist title is required'}, {status: 400});
    }

    if (!userId) {
      return NextResponse.json({error: 'Wallet userId is required'}, {status: 400});
    }

    const uniqueSongIds = Array.from(
      new Set((body.songIds ?? []).map((songId) => songId.trim()).filter(Boolean))
    );

    const existingSongRows =
      uniqueSongIds.length === 0
        ? []
        : await db
            .select({id: songs.id})
            .from(songs)
            .where(inArray(songs.id, uniqueSongIds));

    const existingSongIdSet = new Set(existingSongRows.map((song) => song.id));
    const validSongIds = uniqueSongIds.filter((songId) => existingSongIdSet.has(songId));
    const skippedSongIds = uniqueSongIds.filter((songId) => !existingSongIdSet.has(songId));

    const requestedCoverSongId = body.coverSongId?.trim();
    const coverSongId =
      requestedCoverSongId && existingSongIdSet.has(requestedCoverSongId)
        ? requestedCoverSongId
        : validSongIds[0];

    const playlist = await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({
          contractAddress: userId,
        })
        .onConflictDoNothing();

      const [createdPlaylist] = await tx
        .insert(playlists)
        .values({
          title,
          userId,
          isPublic: Boolean(body.isPublic),
          coverSongId,
        })
        .returning();

      if (validSongIds.length > 0) {
        await tx.insert(playlistItems).values(
          validSongIds.map((songId) => ({
            playlistId: createdPlaylist.id,
            songId,
          }))
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
    return NextResponse.json({error: 'Failed to create playlist'}, {status: 500});
  }
}
