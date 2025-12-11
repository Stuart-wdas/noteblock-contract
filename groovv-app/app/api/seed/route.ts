import { NextResponse } from 'next/server';
import { mainSeed } from '@/seed';

export async function POST() {
  await mainSeed();

  return NextResponse.json({ message: 'Database seeded' });
}
