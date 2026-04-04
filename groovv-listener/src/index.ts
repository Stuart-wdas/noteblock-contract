import 'dotenv/config';
import express from 'express';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  CallData,
  type Abi,
  type AbiEntry,
  type BigNumberish,
  type ByteArray,
  type EmittedEvent,
  RpcProvider,
  WebSocketChannel,
  byteArray,
  events,
  num,
  selector,
} from 'starknet';
import WebSocket from 'ws';

type ListenerState = {
  lastProcessedBlock: number;
};

type ListenerEvent = {
  name: string;
  payload: Record<string, unknown>;
};

type QueueTransactionParams = {
  transactionHash: string;
  blockNumber?: number;
  blockHash?: string;
};

type FunctionCallSummary = {
  contractAddress: string;
  entryPointSelector: string;
  functionName: string;
  calldata: string[];
};

type ParsedContractEvent = {
  eventPath: string;
  eventName: string;
  payload: Record<string, unknown>;
  isGroovv: boolean;
};

const GROOVV_EVENT_PREFIX = 'groovv::groovv::events::';
const ADDRESS_FIELDS = new Set([
  'artist',
  'buyer',
  'from',
  'new_owner',
  'operator',
  'owner',
  'previous_owner',
  'recipient',
  'seller',
  'to',
]);

const EVENT_TO_FUNCTION: Record<string, string> = {
  SongCreated: 'mint_song',
  SongUpdated: 'update_song_price',
  ListingCreated: 'list_song',
  ListingPurchased: 'buy_song',
  ListingRemoved: 'remove_listing',
  AlbumCreated: 'create_album',
  FundsWithdrawn: 'withdraw_funds',
};

const app = express();
app.use(express.json());

const rpcUrl = process.env['RPC_URL']?.trim();
const configuredWsUrl =
  process.env['WS_URL']?.trim() || process.env['STARKNET_WS_URL']?.trim() || '';
const configuredContractAddress =
  process.env['GROOVV_CONTRACT_ADDRESS']?.trim() ||
  process.env['NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS']?.trim() ||
  '';
const appBaseUrl = process.env['APP_BASE_URL']?.trim() || 'http://localhost:3000';
const listenerSecret = process.env['LISTENER_SHARED_SECRET']?.trim();
const stateFile =
  process.env['LISTENER_STATE_FILE']?.trim() ||
  path.join(process.cwd(), '.listener-state.json');
const configuredAbiPath = process.env['GROOVV_ABI_PATH']?.trim();
const port = Number(process.env['PORT'] || 4020);
const receiptRetryCount = Number(process.env['LISTENER_RECEIPT_RETRY_COUNT'] || 3);
const receiptRetryDelayMs = Number(
  process.env['LISTENER_RECEIPT_RETRY_DELAY_MS'] || 750,
);
const txCacheSize = Number(process.env['LISTENER_TX_CACHE_SIZE'] || 2000);
const wsReconnectRetries = Number(process.env['LISTENER_WS_RECONNECT_RETRIES'] || 8);
const wsReconnectDelayMs = Number(process.env['LISTENER_WS_RECONNECT_DELAY_MS'] || 2000);
const wsRequestTimeoutMs = Number(
  process.env['LISTENER_WS_REQUEST_TIMEOUT_MS'] || 60000,
);
const wsMaxBufferSize = Number(process.env['LISTENER_WS_MAX_BUFFER_SIZE'] || 2000);
const listenerEventLoggingSetting = process.env['LISTENER_LOG_EVENTS']
  ?.trim()
  .toLowerCase();
const listenerEventLoggingEnabled =
  listenerEventLoggingSetting !== '0' &&
  listenerEventLoggingSetting !== 'false' &&
  listenerEventLoggingSetting !== 'off';

if (!rpcUrl) {
  throw new Error('Missing RPC_URL for listener.');
}

if (!configuredContractAddress) {
  throw new Error(
    'Missing GROOVV_CONTRACT_ADDRESS or NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS for listener.',
  );
}

