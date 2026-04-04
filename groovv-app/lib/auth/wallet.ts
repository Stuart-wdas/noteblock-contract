import { randomBytes } from 'node:crypto';
import { RpcProvider, verifyMessageInStarknet } from 'starknet';

function toHexFelt(value: number | bigint) {
  return `0x${BigInt(value).toString(16)}`;
}

function resolveChainId() {
  return process.env.AUTH_WALLET_CHAIN_ID?.trim() || 'SN_SEPOLIA';
}

function resolveRpcUrl() {
  return (
    process.env.AUTH_STARKNET_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_STARKNET_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_RPC_URL?.trim() ||
    process.env.RPC_URL?.trim()
  );
}

function resolveProvider() {
  const nodeUrl = resolveRpcUrl();
  if (!nodeUrl) {
    throw new Error(
      'Missing Starknet RPC URL for wallet signature verification.',
    );
  }
  return new RpcProvider({ nodeUrl });
}

export function buildWalletLoginChallenge(walletAddress: string, ttlMinutes = 5) {
  const issuedAtMs = Date.now();
  const expiresAtMs = issuedAtMs + ttlMinutes * 60 * 1000;
  const nonce = `0x${randomBytes(31).toString('hex')}`;

  const typedData = {
    types: {
      StarkNetDomain: [
        { name: 'name', type: 'shortstring' },
        { name: 'version', type: 'shortstring' },
        { name: 'chainId', type: 'shortstring' },
      ],
      GroovvLogin: [
        { name: 'wallet', type: 'ContractAddress' },
        { name: 'nonce', type: 'felt' },
        { name: 'issuedAt', type: 'felt' },
        { name: 'expiresAt', type: 'felt' },
      ],
    },
    primaryType: 'GroovvLogin',
    domain: {
      name: 'Groovv',
      version: '1',
      chainId: resolveChainId(),
    },
    message: {
      wallet: walletAddress,
      nonce,
      issuedAt: toHexFelt(issuedAtMs),
      expiresAt: toHexFelt(expiresAtMs),
    },
  };

  return {
    nonce,
    typedData,
    expiresAt: new Date(expiresAtMs),
  };
}

export async function verifyWalletLoginSignature(params: {
  walletAddress: string;
  typedData: Record<string, unknown>;
  signature: string[];
}) {
  const provider = resolveProvider();
  return verifyMessageInStarknet(
    provider,
    params.typedData as never,
    params.signature,
    params.walletAddress,
  );
}

