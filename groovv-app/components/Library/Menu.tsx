'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ChevronRight,
  GalleryHorizontalEnd,
  ListMusic,
  Logs,
  MicVocal,
  Music3,
  ChevronLeft,
} from 'lucide-react';
import { Label } from '../ui/label';
import LibraryView from './MenuViews/LibraryView';
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { PlaylistView } from './MenuViews/PlaylistView';
import { ArtistView } from './MenuViews/ArtistsView';
import { AlbumView } from './MenuViews/AlbumsView';
import { SongsView } from './MenuViews/SongsView';
import { GenreView } from './MenuViews/GenresView';
import { Album, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { Header } from '../Header';
import SongItem from '../Song/SongItem';
import AlbumCover from '../AlbumCover';

const menuItems = [
  {
    label: 'Playlists',
    icon: <ListMusic size={20} color='white' />,
    value: 'playlists',
    comp: <PlaylistView />,
  },
  {
    label: 'Artists',
    icon: <MicVocal size={20} color='white' />,
    value: 'artists',
    comp: <ArtistView />,
  },
  {
    label: 'Albums',
    icon: <GalleryHorizontalEnd size={20} color='white' />,
    value: 'albums',
    comp: <AlbumView />,
  },
  {
    label: 'Songs',
    icon: <Music3 size={20} color='white' />,
    value: 'songs',
    comp: <SongsView />,
  },
  {
    label: 'Genres',
    icon: <Logs size={20} color='white' />,
    value: 'genres',
    comp: <GenreView />,
  },
];

export default function Menu() {
  const [mobileActiveTab, setMobileActiveTab] = useState('home');
  const [desktopActiveTab, setDesktopActiveTab] = useState('home');
  const { libraryView } = useAudioPlayer();
  const controls = useAnimation();

  useEffect(() => {
    controls.start({ x: 0 });
  }, [controls]);

  const recentlyAddedSongs = libraryView?.partitioned.recentlyAdded ?? [];
  const stats = useMemo(
    () => [
      { label: 'Songs', value: libraryView?.partitioned.songs.length ?? 0 },
      { label: 'Albums', value: libraryView?.partitioned.albums.length ?? 0 },
      { label: 'Artists', value: libraryView?.partitioned.artists.length ?? 0 },
    ],
    [libraryView],
  );

  return (
    <>
      <div className='relative flex w-full flex-col overflow-clip bg-transparent pb-12 text-white md:hidden'>
        <Header />
        <Tabs
          value={mobileActiveTab}
          onValueChange={setMobileActiveTab}
          className='mt-4 flex flex-1 flex-col'
        >
          <TabsList className='h-56 w-full flex-col space-y-2 bg-transparent'>
            {menuItems.map((item) => (
              <div className='w-full border-b border-gray-700' key={item.value}>
                <TabsTrigger
                  value={item.value}
                  onClick={() => setMobileActiveTab(item.value)}
                  className='flex w-full items-center justify-between rounded px-2 pb-2 text-left hover:bg-gray-800 data-[state=active]:bg-transparent'
                >
                  <div className='flex items-center space-x-2'>
                    {item.icon}
                    <Label className='text-white'>{item.label}</Label>
                  </div>
                  <ChevronRight color='white' size={16} />
                </TabsTrigger>
              </div>
            ))}
          </TabsList>

          <div key='home' className='mb-8 mt-4 flex flex-col space-y-4 px-0.5'>
            <h1 className='text-2xl font-bold'>Recently Added</h1>
            <div className='space-y-2'>
              {recentlyAddedSongs.length === 0 ? (
                <p className='text-sm text-zinc-400'>No recent songs yet.</p>
              ) : (
                recentlyAddedSongs.map((song) => (
                  <AlbumCover
                    key={song.id}
                    album={
                      {
                        id: song.id,
                        title: song.title,
                        artist: song.artist,
                        genre: song.genre,
                        cover: song.cover,
                        songs: [song],
                        releaseDate: song.releaseDate,
                      } as Album
                    }
                    // variant='library'
                  />
                ))
              )}
            </div>
          </div>

          <AnimatePresence mode='wait'>
            {menuItems.map((item) =>
              mobileActiveTab === item.value ? (
                <motion.div
                  key={item.value}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ duration: 0.3 }}
                  className='fixed inset-0 top-0 z-[1001] flex flex-col bg-black'
                >
                  <div className='flex w-screen flex-col items-start justify-between gap-4 px-4 py-4'>
                    <button
                      onClick={() => setMobileActiveTab('home')}
                      className='flex items-center space-x-1 text-white hover:text-pink-400'
                    >
                      <ChevronLeft size={18} />
                      <span>Library</span>
                    </button>
                    <h2 className='text-lg font-semibold'>{item.label}</h2>
                  </div>

                  <motion.div
                    drag='x'
                    dragConstraints={{
                      right: 0,
                      left: 0,
                    }}
                    onDragStart={(_, info) => {
                      const dragDistance = info.offset.x;
                      const shouldClose = dragDistance > 0;
                      if (shouldClose) setMobileActiveTab('home');
                      controls.start({ x: 0 });
                    }}
                  >
                    <div className='min-h-[80vh] flex-1 overflow-y-auto px-4 pt-4'>
                      {item.comp}
                    </div>
                  </motion.div>
                </motion.div>
              ) : null,
            )}
          </AnimatePresence>
        </Tabs>
      </div>

      <div className='hidden w-full pb-6 text-white md:block'>
        <Header />

        <Tabs
          value={desktopActiveTab}
          onValueChange={setDesktopActiveTab}
          className='mt-5 flex w-full flex-col'
        >
          <TabsList className='h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0'>
            <TabsTrigger
              value='home'
              className='h-auto rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-300 data-[state=active]:border-orange-400/50 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100'
            >
              Home
            </TabsTrigger>
            {menuItems.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className='h-auto rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-300 data-[state=active]:border-orange-400/50 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100'
              >
                <span className='mr-1.5 inline-flex items-center'>
                  {item.icon}
                </span>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value='home' className='mt-5 space-y-6'>
            <section className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className='rounded-2xl border border-white/10 bg-black/35 p-4'
                >
                  <p className='text-[11px] uppercase tracking-[0.24em] text-zinc-400'>
                    {stat.label}
                  </p>
                  <p className='mt-2 text-2xl font-semibold'>{stat.value}</p>
                </article>
              ))}
            </section>

            <section className='rounded-2xl border border-white/10 bg-black/35 p-4 md:p-5'>
              <h2 className='text-xl font-semibold md:text-2xl'>
                Recently Added
              </h2>
              <p className='mt-1 text-sm text-zinc-400'>
                Fresh additions from your collection.
              </p>
              <div className='mt-5'>
                <div className='space-y-2'>
                  {recentlyAddedSongs.length === 0 ? (
                    <p className='text-sm text-zinc-400'>
                      No recent songs yet.
                    </p>
                  ) : (
                    recentlyAddedSongs.map((song) => (
                      <SongItem key={song.id} song={song} variant='library' />
                    ))
                  )}
                </div>
              </div>
            </section>
          </TabsContent>

          {menuItems.map((item) => (
            <TabsContent key={item.value} value={item.value} className='mt-5'>
              <section className='rounded-2xl border border-white/10 bg-black/35 p-4 md:p-5'>
                <h2 className='text-2xl font-semibold'>{item.label}</h2>
                <div className='mt-4'>{item.comp}</div>
              </section>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
