// Seed file for Groovv

import {sampleSongs} from './lib/getData';
import {prisma} from './lib/prisma';

// Create mock user to be artist

const mock_user =
  '0x057aDfCC2217E750DF2eF5CAdF228349959178b19dF893D784158365dda6483F';

async function createMockUser() {
  await prisma.user.create({
    data: {
      contractAddress: mock_user,
      displayName: 'User-0x057a',
    },
  });
}

// Create mock songs from sample songs

// Seed albums and songs into Prisma
async function seedAlbumsAndSongs() {
  // Remove existing data to avoid unique constraint issues. Adjust if you prefer upserts.
  await prisma.song.deleteMany({});
  await prisma.album.deleteMany({});
  await prisma.tokenOwnership.deleteMany({});

  for (const album of sampleSongs) {
    const createdAlbum = await prisma.album.create({
      data: {
        // adjust field names if your schema differs
        id: Number(album.id),
        title: album.title,
        artist: album.artist,
        genre: album.genre,
        cover: album.cover,
        releaseDate: new Date(album.releaseDate),
      },
    });

    for (const song of album.songs) {
      await prisma.song.create({
        data: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          cid: song.url,
          genre: song.genre,
          cover: song.cover,
          albumId: createdAlbum.id,
          releaseDate: new Date(createdAlbum.releaseDate),
          length: 10,
        },
      });
    }

    for (const song of album.songs) {
      await prisma.tokenOwnership.create({
        data: {
          owner: mock_user,
          songid: song.id,
          balance: '1',
        },
      });
    }
  }
}

// Run seed
export async function mainSeed() {
  await seedAlbumsAndSongs();
}

mainSeed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
