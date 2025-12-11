// app/api/market/albums/route.ts
import {PrismaClient} from '@/generated/prisma';
import {sampleSongs} from '@/lib/getData';
import {prisma} from '@/lib/prisma';
import {NextResponse} from 'next/server';
export async function GET() {
  const albums = await prisma.album.findMany({
    include: {songs: true},
  });

  return NextResponse.json({albums: sampleSongs});
}
