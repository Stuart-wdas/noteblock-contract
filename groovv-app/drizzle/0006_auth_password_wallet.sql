ALTER TABLE "User" ADD COLUMN "email" text;
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "passwordHash" text;
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "passwordSalt" text;
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "lastLoginAt" timestamp;
--> statement-breakpoint
CREATE TABLE "AuthSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"sessionTokenHash" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PasswordResetToken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WalletLoginChallenge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"nonce" text NOT NULL,
	"typedData" jsonb NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_User_contractAddress_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_User_contractAddress_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "WalletLoginChallenge" ADD CONSTRAINT "WalletLoginChallenge_userId_User_contractAddress_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("contractAddress") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_unique" ON "User" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "AuthSession_sessionTokenHash_unique" ON "AuthSession" USING btree ("sessionTokenHash");
--> statement-breakpoint
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession" USING btree ("userId","expiresAt");
--> statement-breakpoint
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_unique" ON "PasswordResetToken" USING btree ("tokenHash");
--> statement-breakpoint
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken" USING btree ("userId","expiresAt");
--> statement-breakpoint
CREATE UNIQUE INDEX "WalletLoginChallenge_nonce_unique" ON "WalletLoginChallenge" USING btree ("nonce");
--> statement-breakpoint
CREATE INDEX "WalletLoginChallenge_userId_expiresAt_idx" ON "WalletLoginChallenge" USING btree ("userId","expiresAt");
