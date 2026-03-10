'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

type Realm = 'library' | 'marketplace';
type MarketSong = Song & { price?: string; copies?: number; cid?: string };

export default function SearchComp() {
  const [searchTerm, setSearchTerm] = useState('');
  const [realm, setRealm] = useState<Realm>('library');
  const [isSearching, setIsSearching] = useState(false);
  const [marketResults, setMarketResults] = useState<MarketSong[]>([]);
  const { libraryView, playSong } = useAudioPlayer();

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const librarySongs = useMemo(() => {
    const songs = libraryView?.partitioned?.songs ?? [];
    if (!normalizedSearchTerm) return songs;

    return songs.filter((song) =>
      `${song.title} ${song.artist} ${song.genre}`
        .toLowerCase()
        .includes(normalizedSearchTerm),
    );
  }, [libraryView?.partitioned?.songs, normalizedSearchTerm]);

  const runSearch = async () => {
    const query = searchTerm.trim();
    if (!query || realm === 'library') return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`,
      );
      const payload = await response.json();

      const songs = Array.isArray(payload.results) ? payload.results : [];
      const normalized = songs.map((song: any) => ({
        ...song,
        url: song.cid || '',
      }));
      setMarketResults(normalized);
    } catch (error) {
      console.error('Market search failed', error);
      setMarketResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const onSearchClick = () => {
    if (realm === 'marketplace') void runSearch();
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
                if (event.key === 'Enter') onSearchClick();
              }}
            />
            <Button
              type='button'
              className='bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
              onClick={onSearchClick}
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
              librarySongs.map((song) => (
                <button
                  type='button'
                  key={song.id}
                  className='w-full rounded-lg border border-zinc-800 px-3 py-2 text-left hover:bg-zinc-900 transition'
                  onClick={() => playSong(song)}
                >
                  <p className='font-medium text-white'>{song.title}</p>
                  <p className='text-xs text-zinc-400'>{song.artist}</p>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className='grid gap-2'>
            {isSearching ? (
              <p className='text-sm text-zinc-400'>Searching marketplace...</p>
            ) : marketResults.length === 0 ? (
              <p className='text-sm text-zinc-400'>
                No marketplace results yet. Enter a query and press search.
              </p>
            ) : (
              marketResults.map((song) => (
                <div
                  key={song.id}
                  className='w-full rounded-lg border border-zinc-800 px-3 py-2'
                >
                  <p className='font-medium text-white'>{song.title}</p>
                  <p className='text-xs text-zinc-400'>{song.artist}</p>
                  <p className='text-xs text-zinc-500'>
                    Price: {song.price ?? '0'} | Copies: {song.copies ?? 0}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </section>
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
