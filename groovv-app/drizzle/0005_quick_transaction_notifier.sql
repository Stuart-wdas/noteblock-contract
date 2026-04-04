CREATE TABLE "UserNotificationSettings" (
	"userId" text PRIMARY KEY NOT NULL,
	"notifyPurchaseConfirmed" boolean DEFAULT true NOT NULL,
	"notifyListingSold" boolean DEFAULT true NOT NULL,
	"notifyListingCreated" boolean DEFAULT true NOT NULL,
	"notifyListingRemoved" boolean DEFAULT true NOT NULL,
	"notifySongMinted" boolean DEFAULT true NOT NULL,
	"notifyAlbumCreated" boolean DEFAULT true NOT NULL,
	"browserNotifications" boolean DEFAULT true NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"dedupeKey" text NOT NULL,
	"txHash" text,
	"blockNumber" integer,
	"eventType" text NOT NULL,
	"direction" text NOT NULL,
	"songId" text,
	"listingId" text,
	"counterparty" text,
	"unitPrice" text DEFAULT '0' NOT NULL,
	"copies" integer DEFAULT 0 NOT NULL,
	"totalAmount" text DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserNotification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"dedupeKey" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"txHash" text,
	"blockNumber" integer,
	"songId" text,
	"listingId" text,
	"transactionId" uuid,
	"metadata" jsonb,
	"isRead" boolean DEFAULT false NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_User_contractAddress_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "UserTransaction" ADD CONSTRAINT "UserTransaction_userId_User_contractAddress_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "UserTransaction" ADD CONSTRAINT "UserTransaction_songId_Song_id_fk" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_User_contractAddress_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_songId_Song_id_fk" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_transactionId_UserTransaction_id_fk" FOREIGN KEY ("transactionId") REFERENCES "public"."UserTransaction"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "UserTransaction_dedupeKey_unique" ON "UserTransaction" USING btree ("dedupeKey");
--> statement-breakpoint
CREATE INDEX "UserTransaction_userId_createdAt_idx" ON "UserTransaction" USING btree ("userId","createdAt");
--> statement-breakpoint
CREATE INDEX "UserTransaction_txHash_idx" ON "UserTransaction" USING btree ("txHash");
--> statement-breakpoint
CREATE INDEX "UserTransaction_songId_idx" ON "UserTransaction" USING btree ("songId");
--> statement-breakpoint
CREATE UNIQUE INDEX "UserNotification_dedupeKey_unique" ON "UserNotification" USING btree ("dedupeKey");
--> statement-breakpoint
CREATE INDEX "UserNotification_userId_isRead_createdAt_idx" ON "UserNotification" USING btree ("userId","isRead","createdAt");
--> statement-breakpoint
CREATE INDEX "UserNotification_txHash_idx" ON "UserNotification" USING btree ("txHash");
