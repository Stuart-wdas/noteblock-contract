'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  connect,
  disconnect,
  type StarknetWindowObject,
} from 'starknetkit';
import {
  RpcProvider,
  WalletAccount,
  type AccountInterface,
  type ProviderInterface,
} from 'starknet';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Fetcher: user library
const fetchUserLibrary = async (walletAddress: string) => {
  const res = await fetch(`/api/library?userId=${walletAddress}`);

  if (!res.ok) {
    throw new Error(`Failed to load library (${res.status})`);
  }

  return res.json();
};

// const DEFAULT_PUBLIC_RPC_URL =
//   'https://starknet-sepolia.public.blastapi.io/rpc/v0_10';

function resolveRpcUrl() {
  return (
    process.env.NEXT_PUBLIC_STARKNET_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_RPC_URL?.trim()
    // DEFAULT_PUBLIC_RPC_URL
  );
}

type WalletConnection = {
  wallet: StarknetWindowObject;
  provider: ProviderInterface;
  account: WalletAccount;
};

interface WalletContextType {
  address: string;
  connection: WalletConnection | null;
  connector: StarknetWindowObject | null;
  connectWallet: () => Promise<string>;
  disconnectWallet: (options?: { logoutSession?: boolean }) => Promise<void>;
  getAccount: () => Promise<AccountInterface | null>;
  isNewUser: boolean;
  library?: any;
  isLibraryLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const provider = useMemo(
    () =>
      new RpcProvider({
        nodeUrl: resolveRpcUrl(),
      }),
    [],
  );

  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [connector, setConnector] = useState<StarknetWindowObject | null>(null);
  const [walletAccount, setWalletAccount] = useState<WalletAccount | null>(
    null,
  );
  const [address, setAddress] = useState<string>('');
  const [isNewUser, setIsNewUser] = useState(false);

  const clearWalletState = useCallback(() => {
    setAddress('');
    setConnection(null);
    setConnector(null);
    setWalletAccount(null);
    setIsNewUser(false);
  }, []);

  const logoutAuthSession = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to logout auth session after wallet disconnect', error);
    } finally {
      queryClient.setQueryData(['authSession'], {
        authenticated: false,
        user: null,
      });
      queryClient.removeQueries({ queryKey: ['userLibrary'] });
      await queryClient.invalidateQueries({ queryKey: ['authSession'] });
    }
  }, [queryClient]);

  const { data: library, isLoading: isLibraryLoading } = useQuery({
    queryKey: ['userLibrary', address],
    queryFn: () => fetchUserLibrary(address),
    enabled: !!address, // only fetch if address exists
    retry: false,
  });

  const updateConnectionState = useCallback(
    (nextConnector: StarknetWindowObject, nextAccount: WalletAccount) => {
      const nextAddress = nextAccount.address.toLowerCase();
      setConnector(nextConnector);
      setWalletAccount(nextAccount);
      setConnection({
        wallet: nextConnector,
        provider,
        account: nextAccount,
      });
      setAddress(nextAddress);
      return nextAddress;
    },
    [provider],
  );

  useEffect(() => {
    if (!connector) return;

    const handleAccountChange = (accounts?: string[]) => {
      const changedAddress = accounts?.[0];

      if (!changedAddress) {
        clearWalletState();
        void logoutAuthSession();
        return;
      }

      const refreshedAccount = new WalletAccount({
        provider,
        walletProvider: connector,
        address: changedAddress,
      });
      updateConnectionState(connector, refreshedAccount);
    };

    const handleNetworkChange = (_chainId?: string, accounts?: string[]) => {
      const changedAddress = accounts?.[0] ?? walletAccount?.address;
      if (!changedAddress) return;

      const refreshedAccount = new WalletAccount({
        provider,
        walletProvider: connector,
        address: changedAddress,
      });
      updateConnectionState(connector, refreshedAccount);
    };

    connector.on('accountsChanged', handleAccountChange);
    connector.on('networkChanged', handleNetworkChange);

    return () => {
      connector.off('accountsChanged', handleAccountChange);
      connector.off('networkChanged', handleNetworkChange);
    };
  }, [
    clearWalletState,
    connector,
    logoutAuthSession,
    provider,
    updateConnectionState,
    walletAccount?.address,
  ]);

  const connectWallet = useCallback(async () => {
    if (walletAccount?.address) {
      return walletAccount.address.toLowerCase();
    }

    const { wallet: walletProvider } = await connect({
      modalMode: 'alwaysAsk',
      modalTheme: 'system',
      dappName: 'Groovv',
      resultType: 'wallet',
    });

    if (!walletProvider) {
      throw new Error('Wallet connection cancelled');
    }

    const connectedAccount = await WalletAccount.connect(
      provider,
      walletProvider,
    );
    return updateConnectionState(walletProvider, connectedAccount);
  }, [walletAccount?.address, provider, updateConnectionState]);

  const disconnectWallet = useCallback(async (options?: { logoutSession?: boolean }) => {
    const shouldLogoutSession = options?.logoutSession !== false;
    await disconnect({ clearLastWallet: true });
    clearWalletState();
    if (shouldLogoutSession) {
      await logoutAuthSession();
    }
  }, [clearWalletState, logoutAuthSession]);

  const getAccount = useCallback(async () => {
    if (walletAccount) return walletAccount;
    if (!connector) return null;

    try {
      const reconnectedAccount = await WalletAccount.connectSilent(
        provider,
        connector,
      );
      updateConnectionState(connector, reconnectedAccount);
      return reconnectedAccount;
    } catch (error) {
      console.error('Failed to restore Starknet WalletAccount', error);
      return null;
    }
  }, [walletAccount, connector, provider, updateConnectionState]);

  return (
    <WalletContext.Provider
      value={{
        address,
        connection,
        connector,
        connectWallet,
        disconnectWallet,
        getAccount,
        isNewUser,
        library,
        isLibraryLoading,
      }}
    >
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
