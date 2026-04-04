import { or, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { songs } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

const MAX_TERMS = 5;
const MAX_RESULTS = 200;

function toSafeLimit(input: string | null) {
  const parsed = Number(input ?? MAX_RESULTS);
  if (!Number.isFinite(parsed)) return MAX_RESULTS;
  const whole = Math.trunc(parsed);
  if (whole <= 0) return MAX_RESULTS;
  return Math.min(MAX_RESULTS, whole);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const limit = toSafeLimit(url.searchParams.get('limit'));

  // Split, trim, and filter unique non-empty terms
  const searchTerms = Array.from(
    new Set(
      q
        .split(' ')
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_TERMS);

  if (searchTerms.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const conditions = searchTerms.flatMap((term) => [
    ilike(songs.title, `%${term}%`),
    ilike(songs.artist, `%${term}%`),
    ilike(songs.genre, `%${term}%`),
  ]);

  const results = await db
    .select({
      id: songs.id,
      title: songs.title,
      artist: songs.artist,
      genre: songs.genre,
      cid: songs.cid,
      cover: songs.cover,
      price: songs.price,
      copies: songs.copies,
    })
    .from(songs)
    .where(or(...conditions))
    .limit(limit);

  return NextResponse.json({
    results,
    limit,
  });
}
