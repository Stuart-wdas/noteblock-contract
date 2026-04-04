'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Play, Shuffle } from 'lucide-react';
import { Album, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { Button } from '@/components/ui/button';
import FastScrollBar from '@/components/FastScrollBar';
import SongItem from '@/components/Song/SongItem';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function AlbumView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const { libraryView, playPlaylist, shufflePlaylist } = useAudioPlayer();
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredAlbums = useMemo(() => {
    return [...(libraryView?.partitioned.albums ?? [])]
      .filter(
        (album) =>
          typeof album.title === 'string' &&
          (album.title.toLowerCase().includes(normalizedSearchTerm) ||
            album.artist.toLowerCase().includes(normalizedSearchTerm)),
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [libraryView?.partitioned.albums, normalizedSearchTerm]);

  const groupedAlbums = useMemo(() => {
    const grouped: Record<string, typeof filteredAlbums> = {};
    filteredAlbums.forEach((album) => {
      const firstChar = album.title.trim().charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(album);
    });

    return grouped;
  }, [filteredAlbums]);

  const activeAlbumSongs = useMemo(() => {
    if (!activeAlbum) return [];
    if (!normalizedSearchTerm) return activeAlbum.songs;

    return activeAlbum.songs.filter(
      (song) =>
        song.title.toLowerCase().includes(normalizedSearchTerm) ||
        song.artist.toLowerCase().includes(normalizedSearchTerm),
    );
  }, [activeAlbum, normalizedSearchTerm]);

  if (activeAlbum) {
    return (
      <div className='w-full space-y-6'>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => {
              setActiveAlbum(null);
              setSearchTerm('');
            }}
            className='inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white'
          >
            <ChevronLeft size={16} />
            Albums
          </button>
          <Input
            className='w-full rounded-full'
            placeholder={`Search in ${activeAlbum.title}`}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <section>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
            <Image
              src={activeAlbum.cover || '/logo.svg'}
              alt={activeAlbum.title}
              width={120}
              height={120}
              className='h-28 w-28 rounded-xl object-cover'
            />
            <div className='min-w-0 flex-1'>
              <h3 className='truncate text-2xl font-semibold'>
                {activeAlbum.title}
              </h3>
              <p className='text-sm text-zinc-300'>{activeAlbum.artist}</p>
              <p className='mt-1 text-xs text-zinc-400'>
                {activeAlbum.genre} | {activeAlbum.songs.length} song
                {activeAlbum.songs.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                className='border-white/20'
                onClick={() => playPlaylist(activeAlbum.songs)}
                disabled={activeAlbum.songs.length === 0}
              >
                <Play className='mr-1.5 h-4 w-4' />
                Play
              </Button>
              <Button
                type='button'
                variant='outline'
                className='border-white/20'
                onClick={() => shufflePlaylist(activeAlbum.songs)}
                disabled={activeAlbum.songs.length === 0}
              >
                <Shuffle className='mr-1.5 h-4 w-4' />
                Shuffle
              </Button>
            </div>
          </div>
        </section>

        <section className='space-y-2'>
          {activeAlbumSongs.length === 0 ? (
            <p className='text-sm text-zinc-400'>
              {searchTerm.trim()
                ? 'No songs in this album match your search.'
                : 'No songs in this album yet.'}
            </p>
          ) : (
            activeAlbumSongs.map((song) => (
              <SongItem key={song.id} song={song} />
            ))
          )}
        </section>
      </div>
    );
  }

  return (
    <div className='relative w-full space-y-6'>
      <Input
        className='w-full rounded-full'
        placeholder='Search for albums'
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      <div className='flex'>
        <div className='flex h-[60vh] w-full flex-col gap-4 overflow-y-auto py-4 pr-6 md:h-[68vh]'>
          {filteredAlbums.length === 0 ? (
            <p className='text-sm text-zinc-400'>
              {searchTerm.trim()
                ? 'No albums match your search.'
                : 'No albums in your library yet.'}
            </p>
          ) : (
            <>
              {ALPHABET.map((letter) =>
                groupedAlbums[letter] ? (
                  <div key={letter} id={`letter-${letter}`}>
                    <h2 className='mb-2 text-lg font-bold text-green-400'>
                      {letter}
                    </h2>
                    {groupedAlbums[letter].map((album) => (
                      <button
                        type='button'
                        key={album.id}
                        onClick={() => {
                          setActiveAlbum(album);
                          setSearchTerm('');
                        }}
                        className='flex w-full items-center space-x-4 text-left'
                      >
                        <Image
                          src={album.cover || '/logo.svg'}
                          alt={album.title}
                          width={50}
                          height={50}
                          className='rounded-md object-cover'
                        />
                        <div className='w-full border-b-[1px] border-gray-600 py-3'>
                          <p className='text-sm font-medium text-white'>
                            {album.title}
                          </p>
                          <p className='text-xs text-zinc-400'>
                            {album.artist} | {album.songs.length} song
                            {album.songs.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <ChevronRight />
                      </button>
                    ))}
                  </div>
                ) : null,
              )}
              {groupedAlbums['#'] ? (
                <div key='#' id='letter-#'>
                  <h2 className='mb-2 text-lg font-bold text-green-400'>#</h2>
                  {groupedAlbums['#'].map((album) => (
                    <button
                      type='button'
                      key={album.id}
                      onClick={() => {
                        setActiveAlbum(album);
                        setSearchTerm('');
                      }}
                      className='flex w-full items-center space-x-4 text-left'
                    >
                      <Image
                        src={album.cover || '/logo.svg'}
                        alt={album.title}
                        width={50}
                        height={50}
                        className='rounded-md object-cover'
                      />
                      <div className='w-full border-b-[1px] border-gray-600 py-3'>
                        <p className='text-sm font-medium text-white'>
                          {album.title}
                        </p>
                        <p className='text-xs text-zinc-400'>
                          {album.artist} | {album.songs.length} song
                          {album.songs.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <ChevronRight />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <FastScrollBar alphabet={[...ALPHABET, '#']} />
      </div>
    </div>
  );
}
