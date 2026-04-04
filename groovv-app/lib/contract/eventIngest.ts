import { and, eq, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  albums,
  marketListings,
  songs,
  tokenOwnerships,
  users,
} from '@/lib/db/schema';
import { syncSongMarketSnapshot } from '@/lib/market/listingSnapshot';
import { getSongBalanceFromChain } from '@/lib/contract/serverBalance';
import {
  buildDedupeKey,
  createUserNotification,
  recordUserTransaction,
} from '@/lib/notifications/service';

type EventPayload = Record<string, unknown>;

export type ListenerEvent = {
  name: string;
  payload: EventPayload;
};

const KNOWN_EVENT_NAMES = [
  'SongCreated',
  'SongUpdated',
  'ListingCreated',
  'ListingPurchased',
  'ListingRemoved',
  'AlbumCreated',
] as const;

type KnownEventName = (typeof KNOWN_EVENT_NAMES)[number];

export type EventIngestSummary = {
  received: number;
  applied: number;
  ignored: number;
  appliedByEvent: Record<KnownEventName, number>;
};

type IngestContext = {
  transactionHash?: string | null;
  blockNumber?: number | null;
};

function logIngestEvent(
  stage: 'received' | 'applied' | 'ignored',
  name: string,
  payload: EventPayload,
) {
  console.log('[listener:db:event]', {
    stage,
    event: name,
    payload,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPotentialEventWrapperKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.includes('::')) return true;
  if (trimmed.endsWith('Event') || trimmed.endsWith('Events')) return true;

  const firstChar = trimmed[0];
  if (!firstChar) return false;
  return (
    firstChar === firstChar.toUpperCase() &&
    firstChar !== firstChar.toLowerCase()
  );
}

function findKnownEventName(value: string): KnownEventName | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  for (const knownEventName of KNOWN_EVENT_NAMES) {
    if (
      trimmed.endsWith(knownEventName) ||
      trimmed.toLowerCase() === knownEventName.toLowerCase()
    ) {
      return knownEventName;
    }
  }

  return null;
}

function resolveListenerEvent(event: ListenerEvent): {
  name: KnownEventName | null;
  payload: EventPayload;
} {
  let resolvedName = findKnownEventName(event.name);
  let currentPayload: unknown = event.payload;
  const seen = new Set<unknown>();

  for (let depth = 0; depth < 8; depth += 1) {
    if (!isRecord(currentPayload)) break;
    if (seen.has(currentPayload)) break;
    seen.add(currentPayload);

    const directEventMatch = Object.entries(currentPayload).find(
      ([nestedKey, nestedValue]) =>
        Boolean(findKnownEventName(nestedKey)) && isRecord(nestedValue),
    );
    if (directEventMatch) {
      const [nestedKey, nestedPayload] = directEventMatch;
      resolvedName = findKnownEventName(nestedKey) ?? resolvedName;
      currentPayload = nestedPayload;
      continue;
    }

    const entries = Object.entries(currentPayload);
    if (entries.length === 1) {
      const [nestedKey, nestedPayload] = entries[0];
      if (
        isPotentialEventWrapperKey(nestedKey) &&
        (isRecord(nestedPayload) || Array.isArray(nestedPayload))
      ) {
        if (!resolvedName) {
          resolvedName = findKnownEventName(nestedKey);
        }
        currentPayload = nestedPayload;
        continue;
      }
    }

    break;
  }

  return {
    name: resolvedName,
    payload: isRecord(currentPayload) ? currentPayload : {},
  };
}

function readPayloadField(payload: EventPayload, ...keys: string[]) {
  for (const key of keys) {
    if (key in payload) {
      return payload[key];
    }
  }
  return undefined;
}

function normalizeHexAddress(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';

  if (trimmed.startsWith('0x')) {
    try {
      return `0x${BigInt(trimmed).toString(16)}`;
    } catch {
      return trimmed;
    }
  }

  try {
    return `0x${BigInt(trimmed).toString(16)}`;
  } catch {
    return trimmed;
  }
}

function toAddress(value: unknown) {
  return normalizeHexAddress(String(value ?? ''));
}

