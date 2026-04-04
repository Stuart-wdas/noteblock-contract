import { and, eq, gte, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  marketListings,
  songs,
  streamSessions,
  tokenOwnerships,
  userPreferences,
} from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

type StreamStats = {
  streams24h: number;
  streamsPrev24h: number;
  streams7d: number;
};

type MarketSong = {
  id: string;
  listingId: string | null;
  listingCount: number;
  title: string;
  artist: string;
  genre: string;
  cover: string;
  url: string;
  price: string;
  copies: number;
  releaseDate: string;
  songId: string;
  albumId: number | null;
  albumTitle: string | null;
  metrics: {
    streams24h: number;
    streamsPrev24h: number;
    streams7d: number;
    ownerCount: number;
    freshness: number;
    trendGrowth: number;
    topPickScore: number;
    riseScore: number;
    personalAffinity: number;
    speedScore: number;
  };
};

type ListingAggregate = {
  bestListingId: string;
  bestPrice: string;
  totalCopies: number;
  listingCount: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value: string | number | null | undefined, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBigIntSafe(value: string) {
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function parsePreferenceList(value: string | null | undefined) {
  if (!value) return [] as string[];

  const trimmed = value.trim();
  if (!trimmed) return [] as string[];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => String(entry).trim().toLowerCase())
        .filter(Boolean);
    }
  } catch {
    // Fallback to CSV-style parsing below.
  }

  return trimmed
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function incrementWeight(map: Map<string, number>, key: string, amount: number) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

