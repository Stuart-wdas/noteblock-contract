'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { useWallet } from '@/providers/StarknetProvider';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import AlbumCover from './AlbumCover';

function formatSongCount(count: number) {
  return `${count} song${count === 1 ? '' : 's'}`;
}

export default function AddToPlaylistDialog({
  open,
  onOpenChange,
  songs,
  entityLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songs: Song[];
  entityLabel: string;
}) {
  const { addToPlayList, libraryView } = useAudioPlayer();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [status, setStatus] = useState('');

  const playlists = libraryView?.partitioned.playlists ?? [];
  const deduplicatedSongs = useMemo(() => {
    const seen = new Set<string>();
    return songs.filter((song) => {
      if (!song?.id || seen.has(song.id)) return false;
      seen.add(song.id);
      return true;
    });
  }, [songs]);

  useEffect(() => {
    if (!open) {
      setStatus('');
      setActivePlaylistId(null);
    }
  }, [open]);

  const handleAddToPlaylist = async (playlistId: number) => {
    const targetPlaylist = playlists.find(
      (playlist) => playlist.playlistId === playlistId,
    );

    if (!targetPlaylist) {
      setStatus('Playlist not found.');
      return;
    }

    const existingSongIds = new Set(
      targetPlaylist.songs.map((song) => song.id),
    );
    const songsToInsert = deduplicatedSongs.filter(
      (song) => !existingSongIds.has(song.id),
    );
    const skippedCount = deduplicatedSongs.length - songsToInsert.length;

    if (!songsToInsert.length) {
      setStatus(`All selected songs are already in "${targetPlaylist.title}".`);
      return;
    }

    setActivePlaylistId(playlistId);
    setStatus('');

    try {
      await addToPlayList(playlistId, songsToInsert);

      if (address) {
        await queryClient.invalidateQueries({
          queryKey: ['userLibrary', address],
          exact: true,
        });
        await queryClient.refetchQueries({
          queryKey: ['userLibrary', address],
          exact: true,
          type: 'all',
        });
      }

      const addedCount = songsToInsert.length;
      const skippedLabel =
        skippedCount > 0 ? ` (${skippedCount} already existed)` : '';
      setStatus(
        `Added ${formatSongCount(addedCount)} to "${targetPlaylist.title}"${skippedLabel}.`,
      );
    } catch (error) {
      console.error('Failed to add songs to playlist:', error);
      setStatus('Failed to add songs to playlist.');
    } finally {
      setActivePlaylistId(null);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='z-1000 border-zinc-700 bg-zinc-900 text-white min-h-[80vh] px-10'>
        <DrawerHeader>
          <DrawerTitle>Add to playlist</DrawerTitle>
          <DrawerDescription className='text-zinc-300'>
            Choose where to add{' '}
            <span className='font-medium'>{entityLabel}</span> (
            {formatSongCount(deduplicatedSongs.length)}).
          </DrawerDescription>
        </DrawerHeader>

        {playlists.length === 0 ? (
          <p className='rounded-md border border-zinc-700 bg-zinc-950/50 p-3 text-sm text-zinc-300'>
            No playlists found yet. Create one first, then come back to add this
            music.
          </p>
        ) : (
          <div className=' space-y-2 overflow-y-auto pr-1 grid gap-2 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {playlists.map((playlist) => {
              return (
                <div
                  onClick={() => handleAddToPlaylist(playlist.playlistId)}
                  key={playlist.playlistId}
                >
                  <AlbumCover
                    key={playlist.playlistId}
                    // disabled={activePlaylistId !== null}
                    variant='playlist'
                    album={playlist}
                    // className='h-auto w-full justify-between border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-white hover:bg-zinc-800'
                  />
                </div>
              );
            })}
          </div>
        )}

        {status ? (
          <p className='rounded-md border border-zinc-700 bg-zinc-950/50 mt-3 p-3 text-sm text-zinc-200'>
            {status}
          </p>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
