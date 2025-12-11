'use client';

import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
  ChevronRight,
  GalleryHorizontalEnd,
  ListMusic,
  Logs,
  MicVocal,
  Music3,
  ChevronLeft,
} from 'lucide-react';
import {Label} from '../ui/label';
import LibraryView from './MenuViews/LibraryView';
import React, {useEffect, useState} from 'react';

import {AnimatePresence, motion, useAnimation} from 'framer-motion';
import {PlaylistView} from './MenuViews/PlaylistView';
import {ArtistView} from './MenuViews/ArtistsView';
import {AlbumView} from './MenuViews/AlbumsView';
import {SongsView} from './MenuViews/SongsView';
import {GenreView} from './MenuViews/GenresView';
import {useAudioPlayer} from '@/providers/AudioPlayerProvider';
import {sampleSongs} from '@/lib/getData';

const menuItems = [
  {
    label: 'Playlists',
    icon: (
      <ListMusic
        size={20}
        color="white"
      />
    ),
    value: 'playlists',
    comp: <PlaylistView />,
  },
  {
    label: 'Artists',
    icon: (
      <MicVocal
        size={20}
        color="white"
      />
    ),
    value: 'artists',
    comp: <ArtistView />,
  },
  {
    label: 'Albums',
    icon: (
      <GalleryHorizontalEnd
        size={20}
        color="white"
      />
    ),
    value: 'albums',
    comp: <AlbumView />,
  },
  {
    label: 'Songs',
    icon: (
      <Music3
        size={20}
        color="white"
      />
    ),
    value: 'songs',
    comp: <SongsView />,
  },
  {
    label: 'Genres',
    icon: (
      <Logs
        size={20}
        color="white"
      />
    ),
    value: 'genres',
    comp: <GenreView />,
  },
];

export default function Menu() {
  const [activeTab, setActiveTab] = useState('home');
  const {libraryView} = useAudioPlayer();
  const controls = useAnimation();

  useEffect(() => {
    controls.start({x: 0}); // Reset when drawer closes
  }, [controls]);

  // Use merged library for Recently Added / LibraryView
  const recentlyAddedSongs = libraryView?.partitioned.albums;

  return (
    <div className="w-full pb-32 flex flex-col bg-black text-white relative overflow-clip">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col">
        {/* Menu List */}
        <TabsList className="flex flex-col space-y-2 w-full h-56 bg-transparent">
          {menuItems.map((item) => (
            <div
              className="w-full border-b border-gray-700"
              key={item.value}>
              <TabsTrigger
                value={item.value}
                onClick={() => setActiveTab(item.value)}
                className="flex justify-between items-center w-full pb-2 px-2 text-left hover:bg-gray-800 rounded">
                <div className="flex items-center space-x-2">
                  {item.icon}
                  <Label className="text-white">{item.label}</Label>
                </div>
                <ChevronRight
                  color="white"
                  size={16}
                />
              </TabsTrigger>
            </div>
          ))}
        </TabsList>
        <div
          key="home"
          className="flex flex-col mt-4 px-0.5 mb-8 space-y-4">
          <h1 className="text-2xl font-bold">Recently Added</h1>
          <LibraryView songs={recentlyAddedSongs} />
        </div>

        {/* Animated Tab Views */}
        <AnimatePresence mode="wait">
          {menuItems.map((item) =>
            activeTab === item.value ? (
              <motion.div
                key={item.value}
                initial={{x: '100%'}}
                animate={{x: 0}}
                exit={{x: '100%'}}
                transition={{duration: 0.3}}
                // animate={controls}
                className="fixed top-0 inset-0 flex flex-col bg-black">
                {/* Header */}
                <div className="flex items-start justify-between px-4 py-4 w-screen flex-col gap-4">
                  <button
                    onClick={() => setActiveTab('home')}
                    className="flex items-center space-x-1 text-white hover:text-pink-400">
                    <ChevronLeft size={18} />
                    <span>Library</span>
                  </button>
                  <h2 className="text-lg font-semibold">{item.label}</h2>
                </div>

                {/* Content */}
                <motion.div
                  drag="x"
                  dragConstraints={{
                    right: 0,
                    left: 0,
                  }}
                  onDragStart={(_, info) => {
                    const dragDistance = info.offset.x;

                    const shouldClose = dragDistance > 0;

                    if (shouldClose) setActiveTab('home');
                    controls.start({x: 0}); // Reset position
                  }}>
                  <div className="px-4 pt-4 overflow-y-auto flex-1 min-h-[80vh]">
                    {item.comp}
                  </div>
                </motion.div>
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
