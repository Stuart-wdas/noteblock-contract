import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  userNotificationSettings,
  userNotifications,
  userTransactions,
  users,
} from '@/lib/db/schema';

export type NotificationPreferenceKey =
  | 'notifyPurchaseConfirmed'
  | 'notifyListingSold'
  | 'notifyListingCreated'
  | 'notifyListingRemoved'
  | 'notifySongMinted'
  | 'notifyAlbumCreated';

export type NotificationSettingsPatch = Partial<
  Omit<
    typeof userNotificationSettings.$inferInsert,
    'userId' | 'updatedAt'
  >
>;

const DEFAULT_SETTINGS: Omit<
  typeof userNotificationSettings.$inferInsert,
  'userId' | 'updatedAt'
> = {
  notifyPurchaseConfirmed: true,
  notifyListingSold: true,
  notifyListingCreated: true,
  notifyListingRemoved: true,
  notifySongMinted: true,
  notifyAlbumCreated: true,
  browserNotifications: true,
};

async function ensureUser(userId: string) {
  if (!userId) return;
  await db
    .insert(users)
    .values({ contractAddress: userId })
    .onConflictDoNothing();
}

export async function ensureNotificationSettings(userId: string) {
  await ensureUser(userId);
  await db
    .insert(userNotificationSettings)
    .values({
      userId,
      ...DEFAULT_SETTINGS,
    })
    .onConflictDoNothing();

  return db.query.userNotificationSettings.findFirst({
    where: eq(userNotificationSettings.userId, userId),
  });
}

export async function getNotificationSettings(userId: string) {
  return ensureNotificationSettings(userId);
}

export async function updateNotificationSettings(
  userId: string,
  patch: NotificationSettingsPatch,
) {
  const settingsPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as NotificationSettingsPatch;

  const current = await ensureNotificationSettings(userId);
  if (!current) return null;

  if (Object.keys(settingsPatch).length === 0) {
    return current;
  }

  const [updated] = await db
    .update(userNotificationSettings)
    .set({
      ...settingsPatch,
      updatedAt: new Date(),
    })
    .where(eq(userNotificationSettings.userId, userId))
    .returning();

  return updated ?? null;
}

export function buildDedupeKey(...parts: Array<string | number | undefined | null>) {
  return parts
    .map((part) => String(part ?? '').trim())
    .join('|')
    .toLowerCase();
}

type RecordTransactionInput = {
  userId: string;
  dedupeKey: string;
  txHash?: string | null;
  blockNumber?: number | null;
  eventType: string;
  direction: string;
  songId?: string | null;
  listingId?: string | null;
  counterparty?: string | null;
  unitPrice?: string | null;
  copies?: number | null;
  totalAmount?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordUserTransaction(input: RecordTransactionInput) {
  await ensureUser(input.userId);

  const [created] = await db
    .insert(userTransactions)
    .values({
      userId: input.userId,
      dedupeKey: input.dedupeKey,
      txHash: input.txHash ?? null,
      blockNumber: input.blockNumber ?? null,
      eventType: input.eventType,
      direction: input.direction,
      songId: input.songId ?? null,
      listingId: input.listingId ?? null,
      counterparty: input.counterparty ?? null,
      unitPrice: input.unitPrice ?? '0',
      copies: input.copies ?? 0,
      totalAmount: input.totalAmount ?? '0',
      status: input.status ?? 'confirmed',
      metadata: input.metadata ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  return db.query.userTransactions.findFirst({
    where: and(
      eq(userTransactions.userId, input.userId),
      eq(userTransactions.dedupeKey, input.dedupeKey),
    ),
  });
}

type CreateUserNotificationInput = {
  userId: string;
  dedupeKey: string;
  type: string;
  title: string;
  message: string;
  preferenceKey?: NotificationPreferenceKey;
  txHash?: string | null;
  blockNumber?: number | null;
  songId?: string | null;
  listingId?: string | null;
  transactionId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function createUserNotification(input: CreateUserNotificationInput) {
  const settings = await ensureNotificationSettings(input.userId);
  if (!settings) return null;

  if (input.preferenceKey && !settings[input.preferenceKey]) {
    return null;
  }

  const [created] = await db
    .insert(userNotifications)
    .values({
      userId: input.userId,
      dedupeKey: input.dedupeKey,
      type: input.type,
      title: input.title,
      message: input.message,
      txHash: input.txHash ?? null,
      blockNumber: input.blockNumber ?? null,
      songId: input.songId ?? null,
      listingId: input.listingId ?? null,
      transactionId: input.transactionId ?? null,
      metadata: input.metadata ?? null,
      isRead: false,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  return db.query.userNotifications.findFirst({
    where: and(
      eq(userNotifications.userId, input.userId),
      eq(userNotifications.dedupeKey, input.dedupeKey),
    ),
  });
}
