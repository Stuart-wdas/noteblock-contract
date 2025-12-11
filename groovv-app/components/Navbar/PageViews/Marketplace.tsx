'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import AlbumCover from '@/components/AlbumCover';
import GroovvCarousel from '@/components/GroovvCarousel';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

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

export default function Marketplace() {
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

  if (loadingAlbums) return <div className='p-6'>Loading albums...</div>;
  if (errorAlbums)
    return <div className='p-6 text-red-500'>Error loading albums</div>;

  return (
    <div className='grid grid-cols-1 gap-6 py-6 z-[999]'>
      <div className='w-full flex flex-col space-y-4'>
        <div className='flex justify-between'>
          <h1 className='font-bold text-xl'>Top picks of today</h1>
          <Button variant={'ghost'} className='-mr-5'>
            more{' '}
            <ChevronRight className='w-5 h-5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500  rounded-xs' />
          </Button>
        </div>
        <GroovvCarousel>
          {albums.map((album: any) => (
            <CarouselItem className='basis-[45%] lg:basis-1/3' key={album.id}>
              <AlbumCover album={album} />
            </CarouselItem>
          ))}
        </GroovvCarousel>
      </div>
      <div className='w-full flex flex-col space-y-4'>
        <h1 className='font-bold text-xl'>On the rise</h1>
        <GroovvCarousel>
          {albums.map((album: any) => (
            <CarouselItem className='basis-[45%] lg:basis-1/3' key={album.id}>
              <AlbumCover album={album} />
            </CarouselItem>
          ))}
        </GroovvCarousel>
      </div>
      <div className='w-full flex flex-col space-y-4'>
        <h1 className='font-bold text-xl'>More your speed</h1>
        <GroovvCarousel>
          {albums.map((album: any) => (
            <CarouselItem className='basis-[45%] lg:basis-1/3' key={album.id}>
              <AlbumCover album={album} />
            </CarouselItem>
          ))}
        </GroovvCarousel>
      </div>
      <div className='w-full flex flex-col space-y-4'>
        <h1 className='font-bold text-xl'>Bangers and mash</h1>
        <GroovvCarousel>
          {albums.map((album: any) => (
            <CarouselItem className='basis-[45%] lg:basis-1/3' key={album.id}>
              <AlbumCover album={album} />
            </CarouselItem>
          ))}
        </GroovvCarousel>
      </div>
    </div>
  );
}
