'use client';

import {useMemo, useState} from 'react';
import {listOwnedSongOnMarket} from '@/actions/musicActions';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useWallet} from '@/providers/StarknetProvider';
import {useQueryClient} from '@tanstack/react-query';
import {Coins, Layers3, ListChecks, Tag} from 'lucide-react';

type LibrarySong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  cover: string;
  price: string;
  copies: number;
};

type TokenOwnershipRow = {
  id: number;
  balance: string;
  song: LibrarySong;
};

type Holding = {
  songId: string;
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

export default function Listings() {
  const {address, library, isLibraryLoading} = useWallet();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeSongId, setActiveSongId] = useState('');
  const [status, setStatus] = useState('');

  const holdings = useMemo(() => {
    if (!library || library === false || typeof library !== 'object') return [];

    const rows = ((library as {tokenOwnerships?: TokenOwnershipRow[]}).tokenOwnerships ??
      []) as TokenOwnershipRow[];
    const grouped = new Map<string, Holding>();

    rows.forEach((row) => {
      if (!row.song?.id) return;
      const ownedBalance = toNumber(row.balance);
      const existing = grouped.get(row.song.id);

      if (existing) {
        existing.ownedBalance += ownedBalance;
        return;
      }

      grouped.set(row.song.id, {
        songId: row.song.id,
        title: row.song.title,
        artist: row.song.artist,
        genre: row.song.genre,
        cover: row.song.cover || '/logo.svg',
        listedPrice: row.song.price ?? '0',
        listedCopies: toNumber(row.song.copies),
        ownedBalance,
      });
    });

    return Array.from(grouped.values());
  }, [library]);

  const filteredHoldings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return holdings;

    return holdings.filter((song) =>
      `${song.title} ${song.artist} ${song.genre} ${song.songId}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [holdings, query]);

  const activeListings = useMemo(
    () => holdings.filter((song) => song.listedCopies > 0).length,
    [holdings]
  );

  const totalListedCopies = useMemo(
    () => holdings.reduce((sum, song) => sum + toNumber(song.listedCopies), 0),
    [holdings]
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

  const saveListing = async (
    event: {preventDefault: () => void},
    song: Holding,
    copies: number
  ) => {
    event.preventDefault();
    if (!address) {
      setStatus('Connect your wallet to manage listings.');
      return;
    }

    const draft = getDraft(song);
    const price = draft.price.trim();
    const copyCount = toNumber(copies);

    if (!Number.isInteger(copyCount) || copyCount < 0) {
      setStatus('Copies must be a whole number.');
      return;
    }

    if (copyCount > song.ownedBalance) {
      setStatus(`You own ${song.ownedBalance} copy/copies of ${song.title}.`);
      return;
    }

    if (copyCount > 0 && toNumber(price) <= 0) {
      setStatus('Price must be greater than zero when listing copies.');
      return;
    }

    setActiveSongId(song.songId);
    setStatus(copyCount === 0 ? 'Removing listing...' : 'Publishing listing...');

    try {
      const updatedSong = await listOwnedSongOnMarket({
        owner: address,
        songId: song.songId,
        price: price || song.listedPrice,
        copies: copyCount,
      });

      if (!updatedSong) {
        throw new Error('Could not update listing');
      }

      await queryClient.invalidateQueries({queryKey: ['userLibrary', address]});
      setDrafts((current) => ({
        ...current,
        [song.songId]: {
          price: updatedSong.price,
          copies: String(updatedSong.copies),
        },
      }));

      setStatus(
        copyCount === 0
          ? `Removed ${song.title} from market listings.`
          : `Listed ${song.title} (${copyCount} copies at ${updatedSong.price}).`
      );
    } catch (error) {
      console.error(error);
      setStatus('Could not update listing right now.');
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
      <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4'>
        <p className='text-xs tracking-[0.25em] text-zinc-400 uppercase'>Listings</p>
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
      </section>

      <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3'>
        <Input
          placeholder='Filter by title, artist, genre, or song id'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {filteredHoldings.length === 0 ? (
          <p className='text-sm text-zinc-400'>
            {holdings.length === 0
              ? 'No songs in your library yet.'
              : 'No matching songs for this filter.'}
          </p>
        ) : (
          <div className='grid grid-cols-1 gap-3'>
            {filteredHoldings.map((song) => {
              const draft = getDraft(song);
              const isBusy = activeSongId === song.songId;

              return (
                <form
                  key={song.songId}
                  onSubmit={(event) =>
                    void saveListing(event, song, toNumber(draft.copies))
                  }
                  className='rounded-xl border border-zinc-800 bg-black/40 p-3'>
                  <div className='flex gap-3'>
                    <img
                      src={song.cover || '/logo.svg'}
                      alt={song.title}
                      className='h-16 w-16 rounded-md border border-zinc-700 object-cover'
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-semibold text-white'>{song.title}</p>
                      <p className='text-xs text-zinc-400'>{song.artist}</p>
                      <p className='mt-1 text-xs text-zinc-300'>Genre: {song.genre}</p>
                      <p className='text-[11px] text-zinc-500'>ID: {song.songId}</p>
                      <p className='mt-1 text-xs text-zinc-300'>
                        Owned: {song.ownedBalance} | Market: {song.listedPrice} /{' '}
                        {song.listedCopies} copies
                      </p>
                    </div>
                  </div>

                  <div className='mt-3 grid grid-cols-2 gap-2'>
                    <Input
                      type='number'
                      min='0'
                      step='0.01'
                      placeholder='Price'
                      value={draft.price}
                      onChange={(event) =>
                        updateDraft(song.songId, {price: event.target.value})
                      }
                    />
                    <Input
                      type='number'
                      min='0'
                      step='1'
                      placeholder='Copies'
                      value={draft.copies}
                      onChange={(event) =>
                        updateDraft(song.songId, {copies: event.target.value})
                      }
                    />
                  </div>

                  <div className='mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end'>
                    <Button
                      type='button'
                      variant='outline'
                      className='sm:w-auto'
                      disabled={isBusy}
                      onClick={(event) => void saveListing(event, song, 0)}>
                      Remove Listing
                    </Button>
                    <Button
                      type='submit'
                      className='sm:w-auto bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                      disabled={isBusy}>
                      <Coins className='h-4 w-4' />
                      {isBusy ? 'Saving...' : 'List On Market'}
                    </Button>
                  </div>
                </form>
              );
            })}
          </div>
        )}
      </section>

      <div className='rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300 break-words'>
        {status || 'Select a song from your library and publish it to the market.'}
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
