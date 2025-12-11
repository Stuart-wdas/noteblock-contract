'use client';

import Image from 'next/image';
import {useState} from 'react';
import {Input} from '@/components/ui/input';
import {ChevronRight} from 'lucide-react';
import {useAudioPlayer} from '@/providers/AudioPlayerProvider';
import FastScrollBar from '@/components/FastScrollBar';
import SongItem from '@/components/Song/SongItem';

export function SongsView({
  variant,
}: {
  variant?: 'library' | 'queue' | 'playlist';
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const {libraryView} = useAudioPlayer();

  // Flatten all songs from albums
  const allSongs = libraryView?.partitioned?.songs;

  // Filter and sort songs
  const songs = allSongs
    ?.filter(
      (song) =>
        typeof song.title === 'string' &&
        song.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.title.localeCompare(b.title));

  // Group songs by first letter
  const groupedSongs: Record<string, typeof songs> = {};
  songs?.forEach((song) => {
    const letter = song.title[0].toUpperCase();
    if (!groupedSongs[letter]) groupedSongs[letter] = [];
    groupedSongs[letter].push(song);
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="relative w-full space-y-6 z-999 pt-3">
      <Input
        className="w-full rounded-full"
        placeholder="Search for songs"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="flex">
        <div
          className={`flex flex-col gap-4 py-4 w-full overflow-y-auto h-[80vh] 'pr-6'
          `}>
          {alphabet.map((letter) =>
            groupedSongs[letter] ? (
              <div
                key={letter}
                id={`letter-${letter}`}>
                <h2 className="text-green-400 font-bold text-lg mb-2">
                  {letter}
                </h2>
                {groupedSongs[letter].map((song, index) => (
                  <div
                    key={index}
                    className="flex w-full items-center space-x-4">
                    <SongItem
                      song={song}
                      variant={variant}
                    />
                  </div>
                ))}
              </div>
            ) : null
          )}
        </div>

        <FastScrollBar alphabet={alphabet} />
      </div>
    </div>
  );
}
