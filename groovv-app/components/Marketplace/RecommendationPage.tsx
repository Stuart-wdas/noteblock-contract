import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { MarketSong } from './RecommendationSection';
import SongRecommendationCard from './SongRecommendationCard';

export default function RecommendationPage({
  handleClose,
  title,
  subtitle,
  icon,
  activeBuySongId,
  songs,
  onPlay,
  onBuy,
  badgeFormatter,
}: {
  handleClose: (close: boolean) => void;
  title: string;
  subtitle: string;
  songs: MarketSong[];
  icon: ReactNode;
  activeBuySongId: string;

  onPlay: (song: MarketSong) => void;
  onBuy: (song: MarketSong) => void;
  badgeFormatter: (song: MarketSong) => string;
}) {
  const controls = useAnimation();

  useEffect(() => {
    controls.start({ x: '100%' });
  }, [controls]);

  return (
    <div className='w-full'>
      <AnimatePresence mode='wait'>
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3 }}
          className='fixed inset-0 top-0 z-100 flex flex-col bg-black'
        >
          <div className='flex w-screen flex-col items-start justify-between gap-4 px-4 py-4'>
            <button
              onClick={() => handleClose(false)}
              className='flex items-center space-x-1 text-white hover:text-pink-400'
            >
              <ChevronLeft size={18} />
              <span>Marketplace</span>
            </button>
          </div>

          <motion.div
            drag='x'
            dragConstraints={{
              right: 0,
              left: 0,
            }}
            onDragStart={(_, info) => {
              const dragDistance = info.offset.x;
              const shouldClose = dragDistance > 0;
              if (shouldClose) handleClose(false);
              controls.start({ x: 0 });
            }}
          >
            <div className='min-h-[80vh] flex-1 overflow-y-auto px-4 pt-4'>
              <div>
                <h1 className='flex items-center gap-2 text-xl font-bold md:text-2xl'>
                  {icon}
                  {title}
                </h1>
                <p className='mt-1 text-xs text-zinc-400 md:text-sm'>
                  {subtitle}
                </p>
              </div>
              <div className='grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-10'>
                {songs.map((song) => {
                  return (
                    <SongRecommendationCard
                      key={song.id}
                      song={song}
                      badge={badgeFormatter(song)}
                      onPlay={() => onPlay(song)}
                      onBuy={() => onBuy(song)}
                      isBuying={activeBuySongId === song.id}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
