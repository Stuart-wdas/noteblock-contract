CREATE TABLE "ProcessedChainEvent" (
	"transactionHash" text PRIMARY KEY NOT NULL,
	"blockNumber" integer NOT NULL,
	"processedAt" timestamp DEFAULT now() NOT NULL
);
