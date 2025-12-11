import {Album, useAudioPlayer} from '@/providers/AudioPlayerProvider';
import {createTokensOwnership} from '../../actions/userActions';
import {Download, Loader} from 'lucide-react';
import {Button} from '../ui/button';
import {useWallet, WalletProvider} from '@/providers/StarknetProvider';
import {useState} from 'react';

export default function BuyAlbumButton({albumId}: {albumId: string}) {
  const {address} = useWallet();
  const [isAdding, setadding] = useState<boolean>();
  const handleBuy = async () => {
    setadding(true);
    try {
      // TODO: Replace with actual purchase logic
      console.log(`Buying album: ${albumId}`);
      const album_data = {
        owner: address,
        albumId: Number(albumId),
        balance: '1',
      };
      await createTokensOwnership(album_data);

      // await buySong(songId) or openModal(songId)
    } catch (err) {
      console.error('Purchase failed:', err);
    }
    setadding(false);
  };
  return (
    <Button
      onClick={(e) => {
        e.preventDefault();
        handleBuy();
      }}
      className="flex items-center gap-2 px-4 py-2 rounded-md bg-tranpsarent text-white ">
      {isAdding ? <Loader /> : <Download />}
    </Button>
  );
}
