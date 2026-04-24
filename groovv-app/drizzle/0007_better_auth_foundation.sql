CREATE TABLE "AuthUser" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"walletAddress" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuthSessionV2" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuthAccountV2" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuthVerificationV2" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AuthSessionV2" ADD CONSTRAINT "AuthSessionV2_userId_AuthUser_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."AuthUser"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "AuthAccountV2" ADD CONSTRAINT "AuthAccountV2_userId_AuthUser_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."AuthUser"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "AuthUser_email_unique" ON "AuthUser" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "AuthUser_walletAddress_unique" ON "AuthUser" USING btree ("walletAddress");
--> statement-breakpoint
CREATE UNIQUE INDEX "AuthSessionV2_token_unique" ON "AuthSessionV2" USING btree ("token");
--> statement-breakpoint
CREATE INDEX "AuthSessionV2_userId_expiresAt_idx" ON "AuthSessionV2" USING btree ("userId","expiresAt");
--> statement-breakpoint
CREATE INDEX "AuthAccountV2_userId_idx" ON "AuthAccountV2" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "AuthAccountV2_providerId_idx" ON "AuthAccountV2" USING btree ("providerId");
--> statement-breakpoint
CREATE UNIQUE INDEX "AuthAccountV2_provider_account_unique" ON "AuthAccountV2" USING btree ("providerId","accountId");
--> statement-breakpoint
CREATE INDEX "AuthVerificationV2_identifier_idx" ON "AuthVerificationV2" USING btree ("identifier");
--> statement-breakpoint
CREATE UNIQUE INDEX "AuthVerificationV2_value_unique" ON "AuthVerificationV2" USING btree ("value");
