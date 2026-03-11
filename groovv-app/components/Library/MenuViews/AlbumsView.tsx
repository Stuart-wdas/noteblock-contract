'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronRight } from 'lucide-react';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';
import FastScrollBar from '@/components/FastScrollBar';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function AlbumView() {
  const [searchTerm, setSearchTerm] = useState('');
  const { libraryView } = useAudioPlayer();
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const groupedAlbums = useMemo(() => {
    const albums = (libraryView?.partitioned.albums ?? [])
      .filter(
        (album) =>
          typeof album.title === 'string' &&
          album.title.toLowerCase().includes(normalizedSearchTerm),
      )
      .sort((a, b) => a.title.localeCompare(b.title));

    const grouped: Record<string, typeof albums> = {};
    albums.forEach((album) => {
      const firstChar = album.title.trim().charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(album);
    });

    return grouped;
  }, [libraryView?.partitioned.albums, normalizedSearchTerm]);

  return (
    <div className='relative w-full space-y-6'>
      <Input
        className='w-full rounded-full'
        placeholder='Search for albums'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className='flex'>
        <div className='flex flex-col gap-4 py-4 w-full overflow-y-auto h-[60vh] md:h-[68vh] pr-6'>
          {ALPHABET.map((letter) =>
            groupedAlbums[letter] ? (
              <div key={letter} id={`letter-${letter}`}>
                <h2 className='text-green-400 font-bold text-lg mb-2'>
                  {letter}
                </h2>
                {groupedAlbums[letter].map((album) => (
                  <div
                    key={album.id}
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

        <FastScrollBar alphabet={ALPHABET} />
      </div>
    </div>
  );
}

