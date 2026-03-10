import {ReactNode} from 'react';
import {Carousel, CarouselContent} from './ui/carousel';

export default function GroovvCarousel({children}: {children: ReactNode}) {
  return (
    <Carousel className="w-full overflow-visible">
      <CarouselContent className="pl-1 md:pl-2">{children}</CarouselContent>
    </Carousel>
  );
}
