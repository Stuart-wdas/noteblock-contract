'use client';

import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {
  Home,
  Sparkles,
  ShoppingCart,
  ListChecks,
  Search,
  Music4,
} from 'lucide-react';
import {Dispatch, SetStateAction, useState} from 'react';
import Marketplace from './PageViews/Marketplace';
import SearchComp from './PageViews/Search';
import Studio from './PageViews/Studio';
import LibraryView from '../Library/MenuViews/LibraryView';
import Menu from '../Library/Menu';
import {Header} from '../Header';

export default function BottomNavBar() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full flex flex-col bg-black text-white">
      {/* Page Views */}
      <div
        className={`flex-1 overflow-y-auto px-4 pt-4 h-screen absolute top-0 bg-black w-screen`}>
        <TabsContent value="home">
          <Header />
          <Menu />
        </TabsContent>
        <TabsContent value="studio">
          <h1 className="text-3xl font-bold">Studio</h1>
          <Studio />
        </TabsContent>
        <TabsContent value="marketplace">
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <Marketplace />
        </TabsContent>
        <TabsContent value="listings">
          <h1 className="text-3xl font-bold">Listings</h1>
        </TabsContent>
        <TabsContent value="search">
          <h1 className="text-3xl font-bold">Search</h1>
          <SearchComp />
        </TabsContent>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 text-white pb-1 z-999 bg-black">
        <TabsList className="flex justify-around items-center w-full bg-black h-full">
          <TabItem
            value="home"
            icon={<Home size={24} />}
            label="Home"
            activeTab={activeTab}
          />
          <TabItem
            value="studio"
            icon={<Music4 size={24} />}
            label="Studio"
            activeTab={activeTab}
          />
          <TabItem
            value="marketplace"
            icon={<ShoppingCart size={24} />}
            label="Market"
            activeTab={activeTab}
          />
          <TabItem
            value="listings"
            icon={<ListChecks size={24} />}
            label="Listings"
            activeTab={activeTab}
          />
          <TabItem
            value="search"
            icon={<Search size={24} />}
            label="Search"
            activeTab={activeTab}
          />
        </TabsList>
      </nav>
    </Tabs>
  );
}

function TabItem({
  value,
  icon,
  label,
  activeTab,
  setActiveTab,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  activeTab: string;
  setActiveTab?: Dispatch<SetStateAction<string>> | undefined;
}) {
  return (
    <TabsTrigger
      value={value}
      className={`flex flex-col items-center text-xs transition data-[state=active]:bg-black  ${
        activeTab === value ? 'text-pink-400' : 'text-white'
      }`}
      onClick={setActiveTab ? () => setActiveTab('home') : undefined}>
      {icon}
      <span className="mt-1 ">{label}</span>
    </TabsTrigger>
  );
}
