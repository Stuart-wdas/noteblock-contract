// app/api/market/albums/route.ts
import {db} from '@/lib/db';
import {NextResponse} from 'next/server';

export async function GET() {
  const albums = await db.query.albums.findMany({
    with: {songs: true},
  });

  const payload = albums.map((album) => ({
    ...album,
    songs: album.songs.map((song) => ({
      ...song,
      url: song.cid,
    })),
  }));

  return NextResponse.json({albums: payload});
}
