import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth/session';

export async function GET() {
  const user = await getCurrentSessionUser();
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      contractAddress: user.contractAddress,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    },
  });
}

