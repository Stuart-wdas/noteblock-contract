'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronRight } from 'lucide-react';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';

export function GenreView() {
  const [searchTerm, setSearchTerm] = useState('');
  const { libraryView, playSong } = useAudioPlayer();

  // Use flattened songs from the library
  const allSongs = useMemo(() => {
    if (!libraryView?.flattened) return [];
    return libraryView.flattened
      .filter((item) => item.type === 'song')
      .map((item) => item.data);
  }, [libraryView]);

  // Group songs by genre
  const genreMap = useMemo(() => {
    const map = new Map<string, typeof allSongs>();
    allSongs.forEach((song) => {
      if (!song.genre) return;
      if (!map.has(song.genre)) map.set(song.genre, []);
      map.get(song.genre)!.push(song);
    });
    return map;
  }, [allSongs]);

  // Filter and sort genres
  const filteredGenres = useMemo(() => {
    return Array.from(genreMap.entries())
      .filter(([genre]) =>
        genre.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort(([a], [b]) => a.localeCompare(b));
  }, [genreMap, searchTerm]);

  // Group genres by first letter
  const groupedGenres = useMemo(() => {
    const grouped: Record<string, Array<[string, typeof allSongs]>> = {};
    filteredGenres.forEach((entry) => {
      const letter = entry[0][0].toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(entry);
    });
    return grouped;
  }, [filteredGenres]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className='relative w-full space-y-6'>
      <Input
        className='w-full rounded-full'
        placeholder='Search for genres'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className='flex'>
        <div className='flex flex-col gap-4 py-4 w-full overflow-y-auto h-[80vh] pr-6'>
          {alphabet.map((letter) =>
            groupedGenres[letter] ? (
              <div key={letter} id={`letter-${letter}`}>
                <h2 className='text-green-400 font-bold text-lg mb-2'>
                  {letter}
                </h2>
                {groupedGenres[letter].map(([genre, songs]) => (
                  <div key={genre}>
                    <h3 className='text-white font-semibold mb-2'>{genre}</h3>
                    {songs.map((song) => (
                      <div
                        key={song.id}
                        className='flex w-full items-center space-x-4 cursor-pointer hover:bg-gray-800 rounded'
                        onClick={() => playSong(song)}
                      >
                        <Image
                          src={song.cover}
                          alt={song.title}
                          width={50}
                          height={50}
                          className='rounded-md object-cover'
                        />
                        <div className='w-full border-b-[1px] border-gray-600 py-3'>
                          <p className='text-sm text-white text-start font-medium'>
                            {song.title}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {song.artist}
                          </p>
                        </div>
                        <ChevronRight />
                      </div>
                    ))}
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
