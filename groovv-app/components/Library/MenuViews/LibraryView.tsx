'use client';

import { Song } from '@/providers/AudioPlayerProvider';
import AlbumCover from '../../AlbumCover';

export default function LibraryView({ songs }: any) {
  return (
    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 z-0'>
      {songs?.map((song: Song) => (
        <div
          key={song.id}
          className='rounded-2xl  p-2.5 transition hover:border-orange-400/35 hover:bg-black/35'
        >
          <AlbumCover album={song} />
        </div>
      ))}
    </div>
  );
}
