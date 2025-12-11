import {Prisma} from '@/generated/prisma';
import {prisma} from '@/lib/prisma';
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

  // Build OR conditions correctly
  const OR: Prisma.SongWhereInput[] = searchTerms.flatMap((term) => [
    {name: {contains: term, mode: 'insensitive'}},
    {artist: {contains: term, mode: 'insensitive'}},
    {genre: {contains: term, mode: 'insensitive'}},
  ]);

  const results = await prisma.song.findMany({
    where: {OR},
  });

  return NextResponse.json({results});
}
