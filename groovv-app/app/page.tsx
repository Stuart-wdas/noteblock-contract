'use client';

import {Song} from '@/providers/AudioPlayerProvider';
import MiniPlayer from '@/components/Song/MiniPlayer';
import {useState} from 'react';
import Image from 'next/image';
import {useAudioPlayer} from '@/providers/AudioPlayerProvider';
import BottomNavBar from '@/components/Navbar/Pages';
import Menu from '@/components/Library/Menu';
import {useWallet} from '@/providers/StarknetProvider';
import Auth from '@/components/Auth/Auth';

export default function HomePage() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const {currentSong} = useAudioPlayer();
  const {address, disconnectWallet} = useWallet();
  const mobile = true;

  return (
    <>
      {mobile ? (
        <div className="min-h-screen bg-black text-white relative">
          {/* Header */}

          {/* Menu Section */}

          {/* Mini Player */}
          <div className="z-[999]">
            <MiniPlayer onExpand={() => setSelectedSong(currentSong)} />
            <BottomNavBar />
          </div>
        </div>
      ) : (
        <></>
      )}
    </>
  );
}
