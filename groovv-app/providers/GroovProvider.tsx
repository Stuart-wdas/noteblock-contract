'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { AccountInterface } from 'starknet';
import { useWallet } from './StarknetProvider';
import {
  addSongToAlbumOnChain,
  buySongOnChain,
  createAlbumOnChain,
  getSongBalanceOnChain,
  getGroovvContractAddress,
  getListingOnChain,
  getSongOnChain,
  listSongOnChain,
  mintSongOnChain,
  removeListingOnChain,
  type MintSongInput,
  type CreateAlbumInput,
  type ListingOnChain,
  updateSongPriceOnChain,
} from '@/lib/contract/groovvClient';

type GroovContextType = {
  contractAddress: string | null;
  isConfigured: boolean;
  mintSong: (input: MintSongInput) => Promise<{
    txHash: string;
    songId: string | null;
    listingId: string | null;
  }>;
  updateSongPrice: (
    listingId: bigint | number | string,
    newPrice: bigint | number | string,
  ) => Promise<{ txHash: string }>;
  buySong: (
    listingId: bigint | number | string,
    expectedPrice: bigint | number | string,
    copies: bigint | number | string,
    tip?: bigint | number | string,
  ) => Promise<{ txHash: string }>;
  removeListing: (
    listingId: bigint | number | string,
    copies: bigint | number | string,
  ) => Promise<{ txHash: string }>;
  listSong: (
    songId: bigint | number | string,
    price: bigint | number | string,
    copies: bigint | number | string,
  ) => Promise<{ txHash: string; listingId: string | null }>;
  createAlbum: (input: CreateAlbumInput) => Promise<{
    txHash: string;
    albumId: string | null;
  }>;
  addSongToAlbum: (
    albumId: bigint | number | string,
    songId: bigint | number | string,
  ) => Promise<{ txHash: string }>;
  getSong: (
    songId: bigint | number | string,
  ) => Promise<Record<string, unknown>>;
  getSongBalance: (
    ownerAddress: string,
    songId: bigint | number | string,
  ) => Promise<string>;
  getListing: (
    listingId: bigint | number | string,
  ) => Promise<ListingOnChain>;
};

const GroovContext = createContext<GroovContextType | undefined>(undefined);

async function requireAccount(
  getAccount: () => Promise<AccountInterface | null>,
): Promise<AccountInterface> {
  const account = await getAccount();
  if (!account) {
    throw new Error(
      'Wallet account unavailable. Please reconnect your wallet and try again.',
    );
  }
  return account;
}

export function GroovProvider({ children }: { children: React.ReactNode }) {
  const { getAccount, connection } = useWallet();

  const contractAddress = useMemo(() => {
    try {
      return getGroovvContractAddress();
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<GroovContextType>(() => {
    return {
      contractAddress,
      isConfigured: Boolean(contractAddress),
      mintSong: async (input) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const account = await requireAccount(getAccount);
        return mintSongOnChain(account, input);
      },
      updateSongPrice: async (listingId, newPrice) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const account = await requireAccount(getAccount);
        return updateSongPriceOnChain(account, listingId, newPrice);
      },
      buySong: async (listingId, expectedPrice, copies, tip = 0) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const account = await requireAccount(getAccount);
        return buySongOnChain(account, listingId, expectedPrice, copies, tip);
      },
      removeListing: async (listingId, copies) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const account = await requireAccount(getAccount);
        return removeListingOnChain(account, listingId, copies);
      },
      listSong: async (songId, price, copies) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const account = await requireAccount(getAccount);
        return listSongOnChain(account, songId, price, copies);
      },
      createAlbum: async (input) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const account = await requireAccount(getAccount);
        return createAlbumOnChain(account, input);
      },
      addSongToAlbum: async (albumId, songId) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const account = await requireAccount(getAccount);
        return addSongToAlbumOnChain(account, albumId, songId);
      },
      getSong: async (songId) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const accountOrProvider = (await getAccount()) ?? connection?.provider;
        if (!accountOrProvider) {
          throw new Error(
            'No Starknet provider available. Please connect your wallet.',
          );
        }
        return (await getSongOnChain(
          accountOrProvider,
          songId,
        )) as Record<string, unknown>;
      },
      getSongBalance: async (ownerAddress, songId) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const accountOrProvider = (await getAccount()) ?? connection?.provider;
        if (!accountOrProvider) {
          throw new Error(
            'No Starknet provider available. Please connect your wallet.',
          );
        }
        return getSongBalanceOnChain(accountOrProvider, ownerAddress, songId);
      },
      getListing: async (listingId) => {
        if (!contractAddress) {
          throw new Error(
            'Contract address not configured. Set NEXT_PUBLIC_GROOVV_CONTRACT_ADDRESS.',
          );
        }
        const accountOrProvider = (await getAccount()) ?? connection?.provider;
        if (!accountOrProvider) {
          throw new Error(
            'No Starknet provider available. Please connect your wallet.',
          );
        }
        return getListingOnChain(accountOrProvider, listingId);
      },
    };
  }, [contractAddress, connection?.provider, getAccount]);

  return (
    <GroovContext.Provider value={value}>{children}</GroovContext.Provider>
  );
}

export function useGroovv() {
  const context = useContext(GroovContext);
  if (!context) {
    throw new Error('useGroovv must be used within GroovProvider');
  }
  return context;
}
