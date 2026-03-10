'use client';

import { ListChecks, Plus, User2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Create from '@/components/Studio/Create';
import Profile from '@/components/Studio/Profile';
import Listings from '@/components/Studio/Listings';

export default function Studio() {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='w-full flex flex-col text-white pt-2'
      >
        <TabsList className='relative grid h-auto w-full grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5'>
          <TabItem
            value='profile'
            icon={<User2 size={15} color='white' />}
            label='Profile'
            isActive={activeTab === 'profile'}
          />
          <TabItem
            value='listings'
            icon={<ListChecks size={15} color='white' />}
            label='Listings'
            isActive={activeTab === 'listings'}
          />
          <TabItem
            value='create'
            icon={<Plus size={15} color='white' />}
            label='Create'
            isActive={activeTab === 'create'}
          />
        </TabsList>

        <TabsContent value='profile'>
          <Profile />
        </TabsContent>
        <TabsContent value='create'>
          <Create />
        </TabsContent>
        <TabsContent value='listings'>
          <Listings />
        </TabsContent>
      </Tabs>
    </>
  );
}

function TabItem({
  value,
  icon,
  label,
  isActive,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}) {
  return (
    <TabsTrigger
      value={value}
      className='relative z-20 flex w-full flex-row place-content-center place-items-center overflow-hidden rounded-xl bg-transparent py-2 text-xs transition data-[state=active]:bg-transparent'
    >
      {isActive ? (
        <motion.span
          layoutId='studio-active-tab'
          className='absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-500'
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      ) : null}
      <span className='relative z-10'>{icon}</span>
      <span className='pl-1 text-white font-bold relative z-10'>{label}</span>
    </TabsTrigger>
  );
}
