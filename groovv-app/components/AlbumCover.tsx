'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Album, Song, useAudioPlayer } from '../providers/AudioPlayerProvider';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { PlayIcon, Pause, AudioWaveform, Pencil, Check } from 'lucide-react';
import { Button } from './ui/button';
import PlaylistControls from './PlaylistControls';
import MoreOptionsMenu from './MoreOptionsPageMenu';
import MoreOptionsSongMenu from './MoreOptionsSongMenu';
import BuySongButton from './Buttons/BuySongButton';
import BuyAlbumButton from './Buttons/BuyAlbumButton';
import { eventBus } from '@/lib/eventBus';
import MiniPlayer from './Song/MiniPlayer';
import { Input } from './ui/input';
import { useWallet } from '@/providers/StarknetProvider';

const EMPTY_OWNED_SONG_IDS = new Set<string>();
type AlbumCoverSource = Album | Song;

function isAlbumSource(source: AlbumCoverSource): source is Album {
  return 'songs' in source;
}

export default function AlbumCover({
  album,
  variant = 'regular',
}: {
  album: AlbumCoverSource;
  variant?: 'regular' | 'playlist';
}) {
  const { playSong, currentSong, togglePlay, isPlaying, libraryView } =
    useAudioPlayer();

  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const [newTitle, setNewTitle] = useState(album.title);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isAlbum = isAlbumSource(album);
  const songs = useMemo(
    () => (isAlbum ? album.songs : [album]),
    [album, isAlbum],
  );
  const ownedSongIds =
    libraryView?.partitioned.ownedSongIds ?? EMPTY_OWNED_SONG_IDS;
  const ownsAlbum = useMemo(() => {
    if (!songs.length) return false;
    return songs.every((song) => ownedSongIds.has(song.id));
  }, [songs, ownedSongIds]);
  const releaseDateLabel = useMemo(() => {
    if (!album.releaseDate) return '';
    return album.releaseDate instanceof Date
      ? album.releaseDate.toLocaleDateString()
      : album.releaseDate;
  }, [album.releaseDate]);

  const startPressTimer = useCallback(() => {
    timerRef.current = setTimeout(() => setOpen(true), 500);
  }, []);

  const cancelPressTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (window.innerWidth < 400) {
      setMode('mobile');
    } else {
      setMode('desktop');
    }
  }, []);

  useEffect(() => {
    const closeHandler = () => {
      setOpen(false);
    };

    eventBus.on('closeDialog', closeHandler);
    return () => {
      eventBus.off('closeDialog', closeHandler);
    };
  }, [album.id]);

  async function handleChangeTitle() {
    let res = await fetch(`/api/playlist`, {
      method: 'PUT',
      body: JSON.stringify({ title: newTitle, userId: address }),
    });
    console.log(res);
    setEditing(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild className='overflow-visible'>
        <motion.div
          className='cursor-pointer space-y-2 overflow-visible'
          onMouseDown={startPressTimer}
          onMouseUp={cancelPressTimer}
          onMouseLeave={cancelPressTimer}
          onTouchStart={startPressTimer}
          onTouchEnd={cancelPressTimer}
        >
          <Image
            src={album.cover}
            alt={album.title}
            className='w-full h-auto rounded-lg'
            loading='lazy'
            width={500}
            height={500}
          />
          <div className='flex justify-between items-center'>
            <div>
              <p className='font-semibold text-md lg:text-2xl text-truncate'>
                {album.title} {variant === 'playlist' ? '(Playlist)' : ''}
              </p>
              <p className='text-sm lg:text-xl'>{album.artist}</p>
            </div>
            {ownsAlbum ? null : isAlbum ? (
              <BuyAlbumButton albumId={album.id} />
            ) : (
              <BuySongButton songId={album.id} expectedPrice={album.price} />
            )}
          </div>
        </motion.div>
      </DialogTrigger>
      <DialogContent
        className='z-999 h-screen max-w-full rounded-none overscroll-contain border-none bg-black p-0 md:h-[88vh] md:max-w-3xl md:rounded-3xl md:border md:border-white/10 md:bg-zinc-950'
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <motion.div
          drag='y'
          dragConstraints={{ top: 0, bottom: 0 }}
          initial={{ y: 0 }}
          animate={{ y: 0 }}
          onDragEnd={(event, info) => {
            if (info.offset.y > 100) setOpen(false);
          }}
          className='relative flex w-full flex-col overflow-x-hidden scroll-auto px-5 pb-24 pt-8 md:pb-10'
        >
          <MoreOptionsMenu item={album} className='absolute right-0 top-3' />
          <DialogHeader className='space-y-4 w-full'>
            <Image
              src={album.cover}
              alt='title'
              className='w-[80%] h-auto object-cover rounded-lg mx-auto mt-5'
              width={200}
              height={200}
            />
            <DialogTitle className='text-white text-center flex items-center place-content-center'>
              {editing ? album.title : ''}
              {variant === 'playlist' ? (
                <div>
                  {!editing ? (
                    <div className='flex'>
                      <Input
                        onChange={(e: any) => setNewTitle(e.target.value)}
                        value={newTitle}
                      />
                      <Button
                        className='bg-none hover:bg-none focus:bg-inherit'
                        variant={'ghost'}
                        onClick={() => {}}
                      >
                        <Check color='white' />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant={'ghost'}
                      onClick={() => {
                        setEditing((prev) => !prev);
                      }}
                      className='hover:bg-inherit focus:bg-none'
                    >
                      <Pencil color='white' />
                    </Button>
                  )}
                </div>
              ) : (
                ''
              )}
            </DialogTitle>
            <DialogDescription className='text-center'>
              {variant !== 'playlist' ? releaseDateLabel : ''}
            </DialogDescription>
            <PlaylistControls songs={songs} />
          </DialogHeader>

          <div className='space-y-3 mt-6'>
            {songs.map((song: Song) => {
              const isOwned = ownedSongIds.has(song.id);

              return (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className='flex flex-row items-center justify-between p-3 bg-transparent text-white border-b border-gray-700'>
                    <div className='flex items-center gap-3'>
                      <div className='px-2'>
                        {currentSong?.id === song.id ? <AudioWaveform /> : ''}
                      </div>
                      <div>
                        <p className='font-medium'>{song.title}</p>
                        <p className='text-sm text-muted-foreground'>
                          {song.artist}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      {isOwned ? (
                        <Button
                          onClick={(e) => {
                            e.preventDefault();

                            currentSong?.id !== song.id
                              ? playSong(song)
                              : togglePlay();
                          }}
                          variant='ghost'
                        >
                          {currentSong?.id === song.id && isPlaying ? (
                            <Pause fill='white' />
                          ) : (
                            <PlayIcon fill='white' />
                          )}
                        </Button>
                      ) : (
                        <BuySongButton
                          songId={song.id}
                          expectedPrice={song.price}
                        />
                      )}

                      <MoreOptionsSongMenu song={song} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {mode == 'desktop' ? '' : <MiniPlayer albumView={true} />}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
