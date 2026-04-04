import { ReactNode } from 'react';
import { Carousel, CarouselContent } from './ui/carousel';

export default function GroovvCarousel({ children }: { children: ReactNode }) {
  return (
    <Carousel className='w-screen sm:w-full -left-4 rounded-md overflow-visible'>
      <CarouselContent className='rounded-screen pl-8 overflow-visible'>
        {children}
      </CarouselContent>
    </Carousel>
  );
}
