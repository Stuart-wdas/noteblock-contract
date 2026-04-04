'use client';

import { useMemo, useState } from 'react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, CirclePlus, X } from 'lucide-react';
import Image from 'next/image';
import AddSongsComp from './AddSongsComp';
import { useWallet } from '@/providers/StarknetProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';

export default function NewPlaylistComp() {
  const [open, setOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const { libraryView } = useAudioPlayer();

  const selectedSongsById = useMemo(() => {
    const selectedIdSet = new Set(selectedSongIds);
    const selectedSongs = (libraryView?.partitioned?.songs ?? []).filter(
      (song) => selectedIdSet.has(song.id),
    );

    return new Map(selectedSongs.map((song) => [song.id, song]));
  }, [libraryView?.partitioned?.songs, selectedSongIds]);

  const resetDraft = () => {
    setPlaylistName('');
    setCoverUrl('');
    setSelectedSongIds([]);
    setStatus('');
  };

  const toggleSong = (songId: string) => {
    setSelectedSongIds((current) =>
      current.includes(songId)
        ? current.filter((id) => id !== songId)
        : [...current, songId],
    );
  };

  const handleCreate = async () => {
    if (!address) {
      setStatus('Connect your wallet before creating playlists.');
      return;
    }

    const normalizedTitle = playlistName.trim();
    if (!normalizedTitle) {
      setStatus('Playlist title is required.');
      return;
    }

    setIsCreating(true);
    setStatus('Creating playlist...');

    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: normalizedTitle,
          userId: address,
          songIds: selectedSongIds,
          coverSongId: selectedSongIds[0],
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Playlist creation failed');
      }

      await queryClient.invalidateQueries({
        queryKey: ['userLibrary', address],
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: ['userLibrary', address],
        exact: true,
      });

      const skippedCount = Array.isArray(payload.skippedSongIds)
        ? payload.skippedSongIds.length
        : 0;
      setStatus(
        skippedCount > 0
          ? `Playlist "${payload.playlist.title}" created. ${skippedCount} song(s) were skipped.`
          : `Playlist "${payload.playlist.title}" created.`,
      );
      setOpen(false);
      resetDraft();
    } catch (error) {
      console.error(error);
      setStatus('Failed to create playlist.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    resetDraft();
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !isCreating) {
          resetDraft();
        }
      }}
    >
      <DrawerTrigger asChild>
        <CirclePlus size={40} fill='white' color='black' />
      </DrawerTrigger>
      <DrawerContent className='fixed top-2 bg-secondary rounded-t-xl px-6 z-999 border-none'>
        <DrawerHeader className='flex justify-between items-center'>
          <DrawerTitle className='text-white'>Create New Playlist</DrawerTitle>
          <DrawerDescription className='flex gap-2 w-full justify-between'>
            <Button variant='ghost' onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              variant={'ghost'}
              disabled={playlistName.trim() === '' || isCreating}
              className={`${playlistName.trim() === '' ? '' : 'text-red-500'}`}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DrawerDescription>
        </DrawerHeader>

        <div className='space-y-4 mt-4 flex flex-col'>
          <div className='border-b-[1px] border-gray-600 place-items-center grid gap-5'>
            {coverUrl ? (
              <Image
                src={coverUrl || '/logo.svg'}
                alt='Playlist Cover'
                width={100}
                height={100}
                className='rounded-md'
              />
            ) : (
              <>
                <label
                  htmlFor='cover-upload'
                  className='w-25 h-25 rounded-md border-2 text-white text-sm flex items-center justify-center cursor-pointer'
                >
                  <Camera />
                </label>
                <Input
                  id='cover-upload'
                  type='file'
                  accept='image/*'
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCoverUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className='hidden'
                />
              </>
            )}

            <Input
              placeholder='Playlist title'
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className='border-none text-white focus:ring-none focus:border-none focus-visible:ring-0 focus-visible:border-none active:border-none'
            />
          </div>
          <AddSongsComp
            selectedSongIds={selectedSongIds}
            onToggleSong={toggleSong}
            onClearSongs={() => setSelectedSongIds([])}
          />
          {selectedSongIds.length > 0 ? (
            <div className='rounded-lg border border-zinc-700 bg-zinc-900/40 p-3'>
              <p className='mb-2 text-sm text-zinc-200'>
                Songs in playlist ({selectedSongIds.length})
              </p>
              <div className='max-h-48 space-y-2 overflow-y-auto pr-1'>
                {selectedSongIds.map((songId) => {
                  const song = selectedSongsById.get(songId);

                  if (!song) {
                    return (
                      <div
                        key={songId}
                        className='flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-950/40 px-2 py-1'
                      >
                        <p className='truncate text-xs text-zinc-400'>
                          {songId}
                        </p>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() => toggleSong(songId)}
                        >
                          <X className='h-3 w-3' />
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={song.id}
                      className='flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-950/40 px-2 py-1'
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        <Image
                          src={song.cover || '/logo.svg'}
                          alt={song.title}
                          width={30}
                          height={30}
                          className='h-8 w-8 rounded object-cover'
                        />
                        <div className='min-w-0'>
                          <p className='truncate text-sm text-white'>
                            {song.title}
                          </p>
                          <p className='truncate text-xs text-zinc-400'>
                            {song.artist}
                          </p>
                        </div>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => toggleSong(song.id)}
                      >
                        <X className='h-3 w-3' />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <p className='text-xs text-zinc-400'>
            Songs are staged locally and only saved after playlist creation.
          </p>
          {status ? <p className='text-sm text-orange-300'>{status}</p> : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
