'use client';

import {useState} from 'react';
import {ShoppingCart} from 'lucide-react';
import {Button} from '../ui/button';
import {useWallet} from '@/providers/StarknetProvider';
import {useGroovv} from '@/providers/GroovProvider';
import {useQueryClient} from '@tanstack/react-query';

type MarketSongSummary = {
  id: string;
  listingId?: string | null;
  price: string;
};

type MarketSongsResponse = {
  sections?: {
    topPicks?: MarketSongSummary[];
    onTheRise?: MarketSongSummary[];
    moreYourSpeed?: MarketSongSummary[];
  };
};

async function resolveExpectedPriceFromApi(songId: string) {
  const response = await fetch('/api/market/songs', {cache: 'no-store'});
  if (!response.ok) return null;

  const payload = (await response.json()) as MarketSongsResponse;
  const sections = payload.sections;
  if (!sections) return null;

  const allSongs = [
    ...(sections.topPicks ?? []),
    ...(sections.onTheRise ?? []),
    ...(sections.moreYourSpeed ?? []),
  ];
  const match = allSongs.find((song) => song.id === songId);
  return match
    ? {
        price: match.price,
        listingId: match.listingId ?? match.id,
      }
    : null;
}

export default function BuySongButton({
  songId,
  listingId,
  expectedPrice,
}: {
  songId: string;
  listingId?: string | null;
  expectedPrice?: string | number;
}) {
  const {address} = useWallet();
  const {buySong, isConfigured} = useGroovv();
  const queryClient = useQueryClient();
  const [isBuying, setIsBuying] = useState(false);

  const handleBuy = async () => {
    if (!address) return;
    setIsBuying(true);
    try {
      if (!isConfigured) {
        throw new Error(
          'Contract not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
        );
      }

      const fallbackListingId = listingId?.trim() || songId;
      if (!/^\d+$/.test(fallbackListingId)) {
        throw new Error(
          `Song ${songId} is not mapped to an on-chain listing id yet.`,
        );
      }

      let resolvedListingId = fallbackListingId;
      let parsedPrice = Number(expectedPrice);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        const marketData = await resolveExpectedPriceFromApi(songId);
        parsedPrice = Number(marketData?.price);
        if (marketData?.listingId && /^\d+$/.test(marketData.listingId)) {
          resolvedListingId = marketData.listingId;
        }
      }

      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        throw new Error(
          `Song ${songId} has no valid listing price to confirm for purchase.`,
        );
      }

      await buySong(resolvedListingId, parsedPrice, 1, 0);

      await queryClient.invalidateQueries({queryKey: ['userLibrary', address]});
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <Button
      disabled={!address || isBuying}
      onClick={handleBuy}
      className="flex items-center gap-2 px-4 py-2 rounded-md bg-tranpsarent text-white ">
      <ShoppingCart size={18} />
    </Button>
  );
}
