import { Play, Pause } from 'lucide-react';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';

export default function PlayPauseButton({ song }: { song: any }) {
  const { isPlaying, togglePlay, currentSong, playSong } = useAudioPlayer();
  return (
    <div
      className='w-20 h-20 rounded-full flex items-center justify-center'
      onClick={isPlaying ? togglePlay : () => playSong(song)}
    >
      {isPlaying && currentSong?.id === song.id ? (
        <Pause size={24} fill='white' color='white' />
      ) : (
        <Play size={24} fill='white' color='white' />
      )}
    </div>
  );
}
