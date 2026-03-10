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
import { useState } from 'react';
import SongProgressBar from './SongProgessBar';
import QueuePanel from '../QueuePanel';
import VolumeBar from './VolumeBar';
import MoreOptionsSongMenu from '../MoreOptionsSongMenu';

export default function MiniPlayer({
  albumView = false,
}: {
  albumView: boolean;
}) {
  const { currentSong, isPlaying, togglePlay, next } = useAudioPlayer();
  const [open, setOpen] = useState(false);

  if (!currentSong) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className={`fixed bottom-16 left-2 right-2 ${albumView ? 'translate-y-14' : ''} z-100 overflow-hidden flex flex-col items-center justify-between rounded-xl border border-white/10 bg-zinc-900/90 py-2 text-white shadow-lg backdrop-blur md:bottom-5 md:left-1/2 md:right-auto md:w-[min(1100px,calc(100%-3rem))] md:-translate-x-1/2 md:rounded-2xl`}
        >
          <div className='absolute top-0 -mt-2 w-full'>
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
        </motion.div>
      </DialogTrigger>

      <DialogContent
        className='pointer-events-auto z-1000 h-screen max-w-full rounded-none border-none bg-black p-6 text-white content-start sm:p-8 md:h-[88vh] md:max-w-3xl md:rounded-3xl md:border md:border-white/10 md:bg-zinc-950'
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
