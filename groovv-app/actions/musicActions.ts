'use server';

import {prisma} from '@/lib/prisma';

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
  albumId?: number;
}) {
  return prisma.song.create({data});
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
    albumId?: number;
  }>
) {
  return prisma.song.update({where: {id}, data: updates});
}

export async function deleteSong(id: string) {
  return prisma.song.delete({where: {id}});
}

// ========== ALBUM ACTIONS ==========
export async function createAlbum(data: {
  title: string;
  artist: string;
  genre: string;
  cover: string;
  releaseDate: Date;
}) {
  return prisma.album.create({data});
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
  return prisma.album.update({where: {id}, data: updates});
}

export async function deleteAlbum(id: number) {
  return prisma.album.delete({where: {id}});
}

// ========== PLAYLIST ITEM ACTIONS ==========
export async function addSongToPlaylist(data: {
  playlistId: number;
  songId: string;
}) {
  return prisma.playlistItem.create({data});
}

export async function removeSongFromPlaylist(id: number, songId: string) {
  return prisma.playlistItem.delete({where: {id, songId}});
}