function toWebSocketUrl(url: string) {
  if (url.startsWith('ws://') || url.startsWith('wss://')) return url;
  if (url.startsWith('https://')) {
    return `wss://${url.slice('https://'.length)}`;
  }
  if (url.startsWith('http://')) {
    return `ws://${url.slice('http://'.length)}`;
  }
  return url;
}

function redactEndpoint(url: string) {
  const trimmed = url.trim();
  const marker = '/rpc/';
  const markerIndex = trimmed.indexOf(marker);
  if (markerIndex === -1) {
    return trimmed;
  }
  const prefix = trimmed.slice(0, markerIndex + marker.length);
  return `${prefix}***`;
}

function stripBom(value: string) {
  return value.replace(/^\uFEFF/, '');
}

function normalizeHexAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  try {
    return num.cleanHex(trimmed).toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readStringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value) || typeof value[key] !== 'string') {
    return undefined;
  }
  const parsed = value[key].trim();
  return parsed || undefined;
}

function parseOptionalBlockNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return undefined;
}

function toBlockNumber(block: unknown) {
  if (!isRecord(block) || typeof block['block_number'] !== 'number') {
    throw new Error('Unable to read block_number from provider response.');
  }
  return block['block_number'];
}

function toBigNumberish(value: unknown): BigNumberish | null {
  if (
    typeof value === 'bigint' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }
  return null;
}

function decodeByteArrayValue(value: Record<string, unknown>): string | null {
  const dataValue = value['data'];
  const pendingWordValue = value['pending_word'];
  const pendingWordLenValue = value['pending_word_len'];
  if (!Array.isArray(dataValue)) {
    return null;
  }

  const data = dataValue
    .map((entry) => toBigNumberish(entry))
    .filter((entry): entry is BigNumberish => entry !== null);

  const pendingWord = toBigNumberish(pendingWordValue);
  const pendingWordLen = toBigNumberish(pendingWordLenValue);
  if (pendingWord === null || pendingWordLen === null) {
    return null;
  }

  const normalized: ByteArray = {
    data,
    pending_word: pendingWord,
    pending_word_len: pendingWordLen,
  };

  try {
    return byteArray.stringFromByteArray(normalized);
  } catch {
    return null;
  }
}

function normalizePayloadValue(fieldName: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    if (ADDRESS_FIELDS.has(fieldName)) {
      return num.toHex(value).toLowerCase();
    }
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizePayloadValue(fieldName, entry));
  }

  if (isRecord(value)) {
    const byteArrayValue = decodeByteArrayValue(value);
    if (byteArrayValue !== null) {
      return byteArrayValue;
    }

    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        normalizePayloadValue(nestedKey, nestedValue),
      ]),
    );
  }

  if (typeof value === 'number' && ADDRESS_FIELDS.has(fieldName)) {
    return num.toHex(value).toLowerCase();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;

    if (ADDRESS_FIELDS.has(fieldName)) {
      if (trimmed.startsWith('0x')) {
        return trimmed.toLowerCase();
      }
      try {
        return num.toHex(trimmed).toLowerCase();
      } catch {
        return trimmed.toLowerCase();
      }
    }

    return trimmed;
  }

  return value;
}

function normalizeEventPayload(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    return { value: normalizePayloadValue('value', payload) };
  }

  return Object.fromEntries(
    Object.entries(payload).map(([fieldName, value]) => [
      fieldName,
      normalizePayloadValue(fieldName, value),
    ]),
  );
}

function getShortEventName(eventPath: string) {
  const parts = eventPath.split('::');
  const resolved = parts[parts.length - 1];
  return resolved || eventPath;
}

function parseAllContractEvents(parsedEvents: unknown[]): ParsedContractEvent[] {
  const parsed: ParsedContractEvent[] = [];

  for (const parsedEvent of parsedEvents) {
    if (!isRecord(parsedEvent)) continue;

    for (const [eventPath, payload] of Object.entries(parsedEvent)) {
      if (
        eventPath === 'block_hash' ||
        eventPath === 'block_number' ||
        eventPath === 'transaction_hash'
      ) {
        continue;
      }

      parsed.push({
        eventPath,
        eventName: getShortEventName(eventPath),
        payload: normalizeEventPayload(payload),
        isGroovv: eventPath.startsWith(GROOVV_EVENT_PREFIX),
      });
    }
  }

  return parsed;
}

