import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  Share2,
  Trash2,
  ListEnd,
  MoreVertical,
  ListPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from './ui/label';
import { Album, Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
export default function MoreOptionsPageMenu({
  song,
  className,
}: {
  song: Song | Song[] | Album;
  className?: string;
}) {
  const { addToQueue, addToPlayList } = useAudioPlayer();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        <Button
          variant={'ghost'}
          className='text-white p-2 rounded-full hover:bg-gray-800'
        >
          <MoreVertical size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='bg-secondary border-none text-white rounded-md p-2 mr-5 z-1000'>
        <DropdownMenuItem
          onClick={() => addToQueue(song as Song)}
          className='flex justify-between items-center'
        >
          <Label>Play Next</Label>
          <ListEnd size={18} color='white' />
        </DropdownMenuItem>
        {/* Opens another modal to choose which playlist */}
        <DropdownMenuItem
          onClick={() => {}}
          className='flex justify-between items-center'
        >
          <Label>Add to playlist</Label>
          <ListPlus size={18} color='white' />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => console.log('Share')}
          className='flex justify-between items-center'
        >
          <Label>Share</Label>
          <Share2 size={18} color='white' />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => console.log('Delete')}
          className='flex justify-between items-center'
        >
          <Label>Delete</Label>
          <Trash2 size={18} color='white' />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
