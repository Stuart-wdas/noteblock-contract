'use client';

import {
  CallData,
  Contract,
  hash,
  uint256,
  type AccountInterface,
} from 'starknet';
import groovvAbi from './groovvAbi.json';

type Numeric = bigint | number | string;

export type MintSongInput = {
  artistAddress: string;
  title: string;
  genre: string;
  lengthSeconds: Numeric;
  releaseDate: Numeric;
  cid: string;
  price: Numeric;
  copies: Numeric;
  featAddresses?: string[];
};

export type CreateAlbumInput = {
  artistAddress: string;
  name: string;
  genre: string;
  releaseDate: Numeric;
  songIds: Numeric[];
};

export type ListingOnChain = {
  seller: string;
  songId: string;
  price: string;
  copies: string;
};

const contractAbi = groovvAbi as unknown as any[];
const MAX_U256 = (BigInt(1) << BigInt(256)) - BigInt(1);
const MINT_APPROVAL_FLOOR = BigInt('1000000000000000000000000'); // 1e24

export function getGroovvContractAddress() {
  const address = process.env.NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS?.trim();
  if (!address) {
    throw new Error(
      'Missing NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS in groovv-app/.env',
    );
  }
  return address;
}

export function getGroovvPaymentTokenAddress() {
  const address =
    process.env.NEXT_PUBLIC_GROOVV_PAYMENT_TOKEN_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS?.trim();
  if (!address) {
    throw new Error(
      'Missing NEXT_PUBLIC_GROOVV_PAYMENT_TOKEN_ADDRESS (or NEXT_PUBLIC_USDC_TOKEN_ADDRESS) in groovv-app/.env',
    );
  }
  return address;
}

function toBigInt(value: Numeric) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  return BigInt(value);
}

function toU256(value: Numeric) {
  return uint256.bnToUint256(toBigInt(value));
}

function toU128(value: Numeric) {
  const parsed = toBigInt(value);
  const maxU128 = (BigInt(1) << BigInt(128)) - BigInt(1);
  if (parsed < 0 || parsed > maxU128) {
    throw new Error(`Value ${parsed.toString()} is out of range for u128`);
  }
  return parsed.toString();
}

function unwrapCallResult(value: unknown) {
  if (Array.isArray(value)) {
    return value[0];
  }
  if (value && typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>);
    if (values.length === 1) {
      return values[0];
    }
  }
  return value;
}

function u256ToBigInt(value: unknown) {
  if (Array.isArray(value)) {
    const [lowRaw, highRaw = 0] = value as Array<string | number | bigint>;
    const low = BigInt(lowRaw);
    const high = BigInt(highRaw);
    return (high << BigInt(128)) + low;
  }

  if (value && typeof value === 'object' && 'low' in value && 'high' in value) {
    const low = BigInt((value as { low: string | number }).low);
    const high = BigInt((value as { high: string | number }).high);
    return (high << BigInt(128)) + low;
  }

  return BigInt(value as string | number | bigint);
}

function u256ToString(value: unknown) {
  return u256ToBigInt(value).toString();
}

function toHexAddress(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '0x0';
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      try {
        return `0x${BigInt(trimmed).toString(16)}`;
      } catch {
        return trimmed.toLowerCase();
      }
    }
    try {
      return `0x${BigInt(trimmed).toString(16)}`;
    } catch {
      return trimmed.toLowerCase();
    }
  }

  if (typeof value === 'bigint' || typeof value === 'number') {
    try {
      return `0x${BigInt(value).toString(16)}`;
    } catch {
      return '0x0';
    }
  }

  return '0x0';
}

function parseListingResult(value: unknown): ListingOnChain | null {
  if (Array.isArray(value)) {
    if (value.length >= 4) {
      return {
        seller: toHexAddress(value[0]),
        songId: u256ToString(value[1]),
        price: u256ToString(value[2]),
        copies: u256ToString(value[3]),
      };
    }
    if (value.length === 1) {
      return parseListingResult(value[0]);
    }
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if ('result' in record) {
      return parseListingResult(record.result);
    }

    if ('listing' in record) {
      return parseListingResult(record.listing);
    }

    const seller = record.seller;
    const songId = record.song_id ?? record.songId;
    const price = record.price;
    const copies = record.copies;
    if (
      seller !== undefined &&
      songId !== undefined &&
      price !== undefined &&
      copies !== undefined
    ) {
      return {
        seller: toHexAddress(seller),
        songId: u256ToString(songId),
        price: u256ToString(price),
        copies: u256ToString(copies),
      };
    }

    const values = Object.values(record);
    if (values.length === 1) {
      return parseListingResult(values[0]);
    }
  }

  return null;
}

function getContract(accountOrProvider: AccountInterface | unknown) {
  return new Contract({
    abi: contractAbi,
    address: getGroovvContractAddress(),
    providerOrAccount: accountOrProvider as any,
  });
}

