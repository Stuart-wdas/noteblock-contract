'use server';

import {and, eq} from 'drizzle-orm';
import {db} from '@/lib/db';
import {albums, playlistItems, songs, tokenOwnerships, users} from '@/lib/db/schema';

function toDefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
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
  price?: string;
  copies?: number;
  albumId?: number;
  owner?: string;
}) {
  const {owner: rawOwner, ...songData} = data;
  const owner = rawOwner?.trim();

  return db.transaction(async (tx) => {
    const [song] = await tx.insert(songs).values(songData).returning();

    if (owner) {
      const mintedCopies = Number(song.copies);
      const ownershipBalance =
        Number.isFinite(mintedCopies) && mintedCopies > 0
          ? String(Math.floor(mintedCopies))
          : '1';

      await tx.insert(users).values({contractAddress: owner}).onConflictDoNothing();
      await tx.insert(tokenOwnerships).values({
        owner,
        songid: song.id,
        balance: ownershipBalance,
      });
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
    price: string;
    copies: number;
    albumId?: number;
  }>
) {
  const updateData = toDefined(updates);

  if (Object.keys(updateData).length === 0) {
    return db.query.songs.findFirst({where: eq(songs.id, id)});
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
  }>
) {
  const updateData = toDefined(updates);

  if (Object.keys(updateData).length === 0) {
    return db.query.albums.findFirst({where: eq(albums.id, id)});
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
}) {
  const ownership = await db.query.tokenOwnerships.findFirst({
    where: and(
      eq(tokenOwnerships.owner, data.owner),
      eq(tokenOwnerships.songid, data.songId)
    ),
  });

  if (!ownership) {
    throw new Error('You do not own this song');
  }

  const ownedBalance = Number(ownership.balance || 0);
  const requestedCopies = Number(data.copies);
  const requestedPrice = Number(data.price);

  if (!Number.isFinite(requestedCopies) || requestedCopies < 0) {
    throw new Error('Copies must be a positive number or zero');
  }

  if (requestedCopies > 0) {
    if (!Number.isFinite(requestedPrice) || requestedPrice <= 0) {
      throw new Error('Price must be greater than zero');
    }

    if (Number.isFinite(ownedBalance) && requestedCopies > ownedBalance) {
      throw new Error('Cannot list more copies than you own');
    }
  }

  const [song] = await db
    .update(songs)
    .set({
      price: data.price.trim(),
      copies: requestedCopies,
    })
    .where(eq(songs.id, data.songId))
    .returning();

  return song ?? null;
}
