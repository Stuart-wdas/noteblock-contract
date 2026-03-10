import {relations} from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('User', {
  contractAddress: text('contractAddress').primaryKey(),
  createdAt: timestamp('createdAt', {mode: 'date'}).defaultNow().notNull(),
  displayName: text('displayName'),
  avatarUrl: text('avatarUrl'),
  bio: text('bio'),
});

export const albums = pgTable('Album', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  genre: text('genre').notNull(),
  cover: text('cover').notNull(),
  releaseDate: timestamp('releaseDate', {mode: 'date'}).notNull(),
});

export const songs = pgTable(
  'Song',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    genre: text('genre').notNull(),
    length: integer('length').notNull(),
    releaseDate: timestamp('releaseDate', {mode: 'date'}).notNull(),
    cid: text('cid').notNull(),
    cover: text('cover').notNull(),
    price: text('price').default('0').notNull(),
    copies: integer('copies').default(0).notNull(),
    albumId: integer('albumId').references(() => albums.id),
  },
  (table) => [index('Song_title_artist_genre_idx').on(table.title, table.artist, table.genre)]
);

export const tokenOwnerships = pgTable(
  'TokenOwnership',
  {
    id: serial('id').primaryKey(),
    owner: text('owner')
      .notNull()
      .references(() => users.contractAddress, {onDelete: 'cascade'}),
    songid: text('songid')
      .notNull()
      .references(() => songs.id),
    balance: text('balance').notNull(),
    updatedAt: timestamp('updatedAt', {mode: 'date'}).defaultNow().notNull(),
  },
  (table) => [index('TokenOwnership_owner_songid_id_idx').on(table.owner, table.songid, table.id)]
);

export const playlists = pgTable('Playlist', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: timestamp('createdAt', {mode: 'date'}).defaultNow().notNull(),
  isPublic: boolean('isPublic').default(false).notNull(),
  userId: text('userId')
    .notNull()
    .references(() => users.contractAddress),
  coverSongId: text('coverSongId'),
});

export const playlistItems = pgTable(
  'PlaylistItem',
  {
    id: serial('id').primaryKey(),
    playlistId: integer('playlistId')
      .notNull()
      .references(() => playlists.id),
    songId: text('songId')
      .notNull()
      .references(() => songs.id),
  },
  (table) => [index('PlaylistItem_playlistId_songId_idx').on(table.playlistId, table.songId)]
);

export const userPreferences = pgTable('UserPreferences', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.contractAddress, {onDelete: 'cascade'}),
  playstyle: text('playstyle').default('Shuffle').notNull(),
  likedGenres: text('likedGenres'),
  likedArtists: text('likedArtists'),
});

export const streamSessions = pgTable(
  'StreamSession',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.contractAddress, {onDelete: 'cascade'}),
    songId: text('songId')
      .notNull()
      .references(() => songs.id),
    startedAt: timestamp('startedAt', {mode: 'date'}).defaultNow().notNull(),
    endedAt: timestamp('endedAt', {mode: 'date'}),
    ipHash: text('ipHash'),
    device: text('device'),
  },
  (table) => [
    index('StreamSession_userId_startedAt_idx').on(table.userId, table.startedAt),
    index('StreamSession_songId_startedAt_idx').on(table.songId, table.startedAt),
  ]
);

export const usersRelations = relations(users, ({many, one}) => ({
  playlists: many(playlists),
  preferences: one(userPreferences),
  tokenOwnerships: many(tokenOwnerships),
  streamSessions: many(streamSessions),
}));

export const songsRelations = relations(songs, ({many, one}) => ({
  album: one(albums, {
    fields: [songs.albumId],
    references: [albums.id],
  }),
  token: many(tokenOwnerships),
  playlistItems: many(playlistItems),
  streamSessions: many(streamSessions),
}));

export const albumsRelations = relations(albums, ({many}) => ({
  songs: many(songs),
}));

export const tokenOwnershipsRelations = relations(tokenOwnerships, ({one}) => ({
  user: one(users, {
    fields: [tokenOwnerships.owner],
    references: [users.contractAddress],
  }),
  song: one(songs, {
    fields: [tokenOwnerships.songid],
    references: [songs.id],
  }),
}));

export const playlistsRelations = relations(playlists, ({many, one}) => ({
  user: one(users, {
    fields: [playlists.userId],
    references: [users.contractAddress],
  }),
  songs: many(playlistItems),
  coverSong: one(songs, {
    fields: [playlists.coverSongId],
    references: [songs.id],
  }),
}));

export const playlistItemsRelations = relations(playlistItems, ({one}) => ({
  playlist: one(playlists, {
    fields: [playlistItems.playlistId],
    references: [playlists.id],
  }),
  song: one(songs, {
    fields: [playlistItems.songId],
    references: [songs.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({one}) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.contractAddress],
  }),
}));

export const streamSessionsRelations = relations(streamSessions, ({one}) => ({
  user: one(users, {
    fields: [streamSessions.userId],
    references: [users.contractAddress],
  }),
  song: one(songs, {
    fields: [streamSessions.songId],
    references: [songs.id],
  }),
}));
