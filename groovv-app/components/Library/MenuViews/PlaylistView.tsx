'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  PlaylistCollection,
  Song,
  useAudioPlayer,
} from '@/providers/AudioPlayerProvider';
import NewPlaylistComp from '@/components/NewPlaylistComp';
import LibraryView from './LibraryView';
import AlbumCover from '@/components/AlbumCover';

export function PlaylistView() {
  const [searchTerm, setSearchTerm] = useState('');
  const { libraryView } = useAudioPlayer();

  const songs = useMemo(() => {
    const playlists = libraryView?.partitioned.playlists ?? [];
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) return playlists;
    return playlists.filter((playlist) =>
      playlist.title.toLowerCase().includes(normalizedSearchTerm),
    );
  }, [libraryView?.partitioned.playlists, searchTerm]);

  return (
    <div className='w-full space-y-6'>
      <div className='w-full flex items-center gap-2'>
        <Input
          className='w-full rounded-full'
          placeholder='Search for your playlists'
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <NewPlaylistComp />
      </div>

      {songs.length === 0 ? (
        <p className='text-sm text-zinc-400'>
          {searchTerm.trim()
            ? 'No playlists match your search.'
            : 'No playlists yet. Create your first one.'}
        </p>
      ) : (
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 z-0'>
          {songs?.map((song: PlaylistCollection) => (
            <div
              key={song.id}
              className='rounded-2xl  p-2.5 transition hover:border-orange-400/35 hover:bg-black/35'
            >
              <AlbumCover album={song} variant='playlist' />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
