'use client';

import {useMemo, useState} from 'react';
import {Input} from '@/components/ui/input';
import {useAudioPlayer} from '@/providers/AudioPlayerProvider';
import NewPlaylistComp from '@/components/NewPlaylistComp';
import LibraryView from './LibraryView';

export function PlaylistView() {
  const [searchTerm, setSearchTerm] = useState('');
  const {libraryView} = useAudioPlayer();

  const filteredPlaylists = useMemo(() => {
    const playlists = libraryView?.partitioned.playlists ?? [];
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) return playlists;
    return playlists.filter((playlist) =>
      playlist.title.toLowerCase().includes(normalizedSearchTerm)
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

      {filteredPlaylists.length === 0 ? (
        <p className='text-sm text-zinc-400'>
          {searchTerm.trim()
            ? 'No playlists match your search.'
            : 'No playlists yet. Create your first one.'}
        </p>
      ) : (
        <LibraryView songs={filteredPlaylists} />
      )}
    </div>
  );
}