const erc20Abi = [
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      {
        name: 'owner',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'spender',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      {
        name: 'spender',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'external',
  },
] as unknown as any[];

function getPaymentTokenContract(
  accountOrProvider: AccountInterface | unknown,
) {
  return new Contract({
    abi: erc20Abi,
    address: getGroovvPaymentTokenAddress(),
    providerOrAccount: accountOrProvider as any,
  });
}

async function ensurePaymentTokenAllowance(
  account: AccountInterface,
  minimumRequired: bigint,
) {
  const token = getPaymentTokenContract(account);
  const spender = getGroovvContractAddress();
  const owner = account.address;

  const currentAllowanceRaw = await token.call('allowance', [owner, spender]);
  const currentAllowance = u256ToBigInt(unwrapCallResult(currentAllowanceRaw));
  if (currentAllowance >= minimumRequired) {
    return;
  }

  const approveCall = token.populate('approve', [spender, toU256(MAX_U256)]);
  const approveTx = await account.execute(approveCall);
  await account.waitForTransaction(approveTx.transaction_hash);
}

function extractEventPayload(parsedEvents: any[], eventName: string) {
  for (const event of parsedEvents ?? []) {
    for (const [path, payload] of Object.entries(event ?? {})) {
      if (
        path === 'block_hash' ||
        path === 'block_number' ||
        path === 'transaction_hash'
      ) {
        continue;
      }
      if (path.toLowerCase().includes(eventName.toLowerCase())) {
        return payload as Record<string, unknown>;
      }
    }
  }
  return null;
}

async function executeAndWait(
  account: AccountInterface,
  method: string,
  args: any[],
) {
  const contract = getContract(account);
  const call = contract.populate(method, args);

  console.log('[groovv:invoke:start]', {
    method,
    contractAddress: getGroovvContractAddress(),
    accountAddress: account.address,
    args,
    calldata: Array.isArray(call.calldata)
      ? call.calldata.map((value) => String(value))
      : call.calldata,
  });

  const tx = await account.execute(call);

  console.log('[groovv:invoke:tx]', {
    method,
    txHash: tx.transaction_hash,
  });

  const txHash = tx.transaction_hash;
  const receipt = await account.waitForTransaction(txHash);
  const parsedEvents = contract.parseEvents(receipt as any) as any[];

  console.log('[groovv:invoke:receipt]', {
    method,
    txHash,
    parsedEventCount: parsedEvents.length,
    parsedEventKeys: parsedEvents.flatMap((event) =>
      Object.keys(event ?? {}).filter(
        (key) =>
          key !== 'block_hash' &&
          key !== 'block_number' &&
          key !== 'transaction_hash',
      ),
    ),
  });

  return { txHash, parsedEvents };
}

export async function mintSongOnChain(
  account: AccountInterface,
  input: MintSongInput,
) {
  // Minting charges a dynamic fee in the payment token. Keep a high allowance.
  await ensurePaymentTokenAllowance(account, MINT_APPROVAL_FLOOR);

  const { txHash, parsedEvents } = await executeAndWait(account, 'mint_song', [
    {
      name: input.title,
      artist: input.artistAddress,
      genre: input.genre,
      length: toU256(input.lengthSeconds),
      releaseDate: toU256(input.releaseDate),
      feat: input.featAddresses ?? [],
      CID: `0x${hash.starknetKeccak(input.cid).toString(16)}`,
    },
    toU128(input.price),
    toU128(input.copies),
  ]);

  const songCreated = extractEventPayload(parsedEvents, 'SongCreated');
  const listingCreated = extractEventPayload(parsedEvents, 'ListingCreated');

  return {
    txHash,
    songId: songCreated?.song_id ? u256ToString(songCreated.song_id) : null,
    listingId: listingCreated?.listing_id
      ? u256ToString(listingCreated.listing_id)
      : null,
  };
}

export async function updateSongPriceOnChain(
  account: AccountInterface,
  listingId: Numeric,
  newPrice: Numeric,
) {
  const { txHash } = await executeAndWait(account, 'update_song_price', [
    toU256(listingId),
    toU256(newPrice),
  ]);

  return { txHash };
}

export async function buySongOnChain(
  account: AccountInterface,
  listingId: Numeric,
  expectedPrice: Numeric,
  copies: Numeric,
  tip: Numeric = 0,
) {
  const minimumAllowance =
    toBigInt(expectedPrice) * toBigInt(copies) + toBigInt(tip);
  await ensurePaymentTokenAllowance(account, minimumAllowance);

  const { txHash } = await executeAndWait(account, 'buy_song', [
    toU256(listingId),
    toU256(expectedPrice),
    toU256(copies),
    toU256(tip),
  ]);

  return { txHash };
}

export async function listSongOnChain(
  account: AccountInterface,
  songId: Numeric,
  price: Numeric,
  copies: Numeric,
) {
  const { txHash, parsedEvents } = await executeAndWait(account, 'list_song', [
    toU256(songId),
    toU256(price),
    toU256(copies),
  ]);

  const listingCreated = extractEventPayload(parsedEvents, 'ListingCreated');

  return {
    txHash,
    listingId: listingCreated?.listing_id
      ? u256ToString(listingCreated.listing_id)
      : null,
  };
}

export async function removeListingOnChain(
  account: AccountInterface,
  listingId: Numeric,
  copies: Numeric,
) {
  const { txHash } = await executeAndWait(account, 'remove_listing', [
    toU256(listingId),
    toU256(copies),
  ]);

  return { txHash };
}

export async function createAlbumOnChain(
  account: AccountInterface,
  input: CreateAlbumInput,
) {
  const { txHash, parsedEvents } = await executeAndWait(
    account,
    'create_album',
    [
      {
        name: input.name,
        artist: input.artistAddress,
        genre: input.genre,
        releaseDate: toU256(input.releaseDate),
        songs: input.songIds.map((songId) => toU256(songId)),
      },
    ],
  );

  const created = extractEventPayload(parsedEvents, 'AlbumCreated');

  return {
    txHash,
    albumId: created?.album_id ? u256ToString(created.album_id) : null,
  };
}

export async function addSongToAlbumOnChain(
  account: AccountInterface,
  albumId: Numeric,
  songId: Numeric,
) {
  const { txHash } = await executeAndWait(account, 'add_song_to_album', [
    toU256(albumId),
    toU256(songId),
  ]);

  return { txHash };
}

export async function getSongOnChain(
  accountOrProvider: AccountInterface | unknown,
  songId: Numeric,
) {
  const contract = getContract(accountOrProvider);
  return contract.call('get_song', [toU256(songId)]);
}

export async function getListingOnChain(
  accountOrProvider: AccountInterface | unknown,
  listingId: Numeric,
): Promise<ListingOnChain> {
  const contract = getContract(accountOrProvider);
  const raw = await contract.call('get_listing', [toU256(listingId)]);
  const parsed = parseListingResult(raw);
  if (!parsed) {
    throw new Error(
      `Could not parse on-chain listing response for listing ${toBigInt(listingId).toString()}.`,
    );
  }
  return parsed;
}

type ContractCaller = {
  callContract: (request: {
    contractAddress: string;
    entrypoint: string;
    calldata?: string[];
  }) => Promise<unknown>;
};

function resolveContractCaller(accountOrProvider: AccountInterface | unknown) {
  const maybeDirect = accountOrProvider as Partial<ContractCaller>;
  if (typeof maybeDirect.callContract === 'function') {
    return maybeDirect as ContractCaller;
  }

  const maybeWithProvider = accountOrProvider as {
    provider?: Partial<ContractCaller>;
  };
  if (maybeWithProvider.provider?.callContract) {
    return maybeWithProvider.provider as ContractCaller;
  }

  throw new Error(
    'No Starknet caller available. Connect your wallet or provide a provider.',
  );
}

function parseU256CallResult(result: unknown): bigint {
  if (Array.isArray(result)) {
    if (result.length >= 2) {
      return u256ToBigInt([result[0], result[1]]);
    }
    if (result.length === 1) {
      return u256ToBigInt(result[0]);
    }
  }

  if (result && typeof result === 'object') {
    if ('result' in result) {
      return parseU256CallResult((result as { result: unknown }).result);
    }
    if ('balance' in result) {
      return parseU256CallResult((result as { balance: unknown }).balance);
    }
  }

  return u256ToBigInt(result);
}

export async function getSongBalanceOnChain(
  accountOrProvider: AccountInterface | unknown,
  ownerAddress: string,
  songId: Numeric,
) {
  const caller = resolveContractCaller(accountOrProvider);
  const contractAddress = getGroovvContractAddress();
  const encodedSongId = toU256(songId);
  const entrypoints = ['get_song_balance', 'balance_of', 'balanceOf'];
  const calldataVariants = [
    {
      label: 'owner+token',
      data: CallData.compile([ownerAddress, encodedSongId]),
    },
    {
      label: 'owner-only',
      data: CallData.compile([ownerAddress]),
    },
  ];

  let lastError: unknown = null;
  for (const { label, data } of calldataVariants) {
    for (const entrypoint of entrypoints) {
      try {
        const result = await caller.callContract({
          contractAddress,
          entrypoint,
          calldata: data,
        });
        const balance = parseU256CallResult(result);
        console.log('[groovv:read:balance]', {
          entrypoint,
          variant: label,
          ownerAddress,
          songId: toBigInt(songId).toString(),
          balance: balance.toString(),
        });
        return balance.toString();
      } catch (error) {
        lastError = error;
      }
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : String(lastError ?? '');
  throw new Error(
    `Could not read on-chain song balance. Tried ${entrypoints.join(', ')} with owner+token and owner-only calldata. ${detail}`,
  );
}
