'use client';

import { useQuery } from '@tanstack/react-query';
import { CarouselItem } from '@/components/ui/carousel';
import GroovvCarousel from '@/components/GroovvCarousel';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/providers/StarknetProvider';
import { Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { ChevronRight, Flame, Play, Sparkles, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

type MarketSong = Song & {
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

type MarketSongsPayload = {
  generatedAt: string;
  sections: {
    topPicks: MarketSong[];
    onTheRise: MarketSong[];
    moreYourSpeed: MarketSong[];
  };
};

export const fetchMarketSongs = async (userId?: string) => {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);

  const query = params.toString();
  const res = await fetch(`/api/market/songs${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch marketplace songs');
  return (await res.json()) as MarketSongsPayload;
};

export default function Marketplace() {
  const { address } = useWallet();
  const { playSong } = useAudioPlayer();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['marketSongs', address],
    queryFn: () => fetchMarketSongs(address || undefined),
  });

  const sections = data?.sections;

  const onPlay = (song: MarketSong) => {
    playSong({
      id: song.id,
      title: song.title,
      artist: song.artist,
      url: song.url,
      genre: song.genre,
      cover: song.cover,
    });
  };

  if (isLoading) return <div className='p-6'>Loading marketplace songs...</div>;
  if (error || !sections)
    return <div className='p-6 text-red-500'>Error loading marketplace songs</div>;

  return (
    <div className='grid grid-cols-1 gap-8 py-2 md:py-4 z-[999]'>
      <RecommendationSection
        title='Top Picks of the Day'
        subtitle='Weighted by momentum, recency, demand, and market fit.'
        songs={sections.topPicks}
        icon={<Sparkles className='h-4 w-4 text-orange-400' />}
        onPlay={onPlay}
        badgeFormatter={(song) => `${song.metrics.streams24h} plays today`}
      />
      <RecommendationSection
        title='On the Rise'
        subtitle='Fastest-rising songs from 24h trend acceleration.'
        songs={sections.onTheRise}
        icon={<TrendingUp className='h-4 w-4 text-pink-400' />}
        onPlay={onPlay}
        badgeFormatter={(song) =>
          `${Math.max(0, Math.round(song.metrics.trendGrowth * 100))}% rise`
        }
      />
      <RecommendationSection
        title='More Your Speed'
        subtitle='Personalized by genre and artist likeness from your profile.'
        songs={sections.moreYourSpeed}
        icon={<Flame className='h-4 w-4 text-orange-300' />}
        onPlay={onPlay}
        badgeFormatter={(song) =>
          `${Math.round(song.metrics.personalAffinity * 10) / 10} match`
        }
      />
    </div>
  );
}

function RecommendationSection({
  title,
  subtitle,
  songs,
  icon,
  onPlay,
  badgeFormatter,
}: {
  title: string;
  subtitle: string;
  songs: MarketSong[];
  icon: ReactNode;
  onPlay: (song: MarketSong) => void;
  badgeFormatter: (song: MarketSong) => string;
}) {
  return (
    <section className='w-full flex flex-col space-y-4 rounded-2xl border border-white/10 bg-black/25 p-4 md:p-5'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='flex items-center gap-2 text-xl font-bold md:text-2xl'>
            {icon}
            {title}
          </h1>
          <p className='mt-1 text-xs text-zinc-400 md:text-sm'>{subtitle}</p>
        </div>
        <Button variant={'ghost'} className='text-zinc-300'>
          more
          <ChevronRight className='w-5 h-5 bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 rounded-xs' />
        </Button>
      </div>
      {songs.length === 0 ? (
        <p className='text-sm text-zinc-400'>No songs available yet.</p>
      ) : (
        <GroovvCarousel>
          {songs.map((song) => (
            <CarouselItem
              className='basis-[84%] sm:basis-[52%] lg:basis-[40%] xl:basis-[32%]'
              key={song.id}
            >
              <SongRecommendationCard
                song={song}
                badge={badgeFormatter(song)}
                onPlay={() => onPlay(song)}
              />
            </CarouselItem>
          ))}
        </GroovvCarousel>
      )}
    </section>
  );
}

function SongRecommendationCard({
  song,
  badge,
  onPlay,
}: {
  song: MarketSong;
  badge: string;
  onPlay: () => void;
}) {
  return (
    <article className='h-full rounded-2xl border border-white/10 bg-zinc-950/75 p-3 transition hover:border-orange-400/35'>
      <img
        src={song.cover || '/logo.svg'}
        alt={song.title}
        className='h-36 w-full rounded-xl border border-zinc-700 object-cover md:h-40'
      />
      <div className='mt-3 space-y-2'>
        <p className='text-sm font-semibold text-white truncate'>{song.title}</p>
        <p className='text-xs text-zinc-400 truncate'>{song.artist}</p>
        <div className='flex flex-wrap gap-1 text-[11px]'>
          <span className='rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-orange-200'>
            {song.genre}
          </span>
          <span className='rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300'>
            Price {song.price}
          </span>
          <span className='rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300'>
            Copies {song.copies}
          </span>
        </div>
        <p className='text-[11px] text-pink-300'>{badge}</p>
      </div>
      <Button
        type='button'
        onClick={onPlay}
        className='mt-3 w-full bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
      >
        <Play className='h-4 w-4' />
        Play
      </Button>
    </article>
  );
}
