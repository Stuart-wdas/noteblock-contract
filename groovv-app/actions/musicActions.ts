'use server';

import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  albums,
  marketListings,
  playlistItems,
  songs,
  tokenOwnerships,
  users,
} from '@/lib/db/schema';
import { syncSongMarketSnapshot } from '@/lib/market/listingSnapshot';

function toDefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;
}

// ========== SONG ACTIONS ==========
export async function createSong(data: {
  id: string;
  title: string;
  artist: string;
  genre: string;
  length: number;
  releaseDate: Date;
  cid: string;
  cover: string;
  listingId?: string | null;
  price?: string;
  copies?: number;
  albumId?: number;
  owner?: string;
}) {
  const { owner: rawOwner, ...songData } = data;
  const owner = rawOwner?.trim();

  return db.transaction(async (tx) => {
    const [song] = await tx.insert(songs).values(songData).returning();

    if (owner) {
      const mintedCopies = Number(song.copies);
      const ownershipBalance =
        Number.isFinite(mintedCopies) && mintedCopies > 0
          ? String(Math.floor(mintedCopies))
          : '1';

      await tx
        .insert(users)
        .values({ contractAddress: owner })
        .onConflictDoNothing();
      await tx.insert(tokenOwnerships).values({
        owner,
        songid: song.id,
        balance: ownershipBalance,
      });

      if (data.listingId && Number(data.copies ?? 0) > 0) {
        await tx
          .insert(marketListings)
          .values({
            listingId: data.listingId,
            songId: song.id,
            seller: owner,
            price: data.price?.trim() || '0',
            copies: Number(data.copies),
            isActive: true,
          })
          .onConflictDoUpdate({
            target: marketListings.listingId,
            set: {
              songId: song.id,
              seller: owner,
              price: data.price?.trim() || '0',
              copies: Number(data.copies),
              isActive: true,
              updatedAt: new Date(),
            },
          });
      }
    }

    return song;
  });
}

export async function updateSong(
  id: string,
  updates: Partial<{
    title: string;
    artist: string;
    genre: string;
    length: number;
    releaseDate: Date;
    cid: string;
    cover: string;
    listingId?: string | null;
    price: string;
    copies: number;
    albumId?: number;
  }>,
) {
  const updateData = toDefined(updates);

  if (Object.keys(updateData).length === 0) {
    return db.query.songs.findFirst({ where: eq(songs.id, id) });
  }

  const [song] = await db
    .update(songs)
    .set(updateData)
    .where(eq(songs.id, id))
    .returning();

  return song ?? null;
}

export async function deleteSong(id: string) {
  const [song] = await db.delete(songs).where(eq(songs.id, id)).returning();
  return song ?? null;
}

// ========== ALBUM ACTIONS ==========
export async function createAlbum(data: {
  title: string;
  artist: string;
  genre: string;
  cover: string;
  releaseDate: Date;
}) {
  const [album] = await db.insert(albums).values(data).returning();
  return album;
}

export async function updateAlbum(
  id: number,
  updates: Partial<{
    title: string;
    artist: string;
    genre: string;
    cover: string;
    releaseDate: Date;
  }>,
) {
  const updateData = toDefined(updates);

  if (Object.keys(updateData).length === 0) {
    return db.query.albums.findFirst({ where: eq(albums.id, id) });
  }

  const [album] = await db
    .update(albums)
    .set(updateData)
    .where(eq(albums.id, id))
    .returning();

  return album ?? null;
}

export async function deleteAlbum(id: number) {
  const [album] = await db.delete(albums).where(eq(albums.id, id)).returning();
  return album ?? null;
}

// ========== PLAYLIST ITEM ACTIONS ==========
export async function addSongToPlaylist(data: {
  playlistId: number;
  songId: string;
}) {
  const [item] = await db.insert(playlistItems).values(data).returning();
  return item;
}

export async function removeSongFromPlaylist(id: number, songId: string) {
  const [item] = await db
    .delete(playlistItems)
    .where(and(eq(playlistItems.id, id), eq(playlistItems.songId, songId)))
    .returning();

  return item ?? null;
}

// ========== MARKET LISTING ACTIONS ==========
export async function listOwnedSongOnMarket(data: {
  owner: string;
  songId: string;
  price: string;
  copies: number;
  listingId?: string | null;
}) {
  const ownership = await db.query.tokenOwnerships.findFirst({
    where: and(
      eq(tokenOwnerships.owner, data.owner),
      eq(tokenOwnerships.songid, data.songId),
    ),
  });

  if (!ownership) {
    throw new Error('You do not own this song');
  }

  const requestedCopies = Number(data.copies);
  const requestedPrice = Number(data.price);

  if (!Number.isFinite(requestedCopies) || requestedCopies < 0) {
    throw new Error('Copies must be a positive number or zero');
  }

  if (requestedCopies > 0) {
    if (!Number.isFinite(requestedPrice) || requestedPrice <= 0) {
      throw new Error('Price must be greater than zero');
    }

    const listingId = data.listingId?.trim();
    if (!listingId) {
      throw new Error('Missing listing id from on-chain listing response');
    }

    await db
      .insert(marketListings)
      .values({
        listingId,
        songId: data.songId,
        seller: data.owner,
        price: data.price.trim(),
        copies: requestedCopies,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: marketListings.listingId,
        set: {
          songId: data.songId,
          seller: data.owner,
          price: data.price.trim(),
          copies: requestedCopies,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  } else {
    const listingId = data.listingId?.trim();
    if (listingId) {
      await db
        .update(marketListings)
        .set({
          copies: 0,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(marketListings.listingId, listingId),
            eq(marketListings.seller, data.owner),
          ),
        );
    } else {
      await db
        .update(marketListings)
        .set({
          copies: 0,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(marketListings.songId, data.songId),
            eq(marketListings.seller, data.owner),
            eq(marketListings.isActive, true),
          ),
        );
    }
  }

  await syncSongMarketSnapshot(data.songId);

  return db.query.songs.findFirst({
    where: eq(songs.id, data.songId),
  });
}
