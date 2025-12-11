import { addSongToPlaylist } from '@/actions/musicActions';
import { Plus } from 'lucide-react';

export default function AddToPlaylistButton({
  playlistId,
  songId,
}: {
  playlistId: number;
  songId: string;
}) {
  return (
    <div
      className='w-20 h-20 rounded-full flex items-center justify-center'
      onClick={() => addSongToPlaylist({ playlistId, songId })}
    >
      <Plus size={20} color='white' />
    </div>
  );
}
