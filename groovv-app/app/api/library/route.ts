// /app/api/library/route.ts
import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId)
    return NextResponse.json({error: 'Missing userId'}, {status: 400});

  const user = await prisma.user.findFirst({
    where: {
      contractAddress: userId,
    },
  });

  console.log(user);
  if (!user) {
    return NextResponse.json({message: 'User not found'}, {status: 404});
  }

  const playlists = await prisma.playlist.findMany({
    where: {userId},
    include: {
      songs: true,
    },
  });

  const tokenOwnerships = await prisma.tokenOwnership.findMany({
    where: {owner: userId},
    include: {
      song: {
        include: {
          album: true,
        },
      },
    },
  });

  const preferences = await prisma.userPreferences.findUnique({
    where: {userId},
  });

  return NextResponse.json({playlists, tokenOwnerships, preferences});
}
