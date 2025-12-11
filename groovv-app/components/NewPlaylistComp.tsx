'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, CirclePlus, PlusCircle, Trash } from 'lucide-react';
import Image from 'next/image';
import { SongsView } from './Library/MenuViews/SongsView';
import { motion } from 'framer-motion';
import AddSongsComp from './AddSongsComp';

export default function NewPlaylistComp() {
  const [open, setOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [songs, setSongs] = useState<string[]>([]);

  const handleCreate = () => {
    console.log({ playlistName, coverUrl, songs });
    setOpen(false);
    setPlaylistName('');
    setCoverUrl('');
    setSongs([]);
  };

  const handleCancel = () => {
    setOpen(false);
    setPlaylistName('');
    setCoverUrl('');
    setSongs([]);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <CirclePlus size={40} fill='white' color='black' />
      </DrawerTrigger>
      <DrawerContent className='fixed -top-15 bg-secondary rounded-t-xl px-6 z-999 border-none'>
        <DrawerHeader className='flex justify-between items-center'>
          <DrawerTitle className='text-white'>Create New Playlist</DrawerTitle>
          <DrawerDescription className='flex gap-2 w-full justify-between'>
            <Button variant='ghost' onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              variant={'ghost'}
              disabled={playlistName == '' ? true : false}
              className={`${playlistName == '' ? '' : 'text-red-500'}`}
            >
              Create
            </Button>
          </DrawerDescription>
        </DrawerHeader>

        <div className='space-y-4 mt-4 flex flex-col'>
          <div className='border-b-[1px] border-gray-600 place-items-center grid gap-5'>
            {coverUrl ? (
              <Image
                src={coverUrl || '/logo.svg'}
                alt='Playlist Cover'
                width={100}
                height={100}
                className='rounded-md'
              />
            ) : (
              <>
                <label
                  htmlFor='cover-upload'
                  className='w-[100px] h-[100px] rounded-md bg-gray-800 text-white text-sm flex items-center justify-center cursor-pointer'
                >
                  <Camera />
                </label>
                <Input
                  id='cover-upload'
                  type='file'
                  accept='image/*'
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCoverUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className='hidden'
                />
              </>
            )}

            <Input
              placeholder='Playlist title'
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className='border-none text-white focus:ring-none focus:border-none focus-visible:ring-0 focus-visible:border-none active:border-none'
            />
          </div>
          <AddSongsComp />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
