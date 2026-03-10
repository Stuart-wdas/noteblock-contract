'use server';

import {eq} from 'drizzle-orm';
import {db} from '@/lib/db';
import {
  albums,
  playlists,
  streamSessions,
  tokenOwnerships,
  userPreferences,
  users,
} from '@/lib/db/schema';

function toDefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as Partial<T>;
}

// ========== USER ACTIONS ==========
export async function createUser(data: {
  contractAddress: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function updateUser(
  contractAddress: string,
  updates: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  }
) {
  const updateData = toDefined(updates);

  if (Object.keys(updateData).length === 0) {
    return db.query.users.findFirst({
      where: eq(users.contractAddress, contractAddress),
    });
  }

  const [user] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.contractAddress, contractAddress))
    .returning();

  return user ?? null;
}

export async function deleteUser(contractAddress: string) {
  const [user] = await db
    .delete(users)
    .where(eq(users.contractAddress, contractAddress))
    .returning();

  return user ?? null;
}

// ========== PLAYLIST ACTIONS ==========
export async function createPlaylist(data: {
  title: string;
  userId: string;
  isPublic?: boolean;
  coverSongId?: string;
}) {
  const [playlist] = await db.insert(playlists).values(data).returning();
  return playlist;
}

export async function updatePlaylist(
  id: number,
  updates: {
    title?: string;
    isPublic?: boolean;
    coverSongId?: string;
  }
) {
  const updateData = toDefined(updates);

  if (Object.keys(updateData).length === 0) {
    return db.query.playlists.findFirst({
      where: eq(playlists.id, id),
    });
  }

  const [playlist] = await db
    .update(playlists)
    .set(updateData)
    .where(eq(playlists.id, id))
    .returning();

  return playlist ?? null;
}

export async function deletePlaylist(id: number) {
  const [playlist] = await db.delete(playlists).where(eq(playlists.id, id)).returning();
  return playlist ?? null;
}

// ========== TOKEN OWNERSHIP ==========
export async function createTokenOwnership(data: {
  owner: string;
  songid: string;
  balance: string;
}) {
  const [tokenOwnership] = await db.insert(tokenOwnerships).values(data).returning();
  return tokenOwnership;
}

export async function createTokensOwnership(data: {
  owner: string;
  albumId: number;
  balance: string;
}) {
  const album = await db.query.albums.findFirst({
    where: eq(albums.id, data.albumId),
    with: {songs: true},
  });

  if (!album?.songs?.length) {
    return [];
  }

  const values = album.songs.map((song) => ({
    owner: data.owner,
    songid: String(song.id),
    balance: data.balance,
  }));

  return db.insert(tokenOwnerships).values(values).returning();
}

export async function updateTokenBalance(id: number, balance: string) {
  const [tokenOwnership] = await db
    .update(tokenOwnerships)
    .set({balance, updatedAt: new Date()})
    .where(eq(tokenOwnerships.id, id))
    .returning();

  return tokenOwnership ?? null;
}

export async function deleteTokenOwnership(id: number) {
  const [tokenOwnership] = await db
    .delete(tokenOwnerships)
    .where(eq(tokenOwnerships.id, id))
    .returning();

  return tokenOwnership ?? null;
}

// ========== STREAM SESSION ==========
export async function createStreamSession(data: {
  userId: string;
  songId: string;
  ipHash?: string;
  device?: string;
}) {
  const [streamSession] = await db.insert(streamSessions).values(data).returning();
  return streamSession;
}

export async function endStreamSession(id: string) {
  const [streamSession] = await db
    .update(streamSessions)
    .set({endedAt: new Date()})
    .where(eq(streamSessions.id, id))
    .returning();

  return streamSession ?? null;
}

export async function deleteStreamSession(id: string) {
  const [streamSession] = await db
    .delete(streamSessions)
    .where(eq(streamSessions.id, id))
    .returning();

  return streamSession ?? null;
}

// ========== USER PREFERENCES ==========
export async function setUserPreferences(data: {
  userId: string;
  playstyle?: string;
}) {
  if (data.playstyle === undefined) {
    const existingPreferences = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, data.userId),
    });

    if (existingPreferences) {
      return existingPreferences;
    }

    const [createdPreferences] = await db
      .insert(userPreferences)
      .values({
        userId: data.userId,
      })
      .returning();

    return createdPreferences;
  }

  const [preferences] = await db
    .insert(userPreferences)
    .values({
      userId: data.userId,
      playstyle: data.playstyle,
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        playstyle: data.playstyle,
      },
    })
    .returning();

  return preferences;
}

export async function deleteUserPreferences(userId: string) {
  const [preferences] = await db
    .delete(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .returning();

  return preferences ?? null;
}
