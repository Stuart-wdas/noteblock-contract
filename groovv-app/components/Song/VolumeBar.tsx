'use client';

import {useRef} from 'react';
import {useAudioPlayer} from '@/providers/AudioPlayerProvider';
import {Volume2, VolumeX} from 'lucide-react';
import {motion, useMotionValue, useTransform} from 'framer-motion';

export default function VolumeBar() {
  const {volume, currentVolume} = useAudioPlayer();
  const barRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);

  const knobSize = 20; // px (same as w-5 h-5)

  // Converts dragX px into percentage, adjusted for knob center
  const dragPercent = useTransform(dragX, (x) => {
    if (!barRef.current) return 0;
    const width = barRef.current.offsetWidth;
    const centerX = x + knobSize / 2; // shift from left edge to center
    return Math.min(Math.max(centerX / width, 0), 1); // clamp 0–1
  });

  function handleDragEnd() {
    const pct = dragPercent.get();
    volume(pct);
  }

  return (
    <div className="w-full flex mt-2 place-items-center select-none">
      <VolumeX size={20} />
      <div
        ref={barRef}
        className="relative w-full h-2 rounded-full bg-gradient-to-r from-green-400 to-blue-500 cursor-pointer mx-5">
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 shadow-md cursor-grab active:cursor-grabbing bg-white rounded-full"
          drag="x"
          dragConstraints={barRef}
          style={{x: dragX}}
          // animate knob center instead of left edge
          animate={{
            x:
              currentVolume * (barRef.current?.offsetWidth ?? 0) - knobSize / 2,
          }}
          onDragEnd={handleDragEnd}
        />
      </div>
      <Volume2 size={20} />
    </div>
  );
}
