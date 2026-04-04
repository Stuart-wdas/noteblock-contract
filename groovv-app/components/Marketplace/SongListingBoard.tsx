'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ShoppingBasket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketSong } from './RecommendationSection';

export type SongBoardListing = {
  listingId: string;
  songId: string;
  seller: string;
  sellerName: string;
  sellerAvatar: string | null;
  price: string;
  copies: number;
  isArtist: boolean;
  createdAt: string;
  updatedAt: string;
};

type SongListingBoardPayload = {
  generatedAt: string;
  song: {
    id: string;
    title: string;
    artist: string;
    genre: string;
    cover: string;
    url: string;
    releaseDate: string;
  };
  listingCount: number;
  listings: SongBoardListing[];
};

async function fetchSongListings(songId: string) {
  const response = await fetch(`/api/market/songs/${songId}/listings`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load song listings');
  }

  return (await response.json()) as SongListingBoardPayload;
}

export default function SongListingBoard({
  song,
  walletAddress,
  activeBuyListingId,
  status,
  onClose,
  onBuyListing,
}: {
  song: MarketSong | null;
  walletAddress: string;
  activeBuyListingId: string;
  status: string;
  onClose: () => void;
  onBuyListing: (song: MarketSong, listing: SongBoardListing) => Promise<void>;
}) {
  const songId = song?.id ?? '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['songListingBoard', songId],
    queryFn: () => fetchSongListings(songId),
    enabled: Boolean(songId),
    staleTime: 20_000,
  });

  if (!song) return null;

  return (
    <div className='fixed inset-0 z-100 bg-black'>
      <div className='mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden'>
        <div className='flex items-center justify-between border-b border-zinc-800 px-4 py-4'>
          <button
            type='button'
            className='flex items-center gap-1 text-sm text-zinc-300 hover:text-white'
            onClick={onClose}
          >
            <ChevronLeft className='h-4 w-4' />
            Marketplace
          </button>
          <p className='text-xs text-zinc-500'>Song Listing Board</p>
        </div>

        <div className='flex-1 overflow-y-auto px-4 py-4'>
          <div className='mb-4 flex gap-3'>
            <img
              src={song.cover || '/logo.svg'}
              alt={song.title}
              className='h-20 w-20 rounded-lg border border-zinc-700 object-cover'
            />
            <div className='min-w-0 flex-1'>
              <p className='truncate text-lg font-semibold text-white'>
                {song.title}
              </p>
              <p className='text-sm text-zinc-400'>{song.artist}</p>
              <p className='mt-1 text-xs text-zinc-500'>
                {song.genre} • {song.listingCount} listing
                {song.listingCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className='text-sm text-zinc-400'>Loading listings...</p>
          ) : error ? (
            <p className='text-sm text-red-400'>Could not load listings right now.</p>
          ) : !data || data.listings.length === 0 ? (
            <p className='text-sm text-zinc-400'>
              No active listings for this song right now.
            </p>
          ) : (
            <div className='space-y-3'>
              {data.listings.map((listing) => {
                const normalizedWallet = walletAddress.trim().toLowerCase();
                const normalizedSeller = listing.seller.trim().toLowerCase();
                const isSellerWallet =
                  Boolean(normalizedWallet) &&
                  normalizedWallet === normalizedSeller;
                const isBusy = activeBuyListingId === listing.listingId;

                return (
                  <article
                    key={listing.listingId}
                    className='rounded-xl border border-zinc-800 bg-zinc-950/70 p-3'
                  >
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm text-zinc-100'>
                          Seller: {listing.sellerName}
                        </p>
                        <p className='text-[11px] text-zinc-500 break-all'>
                          {listing.seller}
                        </p>
                        <div className='mt-1 flex flex-wrap items-center gap-2 text-xs'>
                          <span className='rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300'>
                            Price {listing.price}
                          </span>
                          <span className='rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300'>
                            Copies {listing.copies}
                          </span>
                          {listing.isArtist ? (
                            <span className='rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-orange-200'>
                              Artist
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <Button
                        type='button'
                        className='bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                        disabled={isBusy || isSellerWallet || !walletAddress}
                        onClick={() => void onBuyListing(song, listing)}
                      >
                        <ShoppingBasket className='h-4 w-4' />
                        {isSellerWallet
                          ? 'Your Listing'
                          : isBusy
                            ? 'Buying...'
                            : 'Buy 1 Copy'}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className='border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400'>
          {status || 'Pick a listing to buy from the board.'}
        </div>
      </div>
    </div>
  );
}
