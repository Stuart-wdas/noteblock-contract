'use client';
// components/PlaylistGroupDialog.tsx

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MoreVertical, PlayIcon, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import Image from 'next/image';
import PlaylistControls from '@/components/PlaylistControls';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import MoreOptionsMenu from '@/components/MoreOptionsPageMenu';
import { Input } from '@/components/ui/input';
import NewPlaylistComp from '@/components/NewPlaylistComp';

export default function PlaylistGroupDialog({ playlist }: any) {
  const { playSong } = useAudioPlayer();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <button
          className='flex items-center gap-4 py-1 text-left w-full hover:bg-muted/30 rounded-lg transition'
          onClick={() => setOpen(true)}
        >
          <Image
            src={playlist.tracks[0]?.cover}
            alt={playlist.name}
            className='w-14 h-14 rounded-md object-cover'
            width={200}
            height={200}
          />
          <div>
            <h2 className='text-lg font-semibold'>{playlist.name}</h2>
            <p className='text-sm text-muted-foreground'>
              {playlist.description}
            </p>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent
        className='w-screen h-full fixed p-0 border-none pointer-events-none pb-34'
        onInteractOutside={(e) => e.preventDefault()}
      >
        <motion.div
          drag='y'
          dragConstraints={{ top: 0, bottom: 0 }}
          initial={{ y: 0 }}
          animate={{ y: 0 }}
          onDragEnd={(event, info) => {
            if (info.offset.y > 100) {
              setOpen(false);
            }
          }}
          className='pointer-events-auto flex flex-col h-full w-full overflow-y-auto bg-background pt-8'
        >
          <MoreOptionsMenu className='' song={playlist.songs} />
          <DialogHeader className='space-y-4 w-full'>
            <Image
              src='/logo.svg'
              alt='title'
              className='w-[80%] h-auto object-cover rounded-lg mx-auto pt-5'
              width={200}
              height={200}
            />
            <DialogTitle className='text-white text-center'>
              {playlist.name}
            </DialogTitle>
            <DialogDescription className='text-center'>
              {playlist.description}
            </DialogDescription>
            <PlaylistControls songs={playlist.tracks} />
          </DialogHeader>

          <div className='space-y-3 mt-6'>
            {playlist.tracks.map((track: Song, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className='flex flex-row items-center justify-between p-3 bg-transparent text-white border-b-[1px] border-gray-700'>
                  <div className='flex items-center gap-3'>
                    <Image
                      src={track.cover}
                      alt={track.title}
                      className='w-10 h-10 rounded-md'
                      width={100}
                      height={100}
                    />
                    <div>
                      <p className='font-medium'>{track.title}</p>
                      <p className='text-sm text-muted-foreground'>
                        {track.artist}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Button onClick={() => playSong(track)} variant={'ghost'}>
                      <PlayIcon fill='white' />
                    </Button>
                    <Button variant={'ghost'}>
                      <MoreVertical size={20} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export function PlaylistView() {
  const [searchTerm, setSearchTerm] = useState('');
  const { libraryView } = useAudioPlayer();

  const filteredPlaylists = libraryView?.partitioned.playlists.filter(
    (playlist) => playlist.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className='w-full space-y-6'>
      <div className='w-full flex items-center gap-2'>
        <Input
          className='w-full rounded-full'
          placeholder='Search for your playlists'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <NewPlaylistComp />
      </div>

      {filteredPlaylists?.map((playlist) => (
        <PlaylistGroupDialog key={playlist.id} playlist={playlist} />
      ))}
    </div>
  );
}
