CREATE TABLE "MarketListing" (
	"id" serial PRIMARY KEY NOT NULL,
	"listingId" text NOT NULL,
	"songId" text NOT NULL,
	"seller" text NOT NULL,
	"price" text NOT NULL,
	"copies" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MarketListing" ADD CONSTRAINT "MarketListing_songId_Song_id_fk" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "MarketListing" ADD CONSTRAINT "MarketListing_seller_User_contractAddress_fk" FOREIGN KEY ("seller") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "MarketListing_listingId_unique" ON "MarketListing" USING btree ("listingId");
--> statement-breakpoint
CREATE INDEX "MarketListing_songId_isActive_idx" ON "MarketListing" USING btree ("songId","isActive");
--> statement-breakpoint
CREATE INDEX "MarketListing_seller_songId_idx" ON "MarketListing" USING btree ("seller","songId");
