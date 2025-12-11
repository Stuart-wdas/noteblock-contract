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

export default function AddSongsComp() {
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
        <Button
          className='relative z-10 px-6 py-3 font-bold text-white rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 
               shadow-xl transition-all duration-300 ease-in-out 
               hover:scale-105 hover:rotate-1 hover:shadow-2xl 
                text-xs'
        >
          <PlusCircle color='white' />
          <span>Add music</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className='fixed -top-15 bg-secondary rounded-t-xl px-6 z-999 border-none'>
        <DrawerHeader className='flex justify-between items-center'>
          <DrawerTitle className='text-white'>Add Songs</DrawerTitle>
          <DrawerDescription className='flex gap-2 w-full justify-between'></DrawerDescription>
        </DrawerHeader>
        <SongsView variant='playlist' />
      </DrawerContent>
    </Drawer>
  );
}
