# Groovv (noteblock-contract)

Groovv is a full-stack Starknet music platform where artists can mint songs, list them on-chain, and listeners can discover, buy, and manage ownership-backed music access.

This repository contains:
- A Cairo smart contract for minting, listing, trading, and royalty-aware marketplace logic.
- A Next.js web app for wallet-based listening, studio management, playlists, marketplace discovery, and profile history.
- A TypeScript listener service that watches Starknet events and syncs them into the app database for fast queries, notifications, and recommendations.

## What This Project Is

Groovv combines on-chain ownership and off-chain product UX:
- On-chain (Starknet): source of truth for minting, listing, purchases, listing removal, and ownership balance.
- Off-chain (Postgres + Next.js APIs): indexed query layer for search, recommendations, notifications, and profile timelines.
- Realtime sync layer: event listener reads contract events and posts normalized batches to the app ingest API.

The result is a hybrid architecture: trust-minimized market actions on-chain, fast consumer-grade UX off-chain.

## Monorepo Layout

```text
.
|- contracts/         # Cairo contract + Starknet Foundry tests
|- groovv-app/        # Next.js 15 app + Drizzle ORM + PostgreSQL
`- groovv-listener/   # Starknet websocket listener + event forwarding
```

## Core Features

- Wallet connect flow for Starknet users.
- Artist studio tools to mint songs and create albums.
- ERC1155-based ownership balances for songs.
- On-chain listings with purchase flow and seller-controlled delisting.
- Secondary sale royalty logic (artist royalty on resale).
- Marketplace ranking sections:
  - Top Picks
  - On the Rise
  - More Your Speed (personalized)
- Listener-driven event ingest that updates songs, ownership balances, active market listings, user transactions, and user notifications.
- Search, playlists, profile transactions, and notification settings.
- PWA support and offline route in the web client.

## High-Level Architecture

```text
User Wallet (Starknet)
        |
        v
Groovv Contract (Cairo, ERC1155 + marketplace)
        | emits events
        v
groovv-listener (WS/RPC subscriber)
        | POST /api/listener/events
        v
groovv-app ingest pipeline (eventIngest.ts)
        |
        v
PostgreSQL (Drizzle schema)
        |
        v
Next.js APIs + UI (library, market, search, notifications, profile)
```

## Smart Contract Scope (`contracts/`)

Primary contract: `Groovv`

Implemented capabilities include:
- `mint_song`
- `update_song_price`
- `buy_song`
- `list_song`
- `remove_listing`
- `create_album`
- `add_song_to_album`
- `get_song`
- `get_listing`
- `get_song_balance`
- owner-only `withdraw_funds`
- owner-only `upgrade`

Event surface includes:
- `SongCreated`
- `SongUpdated`
- `AlbumCreated`
- `ListingCreated`
- `ListingPurchased`
- `ListingRemoved`
- `FundsWithdrawn`

## Web App Scope (`groovv-app/`)

Tech stack:
- Next.js 15 (App Router, Turbopack)
- React 19
- Drizzle ORM + PostgreSQL
- Starknet wallet integration (`starknetkit`, `@starknet-react`)
- React Query for client data sync

Functional areas:
- Library and playback UI
- Studio (create/profile/listings)
- Marketplace + recommendation feeds
- Search across library and market
- Playlists
- Notification center + transaction history
- API endpoints for uploads, ingest, market views, and profile data

## Listener Scope (`groovv-listener/`)

Responsibilities:
- Subscribe to Groovv contract events over WebSocket.
- Fetch receipts/traces over RPC.
- Decode ABI events and normalize payloads.
- Deduplicate/retry/reconnect for resilience.
- Forward event batches to `groovv-app` ingest endpoint.
- Persist last processed block to state file.

## Local Development

### 1. Prerequisites

- Node.js 20+
- npm
- PostgreSQL
- Scarb
- Starknet Foundry (`snforge`)
- Starknet Sepolia RPC + WS endpoints

### 2. Configure Environment Variables

#### `groovv-app/.env`

Required:
- `DATABASE_URL`
- `NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_GROOVV_PAYMENT_TOKEN_ADDRESS` (or `NEXT_PUBLIC_USDC_TOKEN_ADDRESS`)
- `NEXT_PUBLIC_STARKNET_RPC_URL` (or `NEXT_PUBLIC_RPC_URL`)

Optional:
- `LISTENER_SHARED_SECRET` (recommended when listener posts events)
- `NEXT_PUBLIC_STARKSCAN_TX_BASE_URL`
- `NEXT_PUBLIC_PWA_DEV_ENABLED`
- `RPC_URL` (server fallback for chain reads)

#### `groovv-listener/.env`

Use `groovv-listener/.env.example` as baseline:
- `RPC_URL`
- `WS_URL`
- `GROOVV_CONTRACT_ADDRESS`
- `APP_BASE_URL` (usually `http://localhost:3000`)
- `LISTENER_SHARED_SECRET` (must match app if configured)
- `GROOVV_ABI_PATH` (or use fallback ABI paths)

#### `contracts/` (test/fork)

- `RPC_URL` is used by fork tests in `Scarb.toml`.

### 3. Install Dependencies

```bash
cd groovv-app
npm install

cd ../groovv-listener
npm install
```

### 4. Database Setup (App)

```bash
cd groovv-app
npm run db:generate
npm run db:migrate
npm run seed
```

Or trigger seed API after app start:

```bash
curl -X POST http://localhost:3000/api/seed
```

### 5. Run Services

Use three terminals:

```bash
# Terminal 1: Next.js app
cd groovv-app
npm run dev
```

```bash
# Terminal 2: Starknet listener
cd groovv-listener
npm run dev
```

```bash
# Terminal 3: Contract tests
cd contracts
scarb test
```

## Key Scripts

### `groovv-app`
- `npm run dev` - start app in dev mode
- `npm run build` - production build
- `npm run start` - run production server
- `npm run seed` - run data seed script
- `npm run db:generate` - generate Drizzle migrations
- `npm run db:migrate` - apply migrations
- `npm run db:studio` - open Drizzle studio

### `groovv-listener`
- `npm run dev` - run listener in TS mode
- `npm run build` - compile listener
- `npm run start` - run compiled listener
- `npm run decode:tx` - tx decode utility

### `contracts`
- `scarb test` - run contract tests (configured with coverage script in `Scarb.toml`)

## Event-Driven Data Model (App)

The ingest pipeline updates Postgres tables for:
- users
- songs
- albums
- market listings
- token ownership
- processed chain events (dedupe)
- user transactions
- user notifications
- notification settings

This enables fast API reads without repeatedly querying chain state for every UI interaction.

## Notes

- This repository appears targeted at Starknet Sepolia for current tests and listener configs.
- Upload endpoints save media under `groovv-app/public/uploads/...` for local development.
- Contract and marketplace logic should be audited before mainnet production use.