import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { marketListings, songs } from '@/lib/db/schema';

type ActiveListing = {
  listingId: string;
  price: string;
  copies: number;
};

function toBigIntSafe(value: string) {
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function pickBestListing(listings: ActiveListing[]) {
  if (listings.length === 0) return null;

  const sorted = [...listings].sort((a, b) => {
    const priceDiff = toBigIntSafe(a.price) - toBigIntSafe(b.price);
    if (priceDiff < 0) return -1;
    if (priceDiff > 0) return 1;

    if (a.copies !== b.copies) return b.copies - a.copies;
    return a.listingId.localeCompare(b.listingId);
  });

  return sorted[0];
}

export async function syncSongMarketSnapshot(songId: string) {
  const active = await db
    .select({
      listingId: marketListings.listingId,
      price: marketListings.price,
      copies: marketListings.copies,
    })
    .from(marketListings)
    .where(
      and(
        eq(marketListings.songId, songId),
        eq(marketListings.isActive, true),
        gt(marketListings.copies, 0),
      ),
    );

  const preferred = pickBestListing(active);
  const totalCopies = active.reduce((sum, listing) => sum + listing.copies, 0);

  await db
    .update(songs)
    .set({
      listingId: preferred?.listingId ?? null,
      price: preferred?.price ?? '0',
      copies: totalCopies,
    })
    .where(eq(songs.id, songId));
}
