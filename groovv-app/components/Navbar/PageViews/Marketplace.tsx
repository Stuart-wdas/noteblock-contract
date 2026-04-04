'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/providers/StarknetProvider';
import { useGroovv } from '@/providers/GroovProvider';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { Flame, Sparkles, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import RecommendationSection, {
  MarketSong,
} from '@/components/Marketplace/RecommendationSection';
import SongListingBoard, {
  SongBoardListing,
} from '@/components/Marketplace/SongListingBoard';

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
  const { buySong, isConfigured } = useGroovv();
  const { playSong } = useAudioPlayer();
  const queryClient = useQueryClient();
  const [activeBuyListingId, setActiveBuyListingId] = useState('');
  const [activeOpenSongId, setActiveOpenSongId] = useState('');
  const [selectedSong, setSelectedSong] = useState<MarketSong | null>(null);
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['marketSongs', address],
    queryFn: () => fetchMarketSongs(address || undefined),
    staleTime: 60_000,
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

  const onBuy = (song: MarketSong) => {
    setActiveOpenSongId(song.id);
    setSelectedSong(song);
    setStatus(`Viewing listings for ${song.title}.`);
    setTimeout(() => {
      setActiveOpenSongId((current) => (current === song.id ? '' : current));
    }, 150);
  };

  const handleBuyListing = async (
    song: MarketSong,
    listing: SongBoardListing,
  ) => {
    if (!address) {
      setStatus('Connect your wallet before buying songs.');
      return;
    }

    if (!isConfigured) {
      setStatus(
        'Contract not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
      );
      return;
    }

    if (!/^\d+$/.test(listing.listingId)) {
      setStatus(
        `Listing ${listing.listingId} is not a valid on-chain listing id.`,
      );
      return;
    }

    setActiveBuyListingId(listing.listingId);
    setStatus(`Buying ${song.title} from listing ${listing.listingId}...`);
    try {
      await buySong(listing.listingId, listing.price, 1, 0);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['userLibrary', address] }),
        queryClient.invalidateQueries({ queryKey: ['marketSongs', address] }),
        queryClient.invalidateQueries({
          queryKey: ['songListingBoard', song.id],
        }),
      ]);

      setStatus(`Purchased ${song.title} from ${listing.sellerName}.`);
    } catch (error) {
      console.error('Failed to buy song', error);
      setStatus(`Could not buy ${song.title} right now.`);
    } finally {
      setActiveBuyListingId('');
    }
  };

  if (isLoading) return <div className='p-6'>Loading marketplace songs...</div>;
  if (error || !sections)
    return (
      <div className='p-6 text-red-500'>Error loading marketplace songs</div>
    );

  return (
    <div className='grid grid-cols-1 gap-8 py-2 md:py-4 z-999'>
      <RecommendationSection
        title='Top Picks of the Day'
        subtitle='Weighted by momentum, recency, demand, and market fit.'
        songs={sections.topPicks}
        icon={<Sparkles className='h-4 w-4 text-orange-400' />}
        onPlay={onPlay}
        onBuy={onBuy}
        activeBuySongId={activeOpenSongId}
        badgeFormatter={(song) => `${song.metrics.streams24h} plays today`}
      />
      <RecommendationSection
        title='On the Rise'
        subtitle='Fastest-rising songs from 24h trend acceleration.'
        songs={sections.onTheRise}
        icon={<TrendingUp className='h-4 w-4 text-pink-400' />}
        onPlay={onPlay}
        onBuy={onBuy}
        activeBuySongId={activeOpenSongId}
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
        onBuy={onBuy}
        activeBuySongId={activeOpenSongId}
        badgeFormatter={(song) =>
          `${Math.round(song.metrics.personalAffinity * 10) / 10} match`
        }
      />
      {status ? <p className='text-sm text-orange-300'>{status}</p> : null}
      <SongListingBoard
        song={selectedSong}
        walletAddress={address}
        activeBuyListingId={activeBuyListingId}
        status={status}
        onClose={() => {
          setSelectedSong(null);
          setActiveOpenSongId('');
        }}
        onBuyListing={handleBuyListing}
      />
    </div>
  );
}
