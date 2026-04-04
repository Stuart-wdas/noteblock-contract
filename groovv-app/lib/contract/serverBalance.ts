import { CallData, RpcProvider, uint256 } from 'starknet';

function resolveRpcUrl() {
  return (
    process.env.NEXT_PUBLIC_STARKNET_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_RPC_URL?.trim() ||
    process.env.RPC_URL?.trim()
  );
}

function resolveContractAddress() {
  return process.env.NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS?.trim();
}

function parseU256(result: unknown): bigint {
  if (Array.isArray(result)) {
    if (result.length >= 2) {
      const low = BigInt(result[0] as string | number | bigint);
      const high = BigInt(result[1] as string | number | bigint);
      return (high << BigInt(128)) + low;
    }
    if (result.length === 1) {
      return parseU256(result[0]);
    }
  }

  if (result && typeof result === 'object') {
    if ('result' in result) {
      return parseU256((result as { result: unknown }).result);
    }
    if ('balance' in result) {
      return parseU256((result as { balance: unknown }).balance);
    }
    if ('low' in result && 'high' in result) {
      const low = BigInt((result as { low: string | number }).low);
      const high = BigInt((result as { high: string | number }).high);
      return (high << BigInt(128)) + low;
    }
  }

  return BigInt(result as string | number | bigint);
}

export async function getSongBalanceFromChain(owner: string, songId: string) {
  const rpcUrl = resolveRpcUrl();
  const contractAddress = resolveContractAddress();

  if (!rpcUrl) {
    throw new Error('Missing RPC URL (NEXT_PUBLIC_STARKNET_RPC_URL, NEXT_PUBLIC_RPC_URL, or RPC_URL)');
  }
  if (!contractAddress) {
    throw new Error('Missing NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS');
  }

  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const encodedSongId = uint256.bnToUint256(BigInt(songId));

  const result = await provider.callContract({
    contractAddress,
    entrypoint: 'get_song_balance',
    calldata: CallData.compile([owner, encodedSongId]),
  });

  return parseU256(result);
}
