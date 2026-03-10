// Seed file for Groovv

import {fileURLToPath} from 'node:url';
import {sampleSongs} from './lib/getData';
import {db, pool} from './lib/db';
import {
  albums,
  playlistItems,
  playlists,
  songs,
  streamSessions,
  tokenOwnerships,
  userPreferences,
  users,
} from './lib/db/schema';

// Create mock user to be artist

const mock_user =
  '0x057aDfCC2217E750DF2eF5CAdF228349959178b19dF893D784158365dda6483F';

async function createMockUser() {
  await db
    .insert(users)
    .values({
      contractAddress: mock_user,
      displayName: 'User-0x057a',
    })
    .onConflictDoNothing({
      target: users.contractAddress,
    });
}

// Seed albums and songs
async function seedAlbumsAndSongs() {
  // Remove existing data in FK-safe order.
  await db.delete(playlistItems);
  await db.delete(playlists);
  await db.delete(streamSessions);
  await db.delete(userPreferences);
  await db.delete(tokenOwnerships);
  await db.delete(songs);
  await db.delete(albums);

  const seenSongs = new Set<string>();

  for (const album of sampleSongs) {
    const [createdAlbum] = await db
      .insert(albums)
      .values({
        id: Number(album.id),
        title: album.title,
        artist: album.artist,
        genre: album.genre,
        cover: album.cover,
        releaseDate: new Date(album.releaseDate),
      })
      .onConflictDoUpdate({
        target: albums.id,
        set: {
          title: album.title,
          artist: album.artist,
          genre: album.genre,
          cover: album.cover,
          releaseDate: new Date(album.releaseDate),
        },
      })
      .returning();

    for (const song of album.songs) {
      if (seenSongs.has(song.id)) {
        continue;
      }

      seenSongs.add(song.id);

      await db.insert(songs).values({
        id: song.id,
        title: song.title,
        artist: song.artist,
        cid: song.url,
        genre: song.genre,
        cover: song.cover,
        albumId: createdAlbum.id,
        releaseDate: createdAlbum.releaseDate,
        length: 10,
        price: '1',
        copies: 1000,
      });
    }
  }

  for (const song of seenSongs) {
    await db.insert(tokenOwnerships).values({
      owner: mock_user,
      songid: song,
      balance: '1',
    });
  }
}

// Run seed
export async function mainSeed() {
  await createMockUser();
  await seedAlbumsAndSongs();
}

const isDirectRun =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  mainSeed()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
