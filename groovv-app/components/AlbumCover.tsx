'use client';

import {motion} from 'framer-motion';
import Image from 'next/image';
import {Album, Song, useAudioPlayer} from '../providers/AudioPlayerProvider';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {useState, useRef, useCallback, useEffect} from 'react';
import {PlayIcon, Pause, AudioWaveform} from 'lucide-react';
import {Button} from './ui/button';
import PlaylistControls from './PlaylistControls';
import MoreOptionsMenu from './MoreOptionsPageMenu';
import MoreOptionsSongMenu from './MoreOptionsSongMenu';
import BuySongButton from './Buttons/BuySongButton';
import BuyAlbumButton from './Buttons/BuyAlbumButton';
import {eventBus} from '@/lib/eventBus';

export default function AlbumCover({album}: {album: Album}) {
  const {playSong, currentSong, togglePlay, isPlaying, libraryView} =
    useAudioPlayer();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPressTimer = useCallback(() => {
    timerRef.current = setTimeout(() => setOpen(true), 500);
  }, []);

  const cancelPressTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useCallback(() => {
    const closeHandler = () => {
      console.log(`[AlbumCover ${album.id}] closeDialog triggered`);
      setOpen(false);
    };
    eventBus.on('closeDialog', closeHandler);
    console.log(`[AlbumCover ${album.id}] registered listener`);
  }, [album.id]);

  // console.log(eventBus.listenerCount());

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      modal={false}>
      <DialogTrigger
        asChild
        className="overflow-visible">
        <motion.div
          className="cursor-pointer space-y-2 overflow-visible"
          onMouseDown={startPressTimer}
          onMouseUp={cancelPressTimer}
          onMouseLeave={cancelPressTimer}
          onTouchStart={startPressTimer}
          onTouchEnd={cancelPressTimer}>
          <Image
            src={album.cover}
            alt={album.title}
            className="w-full h-auto rounded-lg"
            width={200}
            height={200}
          />
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-md lg:text-2xl text-truncate">
                {album.title}
              </p>
              <p className="text-sm lg:text-xl">{album.artist}</p>
            </div>
            {libraryView?.partitioned.albums?.some(
              (item) => item.id === album.id
            ) ? null : (
              <BuyAlbumButton albumId={album.id} />
            )}
          </div>
        </motion.div>
      </DialogTrigger>
      <DialogContent
        className="absolute h-screen flex content-center overflow-visible min-w-full border-none p-0 bg-black rounded-none z-998"
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}>
        <motion.div
          drag="y"
          dragConstraints={{top: 0, bottom: 0}}
          initial={{y: 0}}
          animate={{y: 0}}
          onDragEnd={(event, info) => {
            if (info.offset.y > 100) setOpen(false);
          }}
          className="relative flex flex-col overflow-x-hidden scroll-auto pt-8 px-5 pb-35 w-full" // 👈 Added pb-20
        >
          <MoreOptionsMenu
            song={album.songs}
            className="absolute right-0 top-4"
          />
          <DialogHeader className="space-y-4 w-full">
            <Image
              src="/logo.svg"
              alt="title"
              className="w-[80%] h-auto object-cover rounded-lg mx-auto pt-5"
              width={200}
              height={200}
            />
            <DialogTitle className="text-white text-center">
              {album.title}
            </DialogTitle>
            <DialogDescription className="text-center">
              {album.releaseDate}
            </DialogDescription>
            <PlaylistControls songs={album.songs} />
          </DialogHeader>

          <div className="space-y-3 mt-6">
            {album.songs.map((song: Song) => {
              const isOwned = libraryView?.flattened.some(
                (item) => item.type === 'song' && item.data.id === song.id
              );

              return (
                <motion.div
                  key={song.id}
                  initial={{opacity: 0, y: 10}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.3}}>
                  <div className="flex flex-row items-center justify-between p-3 bg-transparent text-white border-b border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="px-2">
                        {currentSong?.id === song.id ? (
                          <AudioWaveform />
                        ) : (
                          song.id
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{song.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {song.artist}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwned ? (
                        <Button
                          onClick={(e) => {
                            e.preventDefault();

                            currentSong?.id !== song.id
                              ? playSong(song)
                              : togglePlay();
                          }}
                          variant="ghost">
                          {currentSong?.id === song.id && isPlaying ? (
                            <Pause fill="white" />
                          ) : (
                            <PlayIcon fill="white" />
                          )}
                        </Button>
                      ) : (
                        <BuySongButton songId={song.id} />
                      )}

                      <MoreOptionsSongMenu song={song} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