function logListenerEvent(message: string, payload?: Record<string, unknown>) {
  if (!listenerEventLoggingEnabled) return;
  if (payload) {
    console.log(`[listener:event] ${message}`, payload);
    return;
  }
  console.log(`[listener:event] ${message}`);
}

function logGroovvEventBatch(params: {
  transactionHash: string;
  blockNumber: number;
  blockHash?: string;
  events: ListenerEvent[];
}) {
  if (!listenerEventLoggingEnabled) return;

  console.log('[listener:groovv-events] Decoded Groovv events', {
    transactionHash: params.transactionHash,
    blockNumber: params.blockNumber,
    blockHash: params.blockHash ?? null,
    eventCount: params.events.length,
  });
  for (const event of params.events) {
    console.log(
      '[listener:groovv-event]',
      JSON.stringify(
        {
          name: event.name,
          payload: event.payload,
        },
        null,
        2,
      ),
    );
  }
}

function logDecodedContractEvents(params: {
  transactionHash: string;
  decodedEvents: ParsedContractEvent[];
}) {
  if (!listenerEventLoggingEnabled) return;

  console.log('[listener:decoded-contract-events]', {
    tx: params.transactionHash,
    totalDecodedEvents: params.decodedEvents.length,
    groovvEventCount: params.decodedEvents.filter((event) => event.isGroovv).length,
    eventPaths: params.decodedEvents.map((event) => event.eventPath),
  });
}

const wsUrl = toWebSocketUrl(configuredWsUrl || rpcUrl);
if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
  throw new Error(
    'Unable to resolve a valid WebSocket URL. Set WS_URL explicitly (ws:// or wss://).',
  );
}

const contractAddress = configuredContractAddress;
const normalizedContractAddress = normalizeHexAddress(contractAddress);
const provider = new RpcProvider({ nodeUrl: rpcUrl });
const channel = new WebSocketChannel({
  nodeUrl: wsUrl,
  websocket: WebSocket as unknown as typeof globalThis.WebSocket,
  autoReconnect: true,
  reconnectOptions: {
    retries: wsReconnectRetries,
    delay: wsReconnectDelayMs,
  },
  requestTimeout: wsRequestTimeoutMs,
  maxBufferSize: wsMaxBufferSize,
});

let abiEventsMap: ReturnType<typeof events.getAbiEvents> | undefined;
let abiStructMap: ReturnType<typeof CallData.getAbiStruct> | undefined;
let abiEnumMap: ReturnType<typeof CallData.getAbiEnum> | undefined;
let functionNameBySelector = new Map<string, string>();

let lastProcessedBlock = -1;
let queuedTransactions: Promise<void> = Promise.resolve();
const inFlightTransactions = new Set<string>();
const recentlyProcessedTransactions = new Set<string>();

async function readAbiFromDisk() {
  const fallbackAbiPaths = [
    path.resolve(process.cwd(), '..', 'groovv-app', 'lib', 'contract', 'groovvAbi.json'),
    path.resolve(
      process.cwd(),
      '..',
      'contracts',
      'target',
      'dev',
      'groovv_Groovv.abi.extracted.json',
    ),
  ];

  const candidatePaths = configuredAbiPath
    ? [path.resolve(configuredAbiPath), ...fallbackAbiPaths]
    : fallbackAbiPaths;

  for (const candidatePath of candidatePaths) {
    try {
      const content = stripBom(await readFile(candidatePath, 'utf8'));
      const abi = JSON.parse(content) as Abi;
      return {
        abi,
        abiPath: candidatePath,
      };
    } catch {
      continue;
    }
  }

  throw new Error(
    `Unable to read Groovv ABI. Checked: ${candidatePaths.join(', ')}`,
  );
}