function buildListingAggregate(rows: Array<{
  songId: string;
  listingId: string;
  price: string;
  copies: number;
}>) {
  const bySong = new Map<string, ListingAggregate>();

  for (const row of rows) {
    const current = bySong.get(row.songId);
    if (!current) {
      bySong.set(row.songId, {
        bestListingId: row.listingId,
        bestPrice: row.price,
        totalCopies: row.copies,
        listingCount: 1,
      });
      continue;
    }

    const isBetterPrice =
      toBigIntSafe(row.price) < toBigIntSafe(current.bestPrice);
    if (isBetterPrice) {
      current.bestPrice = row.price;
      current.bestListingId = row.listingId;
    }

    current.totalCopies += row.copies;
    current.listingCount += 1;
  }

  return bySong;
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')?.trim();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = oneDayMs * 7;
  const oneMonthMs = oneDayMs * 30;

  const weekStart = new Date(now - oneWeekMs);
  const monthStart = new Date(now - oneMonthMs);

  const [activeListingRows, recentStreams, ownershipRows] = await Promise.all([
    db
      .select({
        songId: marketListings.songId,
        listingId: marketListings.listingId,
        price: marketListings.price,
        copies: marketListings.copies,
      })
      .from(marketListings)
      .where(
        and(
          eq(marketListings.isActive, true),
          gt(marketListings.copies, 0),
        ),
      ),
    db
      .select({
        songId: streamSessions.songId,
        startedAt: streamSessions.startedAt,
      })
      .from(streamSessions)
      .where(gte(streamSessions.startedAt, weekStart)),
    db
      .select({
        songId: tokenOwnerships.songid,
        owner: tokenOwnerships.owner,
      })
      .from(tokenOwnerships),
  ]);

  const listingBySong = buildListingAggregate(activeListingRows);

  const fallbackSongRows = await db.query.songs.findMany({
    where: (table, { and, gt, isNotNull }) =>
      and(gt(table.copies, 0), isNotNull(table.listingId)),
    with: { album: true },
  });

  for (const song of fallbackSongRows) {
    if (!song.listingId) continue;
    if (listingBySong.has(song.id)) continue;
    listingBySong.set(song.id, {
      bestListingId: song.listingId,
      bestPrice: song.price,
      totalCopies: song.copies,
      listingCount: 1,
    });
  }

  const listedSongIds = Array.from(listingBySong.keys());
  const listedSongs =
    listedSongIds.length === 0
      ? []
      : await db.query.songs.findMany({
          where: (table, { inArray }) => inArray(table.id, listedSongIds),
          with: { album: true },
        });

  const streamStatsBySong = new Map<string, StreamStats>();
  for (const stream of recentStreams) {
    const key = stream.songId;
    const stats = streamStatsBySong.get(key) ?? {
      streams24h: 0,
      streamsPrev24h: 0,
      streams7d: 0,
    };

    const startedAtMs = stream.startedAt?.getTime() ?? 0;
    stats.streams7d += 1;

    if (startedAtMs >= now - oneDayMs) {
      stats.streams24h += 1;
    } else if (startedAtMs >= now - oneDayMs * 2) {
      stats.streamsPrev24h += 1;
    }

    streamStatsBySong.set(key, stats);
  }

  const ownersBySong = new Map<string, Set<string>>();
  for (const row of ownershipRows) {
    if (!ownersBySong.has(row.songId)) {
      ownersBySong.set(row.songId, new Set<string>());
    }
    ownersBySong.get(row.songId)?.add(row.owner);
  }

  const scoredSongs = listedSongs
    .map((song) => {
      const listingAggregate = listingBySong.get(song.id);
      if (!listingAggregate) return null;

      const stats = streamStatsBySong.get(song.id) ?? {
        streams24h: 0,
        streamsPrev24h: 0,
        streams7d: 0,
      };
      const ownerCount = ownersBySong.get(song.id)?.size ?? 0;
      const price = toFiniteNumber(listingAggregate.bestPrice, 0);
      const copies = toFiniteNumber(listingAggregate.totalCopies, 0);
      const daysSinceRelease =
        (now - new Date(song.releaseDate).getTime()) / oneDayMs;

      const freshness = clamp(1 - daysSinceRelease / 45);
      const momentum = Math.log1p(stats.streams24h * 2 + stats.streams7d);
      const ownershipSignal = Math.log1p(ownerCount);
      const affordability = 1 / (1 + Math.max(price, 0));
      const liquidity = clamp(copies / 1500);

      const topPickScore =
        momentum * 0.45 +
        freshness * 0.2 +
        ownershipSignal * 0.15 +
        affordability * 0.1 +
        liquidity * 0.1;

      const trendGrowth =
        (stats.streams24h - stats.streamsPrev24h) /
        Math.max(1, stats.streamsPrev24h);
      const riseScore =
        clamp(trendGrowth, -1, 3) * 0.6 +
        Math.log1p(stats.streams24h) * 0.3 +
        freshness * 0.1;

      const marketSong: MarketSong = {
        id: song.id,
        listingId: listingAggregate.bestListingId,
        listingCount: listingAggregate.listingCount,
        title: song.title,
        artist: song.artist,
        genre: song.genre,
        cover: song.cover,
        url: song.cid,
        price: listingAggregate.bestPrice,
        copies: listingAggregate.totalCopies,
        releaseDate: song.releaseDate.toISOString(),
        songId: song.id,
        albumId: song.albumId ?? null,
        albumTitle: song.album?.title ?? null,
        metrics: {
          streams24h: stats.streams24h,
          streamsPrev24h: stats.streamsPrev24h,
          streams7d: stats.streams7d,
          ownerCount,
          freshness,
          trendGrowth,
          topPickScore,
          riseScore,
          personalAffinity: 0,
          speedScore: 0,
        },
      };

      return marketSong;
    })
    .filter((song): song is MarketSong => Boolean(song));

  const topPicks = [...scoredSongs]
    .sort((a, b) => b.metrics.topPickScore - a.metrics.topPickScore)
    .slice(0, 12);

  const onTheRise = [...scoredSongs]
    .sort((a, b) => b.metrics.riseScore - a.metrics.riseScore)
    .slice(0, 12);

  const genreWeights = new Map<string, number>();
  const artistWeights = new Map<string, number>();
  const ownedSongIds = new Set<string>();

  if (userId) {
    const [preferences, ownedRows, personalStreams] = await Promise.all([
      db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      }),
      db.query.tokenOwnerships.findMany({
        where: eq(tokenOwnerships.owner, userId),
        with: { song: true },
      }),
      db
        .select({ songId: streamSessions.songId })
        .from(streamSessions)
        .where(
          and(
            eq(streamSessions.userId, userId),
            gte(streamSessions.startedAt, monthStart),
          ),
        ),
    ]);

    const preferredGenres = parsePreferenceList(preferences?.likedGenres);
    const preferredArtists = parsePreferenceList(preferences?.likedArtists);

    preferredGenres.forEach((genre) => incrementWeight(genreWeights, genre, 3));
    preferredArtists.forEach((artist) =>
      incrementWeight(artistWeights, artist, 2.5),
    );

    for (const row of ownedRows) {
      if (!row.song) continue;
      ownedSongIds.add(row.songid);
      incrementWeight(genreWeights, row.song.genre.toLowerCase(), 2);
      incrementWeight(artistWeights, row.song.artist.toLowerCase(), 1.25);
    }

    const songLookup = new Map(scoredSongs.map((song) => [song.id, song]));
    for (const play of personalStreams) {
      const song = songLookup.get(play.songId);
      if (!song) continue;
      incrementWeight(genreWeights, song.genre.toLowerCase(), 0.8);
      incrementWeight(artistWeights, song.artist.toLowerCase(), 0.5);
    }
  }

  if (genreWeights.size === 0 && artistWeights.size === 0) {
    const globalGenreMomentum = new Map<string, number>();
    for (const song of scoredSongs) {
      incrementWeight(
        globalGenreMomentum,
        song.genre.toLowerCase(),
        Math.max(1, song.metrics.streams7d + song.metrics.streams24h * 2),
      );
    }

    const fallbackGenres = Array.from(globalGenreMomentum.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    for (const [genre] of fallbackGenres) {
      incrementWeight(genreWeights, genre, 1);
    }
  }

  const scoredPersonal = scoredSongs.map((song) => {
    const genreAffinity = genreWeights.get(song.genre.toLowerCase()) ?? 0;
    const artistAffinity = artistWeights.get(song.artist.toLowerCase()) ?? 0;
    const personalAffinity = genreAffinity * 1.8 + artistAffinity * 1.2;
    const speedScore =
      personalAffinity +
      song.metrics.topPickScore * 0.45 +
      song.metrics.riseScore * 0.35 +
      song.metrics.freshness * 0.2;

    return {
      ...song,
      metrics: {
        ...song.metrics,
        personalAffinity,
        speedScore,
      },
    };
  });

  const personalCandidates =
    userId && ownedSongIds.size > 0
      ? scoredPersonal.filter((song) => !ownedSongIds.has(song.id))
      : scoredPersonal;

  const moreYourSpeedSource =
    personalCandidates.length > 0 ? personalCandidates : scoredPersonal;

  const moreYourSpeed = [...moreYourSpeedSource]
    .sort((a, b) => b.metrics.speedScore - a.metrics.speedScore)
    .slice(0, 12);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    sections: {
      topPicks,
      onTheRise,
      moreYourSpeed,
    },
  });
}
