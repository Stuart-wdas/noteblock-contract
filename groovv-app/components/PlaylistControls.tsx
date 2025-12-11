import { Play, Shuffle } from 'lucide-react';
import { Button } from './ui/button';
import { Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';

export default function PlaylistControls({ songs }: { songs: Song[] }) {
  const { playPlaylist, shufflePlaylist } = useAudioPlayer();

  return (
    <div className='grid grid-cols-2 gap-3 w-full'>
      <Button onClick={() => playPlaylist(songs)}>
        <Play className='mr-2' />
        Play
      </Button>
      <Button onClick={() => shufflePlaylist(songs)}>
        <Shuffle className='mr-2' />
        Shuffle
      </Button>
    </div>
  );
}
