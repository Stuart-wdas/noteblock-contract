import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Download, Share2, Trash2, ListEnd, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from './ui/label';
import { Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
export default function MoreOptionsSongMenu({ song }: { song: Song | Song[] }) {
  const { addToQueue } = useAudioPlayer();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className='z-20'>
        <Button
          variant={'ghost'}
          className='text-white p-2 rounded-full hover:bg-gray-800'
        >
          <MoreVertical size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='bg-secondary border-none text-white rounded-md p-2 mr-5 z-[999]'>
        <DropdownMenuItem
          onClick={() => addToQueue(song)}
          className='flex justify-between items-center'
        >
          <Label>Play Next</Label>
          <ListEnd size={18} color='white' />
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
