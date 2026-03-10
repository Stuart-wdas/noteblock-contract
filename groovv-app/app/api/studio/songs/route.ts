import {and, desc, ilike, or} from 'drizzle-orm';
import {NextRequest, NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {songs} from '@/lib/db/schema';

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const artist = searchParams.get('artist')?.trim();
  const query = searchParams.get('q')?.trim();

  if (!artist) {
    return NextResponse.json({error: 'Missing artist'}, {status: 400});
  }

  const artistFilter = ilike(songs.artist, artist);

  const searchFilter = query
    ? or(
        ilike(songs.title, `%${query}%`),
        ilike(songs.genre, `%${query}%`),
        ilike(songs.id, `%${query}%`)
      )
    : undefined;

  const results = await db
    .select()
    .from(songs)
    .where(searchFilter ? and(artistFilter, searchFilter) : artistFilter)
    .orderBy(desc(songs.releaseDate));

  return NextResponse.json({songs: results});
}
