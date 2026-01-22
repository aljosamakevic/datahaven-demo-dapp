import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { initWasm } from '@storagehub-sdk/core';
import {
  connectWallet as connectWalletService,
  disconnectWallet,
  getConnectedAddress,
  initPolkadotApi,
  restoreWalletConnection,
} from '../../utils/services/clientService';
import {
  connectToMsp,
  getMspInfo,
  getMspHealth,
  authenticateUser as authUser,
  disconnectMsp,
  isAuthenticated as checkAuth,
  getUserProfile,
} from '../../utils/services/mspService';
import type { AppState, InfoResponse, UserInfo, HealthStatus } from '../types';

interface AppContextType extends AppState {
  // Actions
  connectWallet: () => Promise<void>;
  disconnect: () => void;
  connectMsp: () => Promise<void>;
  authenticateUser: () => Promise<void>;
  getMspHealthStatus: () => Promise<HealthStatus>;
  // Loading states
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

let wasmInitialized = false;

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    isWalletConnected: false,
    isMspConnected: false,
    isAuthenticated: false,
    address: null,
    mspInfo: null,
    userProfile: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Initialize WASM if not already done
      if (!wasmInitialized) {
        await initWasm();
        wasmInitialized = true;
      }

      const address = await connectWalletService();
      await initPolkadotApi();

      setState((prev) => ({
        ...prev,
        isWalletConnected: true,
        address,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWallet();
    disconnectMsp();
    setState({
      isWalletConnected: false,
      isMspConnected: false,
      isAuthenticated: false,
      address: null,
      mspInfo: null,
      userProfile: null,
    });
  }, []);

  const connectMsp = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await connectToMsp();
      const mspInfo: InfoResponse = await getMspInfo();

      setState((prev) => ({
        ...prev,
        isMspConnected: true,
        mspInfo,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to MSP';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authenticateUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile: UserInfo = await authUser();

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        userProfile: profile,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to authenticate';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMspHealthStatus = useCallback(async (): Promise<HealthStatus> => {
    try {
      return await getMspHealth();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get MSP health';
      setError(message);
      throw err;
    }
  }, []);

  // Restore session from storage on mount
  useEffect(() => {
    const restoreSession = async () => {
      // Check if we have persisted state to restore
      const persistedAddress = getConnectedAddress();
      if (!persistedAddress) {
        return;
      }

      setIsLoading(true);
      try {
        // Initialize WASM if needed
        if (!wasmInitialized) {
          await initWasm();
          wasmInitialized = true;
        }

        // Try to restore wallet connection
        const restoredAddress = await restoreWalletConnection();
        if (!restoredAddress) {
          // Wallet no longer connected, state was cleared
          return;
        }

        // Initialize Polkadot API
        await initPolkadotApi();

        // Check if we have a valid session
        const isAuth = checkAuth();
        const profile = getUserProfile();

        // If we have auth, reconnect to MSP
        if (isAuth) {
          await connectToMsp();
          const mspInfo: InfoResponse = await getMspInfo();

          setState({
            isWalletConnected: true,
            isMspConnected: true,
            isAuthenticated: true,
            address: restoredAddress,
            mspInfo,
            userProfile: profile,
          });
        } else {
          setState((prev) => ({
            ...prev,
            isWalletConnected: true,
            address: restoredAddress,
          }));
        }
      } catch {
        // Failed to restore session, start fresh
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const value: AppContextType = {
    ...state,
    connectWallet,
    disconnect,
    connectMsp,
    authenticateUser,
    getMspHealthStatus,
    isLoading,
    error,
    clearError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}
