'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';
import FastScrollBar from '@/components/FastScrollBar';
import SongItem from '@/components/Song/SongItem';

export function SongsView({
  variant,
}: {
  variant?: 'library' | 'queue' | 'playlist';
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const { libraryView } = useAudioPlayer();

  const allSongs = libraryView?.partitioned?.songs;

  const songs = allSongs
    ?.filter(
      (song) =>
        typeof song.title === 'string' &&
        song.title.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => a.title.localeCompare(b.title));

  const groupedSongs: Record<string, typeof songs> = {};
  songs?.forEach((song) => {
    const letter = song.title[0].toUpperCase();
    if (!groupedSongs[letter]) groupedSongs[letter] = [];
    groupedSongs[letter].push(song);
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className='relative w-full space-y-6 z-999'>
      <Input
        className='w-full rounded-full'
        placeholder='Search for songs'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className='flex'>
        <div className='flex h-[60vh] w-full flex-col gap-4 overflow-y-auto py-4 pr-1 md:h-[68vh] md:pr-6'>
          {alphabet.map((letter) =>
            groupedSongs[letter] ? (
              <div key={letter} id={`letter-${letter}`}>
                <h2 className='mb-2 text-lg font-bold text-green-400'>
                  {letter}
                </h2>
                {groupedSongs[letter].map((song, index) => (
                  <div
                    key={index}
                    className='flex w-full items-center space-x-4'
                  >
                    <SongItem song={song} variant={variant} />
                  </div>
                ))}
              </div>
            ) : null,
          )}
        </div>

        <FastScrollBar alphabet={alphabet} />
      </div>
    </div>
  );
}
