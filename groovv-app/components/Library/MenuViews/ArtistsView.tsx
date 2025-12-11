'use client';

import { mockPlaylists } from '@/lib/getData';
import Image from 'next/image';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronRight } from 'lucide-react';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';

export function ArtistView() {
  const [searchTerm, setSearchTerm] = useState('');
  const { libraryView } = useAudioPlayer();

  const artists = libraryView?.partitioned.artists
    .filter((artist) =>
      artist.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group artists by first letter
  const groupedArtists: Record<string, typeof artists> = {};
  libraryView?.partitioned.artists.forEach((artist) => {
    const letter = artist.name.toUpperCase();
    if (!groupedArtists[letter]) groupedArtists[letter] = [];
    groupedArtists[letter].push(artist);
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className='relative w-full space-y-6'>
      <Input
        className='w-full rounded-full'
        placeholder='Search for artists'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className='flex'>
        <div className='flex flex-col gap-4 py-4 w-full overflow-y-auto h-[80vh] pr-6'>
          {alphabet.map((letter) =>
            groupedArtists[letter] ? (
              <div key={letter} id={`letter-${letter}`}>
                <h2 className='text-green-400 font-bold text-lg mb-2'>
                  {letter}
                </h2>
                {groupedArtists[letter].map((artist, index) => (
                  <div
                    key={index}
                    className='flex w-full items-center space-x-4'
                  >
                    <Image
                      src={artist.image}
                      alt={artist.name}
                      width={50}
                      height={50}
                      className='rounded-full object-cover'
                    />
                    <p className='text-sm text-white w-full text-start border-b-[1px] border-gray-600 py-3'>
                      {artist.name}
                    </p>
                    <ChevronRight />
                  </div>
                ))}
              </div>
            ) : null
          )}
        </div>

        {/* Fast scroll bar */}
        <div className='fixed right-2 top-1/4 z-50 flex flex-col items-center bg-green-500 rounded-md p-1'>
          {alphabet.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className='text-white text-xs font-bold hover:scale-110 transition'
            >
              {letter}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