function toBigIntValue(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return BigInt(0);
    return BigInt(trimmed);
  }
  if (
    value &&
    typeof value === 'object' &&
    'low' in value &&
    'high' in value
  ) {
    const low = BigInt((value as { low: string | number }).low);
    const high = BigInt((value as { high: string | number }).high);
    return (high << BigInt(128)) + low;
  }
  return BigInt(0);
}

function toU256String(value: unknown) {
  return toBigIntValue(value).toString();
}

function multiplyAsString(left: unknown, right: unknown) {
  return (toBigIntValue(left) * toBigIntValue(right)).toString();
}

function toSafeInt(value: unknown) {
  const parsed = Number(toBigIntValue(value));
  if (!Number.isFinite(parsed)) return 0;
  if (parsed > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
  if (parsed < Number.MIN_SAFE_INTEGER) return Number.MIN_SAFE_INTEGER;
  return Math.trunc(parsed);
}

function parseByteArrayLike(value: unknown) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return String(value ?? '');
  if ('data' in value || 'pending_word' in value) {
    return JSON.stringify(value);
  }
  return String(value);
}

function parseReleaseDate(value: unknown) {
  const numeric = toU256String(value);
  const compact = numeric.replace(/\D/g, '');
  if (compact.length >= 8) {
    const trimmed = compact.slice(0, 8);
    const year = Number(trimmed.slice(0, 4));
    const month = Number(trimmed.slice(4, 6));
    const day = Number(trimmed.slice(6, 8));
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      year >= 1970 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }
  return new Date();
}

async function ensureUser(address: string) {
  if (!address) return;
  await db
    .insert(users)
    .values({
      contractAddress: address,
    })
    .onConflictDoNothing();
}

async function upsertSongPlaceholder(songId: string, artist?: string) {
  await db
    .insert(songs)
    .values({
      id: songId,
      title: `Song ${songId}`,
      artist: artist || 'unknown',
      genre: 'unknown',
      length: 0,
      releaseDate: new Date(),
      cid: '',
      cover: '/logo.svg',
      price: '0',
      copies: 0,
      listingId: null,
    })
    .onConflictDoNothing();
}

