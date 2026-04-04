// /app/api/library/route.ts
import {and, eq, gt, ilike, or} from 'drizzle-orm';
import {db} from '@/lib/db';
import {
  marketListings,
  playlists,
  songs,
  userPreferences,
  users,
} from '@/lib/db/schema';
import {NextRequest, NextResponse} from 'next/server';
import { guardUserAccess } from '@/lib/auth/guards';

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const userId = searchParams.get('userId');
  const guard = await guardUserAccess(userId);
  if (!guard.ok) {
    return NextResponse.json({error: guard.error}, {status: guard.status});
  }
  const resolvedUserId = guard.userId;

  const user = await db.query.users.findFirst({
    where: eq(users.contractAddress, resolvedUserId),
  });

  if (!user) {
    return NextResponse.json({message: 'User not found'}, {status: 404});
  }

  const userPlaylists = await db.query.playlists.findMany({
    where: eq(playlists.userId, resolvedUserId),
    with: {
      coverSong: true,
      songs: {
        with: {
          song: {
            with: {
              album: true,
            },
          },
        },
      },
    },
  });

  const playlistsPayload = userPlaylists.map((playlist) => {
    const playlistSongs = playlist.songs
      .map((playlistItem) => playlistItem.song)
      .filter(Boolean);

    return {
      ...playlist,
      id: `playlist-${playlist.id}`,
      playlistId: playlist.id,
      title: playlist.title,
      artist: user.displayName?.trim() || user.contractAddress,
      genre: 'Playlist',
      cover: playlist.coverSong?.cover || playlistSongs[0]?.cover || '/logo.svg',
      releaseDate: playlist.createdAt?.toISOString?.() ?? new Date().toISOString(),
      songs: playlistSongs,
      tracks: playlistSongs,
      playlistItems: playlist.songs,
    };
  });

  const userTokenOwnerships = await db.query.tokenOwnerships.findMany({
    where: (table, {eq}) => eq(table.owner, resolvedUserId),
    with: {
      song: {
        with: {
          album: true,
        },
      },
    },
  });

  const userActiveListings = await db.query.marketListings.findMany({
    where: and(
      eq(marketListings.seller, resolvedUserId),
      eq(marketListings.isActive, true),
      gt(marketListings.copies, 0)
    ),
    with: {
      song: {
        with: {
          album: true,
        },
      },
    },
  });

  const artistIdentifiers = [
    user.contractAddress?.trim(),
    user.displayName?.trim(),
  ].filter((value): value is string => Boolean(value));

  const uploadedSongs =
    artistIdentifiers.length === 0
      ? []
      : await db.query.songs.findMany({
          where:
            artistIdentifiers.length === 1
              ? ilike(songs.artist, artistIdentifiers[0])
              : or(...artistIdentifiers.map((artist) => ilike(songs.artist, artist))),
          with: {
            album: true,
          },
        });

  const preferences = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, resolvedUserId),
  });

  return NextResponse.json({
    user,
    playlists: playlistsPayload,
    tokenOwnerships: userTokenOwnerships,
    activeListings: userActiveListings,
    uploadedSongs,
    preferences,
  });
}
