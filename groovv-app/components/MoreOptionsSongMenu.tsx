import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Share2, Trash2, ListEnd, MoreVertical, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from './ui/label';
import { useState } from 'react';
import { Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import ShareLinkDialog from './ShareLinkDialog';
import AddToPlaylistDialog from './AddToPlaylistDialog';

export default function MoreOptionsSongMenu({ song }: { song: Song }) {
  const { addToQueue } = useAudioPlayer();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isAddPlaylistDialogOpen, setIsAddPlaylistDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild className='z-0'>
          <Button
            variant={'ghost'}
            className='text-white p-2 rounded-full hover:bg-gray-800'
          >
            <MoreVertical size={20} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='bg-secondary border-none text-white rounded-md p-2 mr-5 z-1400'>
          <DropdownMenuItem
            onClick={() => addToQueue(song)}
            className='flex justify-between items-center'
          >
            <Label>Play Next</Label>
            <ListEnd size={18} color='white' />
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setIsAddPlaylistDialogOpen(true)}
            className='flex justify-between items-center'
          >
            <Label>Add to playlist</Label>
            <ListPlus size={18} color='white' />
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setIsShareDialogOpen(true)}
            className='flex justify-between items-center'
          >
            <Label>Share</Label>
            <Share2 size={18} color='white' />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareLinkDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        entityType='song'
        entityId={song.id}
        entityTitle={song.title}
      />
      <AddToPlaylistDialog
        open={isAddPlaylistDialogOpen}
        onOpenChange={setIsAddPlaylistDialogOpen}
        songs={[song]}
        entityLabel={song.title}
      />
    </>
  );
}
