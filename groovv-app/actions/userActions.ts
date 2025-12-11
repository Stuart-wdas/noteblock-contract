'use server';

import {prisma} from '@/lib/prisma';

// ========== USER ACTIONS ==========
export async function createUser(data: {
  contractAddress: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  return prisma.user.create({data});
}

export async function updateUser(
  contractAddress: string,
  updates: {
    displayName?: string;
    avatarUrl?: string;
  }
) {
  return prisma.user.update({
    where: {contractAddress},
    data: updates,
  });
}

export async function deleteUser(contractAddress: string) {
  return prisma.user.delete({where: {contractAddress}});
}

// ========== PLAYLIST ACTIONS ==========
export async function createPlaylist(data: {
  title: string;
  userId: string;
  isPublic?: boolean;
  coverSongId?: string;
}) {
  return prisma.playlist.create({data});
}

export async function updatePlaylist(
  id: number,
  updates: {
    title?: string;
    isPublic?: boolean;
    coverSongId?: string;
  }
) {
  return prisma.playlist.update({where: {id}, data: updates});
}

export async function deletePlaylist(id: number) {
  return prisma.playlist.delete({where: {id}});
}

// ========== TOKEN OWNERSHIP ==========
export async function createTokenOwnership(data: {
  owner: string;
  songid: string;
  balance: string;
}) {
  return await prisma.tokenOwnership.create({data});
}

export async function createTokensOwnership(data: {
  owner: string;
  albumId: number;
  balance: string;
}) {
  console.log('HIT');
  const album = await prisma.album.findFirst({
    where: {
      id: data.albumId,
    },
    include: {songs: true},
  });
  console.log(album);

  const results = [];
  if (album?.songs) {
    for (const song of album.songs) {
      const tokenData = {
        owner: data.owner,
        songid: String(song.id),
        balance: data.balance,
      };
      const created = await createTokenOwnership(tokenData);
      results.push(created);
      console.log('pushing', song.id);
    }
  }

  return results;
}

export async function updateTokenBalance(id: number, balance: string) {
  return prisma.tokenOwnership.update({
    where: {id},
    data: {balance, updatedAt: new Date()},
  });
}

export async function deleteTokenOwnership(id: number) {
  return prisma.tokenOwnership.delete({where: {id}});
}

// ========== STREAM SESSION ==========
export async function createStreamSession(data: {
  userId: string;
  songId: string;
  ipHash?: string;
  device?: string;
}) {
  return prisma.streamSession.create({data});
}

export async function endStreamSession(id: string) {
  return prisma.streamSession.update({
    where: {id},
    data: {endedAt: new Date()},
  });
}

export async function deleteStreamSession(id: string) {
  return prisma.streamSession.delete({where: {id}});
}

// ========== USER PREFERENCES ==========
export async function setUserPreferences(data: {
  userId: string;
  playstyle?: string;
}) {
  return prisma.userPreferences.upsert({
    where: {userId: data.userId},
    update: data,
    create: data,
  });
}

export async function deleteUserPreferences(userId: string) {
  return prisma.userPreferences.delete({where: {userId}});
}
