import { NextRequest, NextResponse } from 'next/server';
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettingsPatch,
} from '@/lib/notifications/service';
import { guardUserAccess } from '@/lib/auth/guards';

type SettingsBody = {
  userId?: string;
  settings?: NotificationSettingsPatch;
};

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')?.trim();
  const guard = await guardUserAccess(userId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const resolvedUserId = guard.userId;

  const settings = await getNotificationSettings(resolvedUserId);
  if (!settings) {
    return NextResponse.json(
      { error: 'Could not load notification settings' },
      { status: 500 },
    );
  }

  return NextResponse.json({ userId: resolvedUserId, settings });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as SettingsBody;
  const userId = body.userId?.trim();
  const guard = await guardUserAccess(userId);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const resolvedUserId = guard.userId;

  const patch = body.settings ?? {};
  const updated = await updateNotificationSettings(resolvedUserId, patch);
  if (!updated) {
    return NextResponse.json(
      { error: 'Could not update notification settings' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, settings: updated });
}
