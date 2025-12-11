import { Song } from '@/generated/prisma';
import { ChevronRight, Plus } from 'lucide-react';
import { Play } from 'next/font/google';
import Image from 'next/image';
import React, { act } from 'react';
import PlayPauseButton from '../Buttons/PlayPauseButton';
import AddToPlaylistButton from '../Buttons/AddToPlaylistButton';

export default function SongItem({
  song,
  variant = 'library',
}: {
  song: Song | any;
  variant?: 'library' | 'queue' | 'playlist';
}) {
  let action_content: React.ReactNode = null;

  switch (variant) {
    case 'library':
      action_content = <PlayPauseButton song={song} />;
    case 'playlist':
      action_content = <AddToPlaylistButton playlistId={1} songId={song.id} />;
      break;
  }

  return (
    <div className='flex w-full items-center space-x-4 pr-2'>
      <Image
        src={song.cover}
        alt={song.title}
        width={50}
        height={50}
        className='rounded-md object-cover'
      />
      <div className='w-full border-b-[1px] border-gray-600 py-3'>
        <p className='text-sm text-white text-start font-medium'>
          {song.title}
        </p>
        <p className='text-xs text-muted-foreground'>{song.artist}</p>
      </div>
      {/* actions depend on variant */}
      {action_content}
    </div>
  );
}
