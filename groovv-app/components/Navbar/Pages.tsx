'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Home,
  ShoppingCart,
  ListChecks,
  Search,
  Music4,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Marketplace from './PageViews/Marketplace';
import SearchComp from './PageViews/Search';
import Studio from './PageViews/Studio';
import Menu from '../Library/Menu';
import Listings from '@/components/Studio/Listings';

type NavItem = {
  value: string;
  label: string;
  hint: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    value: 'home',
    label: 'Library',
    hint: 'Your collection and recently added music',
    icon: <Home size={18} />,
  },
  {
    value: 'studio',
    label: 'Studio',
    hint: 'Create and manage your artist profile',
    icon: <Music4 size={18} />,
  },
  {
    value: 'marketplace',
    label: 'Market',
    hint: 'Curated tracks with trading momentum',
    icon: <ShoppingCart size={18} />,
  },
  {
    value: 'listings',
    label: 'Listings',
    hint: 'Publish songs from your owned inventory',
    icon: <ListChecks size={18} />,
  },
  {
    value: 'search',
    label: 'Search',
    hint: 'Find songs in your library and marketplace',
    icon: <Search size={18} />,
  },
];

export default function BottomNavBar() {
  const [activeTab, setActiveTab] = useState('home');
  const activeItem = useMemo(
    () => navItems.find((item) => item.value === activeTab),
    [activeTab],
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className='min-h-screen w-full text-white'
    >
      <div className='flex w-full h-full gap-0 pb-10 md:h-screen md:gap-0 md:px-0 md:py-0'>
        <aside className='hidden h-[calc(100vh-3rem)] w-[340px] md:h-full shrink-0 flex-col border-r border-white/10 bg-black/65 p-4 md:sticky md:top-6 md:flex'>
          <div>
            <p className='text-xs uppercase tracking-[0.3em] text-zinc-400'>
              Groovv
            </p>
            <h1 className='mt-2 text-2xl font-semibold tracking-tight'>
              Listen. Own. Trade.
            </h1>
          </div>

          <TabsList className='mt-6 flex h-auto w-full flex-col gap-2 bg-transparent p-0'>
            {navItems.map((item) => (
              <DesktopTabItem
                key={item.value}
                item={item}
                isActive={activeTab === item.value}
              />
            ))}
          </TabsList>

          <div className='mt-auto border border-white/10 bg-black/25 p-4 rounded-sm'>
            <div className='mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400'>
              <Sparkles className='h-3.5 w-3.5 text-orange-300' />
              Daily Signal
            </div>
            <p className='text-sm text-zinc-200'>
              Marketplace recommendations blend stream momentum, recency, and
              ownership interest.
            </p>
          </div>
        </aside>

        <main className='relative h-full w-full overflow-hidden'>
          <div className='h-full overflow-y-auto px-4 pb-10 pt-4 sm:px-5 md:px-8 md:pt-8'>
            {activeItem && activeTab !== 'home' ? (
              <div className='mb-5 hidden items-center justify-between md:flex'>
                <div>
                  <p className='text-xs uppercase tracking-[0.3em] text-zinc-400'>
                    {activeItem.label}
                  </p>
                  <h2 className='text-2xl font-semibold tracking-tight text-white'>
                    {activeItem.label}
                  </h2>
                </div>
                <p className='max-w-lg text-right text-sm text-zinc-400'>
                  {activeItem.hint}
                </p>
              </div>
            ) : null}

            <TabsContent value='home' className='mt-0'>
              <Menu />
            </TabsContent>
            <TabsContent value='studio' className='mt-0'>
              <Studio />
            </TabsContent>
            <TabsContent value='marketplace' className='mt-0'>
              <Marketplace />
            </TabsContent>
            <TabsContent value='listings' className='mt-0'>
              <h1 className='text-3xl font-bold md:hidden'>Listings</h1>
              <Listings />
            </TabsContent>
            <TabsContent value='search' className='mt-0'>
              <SearchComp />
            </TabsContent>
          </div>
        </main>
      </div>

      <nav className='fixed bottom-0 left-0 right-0 z-1000 border-t border-white/10 bg-black/85 px-1 pb-2 pt-1 backdrop-blur md:hidden'>
        <TabsList className='flex h-auto w-full items-center justify-around bg-transparent p-0'>
          {navItems.map((item) => (
            <MobileTabItem
              key={item.value}
              item={item}
              isActive={activeTab === item.value}
            />
          ))}
        </TabsList>
      </nav>
    </Tabs>
  );
}

function DesktopTabItem({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <TabsTrigger
      value={item.value}
      className={`h-auto w-full justify-start border p-3 text-left transition data-[state=active]:shadow-none rounded-sm ${
        isActive
          ? 'border-orange-400/40 bg-linear-to-r from-orange-500/20 via-pink-500/20 to-emerald-500/15 text-white'
          : 'border-white/8 bg-black/25 text-zinc-300 hover:border-white/20 hover:bg-white/5'
      }`}
    >
      <div className='mr-3 mt-0.5 shrink-0'>{item.icon}</div>
      <div>
        <p className='text-sm font-semibold'>{item.label}</p>
        <p className='text-xs text-zinc-400 text-wrap'>{item.hint}</p>
      </div>
    </TabsTrigger>
  );
}

function MobileTabItem({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <TabsTrigger
      value={item.value}
      className={`flex h-auto flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] transition data-[state=active]:bg-transparent ${
        isActive ? 'text-pink-500' : 'text-white'
      }`}
    >
      {item.icon}
      <span>{item.label}</span>
    </TabsTrigger>
  );
}
