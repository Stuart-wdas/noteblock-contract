'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Album, Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import LibraryView from './LibraryView';
import FastScrollBar from '@/components/FastScrollBar';

type ArtistEntry = {
  name: string;
  image: string;
};

type LibrarySong = Song & {
  albumObj?: { id?: string } | null;
};

export function ArtistView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeArtist, setActiveArtist] = useState<ArtistEntry | null>(null);
  const { libraryView } = useAudioPlayer();

  const artists = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const sourceArtists = libraryView?.partitioned.artists ?? [];

    if (!normalizedSearchTerm) {
      return [...sourceArtists].sort((a, b) => a.name.localeCompare(b.name));
    }

    return sourceArtists
      .filter((artist) =>
        artist.name.toLowerCase().includes(normalizedSearchTerm),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [libraryView?.partitioned.artists, searchTerm]);

  const groupedArtists = useMemo(() => {
    const grouped: Record<string, ArtistEntry[]> = {};

    artists.forEach((artist) => {
      const firstChar = artist.name.trim().charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(firstChar) ? firstChar : '#';

      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(artist);
    });

    return grouped;
  }, [artists]);

  const artistReleases = useMemo(() => {
    if (!activeArtist) return [];
    const activeArtistName = activeArtist.name.toLowerCase();

    const albums = (libraryView?.partitioned.albums ?? []).filter(
      (album) => album.artist.toLowerCase() === activeArtistName,
    );

    const singles = (libraryView?.partitioned.songs ?? [])
      .filter((song) => {
        const libSong = song as LibrarySong;
        const hasAlbum = Boolean(libSong.albumObj?.id || libSong.album);
        return song.artist.toLowerCase() === activeArtistName && !hasAlbum;
      })
      .map<Album>((song) => ({
        id: `single-${song.id}`,
        title: song.title,
        artist: song.artist,
        genre: song.genre,
        cover: song.cover,
        songs: [song],
        releaseDate: String(song.releaseDate ?? ''),
      }));

    return [...albums, ...singles].sort((a, b) => {
      const aDate = new Date(a.releaseDate ?? 0).getTime();
      const bDate = new Date(b.releaseDate ?? 0).getTime();
      const byDate = bDate - aDate;

      if (Number.isNaN(byDate) || byDate === 0) {
        return a.title.localeCompare(b.title);
      }

      return byDate;
    });
  }, [activeArtist, libraryView?.partitioned.albums, libraryView?.partitioned.songs]);

  const filteredArtistReleases = useMemo(() => {
    if (!activeArtist) return [];

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) return artistReleases;

    return artistReleases.filter((release) =>
      release.title.toLowerCase().includes(normalizedSearchTerm),
    );
  }, [activeArtist, artistReleases, searchTerm]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  if (activeArtist) {
    return (
      <div className='w-full space-y-6'>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => {
              setActiveArtist(null);
              setSearchTerm('');
            }}
            className='inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white'
          >
            <ChevronLeft size={16} />
            Artists
          </button>
          <Input
            className='w-full rounded-full'
            placeholder={`Search ${activeArtist.name}`}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className='space-y-1'>
          <h3 className='text-xl font-semibold'>{activeArtist.name}</h3>
          <p className='text-sm text-zinc-400'>
            {artistReleases.length} release{artistReleases.length === 1 ? '' : 's'}
          </p>
        </div>

        {filteredArtistReleases.length === 0 ? (
          <p className='text-sm text-zinc-400'>
            {searchTerm.trim()
              ? 'No releases match your search.'
              : 'No releases found for this artist yet.'}
          </p>
        ) : (
          <LibraryView songs={filteredArtistReleases} />
        )}
      </div>
    );
  }

  return (
    <div className='relative w-full space-y-6'>
      <Input
        className='w-full rounded-full'
        placeholder='Search for artists'
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      <div className='flex'>
        <div className='flex h-[60vh] w-full flex-col gap-4 overflow-y-auto py-4 pr-1 md:h-[68vh] md:pr-6'>
          {artists.length === 0 ? (
            <p className='text-sm text-zinc-400'>
              {searchTerm.trim()
                ? 'No artists match your search.'
                : 'No artists in your library yet.'}
            </p>
          ) : (
            <>
              {alphabet.map((letter) =>
                groupedArtists[letter] ? (
                  <div key={letter} id={`letter-${letter}`}>
                    <h2 className='mb-2 text-lg font-bold text-green-400'>
                      {letter}
                    </h2>
                    {groupedArtists[letter].map((artist) => (
                      <button
                        type='button'
                        key={artist.name}
                        onClick={() => {
                          setActiveArtist(artist);
                          setSearchTerm('');
                        }}
                        className='flex w-full items-center space-x-4 text-left'
                      >
                        <Image
                          src={artist.image || '/logo.svg'}
                          alt={artist.name}
                          width={50}
                          height={50}
                          className='rounded-full object-cover'
                        />
                        <p className='w-full border-b-[1px] border-gray-600 py-3 text-sm text-white'>
                          {artist.name}
                        </p>
                        <ChevronRight />
                      </button>
                    ))}
                  </div>
                ) : null,
              )}
              {groupedArtists['#'] ? (
                <div key='#' id='letter-#'>
                  <h2 className='mb-2 text-lg font-bold text-green-400'>#</h2>
                  {groupedArtists['#'].map((artist) => (
                    <button
                      type='button'
                      key={artist.name}
                      onClick={() => {
                        setActiveArtist(artist);
                        setSearchTerm('');
                      }}
                      className='flex w-full items-center space-x-4 text-left'
                    >
                      <Image
                        src={artist.image || '/logo.svg'}
                        alt={artist.name}
                        width={50}
                        height={50}
                        className='rounded-full object-cover'
                      />
                      <p className='w-full border-b-[1px] border-gray-600 py-3 text-sm text-white'>
                        {artist.name}
                      </p>
                      <ChevronRight />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <FastScrollBar alphabet={[...alphabet, '#']} />
      </div>
    </div>
  );
}
