'use client';

import AlbumCover from '@/components/AlbumCover';
import SongListingBoard, {
  SongBoardListing,
} from '@/components/Marketplace/SongListingBoard';
import type { MarketSong } from '@/components/Marketplace/RecommendationSection';
import { useGroovv } from '@/providers/GroovProvider';
import { useWallet } from '@/providers/StarknetProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingBasket } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SongItem from '@/components/Song/SongItem';

type Realm = 'library' | 'marketplace';
type SearchMarketSong = Song & {
  price?: string;
  copies?: number;
  cid?: string;
  listingId?: string | null;
  listingCount?: number;
  songId?: string;
  releaseDate?: string;
  albumId?: number | null;
  albumTitle?: string | null;
};
type SearchApiResult = {
  id: string | number;
  title?: string;
  artist?: string;
  genre?: string;
  cid?: string;
  cover?: string;
  price?: string | number;
  copies?: number | string;
  listingId?: string | null;
  listingCount?: number | string;
  songId?: string;
  releaseDate?: string;
  albumId?: number | null;
  albumTitle?: string | null;
};

const SEARCH_DEBOUNCE_MS = 320;
const MAX_SEARCH_RESULTS = 200;
const EMPTY_OWNED_SONG_IDS = new Set<string>();
const EMPTY_METRICS: MarketSong['metrics'] = {
  streams24h: 0,
  streamsPrev24h: 0,
  streams7d: 0,
  ownerCount: 0,
  freshness: 0,
  trendGrowth: 0,
  topPickScore: 0,
  riseScore: 0,
  personalAffinity: 0,
  speedScore: 0,
};

function toSafeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
}

function resolveSongUrl(cid?: string) {
  if (!cid) return '';
  if (
    cid.startsWith('http://') ||
    cid.startsWith('https://') ||
    cid.startsWith('/')
  ) {
    return cid;
  }
  return `/songs/${cid}`;
}

function toListingBoardSong(song: SearchMarketSong): MarketSong {
  return {
    ...song,
    listingId: song.listingId ?? null,
    listingCount: song.listingCount ?? 0,
    songId: song.songId ?? song.id,
    price: song.price ?? '0',
    copies: song.copies ?? 0,
    releaseDate: song.releaseDate ?? new Date().toISOString(),
    albumId: song.albumId ?? null,
    albumTitle: song.albumTitle ?? null,
    metrics: { ...EMPTY_METRICS },
  };
}

