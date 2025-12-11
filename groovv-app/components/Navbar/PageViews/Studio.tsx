'use client';

import { useQuery } from '@tanstack/react-query';

import { ListChecks, Plus, PlusIcon, Search, User2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { TabsTrigger } from '@radix-ui/react-tabs';
import { useState } from 'react';
import { motion } from 'framer-motion';

export const fetchMarketAlbums = async () => {
  const res = await fetch('/api/market/albums'); // adjust endpoint
  if (!res.ok) throw new Error('Failed to fetch albums');
  return await res.json().then((albums) => albums.albums);
};

export const fetchMarketArtists = async () => {
  const res = await fetch('/api/market/artist'); // adjust endpoint
  if (!res.ok) throw new Error('Failed to fetch artist');

  return res.json().then((albums) => albums.albums);
};

export default function Studio() {
  const {
    data: albums,
    isLoading: loadingAlbums,
    error: errorAlbums,
  } = useQuery({
    queryKey: ['marketAlbums'],
    queryFn: fetchMarketAlbums,
  });

  const {
    data: artists,
    isLoading: loadingArtists,
    error: errorArtists,
  } = useQuery({
    queryKey: ['marketAlbums'],
    queryFn: fetchMarketArtists,
  });

  const [activeTab, setActiveTab] = useState('profile');

  if (loadingAlbums) return <div className='p-6'>Loading albums...</div>;
  if (errorAlbums)
    return <div className='p-6 text-red-500'>Error loading albums</div>;

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='w-full flex flex-col bg-black text-white pt-2'
      >
        <TabsList className='relative grid grid-cols-3 gap-2 items-center w-full bg-black h-full'>
          {/* Highlight */}
          <motion.div
            layout
            initial={false}
            animate={{
              x:
                activeTab === 'profile'
                  ? 0
                  : activeTab === 'listings'
                  ? '100%'
                  : '200%',
            }}
            className='absolute top-0 left-0 w-1/3 h-full bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 rounded-xl'
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
          <TabItem
            value='profile'
            icon={<User2 size={15} color='white' />}
            label='Profile'
          />
          <TabItem
            value='listings'
            icon={<ListChecks size={15} color='white' />}
            label='Listings'
          />
          <TabItem
            value='create'
            icon={<Plus size={15} color='white' />}
            label='Create'
          />
        </TabsList>

        <TabsContent value='profile'>{/* <Profile /> */}</TabsContent>
        <TabsContent value='create'>{/* <Create /> */}</TabsContent>
        <TabsContent value='listings'>{/* <Listings /> */}</TabsContent>
      </Tabs>
    </>
  );
}

function TabItem({
  value,
  icon,
  label,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className={`flex flex-row place-items-center place-content-center text-xs rounded-xl transition py-1 z-20 w-full
      `}
    >
      {icon}
      <span className='pl-1 text-white font-bold'>{label}</span>
    </TabsTrigger>
  );
}
