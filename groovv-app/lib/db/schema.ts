import {relations} from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('User', {
  contractAddress: text('contractAddress').primaryKey(),
  createdAt: timestamp('createdAt', {mode: 'date'}).defaultNow().notNull(),
  displayName: text('displayName'),
  email: text('email'),
  passwordHash: text('passwordHash'),
  passwordSalt: text('passwordSalt'),
  lastLoginAt: timestamp('lastLoginAt', {mode: 'date'}),
  avatarUrl: text('avatarUrl'),
  bio: text('bio'),
}, (table) => [
  uniqueIndex('User_email_unique').on(table.email),
]);

export const authSessions = pgTable(
  'AuthSession',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.contractAddress, {onDelete: 'cascade'}),
    sessionTokenHash: text('sessionTokenHash').notNull(),
    expiresAt: timestamp('expiresAt', {mode: 'date'}).notNull(),
    createdAt: timestamp('createdAt', {mode: 'date'}).defaultNow().notNull(),
    lastSeenAt: timestamp('lastSeenAt', {mode: 'date'}).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('AuthSession_sessionTokenHash_unique').on(table.sessionTokenHash),
    index('AuthSession_userId_expiresAt_idx').on(table.userId, table.expiresAt),
  ],
);

export const passwordResetTokens = pgTable(
  'PasswordResetToken',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.contractAddress, {onDelete: 'cascade'}),
    tokenHash: text('tokenHash').notNull(),
    expiresAt: timestamp('expiresAt', {mode: 'date'}).notNull(),
    usedAt: timestamp('usedAt', {mode: 'date'}),
    createdAt: timestamp('createdAt', {mode: 'date'}).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('PasswordResetToken_tokenHash_unique').on(table.tokenHash),
    index('PasswordResetToken_userId_expiresAt_idx').on(table.userId, table.expiresAt),
  ],
);

export const walletLoginChallenges = pgTable(
  'WalletLoginChallenge',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.contractAddress, {onDelete: 'cascade'}),
    nonce: text('nonce').notNull(),
    typedData: jsonb('typedData').notNull(),
    expiresAt: timestamp('expiresAt', {mode: 'date'}).notNull(),
    usedAt: timestamp('usedAt', {mode: 'date'}),
    createdAt: timestamp('createdAt', {mode: 'date'}).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('WalletLoginChallenge_nonce_unique').on(table.nonce),
    index('WalletLoginChallenge_userId_expiresAt_idx').on(
      table.userId,
      table.expiresAt,
    ),
  ],
);

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
    listingId: text('listingId'),
    price: text('price').default('0').notNull(),
    copies: integer('copies').default(0).notNull(),
    albumId: integer('albumId').references(() => albums.id),
  },
  (table) => [index('Song_title_artist_genre_idx').on(table.title, table.artist, table.genre)]
);

export const marketListings = pgTable(
  'MarketListing',
  {
    id: serial('id').primaryKey(),
    listingId: text('listingId').notNull(),
    songId: text('songId')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    seller: text('seller')
      .notNull()
      .references(() => users.contractAddress, { onDelete: 'cascade' }),
    price: text('price').notNull(),
    copies: integer('copies').default(0).notNull(),
    isActive: boolean('isActive').default(true).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('MarketListing_listingId_unique').on(table.listingId),
    index('MarketListing_songId_isActive_idx').on(table.songId, table.isActive),
    index('MarketListing_seller_songId_idx').on(table.seller, table.songId),
  ],
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

export const processedChainEvents = pgTable('ProcessedChainEvent', {
  transactionHash: text('transactionHash').primaryKey(),
  blockNumber: integer('blockNumber').notNull(),
  processedAt: timestamp('processedAt', {mode: 'date'}).defaultNow().notNull(),
});

export const userNotificationSettings = pgTable('UserNotificationSettings', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.contractAddress, {onDelete: 'cascade'}),
  notifyPurchaseConfirmed: boolean('notifyPurchaseConfirmed')
    .default(true)
    .notNull(),
  notifyListingSold: boolean('notifyListingSold').default(true).notNull(),
  notifyListingCreated: boolean('notifyListingCreated').default(true).notNull(),
  notifyListingRemoved: boolean('notifyListingRemoved').default(true).notNull(),
  notifySongMinted: boolean('notifySongMinted').default(true).notNull(),
  notifyAlbumCreated: boolean('notifyAlbumCreated').default(true).notNull(),
  browserNotifications: boolean('browserNotifications').default(true).notNull(),
  updatedAt: timestamp('updatedAt', {mode: 'date'}).defaultNow().notNull(),
});

