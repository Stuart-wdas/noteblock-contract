'use client';

import { createStreamSession, setUserPreferences } from '@/actions/userActions';
import {
  addSongToPlaylist,
  removeSongFromPlaylist,
} from '@/actions/musicActions';
import { useWallet } from './StarknetProvider';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
  useMemo,
} from 'react';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string | any;
  url: string;
  genre: string;
  cover: string;
  releaseDate?: string | Date;
  price?: string;
  copies?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  genre: string;
  cover: string;
  songs: Song[];
  releaseDate: string;
}

export interface PlaylistCollection extends Album {
  playlistId: number;
  isPublic?: boolean;
  createdAt?: string | Date;
}

export enum Playstyle {
  Shuffle,
  Loop,
  Play,
  Discover,
}
export type IndexedSong = Song & { index: number };

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(value, 0), 1);
}

function detectBrowserVolume() {
  if (typeof window === 'undefined') return 1;
  try {
    const probe = new Audio();
    return clampVolume(probe.volume);
  } catch {
    return 1;
  }
}

interface AudioPlayerContextType {
  currentSong: Song | null;
  queue: IndexedSong[];
  isPlaying: boolean;
  currentVolume: number;
  playstyle: Playstyle;
  reorderQueue: (newOrder: IndexedSong[]) => void;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  volume: (volume: number) => void;
  next: () => void;
  previous: () => void;
  addToQueue: (song: Song | Song[]) => void;
  removeFromQueue: (song: Song) => void;
  playPlaylist: (songs: Song[]) => void;
  shufflePlaylist: (songs: Song[]) => void;
  addToPlayList: (playlistId: number, song: Song | Song[]) => void;
  setPlayStyle: (input: string) => void;
  removeFromPlaylist: (playlistId: number, songId: string) => void;
  libraryView?: {
    flattened: Array<{ type: string; data: any }>;
    partitioned: {
      songs: Song[];
      albums: Album[];
      artists: { name: string; image: string }[];
      genres: string[];
      playlists: PlaylistCollection[];
      recentlyAdded: Song[] | Album[];
      ownedSongIds: Set<string>;
    };
  };
}

interface AudioProgressContextType {
  currentTime: number;
  duration: number;
  seek: (time: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(
  undefined,
);
const AudioProgressContext = createContext<
  AudioProgressContextType | undefined
>(undefined);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context)
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return context;
};

