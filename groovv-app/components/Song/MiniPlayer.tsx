'use client';

import {motion} from 'framer-motion';
import {useAudioPlayer} from '../../providers/AudioPlayerProvider';
import {Button} from '@/components/ui/button';
import {Pause, Play, SkipForward} from 'lucide-react';
// Remove incorrect import of 'next'
import Image from 'next/image';
import SongControls from './SongControls';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {useState, useRef, useCallback} from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {MoreVertical} from 'lucide-react';
import SongProgressBar from './SongProgessBar';
import QueuePanel from '../QueuePanel';
import VolumeBar from './VolumeBar';
import MoreOptionsSongMenu from '../MoreOptionsSongMenu';

export default function MiniPlayer({onExpand}: {onExpand: () => void}) {
  const {currentSong, isPlaying, togglePlay, next} = useAudioPlayer();
  const [open, setOpen] = useState(false);

  if (!currentSong) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div
          initial={{y: 100}}
          animate={{y: 0}}
          className="fixed bottom-16 left-0 right-0 p-2 bg-secondary border-b-[6px] -mb-2 rounded-md border-black text-white flex flex-col w-full justify-between items-center shadow-lg z-[999]"
          onClick={onExpand}>
          <div className="flex w-full justify-between items-center">
            <div>
              <p className="font-semibold">{currentSong.title}</p>
              <p className="text-sm">{currentSong.artist}</p>
            </div>
            <div>
              <Button
                variant={'ghost'}
                onClick={(e) => {
                  e.stopPropagation(); // prevent triggering onExpand
                  togglePlay();
                }}>
                {isPlaying ? <Pause fill="white" /> : <Play fill="white" />}
              </Button>
              <Button
                variant={'ghost'}
                onClick={(e) => {
                  e.stopPropagation(); // prevent triggering onExpand
                  next();
                }}>
                <SkipForward />
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogTrigger>

      <DialogContent
        className="bg-black text-white max-w-md p-8 h-screen border-none rounded-none content-start z-[999] pointer-events-auto"
        showCloseButton={false}>
        <motion.div
          drag="y"
          dragConstraints={{top: 0, bottom: 0}}
          onDragEnd={(event, info) => {
            if (info.offset.y > 100) {
              setOpen(false); // close if dragged down > 100px
            }
          }}
          className="h-full">
          <Image
            src={currentSong.cover}
            alt={currentSong.title}
            className="w-[90%] h-auto object-cover rounded-lg pb-20 flex self-center-safe place-self-center"
            width={400}
            height={400}
          />
          <DialogHeader className="flex flex-row justify-between items-center ">
            <div className="text-left">
              <DialogTitle className="text-2xl">
                {currentSong.title}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
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