async function adjustOwnership(owner: string, songId: string, delta: bigint) {
  if (!owner || !songId || delta === BigInt(0)) return;

  const current = await db.query.tokenOwnerships.findFirst({
    where: and(eq(tokenOwnerships.owner, owner), eq(tokenOwnerships.songid, songId)),
  });

  const currentBalance = current ? toBigIntValue(current.balance) : BigInt(0);
  const nextBalance = currentBalance + delta;

  if (nextBalance <= BigInt(0)) {
    if (current) {
      await db
        .delete(tokenOwnerships)
        .where(eq(tokenOwnerships.id, current.id));
    }
    return;
  }

  await ensureUser(owner);
  await upsertSongPlaceholder(songId);

  if (current) {
    await db
      .update(tokenOwnerships)
      .set({
        balance: nextBalance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(tokenOwnerships.id, current.id));
  } else {
    await db.insert(tokenOwnerships).values({
      owner,
      songid: songId,
      balance: nextBalance.toString(),
    });
  }
}

async function upsertOwnershipAbsolute(owner: string, songId: string, balance: bigint) {
  if (!owner || !songId) return;

  const current = await db.query.tokenOwnerships.findFirst({
    where: and(eq(tokenOwnerships.owner, owner), eq(tokenOwnerships.songid, songId)),
  });

  if (balance <= BigInt(0)) {
    if (current) {
      await db
        .delete(tokenOwnerships)
        .where(eq(tokenOwnerships.id, current.id));
    }
    return;
  }

  await ensureUser(owner);
  await upsertSongPlaceholder(songId);

  if (current) {
    await db
      .update(tokenOwnerships)
      .set({
        balance: balance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(tokenOwnerships.id, current.id));
  } else {
    await db.insert(tokenOwnerships).values({
      owner,
      songid: songId,
      balance: balance.toString(),
    });
  }
}

async function syncOwnershipFromChain(
  owner: string,
  songId: string,
  fallbackDelta: bigint,
) {
  if (!owner || !songId) return;
  try {
    const balance = await getSongBalanceFromChain(owner, songId);
    await upsertOwnershipAbsolute(owner, songId, balance);
  } catch (error) {
    console.warn('[listener:db:ownership-sync:fallback-delta]', {
      owner,
      songId,
      fallbackDelta: fallbackDelta.toString(),
      error: error instanceof Error ? error.message : String(error),
    });
    await adjustOwnership(owner, songId, fallbackDelta);
  }
}

async function handleSongCreated(payload: EventPayload, context: IngestContext) {
  const songId = toU256String(readPayloadField(payload, 'song_id', 'songId'));
  const artist = toAddress(readPayloadField(payload, 'artist'));
  const name =
    parseByteArrayLike(readPayloadField(payload, 'name')) || `Song ${songId}`;
  const genre = parseByteArrayLike(readPayloadField(payload, 'genre')) || 'unknown';
  const length = toSafeInt(readPayloadField(payload, 'length'));
  const releaseDate = parseReleaseDate(
    readPayloadField(payload, 'release_date', 'releaseDate'),
  );
  const cid = String(readPayloadField(payload, 'cid', 'CID') ?? '');

  await ensureUser(artist);
  await db
    .insert(songs)
    .values({
      id: songId,
      title: name,
      artist,
      genre,
      length,
      releaseDate,
      cid,
      cover: '/logo.svg',
      price: '0',
      copies: 0,
      listingId: null,
    })
    .onConflictDoUpdate({
      target: songs.id,
      set: {
        title: name,
        artist,
        genre,
        length,
        releaseDate,
        cid,
      },
    });

  if (!artist) return;

  const tx = await recordUserTransaction({
    userId: artist,
    dedupeKey: buildDedupeKey(
      'song-created',
      context.transactionHash,
      songId,
      artist,
    ),
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    eventType: 'SongCreated',
    direction: 'mint',
    songId,
    copies: 0,
    metadata: payload,
  });

  await createUserNotification({
    userId: artist,
    dedupeKey: buildDedupeKey(
      'song-created-notification',
      context.transactionHash,
      songId,
      artist,
    ),
    type: 'song_minted',
    title: 'Song Mint Confirmed',
    message: `${name} has been confirmed on-chain.`,
    preferenceKey: 'notifySongMinted',
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    songId,
    transactionId: tx?.id ?? null,
    metadata: payload,
  });
}

async function handleSongUpdated(payload: EventPayload) {
  const listingId = toU256String(
    readPayloadField(payload, 'listing_id', 'listingId'),
  );
  const newPrice = toU256String(
    readPayloadField(payload, 'new_price', 'newPrice', 'price'),
  );

  const [listing] = await db
    .update(marketListings)
    .set({
      price: newPrice,
      updatedAt: new Date(),
    })
    .where(eq(marketListings.listingId, listingId))
    .returning();

  if (!listing) return;
  await syncSongMarketSnapshot(listing.songId);
}

async function handleListingCreated(payload: EventPayload, context: IngestContext) {
  const seller = toAddress(readPayloadField(payload, 'seller'));
  const listingId = toU256String(
    readPayloadField(payload, 'listing_id', 'listingId'),
  );
  const songId = toU256String(readPayloadField(payload, 'song_id', 'songId'));
  const price = toU256String(readPayloadField(payload, 'price'));
  const copies = Math.max(0, toSafeInt(readPayloadField(payload, 'copies')));

  await ensureUser(seller);
  await upsertSongPlaceholder(songId, seller);

  await db
    .insert(marketListings)
    .values({
      listingId,
      songId,
      seller,
      price,
      copies,
      isActive: copies > 0,
    })
    .onConflictDoUpdate({
      target: marketListings.listingId,
      set: {
        songId,
        seller,
        price,
        copies,
        isActive: copies > 0,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (copies > 0) {
    await syncOwnershipFromChain(seller, songId, BigInt(-copies));
  }

  await syncSongMarketSnapshot(songId);

  if (!seller) return;

  const tx = await recordUserTransaction({
    userId: seller,
    dedupeKey: buildDedupeKey(
      'listing-created',
      context.transactionHash,
      listingId,
      seller,
    ),
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    eventType: 'ListingCreated',
    direction: 'listing_created',
    songId,
    listingId,
    unitPrice: price,
    copies,
    totalAmount: multiplyAsString(price, copies),
    metadata: payload,
  });

  await createUserNotification({
    userId: seller,
    dedupeKey: buildDedupeKey(
      'listing-created-notification',
      context.transactionHash,
      listingId,
      seller,
    ),
    type: 'listing_created',
    title: 'Listing Confirmed',
    message: `Your listing ${listingId} is now active on-chain.`,
    preferenceKey: 'notifyListingCreated',
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    songId,
    listingId,
    transactionId: tx?.id ?? null,
    metadata: payload,
  });
}

async function handleListingPurchased(
  payload: EventPayload,
  context: IngestContext,
) {
  const buyer = toAddress(readPayloadField(payload, 'buyer'));
  const seller = toAddress(readPayloadField(payload, 'seller'));
  const listingId = toU256String(
    readPayloadField(payload, 'listing_id', 'listingId'),
  );
  let songId = toU256String(readPayloadField(payload, 'song_id', 'songId'));
  const price = toU256String(readPayloadField(payload, 'price'));
  const boughtCopies = Math.max(0, toSafeInt(readPayloadField(payload, 'copies')));

  let listingRow = null as
    | {
        songId: string;
        copies: number;
      }
    | null;

  if (listingId && listingId !== '0') {
    listingRow =
      (await db.query.marketListings.findFirst({
        where: eq(marketListings.listingId, listingId),
        columns: {
          songId: true,
          copies: true,
        },
      })) ?? null;
  }

  if ((!songId || songId === '0') && listingRow?.songId) {
    songId = listingRow.songId;
  }

  if (!buyer || !songId || songId === '0') {
    return;
  }

  await ensureUser(buyer);
  if (seller) {
    await ensureUser(seller);
  }
  await upsertSongPlaceholder(songId);
  await syncOwnershipFromChain(buyer, songId, BigInt(boughtCopies));

  if (listingId && listingId !== '0') {
    const currentCopies = listingRow?.copies ?? 0;
    const remainingCopies = Math.max(0, currentCopies - boughtCopies);

    await db
      .update(marketListings)
      .set({
        price,
        copies: remainingCopies,
        isActive: remainingCopies > 0,
        updatedAt: new Date(),
      })
      .where(eq(marketListings.listingId, listingId));
  }

  await syncSongMarketSnapshot(songId);

  const song = await db.query.songs.findFirst({
    where: eq(songs.id, songId),
    columns: {
      title: true,
    },
  });
  const songTitle = song?.title || `Song ${songId}`;
  const totalAmount = multiplyAsString(price, boughtCopies);

  const buyerTx = await recordUserTransaction({
    userId: buyer,
    dedupeKey: buildDedupeKey(
      'listing-purchased-buyer',
      context.transactionHash,
      listingId,
      buyer,
    ),
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    eventType: 'ListingPurchased',
    direction: 'purchase',
    songId,
    listingId,
    counterparty: seller || null,
    unitPrice: price,
    copies: boughtCopies,
    totalAmount,
    metadata: payload,
  });

  await createUserNotification({
    userId: buyer,
    dedupeKey: buildDedupeKey(
      'purchase-confirmed-notification',
      context.transactionHash,
      listingId,
      buyer,
    ),
    type: 'purchase_confirmed',
    title: 'Purchase Confirmed',
    message: `Your purchase of ${songTitle} is confirmed on-chain.`,
    preferenceKey: 'notifyPurchaseConfirmed',
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    songId,
    listingId,
    transactionId: buyerTx?.id ?? null,
    metadata: payload,
  });

  if (seller) {
    const sellerTx = await recordUserTransaction({
      userId: seller,
      dedupeKey: buildDedupeKey(
        'listing-purchased-seller',
        context.transactionHash,
        listingId,
        seller,
      ),
      txHash: context.transactionHash ?? null,
      blockNumber: context.blockNumber ?? null,
      eventType: 'ListingPurchased',
      direction: 'sale',
      songId,
      listingId,
      counterparty: buyer,
      unitPrice: price,
      copies: boughtCopies,
      totalAmount,
      metadata: payload,
    });

    await createUserNotification({
      userId: seller,
      dedupeKey: buildDedupeKey(
        'listing-sold-notification',
        context.transactionHash,
        listingId,
        seller,
      ),
      type: 'listing_sold',
      title: 'Listing Sold',
      message: `${boughtCopies} copy${boughtCopies === 1 ? '' : 'ies'} of ${songTitle} sold.`,
      preferenceKey: 'notifyListingSold',
      txHash: context.transactionHash ?? null,
      blockNumber: context.blockNumber ?? null,
      songId,
      listingId,
      transactionId: sellerTx?.id ?? null,
      metadata: payload,
    });
  }
}

async function handleListingRemoved(payload: EventPayload, context: IngestContext) {
  const seller = toAddress(readPayloadField(payload, 'seller'));
  const listingId = toU256String(
    readPayloadField(payload, 'listing_id', 'listingId'),
  );
  let songId = toU256String(readPayloadField(payload, 'song_id', 'songId'));
  const removedCopies = Math.max(
    0,
    toSafeInt(
      readPayloadField(payload, 'removed_copies', 'removedCopies', 'copies'),
    ),
  );
  const remainingCopiesField = readPayloadField(
    payload,
    'remaining_copies',
    'remainingCopies',
  );

  let listingRow = null as
    | {
        songId: string;
        copies: number;
      }
    | null;

  if (listingId && listingId !== '0') {
    listingRow =
      (await db.query.marketListings.findFirst({
        where: eq(marketListings.listingId, listingId),
        columns: {
          songId: true,
          copies: true,
        },
      })) ?? null;
  }

  if ((!songId || songId === '0') && listingRow?.songId) {
    songId = listingRow.songId;
  }

  let remainingCopies = Math.max(0, toSafeInt(remainingCopiesField));
  if (remainingCopiesField === undefined && listingRow) {
    remainingCopies = Math.max(0, listingRow.copies - removedCopies);
  }

  if (listingId && listingId !== '0') {
    await db
      .update(marketListings)
      .set({
        copies: remainingCopies,
        isActive: remainingCopies > 0,
        updatedAt: new Date(),
      })
      .where(eq(marketListings.listingId, listingId));
  }

  if (seller && songId && songId !== '0' && removedCopies > 0) {
    await syncOwnershipFromChain(seller, songId, BigInt(removedCopies));
  }

  if (songId && songId !== '0') {
    await syncSongMarketSnapshot(songId);
  }

  if (!seller) return;

  const tx = await recordUserTransaction({
    userId: seller,
    dedupeKey: buildDedupeKey(
      'listing-removed',
      context.transactionHash,
      listingId,
      seller,
      removedCopies,
    ),
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    eventType: 'ListingRemoved',
    direction: 'listing_removed',
    songId: songId && songId !== '0' ? songId : null,
    listingId: listingId && listingId !== '0' ? listingId : null,
    copies: removedCopies,
    metadata: payload,
  });

  await createUserNotification({
    userId: seller,
    dedupeKey: buildDedupeKey(
      'listing-removed-notification',
      context.transactionHash,
      listingId,
      seller,
      removedCopies,
    ),
    type: 'listing_removed',
    title: 'Listing Updated',
    message:
      removedCopies > 0
        ? `Removed ${removedCopies} copy${removedCopies === 1 ? '' : 'ies'} from listing ${listingId}.`
        : `Listing ${listingId} was updated on-chain.`,
    preferenceKey: 'notifyListingRemoved',
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    songId: songId && songId !== '0' ? songId : null,
    listingId: listingId && listingId !== '0' ? listingId : null,
    transactionId: tx?.id ?? null,
    metadata: payload,
  });
}

async function handleAlbumCreated(payload: EventPayload, context: IngestContext) {
  const artist = toAddress(readPayloadField(payload, 'artist'));
  const title =
    parseByteArrayLike(readPayloadField(payload, 'name')) || 'Untitled Album';
  const genre = parseByteArrayLike(readPayloadField(payload, 'genre')) || 'unknown';
  const releaseDate = parseReleaseDate(
    readPayloadField(payload, 'release_date', 'releaseDate'),
  );

  await ensureUser(artist);

  const existing = await db.query.albums.findFirst({
    where: and(
      ilike(albums.title, title),
      ilike(albums.artist, artist),
      eq(albums.releaseDate, releaseDate)
    ),
  });

  if (existing) return;

  await db.insert(albums).values({
    title,
    artist,
    genre,
    releaseDate,
    cover: '/logo.svg',
  });

  if (!artist) return;

  const tx = await recordUserTransaction({
    userId: artist,
    dedupeKey: buildDedupeKey(
      'album-created',
      context.transactionHash,
      artist,
      title,
      releaseDate.toISOString(),
    ),
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    eventType: 'AlbumCreated',
    direction: 'album_created',
    metadata: payload,
  });

  await createUserNotification({
    userId: artist,
    dedupeKey: buildDedupeKey(
      'album-created-notification',
      context.transactionHash,
      artist,
      title,
      releaseDate.toISOString(),
    ),
    type: 'album_created',
    title: 'Album Confirmed',
    message: `${title} has been confirmed on-chain.`,
    preferenceKey: 'notifyAlbumCreated',
    txHash: context.transactionHash ?? null,
    blockNumber: context.blockNumber ?? null,
    transactionId: tx?.id ?? null,
    metadata: payload,
  });
}

export async function ingestGroovvEvents(
  events: ListenerEvent[],
  context: IngestContext = {},
): Promise<EventIngestSummary> {
  const summary: EventIngestSummary = {
    received: events.length,
    applied: 0,
    ignored: 0,
    appliedByEvent: {
      SongCreated: 0,
      SongUpdated: 0,
      ListingCreated: 0,
      ListingPurchased: 0,
      ListingRemoved: 0,
      AlbumCreated: 0,
    },
  };

  for (const event of events) {
    const resolvedEvent = resolveListenerEvent(event);
    if (!resolvedEvent.name) {
      logIngestEvent('ignored', event.name, event.payload);
      summary.ignored += 1;
      continue;
    }

    logIngestEvent('received', resolvedEvent.name, resolvedEvent.payload);

    if (resolvedEvent.name === 'SongCreated') {
      await handleSongCreated(resolvedEvent.payload, context);
      logIngestEvent('applied', resolvedEvent.name, resolvedEvent.payload);
      summary.applied += 1;
      summary.appliedByEvent.SongCreated += 1;
      continue;
    }
    if (resolvedEvent.name === 'SongUpdated') {
      await handleSongUpdated(resolvedEvent.payload);
      logIngestEvent('applied', resolvedEvent.name, resolvedEvent.payload);
      summary.applied += 1;
      summary.appliedByEvent.SongUpdated += 1;
      continue;
    }
    if (resolvedEvent.name === 'ListingCreated') {
      await handleListingCreated(resolvedEvent.payload, context);
      logIngestEvent('applied', resolvedEvent.name, resolvedEvent.payload);
      summary.applied += 1;
      summary.appliedByEvent.ListingCreated += 1;
      continue;
    }
    if (resolvedEvent.name === 'ListingPurchased') {
      await handleListingPurchased(resolvedEvent.payload, context);
      logIngestEvent('applied', resolvedEvent.name, resolvedEvent.payload);
      summary.applied += 1;
      summary.appliedByEvent.ListingPurchased += 1;
      continue;
    }
    if (resolvedEvent.name === 'ListingRemoved') {
      await handleListingRemoved(resolvedEvent.payload, context);
      logIngestEvent('applied', resolvedEvent.name, resolvedEvent.payload);
      summary.applied += 1;
      summary.appliedByEvent.ListingRemoved += 1;
      continue;
    }
    if (resolvedEvent.name === 'AlbumCreated') {
      await handleAlbumCreated(resolvedEvent.payload, context);
      logIngestEvent('applied', resolvedEvent.name, resolvedEvent.payload);
      summary.applied += 1;
      summary.appliedByEvent.AlbumCreated += 1;
      continue;
    }

    logIngestEvent('ignored', resolvedEvent.name, resolvedEvent.payload);
    summary.ignored += 1;
  }

  return summary;
}
