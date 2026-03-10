import {or, ilike} from 'drizzle-orm';
import {db} from '@/lib/db';
import {songs} from '@/lib/db/schema';
import {NextRequest, NextResponse} from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';

  // Split, trim, and filter unique non-empty terms
  const searchTerms = Array.from(
    new Set(
      q
        .split(' ')
        .map((term) => term.trim())
        .filter(Boolean)
    )
  );

  if (searchTerms.length === 0) {
    return NextResponse.json({results: []});
  }

  const conditions = searchTerms.flatMap((term) => [
    ilike(songs.title, `%${term}%`),
    ilike(songs.artist, `%${term}%`),
    ilike(songs.genre, `%${term}%`),
  ]);

  const results = await db
    .select()
    .from(songs)
    .where(or(...conditions));

  return NextResponse.json({results});
}
