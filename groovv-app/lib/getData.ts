import { Album } from '@/providers/AudioPlayerProvider';

export const sampleSongs: Album[] = [
  {
    id: '1',
    title: 'Echoes of Dawn',
    artist: 'Nova Ray',
    genre: 'Ambient Electronica',
    cover: '/logo.svg',
    releaseDate: '2023-01-01',
    songs: [
      {
        id: '101',
        title: 'First Light',
        artist: 'Nova Ray',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
      {
        id: '102',
        title: 'Golden Horizon',
        artist: 'Nova Ray',
        url: '/songs/song2.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
      {
        id: '201',
        title: 'Neon Dreams',
        artist: 'Luna Drift',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
      {
        id: '202',
        title: 'Shadow Play',
        artist: 'Luna Drift',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
      {
        id: '301',
        title: 'Salt & Signal',
        artist: 'Waveform',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
      {
        id: '302',
        title: 'Driftwood',
        artist: 'Waveform',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
    ],
  },
  {
    id: '2',
    title: 'Midnight Pulse',
    artist: 'Luna Drift',
    cover: '/logo.svg',
    genre: 'Synthwave',
    releaseDate: '2023-02-14',
    songs: [
      {
        id: '201',
        title: 'Neon Dreams',
        artist: 'Luna Drift',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
      {
        id: '202',
        title: 'Shadow Play',
        artist: 'Luna Drift',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
    ],
  },
  {
    id: '3',
    title: 'Ocean Static',
    artist: 'Waveform',
    cover: '/logo.svg',
    genre: 'Rock',
    releaseDate: '2023-03-10',
    songs: [
      {
        id: '301',
        title: 'Salt & Signal',
        artist: 'Waveform',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
      {
        id: '302',
        title: 'Driftwood',
        artist: 'Waveform',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
    ],
  },
  {
    id: '4',
    title: 'Synthetic Bloom',
    artist: 'Aria Code',
    cover: '/logo.svg',
    genre: 'HipHop',
    releaseDate: '2023-04-22',
    songs: [
      {
        id: '401',
        title: 'Petal Circuit',
        artist: 'Aria Code',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
      {
        id: '402',
        title: 'Flora Fade',
        artist: 'Aria Code',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
    ],
  },
  {
    id: '5',
    title: 'Gravity Sketches',
    artist: 'Echoform',
    cover: '/logo.svg',
    genre: 'Rap',
    releaseDate: '2023-05-05',
    songs: [
      {
        id: '501',
        title: 'Orbital Ink',
        artist: 'Echoform',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
      {
        id: '502',
        title: 'Zero Point',
        artist: 'Echoform',
        url: '/songs/song1.mp3',
        genre: 'Ambient Electronica',

        cover: '/logo.svg',
      },
    ],
  },
];

// utils/mockPlaylists.ts

export const mockPlaylists = [
  {
    id: 'chill-vibes',
    name: 'Chill Vibes',
    description: 'Relax and unwind with mellow tunes',
    tracks: [...sampleSongs[0].songs, ...sampleSongs[1].songs],
  },
  {
    id: 'artist-b-essentials',
    name: 'Artist B Essentials',
    description: 'All the hits from Artist B',
    tracks: [
      sampleSongs[0].songs[0],
      sampleSongs[2].songs[0],
      sampleSongs[4].songs[0],
      sampleSongs[3].songs[0],
      sampleSongs[1].songs[0],
    ],
  },
  {
    id: 'daily-mix',
    name: 'Daily Mix',
    description: 'A curated blend of your recent favorites',
    tracks: [
      sampleSongs[0].songs[0],
      sampleSongs[2].songs[0],
      sampleSongs[4].songs[0],
      sampleSongs[3].songs[0],
    ],
  },
];
