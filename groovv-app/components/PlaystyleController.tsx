import { Circle, Play, Search, SearchCheck, Shuffle } from 'lucide-react';
import { Button } from './ui/button';

import { Playstyle, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { ReactNode } from 'react';

export default function PlaystyleController() {
  return (
    <div className='grid grid-cols-4 gap-2 pt-2'>
      <FancyButton label='Play' icon={<Play size={20} />} />
      <FancyButton label='Loop' icon={<Circle size={20} />} />
      <FancyButton label='Shuffle' icon={<Shuffle size={20} />} />
      <FancyButton label='Discover' icon={<Search size={20} />} />
    </div>
  );
}

function FancyButton({ label, icon }: any) {
  const { playstyle, setPlayStyle } = useAudioPlayer();
  const isActive = Playstyle[label as keyof typeof Playstyle] === playstyle;

  return (
    <button
      onClick={() => setPlayStyle(label)}
      className={`relative flex items-center justify-center gap-2 text-xs px-2 py-2 rounded-xl font-semibold 
                  transition-all duration-300 ease-out focus:outline-none 
                  ${
                    isActive
                      ? 'text-white bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 shadow-xl scale-[1.05]'
                      : 'text-white bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]'
                  }`}
      style={{
        WebkitBackdropFilter: 'blur(10px)',
        WebkitBoxShadow: isActive
          ? '0 6px 24px rgba(255, 100, 100, 0.4)'
          : '0 4px 20px rgba(0, 0, 0, 0.2)',
      }}
    >
      {label} {icon}
    </button>
  );
}
