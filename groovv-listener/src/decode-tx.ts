import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CallData, events, num, type Abi, type EmittedEvent } from 'starknet';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultTxPath = path.resolve(scriptDir, '..', 'tx.md');
const defaultAbiPath = path.resolve(
  scriptDir,
  '..',
  '..',
  'contracts',
  'target',
  'dev',
  'groovv_Groovv.abi.extracted.json',
);

function stripBom(value: string) {
  return value.replace(/^\uFEFF/, '');
}

function readStringField(block: string, fieldName: string) {
  const match = block.match(new RegExp(`${fieldName}:\\s*'([^']+)'`));
  if (!match || !match[1]) {
    throw new Error(`Unable to parse "${fieldName}" from tx.md event block.`);
  }
  return match[1];
}

function readNumberField(block: string, fieldName: string) {
  const match = block.match(new RegExp(`${fieldName}:\\s*(\\d+)`));
  if (!match || !match[1]) {
    throw new Error(`Unable to parse "${fieldName}" from tx.md event block.`);
  }
  return Number(match[1]);
}

function readHexArrayField(block: string, fieldName: string) {
  const match = block.match(new RegExp(`${fieldName}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match || !match[1]) {
    throw new Error(`Unable to parse "${fieldName}" array from tx.md event block.`);
  }
  return Array.from(match[1].matchAll(/'([^']+)'/g), (entry) => entry[1] ?? '');
}

function parseRawEvents(markdown: string): EmittedEvent[] {
  const blockRegex = /Received new block data:\s*\{([\s\S]*?)\r?\n\}/g;
  const blocks = Array.from(markdown.matchAll(blockRegex), (match) => match[1] ?? '');

  if (blocks.length === 0) {
    throw new Error('No "Received new block data" blocks found in tx.md.');
  }

  return blocks.map((block) => ({
    block_hash: readStringField(block, 'block_hash'),
    block_number: readNumberField(block, 'block_number'),
    data: readHexArrayField(block, 'data'),
    from_address: readStringField(block, 'from_address'),
    keys: readHexArrayField(block, 'keys'),
    transaction_hash: readStringField(block, 'transaction_hash'),
  }));
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') {
    return num.toHex(value);
  }
  return value;
}

async function main() {
  const txPathArg = process.argv[2];
  const abiPathArg = process.argv[3];
  const txPath = txPathArg ? path.resolve(txPathArg) : defaultTxPath;
  const abiPath = abiPathArg ? path.resolve(abiPathArg) : defaultAbiPath;

  const txMarkdown = await readFile(txPath, 'utf8');
  const abiContent = stripBom(await readFile(abiPath, 'utf8'));

  const rawEvents = parseRawEvents(txMarkdown);
  const abi = JSON.parse(abiContent) as Abi;
  const abiEvents = events.getAbiEvents(abi);
  const abiStructs = CallData.getAbiStruct(abi);
  const abiEnums = CallData.getAbiEnum(abi);
  const decodedEvents = events.parseEvents(rawEvents, abiEvents, abiStructs, abiEnums);

  console.log(
    JSON.stringify(
      {
        txPath,
        abiPath,
        rawEventCount: rawEvents.length,
        decodedEvents,
      },
      jsonReplacer,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to decode tx.md: ${message}`);
  process.exitCode = 1;
});