export default function SearchComp() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [realm, setRealm] = useState<Realm>('library');
  const [isSearching, setIsSearching] = useState(false);
  const [marketResults, setMarketResults] = useState<SearchMarketSong[]>([]);
  const [selectedMarketSong, setSelectedMarketSong] =
    useState<MarketSong | null>(null);
  const [activeBuyListingId, setActiveBuyListingId] = useState('');
  const [status, setStatus] = useState('');
  const queryClient = useQueryClient();
  const { libraryView } = useAudioPlayer();
  const { address } = useWallet();
  const { buySong, isConfigured } = useGroovv();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchTerm]);

  const normalizedSearchTerm = debouncedSearchTerm.toLowerCase();

  const librarySongs = useMemo(() => {
    const songs = libraryView?.partitioned?.songs ?? [];
    if (!normalizedSearchTerm) return songs.slice(0, MAX_SEARCH_RESULTS);

    return songs
      .filter((song) =>
        `${song.title} ${song.artist} ${song.genre}`
          .toLowerCase()
          .includes(normalizedSearchTerm),
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }, [libraryView?.partitioned?.songs, normalizedSearchTerm]);

  const librarySongsById = useMemo(() => {
    const songs = libraryView?.partitioned?.songs ?? [];
    return new Map(songs.map((song) => [song.id, song]));
  }, [libraryView?.partitioned?.songs]);

  const ownedSongIds =
    libraryView?.partitioned?.ownedSongIds ?? EMPTY_OWNED_SONG_IDS;

  useEffect(() => {
    if (realm !== 'marketplace') {
      setIsSearching(false);
      return;
    }

    const query = debouncedSearchTerm.trim();
    if (!query) {
      setMarketResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const runSearch = async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=${MAX_SEARCH_RESULTS}`,
          { signal: controller.signal, cache: 'no-store' },
        );
        const payload = await response.json();

        const songs: SearchApiResult[] = Array.isArray(payload.results)
          ? payload.results
          : [];

        const normalized = songs
          .filter((song) => song?.id != null)
          .map((song) => {
            const cid = typeof song.cid === 'string' ? song.cid : '';
            return {
              id: String(song.id),
              title: song.title ?? 'Untitled Song',
              artist: song.artist ?? 'Unknown Artist',
              genre: song.genre ?? 'Unknown',
              cover: song.cover ?? '/logo.svg',
              url: resolveSongUrl(cid),
              price: String(song.price ?? '0'),
              copies: toSafeNumber(song.copies, 0),
              cid,
              listingId: song.listingId ?? null,
              listingCount: toSafeNumber(song.listingCount, 0),
              songId: song.songId ?? String(song.id),
              releaseDate: song.releaseDate ?? new Date().toISOString(),
              albumId: song.albumId ?? null,
              albumTitle: song.albumTitle ?? null,
            } as SearchMarketSong;
          });

        setMarketResults(normalized);
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return;
        console.error('Market search failed', error);
        setMarketResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    void runSearch();

    return () => {
      controller.abort();
    };
  }, [debouncedSearchTerm, realm]);

  const runImmediateSearch = () => {
    setDebouncedSearchTerm(searchTerm.trim());
  };

  const openSongListingBoard = (song: SearchMarketSong) => {
    setSelectedMarketSong(toListingBoardSong(song));
    setStatus(`Viewing listings for ${song.title}.`);
  };

  const handleBuyListing = async (
    song: MarketSong,
    listing: SongBoardListing,
  ) => {
    if (!address) {
      setStatus('Connect your wallet before buying songs.');
      return;
    }

    if (!isConfigured) {
      setStatus(
        'Contract not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
      );
      return;
    }

    if (!/^\d+$/.test(listing.listingId)) {
      setStatus(
        `Listing ${listing.listingId} is not a valid on-chain listing id.`,
      );
      return;
    }

    setActiveBuyListingId(listing.listingId);
    setStatus(`Buying ${song.title} from listing ${listing.listingId}...`);
    try {
      await buySong(listing.listingId, listing.price, 1, 0);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['userLibrary', address] }),
        queryClient.invalidateQueries({ queryKey: ['marketSongs', address] }),
        queryClient.invalidateQueries({
          queryKey: ['songListingBoard', song.id],
        }),
      ]);

      setStatus(`Purchased ${song.title} from ${listing.sellerName}.`);
    } catch (error) {
      console.error('Failed to buy song', error);
      setStatus(`Could not buy ${song.title} right now.`);
    } finally {
      setActiveBuyListingId('');
    }
  };

  return (
    <div className='grid grid-cols-1 gap-4 py-2'>
      <section className='rounded-2xl'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center'>
          <div className='grid w-full max-w-sm grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5'>
            <RealmTabItem
              label='Library'
              isActive={realm === 'library'}
              onClick={() => setRealm('library')}
            />
            <RealmTabItem
              label='Marketplace'
              isActive={realm === 'marketplace'}
              onClick={() => setRealm('marketplace')}
            />
          </div>

          <div className='flex w-full items-center gap-2'>
            <Input
              className='w-full rounded-full'
              placeholder={
                realm === 'library'
                  ? 'Search your library'
                  : 'Search marketplace songs'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runImmediateSearch();
              }}
            />
            <Button
              type='button'
              className='bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
              onClick={runImmediateSearch}
            >
              <Search className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </section>

      <section className='rounded-2xl border border-white/10 bg-black/30 p-4'>
        {realm === 'library' ? (
          <div className='grid gap-2'>
            {librarySongs.length === 0 ? (
              <p className='text-sm text-zinc-400'>No library songs found.</p>
            ) : (
              librarySongs.map((song) => <SongItem key={song.id} song={song} />)
            )}
          </div>
        ) : (
          <div className='grid gap-2'>
            {isSearching ? (
              <p className='text-sm text-zinc-400'>Searching marketplace...</p>
            ) : marketResults.length === 0 ? (
              <p className='text-sm text-zinc-400'>
                {debouncedSearchTerm
                  ? 'No marketplace matches found.'
                  : 'Start typing to search marketplace songs.'}
              </p>
            ) : (
              marketResults.map((song) => {
                const isOwned = ownedSongIds.has(song.id);
                if (isOwned) {
                  const ownedSong = librarySongsById.get(song.id) ?? song;
                  return (
                    <article
                      key={song.id}
                      className='rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3'
                    >
                      <p className='mb text-xs uppercase tracking-[0.2em] text-emerald-200'>
                        You own this song
                      </p>
                      {/* <AlbumCover album={ownedSong} variant='playlist' /> */}
                      <SongItem song={ownedSong} />
                    </article>
                  );
                }

                return (
                  <article
                    key={song.id}
                    className='rounded-xl border border-zinc-800 bg-zinc-950/60 p-3'
                  >
                    <div className='flex gap-3'>
                      <img
                        src={song.cover || '/logo.svg'}
                        alt={song.title}
                        className='h-16 w-16 rounded-lg border border-zinc-700 object-cover'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate font-medium text-white'>
                          {song.title}
                        </p>
                        <p className='truncate text-xs text-zinc-400'>
                          {song.artist}
                        </p>
                        <p className='mt-1 text-xs text-zinc-500'>
                          Price: {song.price ?? '0'} | Copies:{' '}
                          {song.copies ?? 0}
                        </p>
                      </div>
                    </div>
                    <Button
                      type='button'
                      className='mt-3 w-full bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                      onClick={() => openSongListingBoard(song)}
                    >
                      <ShoppingBasket className='h-4 w-4' />
                      View Listings
                    </Button>
                  </article>
                );
              })
            )}
          </div>
        )}
      </section>

      <SongListingBoard
        song={selectedMarketSong}
        walletAddress={address}
        activeBuyListingId={activeBuyListingId}
        status={status}
        onClose={() => {
          setSelectedMarketSong(null);
        }}
        onBuyListing={handleBuyListing}
      />
    </div>
  );
}

function RealmTabItem({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='relative z-20 flex w-full items-center justify-center overflow-hidden rounded-xl bg-transparent px-3 py-1.5 text-xs font-bold text-white transition'
    >
      {isActive ? (
        <motion.span
          layoutId='search-realm-active-tab'
          className='absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-500'
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      ) : null}
      <span className='relative z-10'>{label}</span>
    </button>
  );
}
