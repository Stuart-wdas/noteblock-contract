'use client';

import {createStreamSession, setUserPreferences} from '@/actions/userActions';
import {
  addSongToPlaylist,
  removeSongFromPlaylist,
} from '@/actions/musicActions';
import {useWallet} from './StarknetProvider';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string | any;
  url: string;
  genre: string;
  cover: string;
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

export enum Playstyle {
  Shuffle,
  Loop,
  Play,
  Discover,
}
export type IndexedSong = Song & {index: number};

interface AudioPlayerContextType {
  currentSong: Song | null;
  queue: IndexedSong[];
  isPlaying: boolean;
  currentTime: number;
  currentVolume: number;
  duration: number;
  playstyle: Playstyle;
  reorderQueue: (newOrder: IndexedSong[]) => void;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
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
    flattened: Array<{type: string; data: any}>;
    partitioned: {
      songs: Song[];
      albums: Album[];
      artists: {name: string; image: string}[];
      genres: string[];
      playlists: any[];
      recentlyAdded: Song[];
    };
  };
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(
  undefined
);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context)
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return context;
};

export const AudioPlayerProvider = ({children}: {children: ReactNode}) => {
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentVolume, setVolume] = useState(1);

  const {library, address} = useWallet();

  // Hydrate user library into queue and partitioned libraryView
  useEffect(() => {
    if (!library) return;

    const allSongs: any[] = [];

    // Flatten playlists & token ownership
    const playlists = library.playlists || [];
    const tokenSongs =
      library.tokenOwnerships?.map((t: any) => {
        console.log(t);
        return {albumId: t.song.album.title, ...t.song};
      }) || [];

    playlists.forEach((playlist: any) => {
      playlist.playlistItems.forEach((item: any) => {
        allSongs.push({
          id: item.song.id,
          title: item.song.title,
          artist: item.song.artist,
          album: item.song.album?.title ?? '', // for display
          albumObj: item.song.album, // for partitioning
          url: `/songs/${item.song.cid}`,
          genre: item.song.genre,
          cover: item.song.cover,
        });
      });
    });

    tokenSongs.forEach((song: any) => {
      if (!allSongs.find((s) => s.id === song.id)) {
        allSongs.push({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album?.title ?? '',
          albumObj: song.album,
          url: `${song.cid}`,
          genre: song.genre,
          cover: song.cover,
        });
      }
    });

    // Partitioned library
    const songs: Song[] | any[] = allSongs;
    const albumsMap = new Map<string, Album | any>();
    const genresSet = new Set<string>();
    const artistsSet = new Set<string>();
    // ...existing code...
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
    const recentlyAdded = songs.slice(-10).reverse();

    setLibraryView({
      flattened: [
        ...songs.map((s) => ({type: 'song', data: s})),
        ...albums.map((a) => ({type: 'album', data: a})),
        ...artists.map((a) => ({type: 'artist', data: a})),
        ...genres.map((g) => ({type: 'genre', data: g})),
        ...playlists.map((p: any) => ({type: 'playlist', data: p})),
      ],
      partitioned: {songs, albums, artists, genres, playlists, recentlyAdded},
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

  // Audio events
  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => next(); // <-- key fix

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded); // <-- bind ended

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded); // <-- cleanup
    };
  });

  const reorderQueue = useCallback(
    (newOrder: IndexedSong[]) => {
      setQueue(newOrder);
      if (!newOrder.find((s) => s.id === currentSong?.id)) {
        setCurrentSong(newOrder[0] ?? null);
      }
    },
    [currentSong]
  );

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const volume = (volume: number) => {
    audioRef.current!.volume = volume;
    setVolume(volume);
  };

  const playSong = async (song: Song) => {
    if (!audioRef.current) return;

    console.log(audioRef.current.ended);

    if (!currentSong || currentSong.id !== song.id) {
      if (currentSong) setHistory((prev) => [...prev, currentSong]);
      setCurrentSong({...song, index: 0});

      audioRef.current.src = song.url;
    }

    audioRef.current.play();
    setIsPlaying(true);

    try {
      await createStreamSession({
        userId: address,
        songId: song.id,
        device: navigator.userAgent,
      });
    } catch (err) {
      console.error('Stream session failed:', err);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) audioRef.current.play();
    else audioRef.current.pause();
  };

  const next = () => {
    if (!queue.length) return;

    if (playstyle === Playstyle.Loop) {
      audioRef.current!.currentTime = 0;
      audioRef.current!.play();
      return;
    }

    let newIndex;
    if (playstyle === Playstyle.Shuffle) {
      newIndex = Math.floor(Math.random() * queue.length);
    } else {
      newIndex = (currentIndex + 1) % queue.length;
    }

    setCurrentIndex(newIndex);
    const nextSong = queue[newIndex];
    setCurrentSong(nextSong);
    audioRef.current!.src = nextSong.url;
    audioRef.current!.play();
  };

  const previous = () => {
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
    setCurrentSong({...prevSong, index: 0});
    audioRef.current.src = prevSong.url;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const addToQueue = (input: Song | Song[]) => {
    const songsToAdd = Array.isArray(input) ? input : [input];
    setQueue((prevQueue) => {
      const startIndex = prevQueue.length;
      const indexedSongs: IndexedSong[] = songsToAdd.map((song, i) => ({
        ...song,
        index: startIndex + i,
      }));
      return [...prevQueue, ...indexedSongs];
    });
  };

  const removeFromQueue = (input: Song) => {
    setQueue((prevQueue) => prevQueue.filter((song) => song.id !== input.id));
  };

  const playPlaylist = (songs: Song[]) => {
    if (!songs.length || !audioRef.current) return;

    const indexedSongs: IndexedSong[] = songs.map((s, i) => ({
      ...s,
      index: i,
    }));
    setQueue(indexedSongs.slice(1));
    setCurrentSong(indexedSongs[0]);
    audioRef.current.src = indexedSongs[0].url;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const shufflePlaylist = (songs: Song[]) => {
    if (!songs.length) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playPlaylist(shuffled);
  };

  const addToPlayList = async (playlistId: number, songs: Song | Song[]) => {
    const songsToAdd = Array.isArray(songs) ? songs : [songs];
    for (const song of songsToAdd) {
      try {
        await addSongToPlaylist({playlistId, songId: song.id});
      } catch (err) {
        console.error(`Failed to add ${song.title} to playlist`, err);
      }
    }
  };

  const removeFromPlaylist = async (playlistId: number, songId: string) => {
    try {
      await removeSongFromPlaylist(playlistId, songId);
    } catch (err) {
      console.error('Failed to remove song from playlist:', err);
    }
  };

  const setPlayStyle = async (input: string) => {
    const normalized =
      input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
    const key = normalized as keyof typeof Playstyle;

    if (key in Playstyle) {
      setPlaystyle(Playstyle[key]);
      try {
        await setUserPreferences({userId: address, playstyle: normalized});
      } catch (err) {
        console.warn('Failed to sync playstyle:', err);
      }
    } else console.warn(`Invalid playstyle: ${input}`);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
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
        currentTime,
        currentVolume,
        volume,
        duration,
        seek,
        reorderQueue,
        setPlayStyle,
        libraryView,
      }}>
      {children}
    </AudioPlayerContext.Provider>
  );
};
