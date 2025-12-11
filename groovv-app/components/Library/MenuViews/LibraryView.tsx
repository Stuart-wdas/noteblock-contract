'use client';

import {Song} from '@/providers/AudioPlayerProvider';
import AlbumCover from '../../AlbumCover';

export default function LibraryView({songs}: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-0">
      {songs?.map((song: Song) => (
        <div key={song.id}>
          <AlbumCover album={song as any} />
        </div>
      ))}
    </div>
  );
}
