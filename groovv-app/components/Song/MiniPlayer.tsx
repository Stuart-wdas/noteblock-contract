'use client';

import { motion } from 'framer-motion';
import { useAudioPlayer } from '../../providers/AudioPlayerProvider';
import { Button } from '@/components/ui/button';
import { Pause, Play, SkipForward } from 'lucide-react';
import Image from 'next/image';
import SongControls from './SongControls';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useEffect, useRef, useState } from 'react';
import SongProgressBar from './SongProgessBar';
import QueuePanel from '../QueuePanel';
import VolumeBar from './VolumeBar';
import MoreOptionsSongMenu from '../MoreOptionsSongMenu';
import { is } from 'drizzle-orm';

export default function MiniPlayer({
  albumView = false,
}: {
  albumView?: boolean;
}) {
  const { currentSong, isPlaying, togglePlay, next } = useAudioPlayer();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const suppressClickUntilRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const syncDesktopState = () => setIsDesktop(mediaQuery.matches);
    syncDesktopState();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncDesktopState);
      return () => mediaQuery.removeEventListener('change', syncDesktopState);
    }

    mediaQuery.addListener(syncDesktopState);
    return () => mediaQuery.removeListener(syncDesktopState);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setIsDesktopCollapsed(false);
    }
  }, [isDesktop]);

  if (!currentSong) return null;

  const blockDialogTriggerClick = () => {
    suppressClickUntilRef.current = Date.now() + 350;
  };

  const handleMiniPlayerDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { y: number } },
  ) => {
    if (!isDesktop) return;
    blockDialogTriggerClick();

    if (info.offset.y > 70) {
      setIsDesktopCollapsed(true);
      return;
    }

    if (info.offset.y < -45) {
      setIsDesktopCollapsed(false);
    }
  };

  const handleMiniPlayerClickCapture = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (Date.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (isDesktop && isDesktopCollapsed) {
      event.preventDefault();
      event.stopPropagation();
      setIsDesktopCollapsed(false);
    }
  };

  const miniPlayerBar = (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      drag={isDesktop ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.08}
      onDragStart={blockDialogTriggerClick}
      onDragEnd={handleMiniPlayerDragEnd}
      onClickCapture={handleMiniPlayerClickCapture}
      className={`fixed bottom-16 left-2 right-2 ${albumView ? 'translate-y-14' : ''} z-100 overflow-hidden flex flex-col items-center justify-between rounded-xl border border-white/10 bg-zinc-900/90 text-white shadow-lg backdrop-blur md:bottom-5 md:left-1/2 md:right-auto md:w-[min(800px,calc(100%-3rem))] md:-translate-x-1/2 ${
        isDesktopCollapsed ? 'md:rounded-full' : 'py-2 md:rounded-2xl'
      }`}
    >
      {isDesktop && isDesktopCollapsed ? (
        <div
          className={`w-full ${isDesktop && !isDesktopCollapsed ? 'px-3' : ''}`}
        >
          <SongProgressBar variant='ghost' showTime={false} />
        </div>
      ) : (
        <>
          <div className='absolute top-0 w-full'>
            <SongProgressBar variant='ghost' />
          </div>
          <div className='flex relative w-full justify-between items-center'>
            <div className='flex gap-2 pl-2 pt-2 items-center'>
              <Image
                src={currentSong.cover}
                width={30}
                height={30}
                alt={currentSong.title}
                className='aspect-square rounded-full w-8 h-full '
              />
              <div>
                <p className='font-semibold'>{currentSong.title}</p>
                <p className='text-sm text-zinc-300'>{currentSong.artist}</p>
              </div>
            </div>
            <div>
              <Button
                variant={'ghost'}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
              >
                {isPlaying ? <Pause fill='white' /> : <Play fill='white' />}
              </Button>
              <Button
                variant={'ghost'}
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
              >
                <SkipForward />
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isDesktop && isDesktopCollapsed ? (
        miniPlayerBar
      ) : (
        <DialogTrigger asChild>{miniPlayerBar}</DialogTrigger>
      )}

      <DialogContent
        className='pointer-events-auto z-1000 h-screen max-w-full rounded-none border-none bg-black p-6 text-white content-start sm:p-8 md:h-[88vh] md:max-w-xl md:rounded-3xl md:border md:border-white/10 md:bg-zinc-950'
        showCloseButton={false}
      >
        <motion.div
          drag='y'
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(event, info) => {
            if (info.offset.y > 100) {
              setOpen(false); // close if dragged down > 100px
            }
          }}
          className='h-full'
        >
          <Image
            src={currentSong.cover}
            alt={currentSong.title}
            className='mx-auto flex h-auto w-[88%] place-self-center rounded-xl object-cover md:w-[68%] pointer-none'
            width={400}
            height={400}
          />
          <DialogHeader className='flex flex-row justify-between items-center '>
            <div className='text-left'>
              <DialogTitle className='text-2xl'>
                {currentSong.title}
              </DialogTitle>
              <DialogDescription className='text-gray-400'>
                {currentSong.artist}
              </DialogDescription>
            </div>
            <div>
              <MoreOptionsSongMenu song={currentSong} />
            </div>
          </DialogHeader>
          <SongProgressBar />
          <SongControls song={currentSong} />
          <VolumeBar />
        </motion.div>
        <QueuePanel />
      </DialogContent>
    </Dialog>
  );
}
