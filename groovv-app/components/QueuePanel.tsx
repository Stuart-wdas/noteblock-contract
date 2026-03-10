import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { Reorder } from 'framer-motion';
import { useAudioPlayer } from '../providers/AudioPlayerProvider';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ListOrdered,
  Menu,
  Pause,
  Play,
  SkipForward,
  Trash,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from './ui/button';
import PlaystyleController from './PlaystyleController';

export default function QueuePanelDrawer() {
  const {
    queue,
    reorderQueue,
    currentSong,
    togglePlay,
    isPlaying,
    next,
    removeFromQueue,
  } = useAudioPlayer();
  const [open, setOpen] = useState(false);
  const [reorderableQueue, setReorderableQueue] = useState(queue);
  const [activeDirection, setActiveDirection] = useState<'x' | 'y' | null>(
    null,
  );

  useEffect(() => {
    setReorderableQueue(queue);
  }, [queue]);

  const y = useMotionValue(0);
  const controls = useAnimation();
  const isDraggingRef = useRef(false);

  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };

  const handlePointerUp = () => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  useEffect(() => {
    if (!open) {
      controls.start({ y: 0 }); // Reset when drawer closes
    }
  }, [open, controls]);

  return (
    <Drawer open={open}>
      <DrawerTrigger asChild>
        <motion.div
          drag='y'
          style={{ y }}
          animate={controls}
          dragConstraints={{ top: 200 }}
          onDragEnd={(e, info) => {
            const dragDistance = info.offset.y;
            const dragVelocity = info.velocity.y;

            const shouldClose = dragDistance > 80 || dragVelocity > 500;
            const shouldOpen = dragDistance < -50;

            if (shouldOpen) setOpen(true);
            else if (shouldClose) setOpen(false);

            controls.start({ y: 0 }); // Reset position
          }}
          className='fixed left-0 bottom-0 w-full h-10 bg-transparent z-50 flex justify-center items-center pointer-events-auto'
        >
          <ChevronDown />
        </motion.div>
      </DrawerTrigger>

      <DrawerContent className='bg-secondary  flex content-start text-white rounded-t-xl px-4 p-6 border-none z-1000 pointer-events-auto'>
        <motion.div
          drag='y'
          dragConstraints={{ top: 10 }}
          onDragEnd={(e, info) => {
            const dragDistance = info.offset.y;
            const dragVelocity = info.velocity.y;

            const shouldClose = dragDistance > 10 || dragVelocity > 500;
            if (shouldClose) setOpen(false);
          }}
          className='h-24 absolute w-full bg-transparent left-0 -top-10'
        />

        <div className='flex w-full items-center space-x-2 py-1'>
          <Image
            src={currentSong!.cover}
            alt={currentSong!.title}
            width={50}
            height={50}
          />
          <div className='flex flex-col text-start w-full'>
            <p className='font-semibold'>{currentSong!.title}</p>
            <p className='text-sm'>{currentSong!.artist}</p>
          </div>
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
        <PlaystyleController />
        <DrawerHeader className='items-start'>
          <DrawerTitle className='text-white'>Up Next</DrawerTitle>
          <DrawerDescription>Continue listening to you mix</DrawerDescription>
        </DrawerHeader>
        <Reorder.Group
          axis='y'
          values={reorderableQueue}
          onReorder={(newOrder) => {
            setReorderableQueue(newOrder);
            reorderQueue(newOrder);
          }}
          className='flex flex-col gap-2 overflow-y-scroll'
        >
          {reorderableQueue.map((song, index) => (
            <Reorder.Item
              key={song.index}
              layoutId={`song-${song.id}`}
              value={song}
              whileDrag={{ scale: 1.02 }}
              className='relative h-full'
              drag='x'
              dragDirectionLock
              dragConstraints={{ left: 0, right: 80 }}
              onDragEnd={(e, info) => {
                if (info.offset.x > 80) {
                  removeFromQueue(song);
                  setReorderableQueue(
                    reorderableQueue.filter((_, i) => i !== index),
                  );
                }
                setActiveDirection(null);
              }}
            >
              <motion.div className='flex items-center gap-2 w-full p-2 rounded-lg bg-secondary'>
                <Image
                  src={song.cover}
                  alt={song.title}
                  width={100}
                  height={100}
                  className='h-10 w-10'
                />
                <div className='w-full'>
                  <div className='font-semibold'>{song.title}</div>
                  <div className='text-sm text-gray-400'>{song.artist}</div>
                </div>
                <motion.div
                  onMouseDown={handlePointerDown}
                  onMouseUp={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchEnd={handlePointerUp}
                >
                  <Menu />
                </motion.div>
              </motion.div>
              <div className='absolute inset-0 bg-red-500 rounded-lg m-1 -z-1 pl-4 content-center'>
                <Trash />
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </DrawerContent>
    </Drawer>
  );
}
