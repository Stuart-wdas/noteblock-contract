'use client';

import { useMemo, useState } from 'react';
import { listOwnedSongOnMarket } from '@/actions/musicActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useWallet } from '@/providers/StarknetProvider';
import { useGroovv } from '@/providers/GroovProvider';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Coins,
  LayoutGrid,
  Layers3,
  ListChecks,
  Rows3,
  Tag,
} from 'lucide-react';

type LibrarySong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  cover: string;
  listingId?: string | null;
  price: string;
  copies: number;
};

type TokenOwnershipRow = {
  id: number;
  balance: string;
  song: LibrarySong;
};

type ActiveListingRow = {
  id: number;
  listingId: string;
  songId: string;
  seller: string;
  price: string;
  copies: number;
  isActive: boolean;
  song: LibrarySong | null;
};

type ListingAllocation = {
  listingId: string;
  copies: number;
  price: string;
};

type Holding = {
  songId: string;
  listingId?: string | null;
  listingIds: string[];
  title: string;
  artist: string;
  genre: string;
  cover: string;
  listedPrice: string;
  listedCopies: number;
  ownedBalance: number;
};

type Draft = {
  price: string;
  copies: string;
};

function toNumber(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBigIntSafe(value: string) {
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function normalizeAddress(value: string | undefined | null) {
  const normalized = (value ?? '').trim();
  if (!normalized) return '0x0';
  try {
    return `0x${BigInt(normalized).toString(16)}`;
  } catch {
    return normalized.toLowerCase();
  }
}

function isZeroAddress(value: string | undefined | null) {
  return normalizeAddress(value) === '0x0';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? '');
}

export default function Listings() {
  const { address, library, isLibraryLoading } = useWallet();
  const { isConfigured, listSong, removeListing, getSongBalance, getListing } =
    useGroovv();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeSongId, setActiveSongId] = useState('');
  const [listingView, setListingView] = useState<'cards' | 'table'>('cards');
  const [isListingSheetOpen, setIsListingSheetOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [status, setStatus] = useState('');

  const holdings = useMemo(() => {
    if (!library || library === false || typeof library !== 'object') return [];

    const ownershipRows = ((
      library as { tokenOwnerships?: TokenOwnershipRow[] }
    ).tokenOwnerships ?? []) as TokenOwnershipRow[];
    const activeListingRows = ((
      library as { activeListings?: ActiveListingRow[] }
    ).activeListings ?? []) as ActiveListingRow[];
    const grouped = new Map<string, Holding>();

    ownershipRows.forEach((row) => {
      if (!row.song?.id) return;
      const ownedBalance = toNumber(row.balance);
      const existing = grouped.get(row.song.id);

      if (existing) {
        existing.ownedBalance += ownedBalance;
        return;
      }

      grouped.set(row.song.id, {
        songId: row.song.id,
        listingId: row.song.listingId,
        listingIds: row.song.listingId ? [row.song.listingId] : [],
        title: row.song.title,
        artist: row.song.artist,
        genre: row.song.genre,
        cover: row.song.cover || '/logo.svg',
        listedPrice: row.song.price ?? '0',
        listedCopies: toNumber(row.song.copies),
        ownedBalance,
      });
    });

    activeListingRows.forEach((listing) => {
      const songId = listing.song?.id ?? listing.songId;
      if (!songId) return;
      const listedCopies = Math.max(0, toNumber(listing.copies));
      if (listedCopies <= 0) return;

      const existing = grouped.get(songId);
      if (existing) {
        existing.listedCopies += listedCopies;
        existing.listingIds = Array.from(
          new Set([...existing.listingIds, listing.listingId]),
        );
        existing.listingId =
          existing.listingIds[0] ?? existing.listingId ?? null;

        if (
          existing.listedPrice === '0' ||
          toBigIntSafe(listing.price) < toBigIntSafe(existing.listedPrice)
        ) {
          existing.listedPrice = listing.price;
        }

        if (listing.song?.title) {
          existing.title = listing.song.title;
          existing.artist = listing.song.artist;
          existing.genre = listing.song.genre;
          existing.cover = listing.song.cover || existing.cover || '/logo.svg';
        }
        return;
      }

      grouped.set(songId, {
        songId,
        listingId: listing.listingId,
        listingIds: [listing.listingId],
        title: listing.song?.title || `Song ${songId}`,
        artist: listing.song?.artist || listing.seller,
        genre: listing.song?.genre || 'unknown',
        cover: listing.song?.cover || '/logo.svg',
        listedPrice: listing.price,
        listedCopies,
        ownedBalance: 0,
      });
    });

    return Array.from(grouped.values());
  }, [library]);

  const filteredHoldings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return holdings;

    return holdings.filter((song) =>
      `${song.title} ${song.artist} ${song.genre} ${song.songId} ${song.listingIds.join(' ')}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [holdings, query]);

  const activeListings = useMemo(
    () => holdings.filter((song) => song.listedCopies > 0).length,
    [holdings],
  );
  const activeListingSongs = useMemo(
    () => holdings.filter((song) => song.listedCopies > 0),
    [holdings],
  );
  const activeListingsBySongId = useMemo(() => {
    const grouped = new Map<string, Map<string, ListingAllocation>>();
    if (!library || library === false || typeof library !== 'object') {
      return grouped;
    }

    const activeListingRows = ((
      library as { activeListings?: ActiveListingRow[] }
    ).activeListings ?? []) as ActiveListingRow[];

    activeListingRows.forEach((listing) => {
      const songId = listing.song?.id ?? listing.songId;
      if (!songId || !listing.listingId) return;
      const listingCopies = Math.max(0, toNumber(listing.copies));
      if (listingCopies <= 0) return;

      const byListingId =
        grouped.get(songId) ?? new Map<string, ListingAllocation>();
      const existing = byListingId.get(listing.listingId);

      if (existing) {
        existing.copies += listingCopies;
        if (
          existing.price === '0' ||
          toBigIntSafe(listing.price) < toBigIntSafe(existing.price)
        ) {
          existing.price = listing.price;
        }
      } else {
        byListingId.set(listing.listingId, {
          listingId: listing.listingId,
          copies: listingCopies,
          price: listing.price,
        });
      }

      grouped.set(songId, byListingId);
    });

    return grouped;
  }, [library]);

  const onchainBalanceSongs = useMemo(
    () => holdings.filter((song) => /^\d+$/.test(song.songId)),
    [holdings],
  );

  const onchainBalanceQueries = useQueries({
    queries: onchainBalanceSongs.map((song) => ({
      queryKey: ['onchainSongBalance', address, song.songId],
      enabled: Boolean(address && isConfigured),
      retry: false,
      staleTime: 15_000,
      queryFn: async () => {
        if (!address) return null;
        try {
          return await getSongBalance(address, song.songId);
        } catch (error) {
          console.warn('[groovv:listings:onchain-balance:unavailable]', {
            songId: song.songId,
            owner: address,
            error: getErrorMessage(error),
          });
          return null;
        }
      },
    })),
  });

  const onchainBalanceBySongId = useMemo(() => {
    const balances = new Map<string, bigint>();

    onchainBalanceSongs.forEach((song, index) => {
      const raw = onchainBalanceQueries[index]?.data;
      if (typeof raw !== 'string') return;
      try {
        balances.set(song.songId, BigInt(raw));
      } catch {
        // Ignore malformed values and keep fallback path.
      }
    });

    return balances;
  }, [onchainBalanceQueries, onchainBalanceSongs]);

  const onchainBalanceLoading = useMemo(
    () =>
      onchainBalanceQueries.some(
        (query) => query.isLoading || query.isFetching,
      ),
    [onchainBalanceQueries],
  );

  const getTrustedOwnedBalance = (song: Holding) => {
    const onchainBalance = onchainBalanceBySongId.get(song.songId);
    if (onchainBalance !== undefined) {
      return {
        value: onchainBalance,
        source: 'onchain' as const,
      };
    }

    const dbBalance = BigInt(Math.max(0, Math.trunc(song.ownedBalance)));
    return {
      value: dbBalance,
      source: 'db' as const,
    };
  };

  const totalListedCopies = useMemo(
    () => holdings.reduce((sum, song) => sum + toNumber(song.listedCopies), 0),
    [holdings],
  );
  const selectedSong = useMemo(
    () => holdings.find((song) => song.songId === selectedSongId) ?? null,
    [holdings, selectedSongId],
  );

  const getDraft = (song: Holding): Draft => {
    if (drafts[song.songId]) return drafts[song.songId];
    return {
      price: song.listedPrice || '1',
      copies: String(song.listedCopies || 1),
    };
  };

  const updateDraft = (songId: string, updates: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [songId]: {
        price: current[songId]?.price ?? '1',
        copies: current[songId]?.copies ?? '1',
        ...updates,
      },
    }));
  };
  const selectedDraft = selectedSong ? getDraft(selectedSong) : null;
  const selectedTrustedOwned = selectedSong
    ? getTrustedOwnedBalance(selectedSong)
    : null;
  const selectedBusy = selectedSong
    ? activeSongId === selectedSong.songId
    : false;
  const selectedOwnedBalanceLabel =
    selectedTrustedOwned === null
      ? ''
      : selectedTrustedOwned.source === 'onchain'
        ? `${selectedTrustedOwned.value.toString()} (on-chain)`
        : `${selectedTrustedOwned.value.toString()} (db fallback)`;

  const reconcileSongListingsFromChain = async (song: Holding) => {
    if (!address) {
      throw new Error('Wallet address unavailable for listing reconciliation.');
    }

    const listingIds = Array.from(
      new Set(
        [
          ...song.listingIds,
          ...(song.listingId ? [song.listingId] : []),
        ].filter((listingId): listingId is string => Boolean(listingId)),
      ),
    );
    if (listingIds.length === 0) {
      return [] as ListingAllocation[];
    }

    const normalizedOwner = normalizeAddress(address);
    const reconciled: ListingAllocation[] = [];

    for (const listingId of listingIds) {
      try {
        const listingOnChain = await getListing(listingId);
        const listingSongId = String(listingOnChain.songId ?? '').trim();
        const listingSeller = normalizeAddress(listingOnChain.seller);
        const listingCopiesRaw = Math.max(0, toNumber(listingOnChain.copies));
        const listingPrice = listingOnChain.price || song.listedPrice || '0';

        const belongsToSong = listingSongId === song.songId;
        const belongsToOwner = listingSeller === normalizedOwner;
        const isActiveOnChain =
          listingCopiesRaw > 0 &&
          belongsToSong &&
          belongsToOwner &&
          !isZeroAddress(listingOnChain.seller);
        const patchedCopies = isActiveOnChain ? listingCopiesRaw : 0;

        await listOwnedSongOnMarket({
          owner: address,
          songId: song.songId,
          listingId,
          price: listingPrice,
          copies: patchedCopies,
        });

        if (patchedCopies > 0) {
          reconciled.push({
            listingId,
            copies: patchedCopies,
            price: listingPrice,
          });
        }
      } catch (error) {
        console.warn('[groovv:listings:reconcile-listing:failed]', {
          songId: song.songId,
          listingId,
          error: getErrorMessage(error),
        });
      }
    }

    await queryClient.invalidateQueries({
      queryKey: ['userLibrary', address],
    });

    return reconciled;
  };

  const openListingSheet = (songId: string) => {
    setSelectedSongId(songId);
    setIsListingSheetOpen(true);
  };
  const closeListingSheet = () => {
    setIsListingSheetOpen(false);
    setSelectedSongId('');
  };

  const handleListSong = async (song: Holding) => {
    if (!address) {
      setStatus('Connect your wallet to manage listings.');
      return;
    }

    const draft = getDraft(song);
    const price = draft.price.trim();
    const copyCount = toNumber(draft.copies);

    if (!Number.isInteger(copyCount) || copyCount < 0) {
      setStatus('Copies must be a whole number.');
      return;
    }

    if (copyCount === 0) {
      setStatus(
        'Set copies to at least 1 when listing. Use Remove Copies to unlist.',
      );
      return;
    }

    const trustedOwned = getTrustedOwnedBalance(song);
    if (BigInt(copyCount) > trustedOwned.value) {
      setStatus(
        `You own ${trustedOwned.value.toString()} copy/copies of ${song.title}.`,
      );
      return;
    }

    if (copyCount > 0 && toNumber(price) <= 0) {
      setStatus('Price must be greater than zero when listing copies.');
      return;
    }

    if (!isConfigured) {
      setStatus('Contract integration is not configured.');
      return;
    }

    if (!/^\d+$/.test(song.songId)) {
      setStatus('Song id is not a valid on-chain id.');
      return;
    }

    setActiveSongId(song.songId);
    setStatus('Publishing listing...');

    try {
      const listed = await listSong(song.songId, price, copyCount);
      console.log('[groovv:listings:list-song]', {
        songId: song.songId,
        listingId: listed.listingId,
        price,
        copies: copyCount,
      });

      const updatedSong = await listOwnedSongOnMarket({
        owner: address,
        songId: song.songId,
        listingId: listed.listingId ?? null,
        price: price || song.listedPrice,
        copies: copyCount,
      });

      if (!updatedSong) {
        throw new Error('Could not update listing');
      }

      await queryClient.invalidateQueries({
        queryKey: ['userLibrary', address],
      });
      setDrafts((current) => ({
        ...current,
        [song.songId]: {
          price: updatedSong.price,
          copies: String(updatedSong.copies),
        },
      }));

      setStatus(
        `Listed ${song.title} (${copyCount} copies at ${updatedSong.price}).`,
      );
    } catch (error) {
      console.error(error);
      setStatus(
        getErrorMessage(error) || 'Could not update listing right now.',
      );
    } finally {
      setActiveSongId('');
    }
  };

  const handleRemoveListing = async (
    song: Holding,
    copyCountOverride?: number,
  ) => {
    if (!address) {
      setStatus('Connect your wallet to manage listings.');
      return;
    }

    if (!isConfigured) {
      setStatus('Contract integration is not configured.');
      return;
    }

    if (song.listedCopies <= 0) {
      setStatus('This song has no listed copies to remove.');
      return;
    }

    const copyCount =
      copyCountOverride !== undefined
        ? copyCountOverride
        : toNumber(getDraft(song).copies);
    if (!Number.isInteger(copyCount) || copyCount <= 0) {
      setStatus('Copies to remove must be a whole number greater than zero.');
      return;
    }

    const listingIds = Array.from(
      new Set(
        [
          ...song.listingIds,
          ...(song.listingId ? [song.listingId] : []),
        ].filter((listingId): listingId is string => Boolean(listingId)),
      ),
    );
    if (listingIds.length === 0) {
      setStatus('No on-chain listing id found for this song.');
      return;
    }

    let listingAllocations = Array.from(
      activeListingsBySongId.get(song.songId)?.values() ?? [],
    );
    if (listingAllocations.length === 0) {
      listingAllocations = [
        {
          listingId: listingIds[0],
          copies: song.listedCopies,
          price: song.listedPrice,
        },
      ];
    }

    let totalAllocatableCopies = listingAllocations.reduce(
      (sum, listing) => sum + Math.max(0, listing.copies),
      0,
    );

    if (copyCount > totalAllocatableCopies) {
      setStatus(
        `Could only resolve ${totalAllocatableCopies} listed copy/copies on chain for ${song.title}. Applying live DB patch from chain...`,
      );

      const reconciledAllocations = await reconcileSongListingsFromChain(song);
      if (reconciledAllocations.length > 0) {
        listingAllocations = reconciledAllocations;
        totalAllocatableCopies = reconciledAllocations.reduce(
          (sum, listing) => sum + Math.max(0, listing.copies),
          0,
        );
      } else {
        totalAllocatableCopies = 0;
      }
    }

    if (copyCount > totalAllocatableCopies) {
      setDrafts((current) => ({
        ...current,
        [song.songId]: {
          price: current[song.songId]?.price ?? song.listedPrice,
          copies: String(totalAllocatableCopies),
        },
      }));
      setStatus(
        `DB patched from chain. ${song.title} currently has ${totalAllocatableCopies} listed copy/copies available to remove.`,
      );
      return;
    }

    listingAllocations.sort((a, b) => a.listingId.localeCompare(b.listingId));

    setActiveSongId(song.songId);
    setStatus('Removing listing copies...');

    try {
      let remainingToRemove = copyCount;
      let removedCopies = 0;
      let touchedListings = 0;

      for (const listing of listingAllocations) {
        if (remainingToRemove <= 0) break;
        const removeCopies = Math.min(remainingToRemove, listing.copies);
        if (removeCopies <= 0) continue;

        await removeListing(listing.listingId, removeCopies);
        console.log('[groovv:listings:remove-listing]', {
          songId: song.songId,
          listingId: listing.listingId,
          copies: removeCopies,
        });

        const remainingListingCopies = Math.max(
          0,
          listing.copies - removeCopies,
        );
        await listOwnedSongOnMarket({
          owner: address,
          songId: song.songId,
          listingId: listing.listingId,
          price: listing.price || song.listedPrice,
          copies: remainingListingCopies,
        });

        remainingToRemove -= removeCopies;
        removedCopies += removeCopies;
        touchedListings += 1;
      }

      if (remainingToRemove > 0) {
        throw new Error(
          `Could not remove all requested copies. ${remainingToRemove} copy/copies remain.`,
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ['userLibrary', address],
      });
      const remainingListedCopies = Math.max(
        0,
        song.listedCopies - removedCopies,
      );
      setDrafts((current) => ({
        ...current,
        [song.songId]: {
          price: song.listedPrice,
          copies: String(remainingListedCopies),
        },
      }));
      setStatus(
        `Removed ${removedCopies} copy/copies from ${song.title} across ${touchedListings} listing${touchedListings === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      console.error(error);
      setStatus(
        getErrorMessage(error) || 'Could not update listing right now.',
      );
    } finally {
      setActiveSongId('');
    }
  };

  if (!address) {
    return (
      <section className='pt-4'>
        <div className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400'>
          Connect your wallet to manage song listings.
        </div>
      </section>
    );
  }

  if (isLibraryLoading) {
    return (
      <section className='pt-4'>
        <div className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400'>
          Loading your library...
        </div>
      </section>
    );
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden space-y-4 pt-4 pb-8'>
      <section className='space-y-3 py-4'>
        <Input
          placeholder='Filter by title, artist, genre, or song id'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className=' border border-white/90'
        />
        {isConfigured && onchainBalanceSongs.length > 0 ? (
          <p className='text-[11px] text-zinc-500'>
            {onchainBalanceLoading
              ? 'Fetching wallet copy balances from chain...'
              : 'Copies use on-chain token balances where available.'}
          </p>
        ) : null}

        {filteredHoldings.length === 0 ? (
          <p className='text-sm text-zinc-400'>
            {holdings.length === 0
              ? 'No songs in your library yet.'
              : 'No matching songs for this filter.'}
          </p>
        ) : (
          <div className='space-y-3'>
            <div className='grid w-full max-w-sm grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5'>
              <ListingViewTabItem
                label='Cards'
                icon={<LayoutGrid className='h-3.5 w-3.5' />}
                isActive={listingView === 'cards'}
                onClick={() => setListingView('cards')}
              />
              <ListingViewTabItem
                label='Table'
                icon={<Rows3 className='h-3.5 w-3.5' />}
                isActive={listingView === 'table'}
                onClick={() => setListingView('table')}
              />
            </div>
            {listingView === 'cards' ? (
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                {filteredHoldings.map((song) => {
                  const trustedOwned = getTrustedOwnedBalance(song);
                  const isBusy = activeSongId === song.songId;
                  return (
                    <button
                      key={`card-${song.songId}`}
                      type='button'
                      onClick={() => openListingSheet(song.songId)}
                      className='rounded-xl border border-zinc-800 bg-black/40 p-3 text-left transition hover:border-orange-400/40'
                    >
                      <div className='flex gap-3'>
                        <img
                          src={song.cover || '/logo.svg'}
                          alt={song.title}
                          className='h-14 w-14 rounded-md border border-zinc-700 object-cover'
                        />
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-semibold text-white'>
                            {song.title}
                          </p>
                          <p className='text-xs text-zinc-400'>{song.artist}</p>
                          <p className='mt-1 text-[11px] text-zinc-500'>
                            ID: {song.songId}
                          </p>
                          <p className='mt-2 text-[11px] text-zinc-300'>
                            Listed {song.listedCopies} | Wallet{' '}
                            {trustedOwned.value.toString()}
                          </p>
                          <p className='text-[11px] text-zinc-400'>
                            Price {song.listedPrice}
                          </p>
                        </div>
                      </div>
                      <p className='mt-3 text-[11px] text-zinc-500'>
                        Click to open listing controls
                        {isBusy ? ' (processing...)' : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className='overflow-x-auto rounded-xl border border-zinc-800 bg-black/40'>
                <table className='min-w-[780px] w-full text-left text-sm'>
                  <thead className='bg-zinc-900/80 text-zinc-300'>
                    <tr>
                      <th className='px-3 py-2 font-medium'>Title</th>
                      <th className='px-3 py-2 font-medium'>Artist</th>
                      <th className='px-3 py-2 font-medium'>Genre</th>
                      <th className='px-3 py-2 font-medium'>Price</th>
                      <th className='px-3 py-2 font-medium'>Listed</th>
                      <th className='px-3 py-2 font-medium'>Wallet</th>
                      <th className='px-3 py-2 font-medium'>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHoldings.map((song) => {
                      const trustedOwned = getTrustedOwnedBalance(song);
                      return (
                        <tr
                          key={`row-${song.songId}`}
                          tabIndex={0}
                          onClick={() => openListingSheet(song.songId)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openListingSheet(song.songId);
                            }
                          }}
                          className='cursor-pointer border-t border-zinc-800/80 text-zinc-200 transition hover:bg-zinc-900/40 focus:outline-none focus-visible:bg-zinc-900/50'
                        >
                          <td className='px-3 py-3'>
                            <div className='flex items-center gap-2'>
                              <img
                                src={song.cover || '/logo.svg'}
                                alt={song.title}
                                className='h-8 w-8 rounded border border-zinc-700 object-cover'
                              />
                              <span className='max-w-[180px] truncate'>
                                {song.title}
                              </span>
                            </div>
                          </td>
                          <td className='px-3 py-3 text-zinc-300'>
                            {song.artist}
                          </td>
                          <td className='px-3 py-3 text-zinc-400'>
                            {song.genre}
                          </td>
                          <td className='px-3 py-3'>{song.listedPrice}</td>
                          <td className='px-3 py-3'>{song.listedCopies}</td>
                          <td className='px-3 py-3'>
                            {trustedOwned.value.toString()}
                          </td>
                          <td className='px-3 py-3 text-orange-300'>Manage</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
      <section className='py-4'>
        <p className='text-xs tracking-[0.25em] text-zinc-400 uppercase'>
          Listings
        </p>
        <h2 className='text-2xl font-semibold text-white'>Sell From Library</h2>
        <div className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3'>
          <StatCard
            icon={<ListChecks className='h-3.5 w-3.5 text-pink-400' />}
            label='Owned Songs'
            value={holdings.length}
          />
          <StatCard
            icon={<Tag className='h-3.5 w-3.5 text-orange-400' />}
            label='Active Listings'
            value={activeListings}
          />
          <StatCard
            icon={<Layers3 className='h-3.5 w-3.5 text-yellow-400' />}
            label='Listed Copies'
            value={totalListedCopies}
          />
        </div>

        <div className='mt-4'>
          <p className='text-xs tracking-[0.2em] text-zinc-400 uppercase'>
            Active On Profile
          </p>
          {activeListingSongs.length === 0 ? (
            <p className='mt-2 text-sm text-zinc-500'>
              No active listings yet.
            </p>
          ) : (
            <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              {activeListingSongs.map((song) => {
                const isBusy = activeSongId === song.songId;
                return (
                  <article
                    key={`active-${song.songId}`}
                    className='rounded-lg border border-zinc-800 bg-black/40 p-3'
                  >
                    <div className='flex gap-3'>
                      <img
                        src={song.cover || '/logo.svg'}
                        alt={song.title}
                        className='h-12 w-12 rounded-md border border-zinc-700 object-cover'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-semibold text-white'>
                          {song.title}
                        </p>
                        <p className='text-xs text-zinc-400'>{song.artist}</p>
                        <p className='mt-1 text-[11px] text-zinc-300'>
                          Price {song.listedPrice} | {song.listedCopies} copies
                        </p>
                        <p className='text-[11px] text-zinc-500'>
                          {song.listingIds.length || 1} active listing
                          {song.listingIds.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className='mt-2 flex justify-end'>
                      <Button
                        type='button'
                        variant='outline'
                        className='sm:w-auto'
                        disabled={isBusy}
                        onClick={() => openListingSheet(song.songId)}
                      >
                        Open Controls
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Sheet
        open={isListingSheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeListingSheet();
            return;
          }
          setIsListingSheetOpen(true);
        }}
      >
        <SheetContent
          side='right'
          className='w-full border-zinc-800 bg-zinc-950/95 p-0 text-white sm:max-w-xl'
        >
          {selectedSong && selectedDraft && selectedTrustedOwned ? (
            <>
              <SheetHeader className='border-b border-white/10 bg-black/30 px-4 py-4'>
                <SheetTitle className='text-zinc-100'>
                  {selectedSong.title}
                </SheetTitle>
                <SheetDescription className='text-zinc-400'>
                  Manage listing controls for {selectedSong.artist}
                </SheetDescription>
              </SheetHeader>

              <div className='h-[calc(100vh-84px)] overflow-y-auto space-y-4 p-4'>
                <div className='rounded-2xl border border-white/10 bg-black/30 p-3'>
                  <div className='flex gap-3'>
                    <img
                      src={selectedSong.cover || '/logo.svg'}
                      alt={selectedSong.title}
                      className='h-16 w-16 rounded-md border border-zinc-700 object-cover'
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-semibold text-white'>
                        {selectedSong.title}
                      </p>
                      <p className='text-xs text-zinc-400'>
                        {selectedSong.artist}
                      </p>
                      <p className='mt-1 text-[11px] text-zinc-400'>
                        Genre: {selectedSong.genre}
                      </p>
                      <p className='text-[11px] text-zinc-500'>
                        ID: {selectedSong.songId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/30 p-2'>
                  <ListingDetail
                    label='Listed Copies'
                    value={String(selectedSong.listedCopies)}
                  />
                  <ListingDetail
                    label='Wallet Copies'
                    value={selectedTrustedOwned.value.toString()}
                  />
                </div>
                <p className='text-[11px] text-zinc-500'>
                  Copies source: {selectedOwnedBalanceLabel}
                </p>

                <form
                  className='space-y-3'
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleListSong(selectedSong);
                  }}
                >
                  <div className='space-y-1'>
                    <Label htmlFor={`sheet-price-${selectedSong.songId}`}>
                      Price
                    </Label>
                    <Input
                      id={`sheet-price-${selectedSong.songId}`}
                      type='number'
                      min='0'
                      step='0.01'
                      placeholder='0.00'
                      className='border border-white/90'
                      value={selectedDraft.price}
                      onChange={(event) =>
                        updateDraft(selectedSong.songId, {
                          price: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label htmlFor={`sheet-copies-${selectedSong.songId}`}>
                      Copies (List/Remove)
                    </Label>
                    <Input
                      id={`sheet-copies-${selectedSong.songId}`}
                      type='number'
                      min='0'
                      step='1'
                      placeholder='0'
                      className='border border-white/90'
                      value={selectedDraft.copies}
                      onChange={(event) =>
                        updateDraft(selectedSong.songId, {
                          copies: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
                    <Button
                      type='button'
                      variant='outline'
                      className='sm:w-auto'
                      disabled={selectedBusy || selectedSong.listedCopies <= 0}
                      onClick={() => void handleRemoveListing(selectedSong)}
                    >
                      Remove Copies
                    </Button>
                    <Button
                      type='submit'
                      className='sm:w-auto bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                      disabled={selectedBusy}
                    >
                      <Coins className='h-4 w-4' />
                      {selectedBusy ? 'Saving...' : 'List On Market'}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className='px-4 py-6 text-sm text-zinc-400'>
              Select a song to manage listing controls.
            </div>
          )}
        </SheetContent>
      </Sheet>

      <div className='rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300 wrap-break-words'>
        {status ||
          "Select a song from you've made and publish it to the market."}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className='rounded-lg border border-zinc-800 bg-black/40 p-3'>
      <div className='flex items-center gap-1 text-zinc-400 text-xs'>
        {icon}
        {label}
      </div>
      <p className='mt-1 text-lg font-semibold text-white'>{value}</p>
    </div>
  );
}

function ListingViewTabItem({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
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
          layoutId='listings-view-active-tab'
          className='absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-500'
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      ) : null}
      <span className='relative z-10 inline-flex items-center gap-1.5'>
        {icon}
        {label}
      </span>
    </button>
  );
}

function ListingDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-md border border-zinc-800 bg-zinc-900/50 p-2'>
      <p className='text-[10px] tracking-[0.18em] text-zinc-500 uppercase'>
        {label}
      </p>
      <p className='mt-1 text-sm text-zinc-100'>{value}</p>
    </div>
  );
}
