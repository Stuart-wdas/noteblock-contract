CREATE TABLE "Album" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"genre" text NOT NULL,
	"cover" text NOT NULL,
	"releaseDate" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PlaylistItem" (
	"id" serial PRIMARY KEY NOT NULL,
	"playlistId" integer NOT NULL,
	"songId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Playlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"userId" text NOT NULL,
	"coverSongId" text
);
--> statement-breakpoint
CREATE TABLE "Song" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"genre" text NOT NULL,
	"length" integer NOT NULL,
	"releaseDate" timestamp NOT NULL,
	"cid" text NOT NULL,
	"cover" text NOT NULL,
	"price" text DEFAULT '0' NOT NULL,
	"copies" integer DEFAULT 0 NOT NULL,
	"albumId" integer
);
--> statement-breakpoint
CREATE TABLE "StreamSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"songId" text NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	"ipHash" text,
	"device" text
);
--> statement-breakpoint
CREATE TABLE "TokenOwnership" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"songid" text NOT NULL,
	"balance" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserPreferences" (
	"userId" text PRIMARY KEY NOT NULL,
	"playstyle" text DEFAULT 'Shuffle' NOT NULL,
	"likedGenres" text,
	"likedArtists" text
);
--> statement-breakpoint
CREATE TABLE "User" (
	"contractAddress" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"displayName" text,
	"avatarUrl" text
);
--> statement-breakpoint
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_playlistId_Playlist_id_fk" FOREIGN KEY ("playlistId") REFERENCES "public"."Playlist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_songId_Song_id_fk" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_userId_User_contractAddress_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("contractAddress") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Song" ADD CONSTRAINT "Song_albumId_Album_id_fk" FOREIGN KEY ("albumId") REFERENCES "public"."Album"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StreamSession" ADD CONSTRAINT "StreamSession_userId_User_contractAddress_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StreamSession" ADD CONSTRAINT "StreamSession_songId_Song_id_fk" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TokenOwnership" ADD CONSTRAINT "TokenOwnership_owner_User_contractAddress_fk" FOREIGN KEY ("owner") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TokenOwnership" ADD CONSTRAINT "TokenOwnership_songid_Song_id_fk" FOREIGN KEY ("songid") REFERENCES "public"."Song"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_User_contractAddress_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "PlaylistItem_playlistId_songId_idx" ON "PlaylistItem" USING btree ("playlistId","songId");--> statement-breakpoint
CREATE INDEX "Song_title_artist_genre_idx" ON "Song" USING btree ("title","artist","genre");--> statement-breakpoint
CREATE INDEX "StreamSession_userId_startedAt_idx" ON "StreamSession" USING btree ("userId","startedAt");--> statement-breakpoint
CREATE INDEX "StreamSession_songId_startedAt_idx" ON "StreamSession" USING btree ("songId","startedAt");--> statement-breakpoint
CREATE INDEX "TokenOwnership_owner_songid_id_idx" ON "TokenOwnership" USING btree ("owner","songid","id");