'use client';

import {useMemo, useState} from 'react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Check, PlusCircle, X} from 'lucide-react';
import Image from 'next/image';
import {useAudioPlayer} from '@/providers/AudioPlayerProvider';

type AddSongsCompProps = {
  selectedSongIds: string[];
  onToggleSong: (songId: string) => void;
  onClearSongs: () => void;
};

export default function AddSongsComp({
  selectedSongIds,
  onToggleSong,
  onClearSongs,
}: AddSongsCompProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const {libraryView} = useAudioPlayer();

  const allSongs = libraryView?.partitioned?.songs ?? [];
  const selectedSet = useMemo(() => new Set(selectedSongIds), [selectedSongIds]);

  const filteredSongs = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const source = [...allSongs].sort((a, b) => a.title.localeCompare(b.title));

    if (!normalized) return source;
    return source.filter((song) =>
      `${song.title} ${song.artist}`.toLowerCase().includes(normalized),
    );
  }, [allSongs, searchTerm]);

  const selectedSongs = useMemo(() => {
    if (selectedSet.size === 0) return [];
    return allSongs.filter((song) => selectedSet.has(song.id));
  }, [allSongs, selectedSet]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          className='relative z-10 px-6 py-3 font-bold text-white rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 
               shadow-xl transition-all duration-300 ease-in-out 
               hover:scale-105 hover:rotate-1 hover:shadow-2xl 
                text-xs'
        >
          <PlusCircle color='white' />
          <span>Add songs</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className='fixed -top-15 bg-secondary rounded-t-xl px-6 z-999 border-none'>
        <DrawerHeader className='flex justify-between items-center'>
          <DrawerTitle className='text-white'>Add Songs</DrawerTitle>
        </DrawerHeader>
        <div className='space-y-3 pb-5'>
          <div className='flex items-center gap-2'>
            <Input
              placeholder='Search songs'
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Button
              type='button'
              variant='outline'
              onClick={onClearSongs}
              disabled={selectedSongIds.length === 0}
            >
              Clear
            </Button>
          </div>

          {selectedSongs.length > 0 ? (
            <div className='rounded-lg border border-zinc-700 bg-zinc-900/40 p-2'>
              <p className='mb-2 text-xs text-zinc-300'>
                Selected ({selectedSongs.length})
              </p>
              <div className='flex flex-wrap gap-2'>
                {selectedSongs.map((song) => (
                  <button
                    type='button'
                    key={song.id}
                    onClick={() => onToggleSong(song.id)}
                    className='inline-flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white'
                  >
                    <span className='max-w-32 truncate'>{song.title}</span>
                    <X className='h-3 w-3' />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className='max-h-[55vh] space-y-2 overflow-y-auto pr-1'>
            {filteredSongs.map((song) => {
              const isSelected = selectedSet.has(song.id);

              return (
                <button
                  key={song.id}
                  type='button'
                  onClick={() => onToggleSong(song.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    isSelected
                      ? 'border-orange-400/70 bg-orange-500/10'
                      : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-500'
                  }`}
                >
                  <div className='flex min-w-0 items-center gap-3'>
                    <Image
                      src={song.cover || '/logo.svg'}
                      alt={song.title}
                      width={42}
                      height={42}
                      className='h-10 w-10 rounded-md object-cover'
                    />
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium text-white'>
                        {song.title}
                      </p>
                      <p className='truncate text-xs text-zinc-400'>{song.artist}</p>
                    </div>
                  </div>
                  <div className='ml-2'>
                    {isSelected ? (
                      <Check className='h-4 w-4 text-orange-300' />
                    ) : (
                      <PlusCircle className='h-4 w-4 text-zinc-400' />
                    )}
                  </div>
                </button>
              );
            })}

            {filteredSongs.length === 0 ? (
              <p className='text-sm text-zinc-400'>No songs match your search.</p>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