async function readState() {
  try {
    const raw = await readFile(stateFile, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ListenerState>;
    if (typeof parsed.lastProcessedBlock === 'number') {
      return parsed.lastProcessedBlock;
    }
    return -1;
  } catch {
    return -1;
  }
}

async function writeState(nextLastProcessedBlock: number) {
  const state: ListenerState = { lastProcessedBlock: nextLastProcessedBlock };
  await writeFile(stateFile, JSON.stringify(state, null, 2), 'utf8');
}

async function advanceState(blockNumber: number) {
  if (blockNumber <= lastProcessedBlock) return;
  lastProcessedBlock = blockNumber;
  await writeState(lastProcessedBlock);
}

async function postEvents(params: {
  blockNumber: number;
  blockHash?: string;
  transactionHash: string;
  events: ListenerEvent[];
}) {
  if (params.events.length === 0) return;

  const endpoint = `${appBaseUrl.replace(/\/$/, '')}/api/listener/events`;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (listenerSecret) {
    headers['x-listener-secret'] = listenerSecret;
  }

  logListenerEvent('posting groovv events', {
    transactionHash: params.transactionHash,
    endpoint,
    blockNumber: params.blockNumber,
    blockHash: params.blockHash ?? null,
    eventCount: params.events.length,
    eventNames: params.events.map((event) => event.name),
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      blockNumber: params.blockNumber,
      blockHash: params.blockHash,
      transactionHash: params.transactionHash,
      contractAddress,
      events: params.events,
    }),
  });

  const responseText = await response.text();
  let responseBody: unknown = responseText;
  try {
    responseBody = JSON.parse(responseText);
  } catch {
    responseBody = responseText;
  }

  if (!response.ok) {
    throw new Error(
      `Listener POST failed (${response.status}): ${responseText || 'no body'}`,
    );
  }

  logListenerEvent('events posted', {
    transactionHash: params.transactionHash,
    endpoint,
    status: response.status,
    response: isRecord(responseBody) ? responseBody : { body: String(responseBody) },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTransactionReceiptWithRetry(transactionHash: string) {
  const maxAttempts = Math.max(1, receiptRetryCount);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await provider.getTransactionReceipt(transactionHash);
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }
      await sleep(Math.max(100, receiptRetryDelayMs) * attempt);
    }
  }

  throw new Error(`Failed to fetch receipt for ${transactionHash}`);
}

function pruneRecentTransactions() {
  const maxSize = Math.max(100, txCacheSize);
  while (recentlyProcessedTransactions.size > maxSize) {
    const oldest = recentlyProcessedTransactions.values().next().value;
    if (typeof oldest !== 'string') break;
    recentlyProcessedTransactions.delete(oldest);
  }
}

function extractReceiptEvents(receipt: unknown): EmittedEvent[] {
  if (!isRecord(receipt) || !Array.isArray(receipt['events'])) {
    return [];
  }

  return receipt['events'].filter((entry): entry is EmittedEvent => {
    return (
      isRecord(entry) &&
      typeof entry['from_address'] === 'string' &&
      Array.isArray(entry['keys']) &&
      Array.isArray(entry['data'])
    );
  });
}

function getReceiptBlockNumber(receipt: unknown) {
  if (!isRecord(receipt)) return undefined;
  return parseOptionalBlockNumber(receipt['block_number']);
}

function requireAbiContext() {
  if (!abiEventsMap || !abiStructMap || !abiEnumMap) {
    throw new Error('ABI parser context is not initialized.');
  }
  return {
    abiEventsMap,
    abiStructMap,
    abiEnumMap,
  };
}

