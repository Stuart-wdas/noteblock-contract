import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  animate,
  motion,
  Reorder,
  useAnimation,
  useDragControls,
  useMotionValue,
} from 'framer-motion';
import {
  useAudioPlayer,
  type IndexedSong,
} from '../providers/AudioPlayerProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Menu,
  Pause,
  Play,
  SkipForward,
  Trash,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from './ui/button';
import PlaystyleController from './PlaystyleController';

const DELETE_OFFSET_THRESHOLD = -88;
const MAX_SWIPE_DISTANCE = 120;
const AXIS_LOCK_THRESHOLD = 8;

type GestureAxis = 'x' | 'y' | null;

function QueueRow({
  song,
  onDelete,
}: {
  song: IndexedSong;
  onDelete: (song: IndexedSong) => void;
}) {
  const swipeX = useMotionValue(0);
  const dragControls = useDragControls();
  const gestureAxisRef = useRef<GestureAxis>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  const resetSwipe = useCallback(() => {
    animate(swipeX, 0, {
      type: 'spring',
      stiffness: 520,
      damping: 42,
    });
  }, [swipeX]);

  const releasePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    startPointRef.current = null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    gestureAxisRef.current = null;
    startPointRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const startPoint = startPointRef.current;
    if (!startPoint) return;

    const deltaX = event.clientX - startPoint.x;
    const deltaY = event.clientY - startPoint.y;

    if (!gestureAxisRef.current) {
      if (
        Math.abs(deltaX) < AXIS_LOCK_THRESHOLD &&
        Math.abs(deltaY) < AXIS_LOCK_THRESHOLD
      ) {
        return;
      }

      gestureAxisRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';

      if (gestureAxisRef.current === 'y') {
        dragControls.start(event);
        return;
      }
    }

    if (gestureAxisRef.current === 'x') {
      event.stopPropagation();
      const clamped = Math.min(0, Math.max(MAX_SWIPE_DISTANCE * -1, deltaX));
      swipeX.set(clamped);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gestureAxisRef.current === 'x') {
      if (swipeX.get() <= DELETE_OFFSET_THRESHOLD) {
        onDelete(song);
      } else {
        resetSwipe();
      }
    } else {
      resetSwipe();
    }

    gestureAxisRef.current = null;
    releasePointer(event);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    resetSwipe();
    gestureAxisRef.current = null;
    releasePointer(event);
  };

  return (
    <Reorder.Item
      key={song.id}
      layoutId={`song-${song.id}`}
      value={song}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{ scale: 0.95 }}
      className='relative h-full select-none'
    >
      <div className='pointer-events-none absolute inset-0 z-0 m-1 flex items-center justify-end rounded-lg bg-red-600/90 pr-4 text-white'>
        <Trash className='h-4 w-4' />
      </div>

      <motion.div
        style={{ x: swipeX }}
        className='relative z-10 flex w-full touch-none items-center gap-2 rounded-lg bg-secondary p-2'
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
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
        <Menu />
      </motion.div>
    </Reorder.Item>
  );
}

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
  const syncingFromContextRef = useRef(false);

  useEffect(() => {
    syncingFromContextRef.current = true;
    setReorderableQueue(queue);
  }, [queue]);

  useEffect(() => {
    if (syncingFromContextRef.current) {
      syncingFromContextRef.current = false;
      return;
    }

    const commitTimer = setTimeout(() => {
      reorderQueue(reorderableQueue);
    }, 120);

    return () => clearTimeout(commitTimer);
  }, [reorderQueue, reorderableQueue]);

  const y = useMotionValue(0);
  const controls = useAnimation();

  useEffect(() => {
    if (!open) {
      controls.start({ y: 0 }); // Reset when drawer closes
    }
  }, [open, controls]);

  if (!currentSong) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen} handleOnly>
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

            const shouldClose = dragDistance > 80 || dragVelocity > 500;
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
            className='z-1200'
            onClick={(e) => {
              togglePlay();
            }}
          >
            {isPlaying ? <Pause fill='white' /> : <Play fill='white' />}
          </Button>
          <Button
            variant={'ghost'}
            className='z-1200'
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
          onReorder={setReorderableQueue}
          className='flex flex-col gap-2 overflow-y-scroll'
        >
          {reorderableQueue.map((song) => (
            <QueueRow
              key={song.id}
              song={song}
              onDelete={(selectedSong) => {
                removeFromQueue(selectedSong);
                setReorderableQueue((prevQueue) =>
                  prevQueue.filter(
                    (queuedSong) => queuedSong.id !== selectedSong.id,
                  ),
                );
              }}
            />
          ))}
        </Reorder.Group>
      </DrawerContent>
    </Drawer>
  );
}
