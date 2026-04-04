import { Song } from '@/providers/AudioPlayerProvider';
import { ReactNode, useState } from 'react';
import GroovvCarousel from '@/components/GroovvCarousel';
import { ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { CarouselItem } from '@/components/ui/carousel';
import SongRecommendationCard from './SongRecommendationCard';
import RecommendationPage from './RecommendationPage';

export type MarketSong = Song & {
  listingId: string | null;
  listingCount: number;
  songId: string;
  price: string;
  copies: number;
  releaseDate: string;
  albumId: number | null;
  albumTitle: string | null;
  metrics: {
    streams24h: number;
    streamsPrev24h: number;
    streams7d: number;
    ownerCount: number;
    freshness: number;
    trendGrowth: number;
    topPickScore: number;
    riseScore: number;
    personalAffinity: number;
    speedScore: number;
  };
};
export default function RecommendationSection({
  title,
  subtitle,
  songs,
  icon,
  onPlay,
  onBuy,
  activeBuySongId,
  badgeFormatter,
}: {
  title: string;
  subtitle: string;
  songs: MarketSong[];
  icon: ReactNode;
  onPlay: (song: MarketSong) => void;
  onBuy: (song: MarketSong) => void;
  activeBuySongId: string;
  badgeFormatter: (song: MarketSong) => string;
}) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <section className='w-full flex flex-col space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='flex items-center gap-2 text-xl font-bold md:text-2xl'>
            {icon}
            {title}
          </h1>
          <p className='mt-1 text-xs text-zinc-400 md:text-sm'>{subtitle}</p>
        </div>
        <Button
          variant={'ghost'}
          className='text-zinc-300'
          onClick={() => {
            setOpen(true);
          }}
        >
          more
          <ChevronRight className='w-5 h-5 bg-linear-to-r from-pink-500 via-red-500 to-orange-500 rounded-xs' />
        </Button>
      </div>
      {songs.length === 0 ? (
        <p className='text-sm text-zinc-400'>No songs available yet.</p>
      ) : (
        <GroovvCarousel>
          {songs.map((song) => {
            return (
              <CarouselItem
                className='basis-[84%] sm:basis-[52%] lg:basis-[40%] xl:basis-[32%]'
                key={song.id}
              >
                <SongRecommendationCard
                  song={song}
                  badge={badgeFormatter(song)}
                  onPlay={() => onPlay(song)}
                  onBuy={() => onBuy(song)}
                  isBuying={activeBuySongId === song.id}
                />
              </CarouselItem>
            );
          })}
        </GroovvCarousel>
      )}
      {open ? (
        <RecommendationPage
          handleClose={setOpen}
          title={title}
          icon={icon}
          subtitle={subtitle}
          songs={songs}
          onPlay={onPlay}
          onBuy={onBuy}
          activeBuySongId={activeBuySongId}
          badgeFormatter={(song) => `${song.metrics.streams24h} plays today`}
        />
      ) : (
        ''
      )}
      {/* {<RecommendationPage handleClose={setOpen} />} */}
    </section>
  );
}
