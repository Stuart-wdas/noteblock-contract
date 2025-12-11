'use client';

import { useAudioPlayer, Song } from '@/providers/AudioPlayerProvider';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import PlayPauseButton from '../Buttons/PlayPauseButton';

interface Props {
  song: Song;
}

export default function SongControls({ song }: Props) {
  const {
    addToQueue,
    playSong,
    togglePlay,
    isPlaying,
    next,
    previous,
    currentSong,
  } = useAudioPlayer();

  return (
    <div className='flex flex-col space-y-1 items-center'>
      <div className='flex items-center space-x-4'>
        <div
          className='w-20 h-20 rounded-full flex items-center justify-center'
          onClick={previous}
        >
          <SkipBack size={32} fill='white' />
        </div>

        <PlayPauseButton song={song} />

        <div
          className='w-20 h-20 rounded-full flex items-center justify-center'
          onClick={next}
        >
          <SkipForward size={32} fill='white' />
        </div>
      </div>
    </div>
  );
}
