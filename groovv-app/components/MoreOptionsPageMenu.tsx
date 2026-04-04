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
import { Album, Song, useAudioPlayer } from '@/providers/AudioPlayerProvider';
import ShareLinkDialog from './ShareLinkDialog';
import AddToPlaylistDialog from './AddToPlaylistDialog';

export default function MoreOptionsPageMenu({
  item,
  className,
}: {
  item: Song | Album;
  className?: string;
}) {
  const { addToQueue } = useAudioPlayer();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isAddPlaylistDialogOpen, setIsAddPlaylistDialogOpen] = useState(false);
  const isAlbum = 'songs' in item;
  const queueTarget = isAlbum ? item.songs : item;
  const songsForPlaylist = isAlbum ? item.songs : [item];
  const shareEntityType = isAlbum ? 'album' : 'song';

  return (
    <>
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
            onClick={() => addToQueue(queueTarget)}
            className='flex justify-between items-center'
          >
            <Label>Play Next</Label>
            <ListEnd size={18} color='white' />
          </DropdownMenuItem>
          {/* Opens another modal to choose which playlist */}
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
        entityType={shareEntityType}
        entityId={item.id}
        entityTitle={item.title}
      />
      <AddToPlaylistDialog
        open={isAddPlaylistDialogOpen}
        onOpenChange={setIsAddPlaylistDialogOpen}
        songs={songsForPlaylist}
        entityLabel={item.title}
      />
    </>
  );
}
