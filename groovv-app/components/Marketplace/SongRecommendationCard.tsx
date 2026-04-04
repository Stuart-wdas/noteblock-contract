import { Play, ShoppingBasket } from 'lucide-react';
import { Button } from '../ui/button';
import { MarketSong } from './RecommendationSection';

export default function SongRecommendationCard({
  song,
  badge,
  onPlay,
  onBuy,
  isBuying,
}: {
  song: MarketSong;
  badge: string;
  onPlay: () => void;
  onBuy: () => void;
  isBuying: boolean;
}) {
  return (
    <article className='h-full rounded-2xl border border-white/10 bg-zinc-950/75 p-3 transition hover:border-orange-400/35'>
      <img
        src={song.cover || '/logo.svg'}
        alt={song.title}
        className='h-36 w-full rounded-xl border border-zinc-700 object-cover md:h-40'
      />
      <div className='mt-3 space-y-2'>
        <p className='text-sm font-semibold text-white truncate'>
          {song.title}
        </p>
        <p className='text-xs text-zinc-400 truncate'>{song.artist}</p>
        <div className='flex flex-wrap gap-1 text-[11px]'>
          <span className='rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-orange-200'>
            {song.genre}
          </span>
          <span className='rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300'>
            From {song.price}
          </span>
          <span className='rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300'>
            Copies {song.copies}
          </span>
          <span className='rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300'>
            Listings {song.listingCount}
          </span>
        </div>
        <p className='text-[11px] text-pink-300'>{badge}</p>
      </div>
      <Button
        type='button'
        onClick={onPlay}
        className='mt-3 w-full bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
      >
        <Play className='h-4 w-4' />
        Play
      </Button>
      <Button
        type='button'
        onClick={onBuy}
        disabled={isBuying}
        className='mt-3 w-full bg-linear-to-br to-pink-500 from-red-500 via-orange-500 text-white'
      >
        <ShoppingBasket className='h-4 w-4' />
        {isBuying ? 'Opening...' : 'View Listings'}
      </Button>
    </article>
  );
}
