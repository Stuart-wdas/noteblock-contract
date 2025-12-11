import {ReactNode} from 'react';
import {Carousel, CarouselContent} from './ui/carousel';

export default function GroovvCarousel({children}: {children: ReactNode}) {
  return (
    <Carousel className="w-screen -ml-4 pl-px overflow-visible">
      <CarouselContent className="pl-5">{children}</CarouselContent>
    </Carousel>
  );
}
