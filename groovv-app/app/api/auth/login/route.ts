import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import {
  createSessionForUser,
  updateUserLastLogin,
} from '@/lib/auth/session';

type LoginBody = {
  email?: string;
  password?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as LoginBody;
  const email = normalizeEmail(body.email || '');
  const password = (body.password || '').trim();

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 },
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user?.passwordHash || !user?.passwordSalt) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 },
    );
  }

  const isValid = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 },
    );
  }

  await createSessionForUser(user.contractAddress);
  await updateUserLastLogin(user.contractAddress);

  return NextResponse.json({
    ok: true,
    user: {
      contractAddress: user.contractAddress,
      email: user.email,
      displayName: user.displayName,
    },
  });
}

