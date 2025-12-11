'use client';

import {ShoppingCart} from 'lucide-react';
import {Button} from '../ui/button';
import {useWallet} from '@/providers/StarknetProvider';
import {createTokenOwnership} from '@/actions/userActions';

export default function BuySongButton({songId}: {songId: string}) {
  const {address} = useWallet();

  const handleBuy = async () => {
    try {
      // TODO: Replace with actual purchase logic
      console.log(`Buying song: ${songId}`);
      const song_data = {
        owner: address,
        songid: songId,
        balance: '1',
      };

      createTokenOwnership(song_data);
      // await buySong(songId) or openModal(songId)
    } catch (err) {
      console.error('Purchase failed:', err);
    }
  };

  return (
    <Button
      onClick={handleBuy}
      className="flex items-center gap-2 px-4 py-2 rounded-md bg-tranpsarent text-white ">
      <ShoppingCart size={18} />
    </Button>
  );
}
