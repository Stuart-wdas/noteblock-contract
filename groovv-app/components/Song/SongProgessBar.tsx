'use client';

import { useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useRef } from 'react';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SongProgressBar({
  showTime = true,
  variant = 'default',
}: {
  showTime?: boolean;
  variant?: 'default' | 'ghost';
}) {
  const { currentTime, duration, seek } = useAudioPlayer();
  const barRef = useRef<HTMLDivElement>(null);

  const progress = currentTime / (duration || 1);

  // Motion value for dragging knob
  const dragX = useMotionValue(0);

  // Converts dragX px into percentage
  const dragPercent = useTransform(dragX, (x) => {
    if (!barRef.current) return 0;
    const width = barRef.current.offsetWidth;
    return Math.min(Math.max(x / width, 0), 1); // clamp 0–1
  });

  // When user finishes dragging → seek()
  function handleDragEnd() {
    const pct = dragPercent.get();
    const newTime = pct * duration;
    seek(newTime);
  }

  // Clicking the bar sets the time
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!barRef.current) return;

    const rect = barRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const pct = offsetX / rect.width;

    seek(duration * pct);
  }

  return (
    <div className='w-full mt-2 select-none'>
      <div
        ref={barRef}
        onClick={handleClick}
        className='relative w-full h-2 rounded-full bg-white/40 cursor-pointer'
      >
        {/* FILLED PROGRESS */}
        <motion.div
          className='absolute top-0 left-0 h-2  rounded-full bg-linear-to-r from-pink-500 via-purple-500 to-indigo-500'
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 15 }}
        />

        {/* DRAG KNOB */}
        <motion.div
          className='absolute top-1/2 -translate-y-1/2 w-5 h-5 shadow-md cursor-grab active:cursor-grabbing'
          drag='x'
          dragConstraints={barRef}
          style={{ x: dragX }}
          animate={{ x: progress * (barRef.current?.offsetWidth ?? 0) }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* TIME DISPLAY */}
      {showTime && variant != 'ghost' && (
        <div className='flex justify-between text-xs text-gray-400 mt-1 font-mono'>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
}
