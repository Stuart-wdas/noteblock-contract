'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createAlbum, createSong } from '@/actions/musicActions';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWallet } from '@/providers/StarknetProvider';
import {
  AudioLines,
  Coins,
  Disc3,
  Layers3,
  Music2,
  PlusCircle,
  Sparkles,
  Tag,
  UserRound,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

type AlbumOption = {
  id: number;
  title: string;
  artist: string;
};

type UploadedSong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  price: string;
  copies: number;
  cid: string;
  cover?: string;
  releaseDate: string;
};

function toNumber(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatReleaseDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function getAudioDurationInSeconds(file: File): Promise<number> {
  const objectUrl = URL.createObjectURL(file);
  const audio = document.createElement('audio');
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.src = '';
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Math.max(1, Math.round(audio.duration));
      cleanup();
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('Failed to read audio duration'));
    };
    audio.src = objectUrl;
  });
}

export default function Create() {
  const { address, library } = useWallet();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');

  const [isAlbumDialogOpen, setIsAlbumDialogOpen] = useState(false);
  const [isSongDialogOpen, setIsSongDialogOpen] = useState(false);
  const [albumStep, setAlbumStep] = useState(1);
  const [songStep, setSongStep] = useState(1);

  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);

  const [albumTitle, setAlbumTitle] = useState('');
  const [albumGenre, setAlbumGenre] = useState('');
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null);
  const [albumCoverPreview, setAlbumCoverPreview] = useState('/logo.svg');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  const [songTitle, setSongTitle] = useState('');
  const [songGenre, setSongGenre] = useState('');
  const [songPrice, setSongPrice] = useState('1');
  const [songCopies, setSongCopies] = useState('100');
  const [selectedAlbumId, setSelectedAlbumId] = useState('none');
  const [songFile, setSongFile] = useState<File | null>(null);
  const [songDuration, setSongDuration] = useState<number | null>(null);
  const [songCoverFile, setSongCoverFile] = useState<File | null>(null);
  const [songCoverPreview, setSongCoverPreview] = useState('/logo.svg');
  const [isCreatingSong, setIsCreatingSong] = useState(false);

  const [mySongs, setMySongs] = useState<UploadedSong[]>([]);
  const [sessionUploads, setSessionUploads] = useState<UploadedSong[]>([]);
  const [isLoadingMySongs, setIsLoadingMySongs] = useState(false);
  const [mySongsQuery, setMySongsQuery] = useState('');

  const isWalletConnected = Boolean(address);
  const artistName =
    library?.user?.displayName?.trim() || address?.trim() || '';

  const uploadedSongs = useMemo(() => {
    const songsMap = new Map<string, UploadedSong>();
    [...sessionUploads, ...mySongs].forEach((song) =>
      songsMap.set(song.id, song),
    );
    return Array.from(songsMap.values());
  }, [mySongs, sessionUploads]);

  const totalCopies = useMemo(
    () => uploadedSongs.reduce((sum, song) => sum + toNumber(song.copies), 0),
    [uploadedSongs],
  );
  const totalPotential = useMemo(
    () =>
      uploadedSongs.reduce(
        (sum, song) => sum + toNumber(song.price) * toNumber(song.copies),
        0,
      ),
    [uploadedSongs],
  );

  const canAdvanceAlbumStep1 = albumTitle.trim() && albumGenre.trim();
  const canAdvanceSongStep1 =
    songTitle.trim() &&
    songGenre.trim() &&
    toNumber(songPrice) > 0 &&
    toNumber(songCopies) > 0;

  const setPreviewFile = (
    file: File | null,
    setFile: (value: File | null) => void,
    setPreview: (value: string | ((prev: string) => string)) => void,
  ) => {
    setFile(file);
    setPreview((prev) => {
      if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : '/logo.svg';
    });
  };

  const resetAlbumForm = () => {
    setAlbumStep(1);
    setAlbumTitle('');
    setAlbumGenre('');
    setPreviewFile(null, setAlbumCoverFile, setAlbumCoverPreview);
  };

  const resetSongForm = () => {
    setSongStep(1);
    setSongTitle('');
    setSongGenre('');
    setSongPrice('1');
    setSongCopies('100');
    setSelectedAlbumId('none');
    setSongFile(null);
    setSongDuration(null);
    setPreviewFile(null, setSongCoverFile, setSongCoverPreview);
  };

  const uploadCover = async (file: File | null) => {
    if (!file) return '/logo.svg';
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/studio/upload/cover', {
      method: 'POST',
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok || !payload.url) {
      throw new Error(payload.error || 'Cover upload failed');
    }
    return payload.url as string;
  };

  const loadMySongs = async (query = '') => {
    if (!artistName) {
      setMySongs([]);
      return;
    }
    setIsLoadingMySongs(true);
    try {
      const response = await fetch(
        `/api/studio/songs?artist=${encodeURIComponent(artistName)}&q=${encodeURIComponent(
          query,
        )}`,
      );
      const payload = await response.json();
      setMySongs(Array.isArray(payload.songs) ? payload.songs : []);
    } catch (error) {
      console.error(error);
      setMySongs([]);
    } finally {
      setIsLoadingMySongs(false);
    }
  };

  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const response = await fetch('/api/market/albums');
        const payload = await response.json();
        if (Array.isArray(payload.albums)) {
          setAlbums(
            payload.albums.map((album: any) => ({
              id: album.id,
              title: album.title,
              artist: album.artist,
            })),
          );
        }
      } finally {
        setIsLoadingAlbums(false);
      }
    };
    void loadAlbums();
  }, []);

  useEffect(() => {
    void loadMySongs(mySongsQuery);
  }, [artistName]);

  useEffect(() => {
    return () => {
      if (albumCoverPreview.startsWith('blob:'))
        URL.revokeObjectURL(albumCoverPreview);
      if (songCoverPreview.startsWith('blob:'))
        URL.revokeObjectURL(songCoverPreview);
    };
  }, [albumCoverPreview, songCoverPreview]);

  const handleCreateAlbum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isWalletConnected || !artistName) {
      setStatus('Connect your wallet before creating albums.');
      return;
    }
    setIsCreatingAlbum(true);
    setStatus('Creating album...');
    try {
      const cover = await uploadCover(albumCoverFile);
      const album = await createAlbum({
        title: albumTitle.trim(),
        artist: artistName,
        genre: albumGenre.trim(),
        cover,
        releaseDate: new Date(),
      });
      setAlbums((prev) => [album, ...prev]);
      setSelectedAlbumId(String(album.id));
      setStatus(`Album "${album.title}" created.`);
      setIsAlbumDialogOpen(false);
      resetAlbumForm();
    } catch (error) {
      console.error(error);
      setStatus('Failed to create album.');
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const handleCreateSong = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isWalletConnected || !artistName) {
      setStatus('Connect your wallet before minting songs.');
      return;
    }
    if (!songFile) {
      setStatus('Select an MP3 file to upload.');
      return;
    }
    if (!songFile.name.toLowerCase().endsWith('.mp3')) {
      setStatus('Only MP3 files are allowed.');
      return;
    }

    setIsCreatingSong(true);
    setStatus('Uploading track and creating song...');
    try {
      const cover = await uploadCover(songCoverFile);
      const uploadFormData = new FormData();
      uploadFormData.append('file', songFile);
      const uploadResponse = await fetch('/api/studio/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      const uploadPayload = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadPayload.url) {
        throw new Error(uploadPayload.error || 'Audio upload failed');
      }

      const duration =
        songDuration ?? (await getAudioDurationInSeconds(songFile));
      const songId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.round(Math.random() * 100000)}`;

      const createdSong = await createSong({
        id: songId,
        title: songTitle.trim(),
        artist: artistName,
        genre: songGenre.trim(),
        length: duration,
        releaseDate: new Date(),
        cid: uploadPayload.url,
        cover,
        albumId:
          selectedAlbumId !== 'none' ? Number(selectedAlbumId) : undefined,
        price: songPrice.trim(),
        copies: Number(songCopies),
        owner: address,
      });

      setSessionUploads((prev) => [
        {
          ...createdSong,
          releaseDate: new Date(createdSong.releaseDate).toISOString(),
        } as UploadedSong,
        ...prev,
      ]);

      setStatus(`Song "${createdSong.title}" minted and listed.`);
      setIsSongDialogOpen(false);
      resetSongForm();
      await Promise.all([
        loadMySongs(mySongsQuery),
        queryClient.invalidateQueries({ queryKey: ['userLibrary', address] }),
      ]);
    } catch (error) {
      console.error(error);
      setStatus('Failed to create song listing.');
    } finally {
      setIsCreatingSong(false);
    }
  };

  return (
    <div className='w-full max-w-full overflow-x-hidden space-y-4 pt-4 pb-2'>
      <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4'>
        <p className='text-xs tracking-[0.25em] text-zinc-400 uppercase'>
          Studio
        </p>
        <h2 className='text-2xl font-semibold text-white'>Create & Mint</h2>
        <div className='mt-3 rounded-lg border border-zinc-800 bg-black/50 p-3 text-xs text-zinc-300'>
          <div className='flex items-center gap-2 text-zinc-100'>
            <UserRound className='h-4 w-4 text-orange-400' />
            <span>Artist Name</span>
          </div>
          <p className='mt-1 text-zinc-200'>{artistName || 'Not available'}</p>
          <p className='mt-1 break-all text-zinc-500'>
            {address || 'No wallet'}
          </p>
        </div>
      </section>

      <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4'>
        <div className='mb-3 flex items-center gap-2'>
          <Sparkles className='h-4 w-4 text-orange-400' />
          <h3 className='text-base font-semibold text-white'>
            Release Actions
          </h3>
        </div>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <button
            type='button'
            onClick={() => {
              setAlbumStep(1);
              setIsAlbumDialogOpen(true);
            }}
            className='group rounded-xl border border-zinc-800 bg-black/40 p-4 text-left transition hover:border-orange-400/50'
          >
            <p className='text-sm font-semibold text-white'>Create Album</p>
            <p className='mt-1 text-xs text-zinc-400'>
              2-step form + cover upload
            </p>
            <Disc3 className='mt-2 h-5 w-5 text-orange-400 transition group-hover:scale-110' />
          </button>
          <button
            type='button'
            onClick={() => {
              setSongStep(1);
              setIsSongDialogOpen(true);
            }}
            className='group rounded-xl border border-zinc-800 bg-black/40 p-4 text-left transition hover:border-pink-400/50'
          >
            <p className='text-sm font-semibold text-white'>Mint Song</p>
            <p className='mt-1 text-xs text-zinc-400'>
              2-step form + auto length/date
            </p>
            <PlusCircle className='mt-2 h-5 w-5 text-pink-400 transition group-hover:scale-110' />
          </button>
        </div>
      </section>

      <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4'>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <Tag className='h-4 w-4 text-orange-400' />
            <h3 className='text-base font-semibold text-white'>Your Songs</h3>
          </div>
          <Button
            type='button'
            variant='outline'
            className='h-8'
            onClick={() => void loadMySongs(mySongsQuery)}
            disabled={!isWalletConnected || isLoadingMySongs}
          >
            Refresh
          </Button>
        </div>

        <div className='grid grid-cols-1 gap-2 sm:grid-cols-3 mb-3'>
          <StatCard
            icon={<Music2 className='h-3.5 w-3.5 text-pink-400' />}
            label='Songs'
            value={uploadedSongs.length}
          />
          <StatCard
            icon={<Layers3 className='h-3.5 w-3.5 text-orange-400' />}
            label='Total Copies'
            value={totalCopies}
          />
          <StatCard
            icon={<Coins className='h-3.5 w-3.5 text-yellow-400' />}
            label='Potential Value'
            value={totalPotential}
          />
        </div>

        <div className='flex flex-col gap-2 sm:flex-row'>
          <Input
            placeholder='Filter by title, genre, or id'
            value={mySongsQuery}
            onChange={(event) => setMySongsQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void loadMySongs(mySongsQuery);
              }
            }}
          />
          <Button
            type='button'
            className='sm:w-auto bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
            onClick={() => void loadMySongs(mySongsQuery)}
            disabled={!isWalletConnected || isLoadingMySongs}
          >
            Search
          </Button>
        </div>

        <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {!isWalletConnected ? (
            <p className='text-sm text-zinc-400'>
              Connect wallet to view songs.
            </p>
          ) : isLoadingMySongs ? (
            <p className='text-sm text-zinc-400'>Loading your uploads...</p>
          ) : uploadedSongs.length === 0 ? (
            <p className='text-sm text-zinc-400'>
              No songs found for this artist profile.
            </p>
          ) : (
            uploadedSongs.map((song) => (
              <article
                key={song.id}
                className='rounded-xl border border-zinc-800 bg-black/50 p-3'
              >
                <div className='flex gap-3'>
                  <img
                    src={song.cover || '/logo.svg'}
                    alt={song.title}
                    className='h-16 w-16 rounded-md border border-zinc-700 object-cover'
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-semibold text-white'>
                      {song.title}
                    </p>
                    <p className='text-xs text-zinc-400'>{song.artist}</p>
                    <p className='mt-1 text-xs text-zinc-300'>
                      {song.genre} | Price {song.price} | Copies {song.copies}
                    </p>
                    <p className='text-[11px] text-zinc-500'>
                      {formatReleaseDate(song.releaseDate)}
                    </p>
                    {/* <p className='mt-1 break-all text-[11px] text-zinc-500'>
                      {song.cid}
                    </p> */}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <div className='rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300 break-words'>
        {status ? (
          <p className='text-orange-300'>{status}</p>
        ) : (
          'Ready to mint.'
        )}
      </div>

      <Drawer
        open={isAlbumDialogOpen}
        onOpenChange={(open) => {
          setIsAlbumDialogOpen(open);
          if (!open) resetAlbumForm();
        }}
      >
        <DrawerContent className='fixed -top-15 bg-secondary rounded-t-xl px-6 z-999 border-none text-white'>
          <DrawerHeader>
            <DrawerTitle className='text-white'>Create Album</DrawerTitle>
            <DrawerDescription className='text-white'>
              Step {albumStep} of 2
            </DrawerDescription>
          </DrawerHeader>
          <form className='space-y-3 px-4 pb-4' onSubmit={handleCreateAlbum}>
            {albumStep === 1 ? (
              <>
                <Field label='Album Title' htmlFor='album-title'>
                  <Input
                    id='album-title'
                    className='text-white'
                    required
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                  />
                </Field>
                <Field label='Genre' htmlFor='album-genre'>
                  <Input
                    className='text-white'
                    id='album-genre'
                    required
                    value={albumGenre}
                    onChange={(e) => setAlbumGenre(e.target.value)}
                  />
                </Field>
                <Field label='Cover Upload' htmlFor='album-cover-upload'>
                  <FileUploadButton
                    id='album-cover-upload'
                    accept='image/png,image/jpeg,image/webp,image/gif'
                    file={albumCoverFile}
                    emptyLabel='Upload cover image'
                    filledLabel='Cover image selected'
                    onFileSelect={(file) =>
                      setPreviewFile(
                        file,
                        setAlbumCoverFile,
                        setAlbumCoverPreview,
                      )
                    }
                  />
                </Field>
                <img
                  src={albumCoverPreview}
                  alt='Album cover preview'
                  className='h-20 w-20 rounded-md border border-zinc-700 object-cover'
                />
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    className='bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                    disabled={!canAdvanceAlbumStep1}
                    onClick={() => setAlbumStep(2)}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm space-y-1'>
                  <p className='text-zinc-300'>Title: {albumTitle}</p>
                  <p className='text-zinc-300'>Genre: {albumGenre}</p>
                  <p className='text-zinc-300'>Artist: {artistName}</p>
                  <p className='text-zinc-400'>Release Date: auto on upload</p>
                </div>
                <div className='flex justify-between gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setAlbumStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type='submit'
                    className='bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                    disabled={!isWalletConnected || isCreatingAlbum}
                  >
                    {isCreatingAlbum ? 'Creating album...' : 'Create Album'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={isSongDialogOpen}
        onOpenChange={(open) => {
          setIsSongDialogOpen(open);
          if (!open) resetSongForm();
        }}
      >
        <DrawerContent className='fixed -top-15 bg-secondary rounded-t-xl px-6 z-999 border-none text-white'>
          <DrawerHeader>
            <DrawerTitle className='text-white'>Mint Song Listing</DrawerTitle>
            <DrawerDescription className='text-white'>
              Step {songStep} of 2
            </DrawerDescription>
          </DrawerHeader>
          <form className='space-y-3 px-4 pb-4' onSubmit={handleCreateSong}>
            {songStep === 1 ? (
              <>
                <Field label='Song Title' htmlFor='song-title'>
                  <Input
                    id='song-title'
                    required
                    className='text-white'
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                  />
                </Field>
                <Field label='Genre' htmlFor='song-genre'>
                  <Input
                    id='song-genre'
                    required
                    className='text-white'
                    value={songGenre}
                    onChange={(e) => setSongGenre(e.target.value)}
                  />
                </Field>
                <Field label='Album'>
                  <Select
                    value={selectedAlbumId}
                    onValueChange={setSelectedAlbumId}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select album' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>Single (no album)</SelectItem>
                      {albums.map((album) => (
                        <SelectItem
                          key={album.id}
                          value={String(album.id)}
                          className='text-white'
                        >
                          {album.title} - {album.artist}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className='grid grid-cols-2 gap-3'>
                  <Field label='Price' htmlFor='song-price'>
                    <Input
                      id='song-price'
                      required
                      type='number'
                      className='text-white'
                      min='1'
                      value={songPrice}
                      onChange={(e) => setSongPrice(e.target.value)}
                    />
                  </Field>
                  <Field label='Copies' htmlFor='song-copies'>
                    <Input
                      id='song-copies'
                      required
                      type='number'
                      min='1'
                      value={songCopies}
                      onChange={(e) => setSongCopies(e.target.value)}
                    />
                  </Field>
                </div>
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    className='bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                    disabled={!canAdvanceSongStep1}
                    onClick={() => setSongStep(2)}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Field label='MP3 Upload' htmlFor='song-file'>
                  <FileUploadButton
                    id='song-file'
                    accept='.mp3,audio/mpeg'
                    file={songFile}
                    emptyLabel='Upload MP3 track'
                    filledLabel='MP3 track selected'
                    onFileSelect={async (file) => {
                      setSongFile(file);
                      if (!file) return setSongDuration(null);
                      try {
                        setSongDuration(await getAudioDurationInSeconds(file));
                      } catch {
                        setSongDuration(null);
                        setStatus('Could not read audio duration.');
                      }
                    }}
                  />
                </Field>
                <Field label='Cover Upload' htmlFor='song-cover-upload'>
                  <FileUploadButton
                    id='song-cover-upload'
                    accept='image/png,image/jpeg,image/webp,image/gif'
                    file={songCoverFile}
                    emptyLabel='Upload song cover'
                    filledLabel='Song cover selected'
                    onFileSelect={(file) =>
                      setPreviewFile(
                        file,
                        setSongCoverFile,
                        setSongCoverPreview,
                      )
                    }
                  />
                </Field>
                <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm space-y-1'>
                  <p className='flex items-center gap-2 text-zinc-300'>
                    <UserRound className='h-4 w-4 text-orange-400' />{' '}
                    {artistName}
                  </p>
                  <p className='flex items-center gap-2 text-zinc-300'>
                    <AudioLines className='h-4 w-4 text-pink-400' />{' '}
                    {songDuration ? `${songDuration}s` : 'Duration pending'}
                  </p>
                  <p className='text-zinc-400'>Release Date: auto on upload</p>
                  <img
                    src={songCoverPreview}
                    alt='Song cover preview'
                    className='h-14 w-14 rounded-md border border-zinc-700 object-cover'
                  />
                </div>
                <div className='flex justify-between gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setSongStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type='submit'
                    className='bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                    disabled={
                      !isWalletConnected || isCreatingSong || isLoadingAlbums
                    }
                  >
                    {isCreatingSong ? 'Publishing...' : 'Mint Song Listing'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-1'>
      <Label htmlFor={htmlFor} className='text-white'>
        {label}
      </Label>
      {children}
    </div>
  );
}

function FileUploadButton({
  id,
  accept,
  file,
  emptyLabel,
  filledLabel,
  onFileSelect,
}: {
  id: string;
  accept: string;
  file: File | null;
  emptyLabel: string;
  filledLabel: string;
  onFileSelect: (file: File | null) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasFile = Boolean(file);

  return (
    <div className='space-y-2'>
      <input
        id={id}
        ref={inputRef}
        type='file'
        accept={accept}
        className='hidden'
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] ?? null;
          void onFileSelect(selectedFile);
          event.currentTarget.value = '';
        }}
      />
      <Button
        type='button'
        variant='outline'
        className={`w-full justify-start ${
          hasFile
            ? 'border-orange-500/70 bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
            : 'border-zinc-700 bg-zinc-900/60 text-white hover:bg-zinc-800'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {hasFile ? filledLabel : emptyLabel}
      </Button>
      <p
        className={`text-xs break-all ${hasFile ? 'text-orange-200' : 'text-zinc-400'}`}
      >
        {hasFile ? file?.name : 'No file selected'}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className='rounded-lg border border-zinc-800 bg-black/40 p-3'>
      <div className='flex items-center gap-1 text-zinc-400 text-xs'>
        {icon}
        {label}
      </div>
      <p className='mt-1 text-lg font-semibold text-white'>{value}</p>
    </div>
  );
}