export const userTransactions = pgTable(
  'UserTransaction',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.contractAddress, {onDelete: 'cascade'}),
    dedupeKey: text('dedupeKey').notNull(),
    txHash: text('txHash'),
    blockNumber: integer('blockNumber'),
    eventType: text('eventType').notNull(),
    direction: text('direction').notNull(),
    songId: text('songId').references(() => songs.id, {onDelete: 'set null'}),
    listingId: text('listingId'),
    counterparty: text('counterparty'),
    unitPrice: text('unitPrice').default('0').notNull(),
    copies: integer('copies').default(0).notNull(),
    totalAmount: text('totalAmount').default('0').notNull(),
    status: text('status').default('confirmed').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('createdAt', {mode: 'date'}).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('UserTransaction_dedupeKey_unique').on(table.dedupeKey),
    index('UserTransaction_userId_createdAt_idx').on(table.userId, table.createdAt),
    index('UserTransaction_txHash_idx').on(table.txHash),
    index('UserTransaction_songId_idx').on(table.songId),
  ],
);

export const userNotifications = pgTable(
  'UserNotification',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.contractAddress, {onDelete: 'cascade'}),
    dedupeKey: text('dedupeKey').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    txHash: text('txHash'),
    blockNumber: integer('blockNumber'),
    songId: text('songId').references(() => songs.id, {onDelete: 'set null'}),
    listingId: text('listingId'),
    transactionId: uuid('transactionId').references(() => userTransactions.id, {
      onDelete: 'set null',
    }),
    metadata: jsonb('metadata'),
    isRead: boolean('isRead').default(false).notNull(),
    readAt: timestamp('readAt', {mode: 'date'}),
    createdAt: timestamp('createdAt', {mode: 'date'}).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('UserNotification_dedupeKey_unique').on(table.dedupeKey),
    index('UserNotification_userId_isRead_createdAt_idx').on(
      table.userId,
      table.isRead,
      table.createdAt,
    ),
    index('UserNotification_txHash_idx').on(table.txHash),
  ],
);

export const usersRelations = relations(users, ({many, one}) => ({
  playlists: many(playlists),
  preferences: one(userPreferences),
  notificationSettings: one(userNotificationSettings),
  tokenOwnerships: many(tokenOwnerships),
  authSessions: many(authSessions),
  passwordResetTokens: many(passwordResetTokens),
  walletLoginChallenges: many(walletLoginChallenges),
  listings: many(marketListings),
  streamSessions: many(streamSessions),
  transactions: many(userTransactions),
  notifications: many(userNotifications),
}));

export const songsRelations = relations(songs, ({many, one}) => ({
  album: one(albums, {
    fields: [songs.albumId],
    references: [albums.id],
  }),
  token: many(tokenOwnerships),
  listings: many(marketListings),
  playlistItems: many(playlistItems),
  streamSessions: many(streamSessions),
  transactions: many(userTransactions),
  notifications: many(userNotifications),
}));

export const marketListingsRelations = relations(marketListings, ({ one }) => ({
  song: one(songs, {
    fields: [marketListings.songId],
    references: [songs.id],
  }),
  sellerUser: one(users, {
    fields: [marketListings.seller],
    references: [users.contractAddress],
  }),
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

export const authSessionsRelations = relations(authSessions, ({one}) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.contractAddress],
  }),
}));

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({one}) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.contractAddress],
    }),
  }),
);

export const walletLoginChallengesRelations = relations(
  walletLoginChallenges,
  ({one}) => ({
    user: one(users, {
      fields: [walletLoginChallenges.userId],
      references: [users.contractAddress],
    }),
  }),
);

export const userNotificationSettingsRelations = relations(
  userNotificationSettings,
  ({one}) => ({
    user: one(users, {
      fields: [userNotificationSettings.userId],
      references: [users.contractAddress],
    }),
  }),
);

export const userTransactionsRelations = relations(userTransactions, ({one}) => ({
  user: one(users, {
    fields: [userTransactions.userId],
    references: [users.contractAddress],
  }),
  song: one(songs, {
    fields: [userTransactions.songId],
    references: [songs.id],
  }),
}));

export const userNotificationsRelations = relations(userNotifications, ({one}) => ({
  user: one(users, {
    fields: [userNotifications.userId],
    references: [users.contractAddress],
  }),
  song: one(songs, {
    fields: [userNotifications.songId],
    references: [songs.id],
  }),
  transaction: one(userTransactions, {
    fields: [userNotifications.transactionId],
    references: [userTransactions.id],
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
