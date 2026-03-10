'use client';
import React, {createContext, useContext, useState} from 'react';
import {connect, disconnect, StarknetWindowObject} from 'starknetkit';
import {InjectedConnector} from 'starknetkit/injected';
import {createUser, setUserPreferences} from '@/actions/userActions';
import {useQuery, useQueryClient} from '@tanstack/react-query';

// Fetcher: user library
const fetchUserLibrary = async (walletAddress: string) => {
  let res = await fetch(`/api/library?userId=${walletAddress}`, {
    cache: 'no-store',
  });

  if (res.status === 404) {
    try {
      await createUser({contractAddress: walletAddress});
      res = await fetch(`/api/library?userId=${walletAddress}`, {
        cache: 'no-store',
      });
    } catch (error) {
      console.error('Failed to bootstrap wallet user', error);
      return false;
    }
  }

  if (!res.ok) {
    throw new Error(`Failed to load library (${res.status})`);
  }

  return res.json();
};

interface WalletContextType {
  address: string;
  connection: any;
  connectWallet: () => Promise<string>;
  disconnectWallet: () => Promise<void>;
  isNewUser: boolean;
  library?: any;
  isLibraryLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [connection, setConnection] = useState<any>(null);
  const [address, setAddress] = useState<string>('');
  const [isNewUser, setIsNewUser] = useState(false);
  const queryClient = useQueryClient();

  const {data: library, isLoading: isLibraryLoading} = useQuery({
    queryKey: ['userLibrary', address],
    queryFn: () => fetchUserLibrary(address),
    enabled: !!address, // only fetch if address exists
    retry: false,
  });

  const connectWallet = async () => {
    const {wallet, connectorData} = await connect({
      modalMode: 'canAsk',
      modalTheme: 'system',
      connectors: [
        new InjectedConnector({
          options: {id: 'argentX', name: 'Ready Wallet'},
        }),
        new InjectedConnector({
          options: {id: 'braavos', name: 'Braavos'},
        }),
      ],
    });

    if (wallet && connectorData) {
      console.log('Wallet connection detected');
      const walletAddress = connectorData.account || '';
      console.log('Wallet', walletAddress);
      setConnection(wallet);
      setAddress(walletAddress);
      await queryClient.invalidateQueries({
        queryKey: ['userLibrary', walletAddress],
        exact: true,
      });
      await queryClient.prefetchQuery({
        queryKey: ['userLibrary', walletAddress],
        queryFn: () => fetchUserLibrary(walletAddress),
      });
      return connectorData.account!;
    }
    throw new Error('Wallet connection failed');
  };

  const disconnectWallet = async () => {
    await disconnect();
    setAddress('');
    setConnection(null);
    setIsNewUser(false);
    queryClient.refetchQueries({queryKey: ['userLibrary']});
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        connection,
        connectWallet,
        disconnectWallet,
        isNewUser,
        library,
        isLibraryLoading,
      }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
