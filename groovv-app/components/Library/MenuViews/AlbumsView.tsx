'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronRight } from 'lucide-react';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';

export function AlbumView() {
  const [searchTerm, setSearchTerm] = useState('');
  const { libraryView } = useAudioPlayer();

  // Filter and sort albums
  const albums = libraryView?.partitioned.albums
    .filter(
      (album) =>
        typeof album.title === 'string' &&
        album.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.title.localeCompare(b.title));

  // Group albums by first letter
  const groupedAlbums: Record<string, typeof albums> = {};
  albums?.forEach((album) => {
    const letter = album.title[0].toUpperCase();
    if (!groupedAlbums[letter]) groupedAlbums[letter] = [];
    groupedAlbums[letter].push(album);
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className='relative w-full space-y-6'>
      <Input
        className='w-full rounded-full'
        placeholder='Search for albums'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className='flex'>
        <div className='flex flex-col gap-4 py-4 w-full overflow-y-auto h-[80vh] pr-6'>
          {alphabet.map((letter) =>
            groupedAlbums[letter] ? (
              <div key={letter} id={`letter-${letter}`}>
                <h2 className='text-green-400 font-bold text-lg mb-2'>
                  {letter}
                </h2>
                {groupedAlbums[letter].map((album, index) => (
                  <div
                    key={index}
                    className='flex w-full items-center space-x-4'
                  >
                    <Image
                      src={album.cover}
                      alt={album.title}
                      width={50}
                      height={50}
                      className='rounded-md object-cover'
                    />
                    <p className='text-sm text-white w-full text-start border-b-[1px] border-gray-600 py-3'>
                      {album.title}
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