function buildFunctionSelectorMap(abi: Abi) {
  const map = new Map<string, string>();
  const entries = abi as AbiEntry[];

  const registerFunction = (functionName: string) => {
    const selectorHex = selector.getSelectorFromName(functionName).toLowerCase();
    if (!map.has(selectorHex)) {
      map.set(selectorHex, functionName);
    }
  };

  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const entryRecord = entry as Record<string, unknown>;

    if (
      entryRecord['type'] === 'function' &&
      typeof entryRecord['name'] === 'string'
    ) {
      registerFunction(entryRecord['name']);
      continue;
    }

    if (
      entryRecord['type'] === 'interface' &&
      Array.isArray(entryRecord['items'])
    ) {
      for (const item of entryRecord['items']) {
        if (
          isRecord(item) &&
          item['type'] === 'function' &&
          typeof item['name'] === 'string'
        ) {
          registerFunction(item['name']);
        }
      }
    }
  }

  return map;
}

function summarizeFunctionCallsFromTrace(trace: unknown): FunctionCallSummary[] {
  const seen = new Set<string>();
  const results: FunctionCallSummary[] = [];

  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry);
      return;
    }
    if (!isRecord(node)) return;

    const contractAddr =
      typeof node['contract_address'] === 'string'
        ? node['contract_address']
        : undefined;
    const selectorHex =
      typeof node['entry_point_selector'] === 'string'
        ? node['entry_point_selector']
        : undefined;
    const calldataRaw = Array.isArray(node['calldata']) ? node['calldata'] : [];

    if (
      contractAddr &&
      selectorHex &&
      normalizeHexAddress(contractAddr) === normalizedContractAddress
    ) {
      const selectorLower = selectorHex.toLowerCase();
      const functionName =
        functionNameBySelector.get(selectorLower) ?? `unknown(${selectorLower})`;
      const calldata = calldataRaw.map((value) => String(value));
      const key = `${contractAddr.toLowerCase()}|${selectorLower}|${calldata.join(',')}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          contractAddress: contractAddr.toLowerCase(),
          entryPointSelector: selectorLower,
          functionName,
          calldata,
        });
      }
    }

    for (const value of Object.values(node)) {
      walk(value);
    }
  };

  walk(trace);
  return results;
}

async function getFunctionCallsForTransaction(
  transactionHash: string,
): Promise<FunctionCallSummary[]> {
  try {
    const trace = await provider.getTransactionTrace(transactionHash);
    const tracedCalls = summarizeFunctionCallsFromTrace(trace);
    if (tracedCalls.length > 0) {
      return tracedCalls;
    }
  } catch (error) {
    logListenerEvent('failed to fetch tx trace', {
      transactionHash,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return [];
}

function parseContractEvents(contractEvents: EmittedEvent[]): ParsedContractEvent[] {
  if (contractEvents.length === 0) return [];

  const context = requireAbiContext();
  const parsedEvents = events.parseEvents(
    contractEvents,
    context.abiEventsMap,
    context.abiStructMap,
    context.abiEnumMap,
  );
  return parseAllContractEvents(parsedEvents as unknown[]);
}

async function processTransaction(params: QueueTransactionParams) {
  logListenerEvent('processing transaction', {
    transactionHash: params.transactionHash,
    blockNumber: params.blockNumber ?? null,
    blockHash: params.blockHash ?? null,
  });

  const receipt = await getTransactionReceiptWithRetry(params.transactionHash);
  const tracedFunctionCalls = await getFunctionCallsForTransaction(params.transactionHash);
  const receiptEvents = extractReceiptEvents(receipt);

  const contractEvents = receiptEvents.filter((event) => {
    return normalizeHexAddress(event.from_address) === normalizedContractAddress;
  });

  if (contractEvents.length === 0) {
    const addressesInReceipt = Array.from(
      new Set(
        receiptEvents
          .map((event) => normalizeHexAddress(event.from_address))
          .filter((address) => Boolean(address)),
      ),
    );

    logListenerEvent('ignoring transaction without contract events', {
      transactionHash: params.transactionHash,
      receiptEventCount: receiptEvents.length,
      expectedContractAddress: normalizedContractAddress,
      receiptFromAddresses: addressesInReceipt,
    });
    return;
  }

  const decodedContractEvents = parseContractEvents(contractEvents);
  logDecodedContractEvents({
    transactionHash: params.transactionHash,
    decodedEvents: decodedContractEvents,
  });

  const groovvEvents = decodedContractEvents
    .filter((event) => event.isGroovv)
    .map((event) => ({
      name: event.eventName,
      payload: event.payload,
    }));
  if (groovvEvents.length === 0) {
    logListenerEvent('ignoring transaction without groovv events', {
      transactionHash: params.transactionHash,
      contractEventCount: contractEvents.length,
      decodedEventPaths: decodedContractEvents.map((event) => event.eventPath),
    });
    return;
  }

  const resolvedBlockNumber = params.blockNumber ?? getReceiptBlockNumber(receipt);
  if (resolvedBlockNumber === undefined) {
    throw new Error(
      `Cannot resolve block number for transaction ${params.transactionHash}`,
    );
  }

  const resolvedBlockHash = params.blockHash ?? readStringField(receipt, 'block_hash');

  const logBatchParams: {
    transactionHash: string;
    blockNumber: number;
    blockHash?: string;
    events: ListenerEvent[];
  } = {
    transactionHash: params.transactionHash,
    blockNumber: resolvedBlockNumber,
    events: groovvEvents,
  };
  if (resolvedBlockHash) {
    logBatchParams.blockHash = resolvedBlockHash;
  }

  logGroovvEventBatch(logBatchParams);
  for (const event of groovvEvents) {
    const mappedFunction = EVENT_TO_FUNCTION[event.name] ?? 'unknown';
    console.log('[listener:contract-action]', {
      tx: params.transactionHash,
      event: event.name,
      function: mappedFunction,
      payload: event.payload,
    });
    console.log(
      `[listener:groovv-emitted] tx=${params.transactionHash} event=${event.name} function=${mappedFunction}`,
    );
  }
  if (tracedFunctionCalls.length > 0) {
    for (const call of tracedFunctionCalls) {
      console.log('[listener:tx-function-call]', {
        tx: params.transactionHash,
        function: call.functionName,
        selector: call.entryPointSelector,
        calldata: call.calldata,
      });
    }
  } else {
    logListenerEvent('no direct groovv function trace found for tx', {
      transactionHash: params.transactionHash,
      note: 'Node trace may omit nested invoke details for this transaction.',
    });
  }

  const eventBatch: {
    blockNumber: number;
    blockHash?: string;
    transactionHash: string;
    events: ListenerEvent[];
  } = {
    blockNumber: resolvedBlockNumber,
    transactionHash: params.transactionHash,
    events: groovvEvents,
  };
  if (resolvedBlockHash) {
    eventBatch.blockHash = resolvedBlockHash;
  }

  await postEvents(eventBatch);
  await advanceState(resolvedBlockNumber);

  logListenerEvent('transaction processed', {
    transactionHash: params.transactionHash,
    blockNumber: resolvedBlockNumber,
    blockHash: resolvedBlockHash ?? null,
    groovvEventCount: groovvEvents.length,
  });
}

function queueTransaction(params: QueueTransactionParams) {
  const txHash = params.transactionHash.trim();
  if (!txHash) return;

  const cacheKey = txHash.toLowerCase();
  if (
    inFlightTransactions.has(cacheKey) ||
    recentlyProcessedTransactions.has(cacheKey)
  ) {
    logListenerEvent('skipping duplicate transaction', {
      transactionHash: txHash,
      inFlight: inFlightTransactions.has(cacheKey),
      recentlyProcessed: recentlyProcessedTransactions.has(cacheKey),
    });
    return;
  }

  inFlightTransactions.add(cacheKey);
  logListenerEvent('queued transaction', {
    transactionHash: txHash,
    blockNumber: params.blockNumber ?? null,
    blockHash: params.blockHash ?? null,
    inFlightCount: inFlightTransactions.size,
  });

  queuedTransactions = queuedTransactions
    .then(async () => {
      const processParams: QueueTransactionParams = {
        transactionHash: txHash,
      };
      if (params.blockNumber !== undefined) {
        processParams.blockNumber = params.blockNumber;
      }
      if (params.blockHash !== undefined) {
        processParams.blockHash = params.blockHash;
      }

      await processTransaction(processParams);
      recentlyProcessedTransactions.add(cacheKey);
      pruneRecentTransactions();
    })
    .catch((error) => {
      console.error(`Failed to process transaction ${txHash}:`, error);
    })
    .finally(() => {
      inFlightTransactions.delete(cacheKey);
      logListenerEvent('transaction queue slot released', {
        transactionHash: txHash,
        inFlightCount: inFlightTransactions.size,
      });
    });
}

app.get('/health', async (_req, res) => {
  try {
    const latest = await provider.getBlock('latest');
    const latestBlockNumber = toBlockNumber(latest);

    res.json({
      ok: true,
      contractAddress,
      wsEndpoint: redactEndpoint(wsUrl),
      websocketConnected: channel.isConnected(),
      latestBlock: latestBlockNumber,
      lastProcessedBlock,
      inFlightTransactions: inFlightTransactions.size,
      cachedTransactions: recentlyProcessedTransactions.size,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown listener error',
    });
  }
});

async function startListener() {
  logListenerEvent('event logging enabled', {
    enabled: listenerEventLoggingEnabled,
  });

  channel.on('open', () => {
    console.log('Listener websocket connected.');
  });
  channel.on('close', (event) => {
    console.warn(
      `Listener websocket closed (code: ${event.code}, reason: ${event.reason || 'n/a'}).`,
    );
  });
  channel.on('error', (event) => {
    console.error('Listener websocket error:', event);
  });

  await channel.waitForConnection();

  const subscriptionStart = lastProcessedBlock >= 0 ? lastProcessedBlock + 1 : 'latest';
  const eventSubscription = await channel.subscribeEvents(
    contractAddress,
    undefined,
    subscriptionStart,
  );

  eventSubscription.on((eventData) => {
    const txHash = readStringField(eventData, 'transaction_hash');
    if (!txHash) {
      logListenerEvent('received event without transaction hash', {
        eventDataType: typeof eventData,
        eventKeys: isRecord(eventData) ? Object.keys(eventData) : [],
      });
      return;
    }

    const blockNumber = isRecord(eventData)
      ? parseOptionalBlockNumber(eventData['block_number'])
      : undefined;
    const blockHash = readStringField(eventData, 'block_hash');

    const transactionParams: QueueTransactionParams = {
      transactionHash: txHash,
    };
    if (blockNumber !== undefined) {
      transactionParams.blockNumber = blockNumber;
    }
    if (blockHash !== undefined) {
      transactionParams.blockHash = blockHash;
    }

    logListenerEvent('received websocket contract event', {
      transactionHash: txHash,
      blockNumber: blockNumber ?? null,
      blockHash: blockHash ?? null,
    });

    queueTransaction(transactionParams);
  });

  console.log(
    `Subscribed to contract events on ${contractAddress} via ${redactEndpoint(wsUrl)}, start block: ${String(subscriptionStart)}.`,
  );
}

async function main() {
  const abiResult = await readAbiFromDisk();
  abiEventsMap = events.getAbiEvents(abiResult.abi);
  abiStructMap = CallData.getAbiStruct(abiResult.abi);
  abiEnumMap = CallData.getAbiEnum(abiResult.abi);
  functionNameBySelector = buildFunctionSelectorMap(abiResult.abi);
  lastProcessedBlock = await readState();

  logListenerEvent('loaded groovv abi', {
    abiPath: abiResult.abiPath,
    functionCount: functionNameBySelector.size,
  });
  logListenerEvent('listener configuration', {
    contractAddress: normalizedContractAddress,
    rpcUrl: redactEndpoint(rpcUrl ?? ''),
    wsUrl: redactEndpoint(wsUrl),
    appBaseUrl,
    stateFile,
  });

  app.listen(port, () => {
    console.log(`Groovv listener listening on port ${port}`);
  });

  await startListener();
}

void main().catch((error) => {
  console.error('\nFailed to start listener:', error, '\n');
  process.exitCode = 1;
});