export const useAudioProgress = () => {
  const context = useContext(AudioProgressContext);
  if (!context) {
    throw new Error('useAudioProgress must be used within AudioPlayerProvider');
  }
  return context;
};

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const browserVolumeRef = useRef(detectBrowserVolume());
  const [currentSong, setCurrentSong] = useState<IndexedSong | null>(null);
  const [queue, setQueue] = useState<IndexedSong[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState<Song[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playstyle, setPlaystyle] = useState<Playstyle>(Playstyle.Shuffle);
  const [libraryView, setLibraryView] =
    useState<AudioPlayerContextType['libraryView']>();
  const [currentVolume, setVolume] = useState(browserVolumeRef.current);
  const lastReportedTimeRef = useRef(0);

  const { library, address } = useWallet();
  const resolveSongUrl = (cid?: string) => {
    if (!cid) return '';
    if (
      cid.startsWith('http://') ||
      cid.startsWith('https://') ||
      cid.startsWith('/')
    ) {
      return cid;
    }
    return `/songs/${cid}`;
  };

  // Hydrate user library into queue and partitioned libraryView
  useEffect(() => {
    if (!library) return;

    const songsById = new Map<string, any>();
    const playlists = library.playlists || [];
    const tokenOwnershipRows = library.tokenOwnerships || [];
    const uploadedSongs = library.uploadedSongs || [];
    const normalizedPlaylists: PlaylistCollection[] = [];

    const addSong = (rawSong: any) => {
      if (!rawSong?.id || songsById.has(rawSong.id)) return;

      songsById.set(rawSong.id, {
        id: rawSong.id,
        title: rawSong.title,
        artist: rawSong.artist,
        album: rawSong.album?.title ?? '',
        albumObj: rawSong.album ?? null,
        url: resolveSongUrl(rawSong.cid),
        genre: rawSong.genre,
        cover: rawSong.cover,
        releaseDate: rawSong.releaseDate,
        price: rawSong.price,
        copies: rawSong.copies,
      });
    };

    playlists.forEach((playlist: any) => {
      const playlistSongsRaw = (
        Array.isArray(playlist.songs)
          ? playlist.songs
          : Array.isArray(playlist.playlistItems)
            ? playlist.playlistItems.map((item: any) => item.song)
            : Array.isArray(playlist.tracks)
              ? playlist.tracks
              : []
      ).filter(Boolean);

      playlistSongsRaw.forEach((song: any) => addSong(song));
      const playlistSongs = playlistSongsRaw
        .map((song: any) => songsById.get(song.id))
        .filter(Boolean);

      normalizedPlaylists.push({
        id: String(playlist.id ?? `playlist-${normalizedPlaylists.length}`),
        playlistId: Number(playlist.playlistId ?? playlist.id ?? 0),
        title: playlist.title ?? 'Untitled Playlist',
        artist:
          playlist.artist ??
          library?.user?.displayName?.trim() ??
          library?.user?.contractAddress ??
          'You',
        genre: playlist.genre ?? 'Playlist',
        cover: playlist.cover ?? playlistSongs[0]?.cover ?? '/logo.svg',
        songs: playlistSongs,
        releaseDate:
          playlist.releaseDate ??
          playlist.createdAt?.toISOString?.() ??
          new Date().toISOString(),
        isPublic: playlist.isPublic,
        createdAt: playlist.createdAt,
      });
    });

    uploadedSongs.forEach((song: any) => {
      addSong(song);
    });

    tokenOwnershipRows.forEach((row: any) => {
      addSong(row.song);
    });

    const allSongs = Array.from(songsById.values());

    // Partitioned library
    const songs: Song[] | any[] = allSongs;
    const albumsMap = new Map<string, Album | any>();
    const genresSet = new Set<string>();
    const artistsMap = new Map<string, string>(); // artist name -> image

    songs.forEach((song) => {
      artistsMap.set(song.artist, song.cover);
      genresSet.add(song.genre);

      const album = song.albumObj;
      if (album && !albumsMap.has(album.id)) {
        albumsMap.set(album.id, {
          id: album.id,
          title: album.title,
          artist: album.artist,
          genre: album.genre,
          cover: album.cover,
          releaseDate: album.releaseDate,
          songs: [],
        });
      }

      if (album) {
        albumsMap.get(album.id)?.songs.push(song);
      }
    });

    const albums = Array.from(albumsMap.values());
    const artists = Array.from(artistsMap.entries()).map(([name, image]) => ({
      name,
      image,
    }));
    const genres = Array.from(genresSet);
    const recentlyAdded: any = [...songs]
      .sort((a: any, b: any) => {
        const aTime = new Date(a.releaseDate ?? 0).getTime();
        const bTime = new Date(b.releaseDate ?? 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 10);

    setLibraryView({
      flattened: [
        ...songs.map((s) => ({ type: 'song', data: s })),
        ...albums.map((a) => ({ type: 'album', data: a })),
        ...artists.map((a) => ({ type: 'artist', data: a })),
        ...genres.map((g) => ({ type: 'genre', data: g })),
        ...normalizedPlaylists.map((p) => ({ type: 'playlist', data: p })),
      ],
      partitioned: {
        songs,
        albums,
        artists,
        genres,
        playlists: normalizedPlaylists,
        recentlyAdded,
        ownedSongIds: new Set(songs.map((song) => song.id)),
      },
    });
    // ...existing code...

    if (songs.length > 0 && !currentSong) {
      const indexedSongs: IndexedSong[] = songs.map((s, i) => ({
        ...s,
        index: i,
      }));
      setQueue(indexedSongs);
      // setCurrentSong(indexedSongs[0]);
      if (!audioRef.current) audioRef.current = new Audio(indexedSongs[0].url);
    }
  }, [library]);

  const reorderQueue = useCallback(
    (newOrder: IndexedSong[]) => {
      if (!currentSong) {
        setQueue(newOrder);
        return;
      }

      setQueue(newOrder.filter((song) => song.id !== currentSong.id));
    },
    [currentSong],
  );

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    lastReportedTimeRef.current = time;
    setCurrentTime(time);
  }, []);

  const volume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    const normalizedVolume = clampVolume(volume);
    audioRef.current.volume = normalizedVolume;
    setVolume(normalizedVolume);
  }, []);

  const playAudio = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (error instanceof DOMException && error.name === 'NotAllowedError')
        return;
      console.error('Audio play failed:', error);
    }
  }, []);

  const next = useCallback(() => {
    if (!audioRef.current) return;
    if (playstyle === Playstyle.Loop && currentSong) {
      audioRef.current!.currentTime = 0;
      void playAudio();
      return;
    }

    if (!queue.length) {
      audioRef.current!.pause();
      setCurrentSong(null);
      setQueue([]);
      return;
    }

    const nextIndex =
      playstyle === Playstyle.Shuffle
        ? Math.floor(Math.random() * queue.length)
        : 0;
    const nextSong = queue[nextIndex];

    setQueue((previousQueue) =>
      previousQueue.filter((_, index) => index !== nextIndex),
    );
    if (currentSong) setHistory((prev) => [...prev, currentSong]);
    setCurrentSong(nextSong);
    audioRef.current.src = nextSong.url;
    void playAudio();
  }, [currentSong, playAudio, playstyle, queue]);

  // Audio events
  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    const initialVolume = clampVolume(
      Number.isFinite(audio.volume) ? audio.volume : browserVolumeRef.current,
    );

    if (audio.volume !== initialVolume) {
      audio.volume = initialVolume;
    }
    if (initialVolume !== currentVolume) {
      setVolume(initialVolume);
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      const nextTime = audio.currentTime;
      if (Math.abs(nextTime - lastReportedTimeRef.current) < 0.25) return;
      lastReportedTimeRef.current = nextTime;
      setCurrentTime(nextTime);
    };
    const handleLoadedMetadata = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(nextDuration);
    };
    const handleEnded = () => next();

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [next]);

  const playSong = useCallback(
    async (song: Song) => {
      if (!audioRef.current) return;

      if (!currentSong || currentSong.id !== song.id) {
        if (currentSong) setHistory((prev) => [...prev, currentSong]);
        setCurrentSong({ ...song, index: 0 });
        audioRef.current.src = song.url;

        setQueue((previousQueue) => {
          const filteredQueue = previousQueue.filter(
            (queuedSong) => queuedSong.id !== song.id,
          );
          return filteredQueue.length === previousQueue.length
            ? previousQueue
            : filteredQueue;
        });
      }

      void playAudio();
      setIsPlaying(true);

      if (!address) return;

      try {
        await createStreamSession({
          userId: address,
          songId: song.id,
          device: navigator.userAgent,
        });
      } catch (err) {
        console.error('Stream session failed:', err);
      }
    },
    [address, currentSong, playAudio],
  );

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) void playAudio();
    else audioRef.current.pause();
  }, [playAudio]);

  const previous = useCallback(() => {
    if (!audioRef.current || !currentSong) return;

    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    if (!history.length) {
      audioRef.current.currentTime = 0;
      return;
    }

    const prevSong = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCurrentSong({ ...prevSong, index: 0 });
    audioRef.current.src = prevSong.url;
    void playAudio();
    setIsPlaying(true);
  }, [currentSong, history, playAudio]);

  const addToQueue = useCallback(
    (input: Song | Song[]) => {
      const songsToAdd = Array.isArray(input) ? input : [input];
      setQueue((prevQueue) => {
        const normalizedQueue = prevQueue.filter(
          (queuedSong) => queuedSong.id !== currentSong?.id,
        );
        const currentQueueIds = new Set(normalizedQueue.map((song) => song.id));
        const songsToInsert = songsToAdd.filter(
          (song) =>
            song.id !== currentSong?.id && !currentQueueIds.has(song.id),
        );

        if (!songsToInsert.length) return normalizedQueue;

        const indexedSongs: IndexedSong[] = songsToInsert.map((song, i) => ({
          ...song,
          index: normalizedQueue.length + i,
        }));

        return [...indexedSongs, ...normalizedQueue];
      });
    },
    [currentSong?.id],
  );

  const removeFromQueue = useCallback((input: Song) => {
    setQueue((prevQueue) => prevQueue.filter((song) => song.id !== input.id));
  }, []);

  useEffect(() => {
    if (!currentSong) return;

    setQueue((previousQueue) => {
      const filteredQueue = previousQueue.filter(
        (song) => song.id !== currentSong.id,
      );
      return filteredQueue.length === previousQueue.length
        ? previousQueue
        : filteredQueue;
    });
  }, [currentSong?.id]);

  const playPlaylist = useCallback(
    (songs: Song[]) => {
      if (!songs.length || !audioRef.current) return;

      const indexedSongs: IndexedSong[] = songs.map((s, i) => ({
        ...s,
        index: i,
      }));
      setQueue(indexedSongs.slice(1));
      setCurrentSong(indexedSongs[0]);
      audioRef.current.src = indexedSongs[0].url;
      void playAudio();
      setIsPlaying(true);
    },
    [playAudio],
  );

  const shufflePlaylist = useCallback(
    (songs: Song[]) => {
      if (!songs.length) return;
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playPlaylist(shuffled);
    },
    [playPlaylist],
  );

  const addToPlayList = useCallback(
    async (playlistId: number, songs: Song | Song[]) => {
      const songsToAdd = Array.isArray(songs) ? songs : [songs];
      for (const song of songsToAdd) {
        try {
          await addSongToPlaylist({ playlistId, songId: song.id });
        } catch (err) {
          console.error(`Failed to add ${song.title} to playlist`, err);
        }
      }
    },
    [],
  );

  const removeFromPlaylist = useCallback(
    async (playlistId: number, songId: string) => {
      try {
        await removeSongFromPlaylist(playlistId, songId);
      } catch (err) {
        console.error('Failed to remove song from playlist:', err);
      }
    },
    [],
  );

  const setPlayStyle = useCallback(
    async (input: string) => {
      const normalized =
        input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
      const key = normalized as keyof typeof Playstyle;

      if (key in Playstyle) {
        setPlaystyle(Playstyle[key]);
        if (!address) return;
        try {
          await setUserPreferences({ userId: address, playstyle: normalized });
        } catch (err) {
          console.warn('Failed to sync playstyle:', err);
        }
      } else console.warn(`Invalid playstyle: ${input}`);
    },
    [address],
  );

  const audioProgressValue = useMemo(
    () => ({
      currentTime,
      duration,
      seek,
    }),
    [currentTime, duration, seek],
  );

  const audioPlayerValue = useMemo(
    () => ({
      playstyle,
      currentSong,
      queue,
      isPlaying,
      addToPlayList,
      removeFromPlaylist,
      playSong,
      togglePlay,
      next,
      previous,
      addToQueue,
      removeFromQueue,
      playPlaylist,
      shufflePlaylist,
      currentVolume,
      volume,
      reorderQueue,
      setPlayStyle,
      libraryView,
    }),
    [
      playstyle,
      currentSong,
      queue,
      isPlaying,
      addToPlayList,
      removeFromPlaylist,
      playSong,
      togglePlay,
      next,
      previous,
      addToQueue,
      removeFromQueue,
      playPlaylist,
      shufflePlaylist,
      currentVolume,
      volume,
      reorderQueue,
      setPlayStyle,
      libraryView,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={audioPlayerValue}>
      <AudioProgressContext.Provider value={audioProgressValue}>
        {children}
      </AudioProgressContext.Provider>
    </AudioPlayerContext.Provider>
  );
};
