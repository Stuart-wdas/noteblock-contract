'use client';

import MiniPlayer from '@/components/Song/MiniPlayer';
import {useAudioPlayer} from '@/providers/AudioPlayerProvider';
import BottomNavBar from '@/components/Navbar/Pages';

export default function HomePage() {
  const {currentSong} = useAudioPlayer();

  return (
    <div className='relative min-h-screen text-white'>
      <div className='pointer-events-none absolute inset-0 opacity-80'>
        <div className='absolute -left-24 top-20 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl' />
        <div className='absolute right-0 top-48 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl' />
      </div>
      <div className='relative z-10'>
        <BottomNavBar />
        {currentSong ? <MiniPlayer /> : null}
      </div>
    </div>
  );
}
