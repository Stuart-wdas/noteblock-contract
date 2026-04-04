import { NextRequest, NextResponse } from 'next/server';
import {
  ingestGroovvEvents,
  type EventIngestSummary,
  type ListenerEvent,
} from '@/lib/contract/eventIngest';
import { db } from '@/lib/db';
import { processedChainEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

type ListenerEventBatch = {
  blockNumber?: number;
  blockHash?: string;
  transactionHash?: string;
  contractAddress?: string;
  events: ListenerEvent[];
};

function readSecret() {
  return process.env.LISTENER_SHARED_SECRET?.trim();
}

function isAuthorized(req: NextRequest) {
  const expected = readSecret();
  if (!expected) return true;

  const provided = req.headers.get('x-listener-secret')?.trim();
  return Boolean(provided && provided === expected);
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized listener request' }, { status: 401 });
    }

    const body = (await req.json()) as ListenerEventBatch | { batches: ListenerEventBatch[] };
    const batches = Array.isArray((body as { batches?: ListenerEventBatch[] }).batches)
      ? (body as { batches: ListenerEventBatch[] }).batches
      : [body as ListenerEventBatch];

    let ingestedEvents = 0;
    const ingestSummaries: EventIngestSummary[] = [];
    for (const batch of batches) {
      const events = Array.isArray(batch?.events) ? batch.events : [];
      if (events.length === 0) continue;

      const txHash = batch.transactionHash?.trim();
      const blockNumber = Number(batch.blockNumber ?? -1);
      if (txHash) {
        const existing = await db.query.processedChainEvents.findFirst({
          where: eq(processedChainEvents.transactionHash, txHash),
        });
        if (existing) {
          console.log('[listener:api] skipped already-processed tx', {
            txHash,
            blockNumber,
            eventCount: events.length,
            eventNames: events.map((event) => event.name),
          });
          continue;
        }
      }

      console.log('[listener:api] ingesting listener batch', {
        txHash: txHash ?? null,
        blockNumber: Number.isFinite(blockNumber) ? blockNumber : null,
        contractAddress: batch.contractAddress ?? null,
        eventCount: events.length,
        eventNames: events.map((event) => event.name),
      });

      const ingestSummary = await ingestGroovvEvents(events, {
        transactionHash: txHash ?? null,
        blockNumber: Number.isFinite(blockNumber) ? blockNumber : null,
      });
      ingestSummaries.push(ingestSummary);

      if (txHash && Number.isFinite(blockNumber) && blockNumber >= 0) {
        await db
          .insert(processedChainEvents)
          .values({
            transactionHash: txHash,
            blockNumber,
          })
          .onConflictDoNothing();
      }
      ingestedEvents += events.length;

      console.log('[listener:api] ingest completed', {
        txHash: txHash ?? null,
        blockNumber: Number.isFinite(blockNumber) ? blockNumber : null,
        ingestSummary,
      });
    }

    return NextResponse.json({
      ok: true,
      ingestedEvents,
      batches: batches.length,
      ingestSummaries,
    });
  } catch (error) {
    console.error('Listener ingest failed', error);
    return NextResponse.json(
      { error: 'Failed to ingest listener events' },
      { status: 500 }
    );
  }
}
