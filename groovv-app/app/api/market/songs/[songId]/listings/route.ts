import { and, eq, gt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { marketListings, songs } from '@/lib/db/schema';

function normalizeAddress(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  if (!trimmed.startsWith('0x')) return trimmed;

  try {
    return `0x${BigInt(trimmed).toString(16)}`;
  } catch {
    return trimmed;
  }
}

function toBigIntSafe(value: string) {
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { songId: string } | Promise<{ songId: string }> },
) {
  const { songId: rawSongId } = await params;
  const songId = decodeURIComponent(rawSongId || '').trim();
  if (!songId) {
    return NextResponse.json({ error: 'Missing song id' }, { status: 400 });
  }

  const song = await db.query.songs.findFirst({
    where: eq(songs.id, songId),
    columns: {
      id: true,
      title: true,
      artist: true,
      genre: true,
      cover: true,
      cid: true,
      listingId: true,
      price: true,
      copies: true,
      releaseDate: true,
    },
  });

  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  const listingRows = await db.query.marketListings.findMany({
    where: and(
      eq(marketListings.songId, songId),
      eq(marketListings.isActive, true),
      gt(marketListings.copies, 0),
    ),
    with: {
      sellerUser: {
        columns: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  const normalizedArtist = normalizeAddress(song.artist);

  const listings = listingRows
    .map((listing) => {
      const normalizedSeller = normalizeAddress(listing.seller);
      return {
        listingId: listing.listingId,
        songId: listing.songId,
        seller: listing.seller,
        sellerName: listing.sellerUser?.displayName?.trim() || listing.seller,
        sellerAvatar: listing.sellerUser?.avatarUrl || null,
        price: listing.price,
        copies: listing.copies,
        isArtist:
          Boolean(normalizedArtist) && normalizedArtist === normalizedSeller,
        createdAt: listing.createdAt.toISOString(),
        updatedAt: listing.updatedAt.toISOString(),
      };
    })
    .sort((a, b) => {
      const priceDiff = toBigIntSafe(a.price) - toBigIntSafe(b.price);
      if (priceDiff < 0) return -1;
      if (priceDiff > 0) return 1;
      if (a.copies !== b.copies) return b.copies - a.copies;
      return a.listingId.localeCompare(b.listingId);
    });

  if (listings.length === 0 && song.listingId && song.copies > 0) {
    listings.push({
      listingId: song.listingId,
      songId: song.id,
      seller: song.artist,
      sellerName: song.artist,
      sellerAvatar: null,
      price: song.price,
      copies: song.copies,
      isArtist: true,
      createdAt: song.releaseDate.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    song: {
      id: song.id,
      title: song.title,
      artist: song.artist,
      genre: song.genre,
      cover: song.cover,
      url: song.cid,
      releaseDate: song.releaseDate.toISOString(),
    },
    listingCount: listings.length,
    listings,
  });
}
