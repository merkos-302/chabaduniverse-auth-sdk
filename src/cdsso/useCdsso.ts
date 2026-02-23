/**
 * useCdsso Hook - React hook for CDSSO authentication
 *
 * Provides a React-friendly interface for the CdssoClient.
 *
 * @example
 * ```tsx
 * import { useCdsso } from '@chabaduniverse/auth-sdk';
 *
 * function MyComponent() {
 *   const { isAuthenticated, user, authenticate, logout } = useCdsso();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={authenticate}>Login</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.name}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CdssoClient } from './cdsso-client';
import type {
  CdssoMerkosConfig,
  CdssoState,
  CdssoUser,
  UseCdssoReturn,
} from './types';
import { initialCdssoState } from './types';
import type { TokenLifecycleConfig, TokenState } from './token-lifecycle';

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useCdsso hook
 *
 * React hook for managing CDSSO authentication state.
 *
 * @param config - Optional Merkos CDSSO configuration
 * @returns CDSSO state and methods
 */
export function useCdsso(config?: Partial<CdssoMerkosConfig>): UseCdssoReturn {
  // Create client ref to persist across renders
  const clientRef = useRef<CdssoClient | null>(null);

  // Initialize client
  if (!clientRef.current) {
    clientRef.current = new CdssoClient(config);
  }

  // State
  const [state, setState] = useState<CdssoState>(() =>
    clientRef.current?.getState() ?? initialCdssoState
  );

  // Subscribe to client state changes
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    // Sync initial state
    setState(client.getState());

    // Subscribe to changes
    const unsubscribe = client.onStateChange((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Initiate CDSSO authentication flow
   */
  const authenticate = useCallback(async (): Promise<CdssoUser | null> => {
    const client = clientRef.current;
    if (!client) return null;
    return client.authenticate();
  }, []);

  /**
   * Check current authentication status
   */
  const checkStatus = useCallback(async (): Promise<CdssoUser | null> => {
    const client = clientRef.current;
    if (!client) return null;
    return client.getAuthStatus();
  }, []);

  /**
   * Log out from CDSSO session
   */
  const logout = useCallback(async (): Promise<boolean> => {
    const client = clientRef.current;
    if (!client) return false;
    return client.logout();
  }, []);

  /**
   * Clear local token storage
   */
  const clearToken = useCallback((): void => {
    const client = clientRef.current;
    if (!client) return;
    client.clearSession();
  }, []);

  /**
   * Get the current bearer token
   */
  const getBearerToken = useCallback((): string | null => {
    const client = clientRef.current;
    if (!client) return null;
    return client.getBearerToken();
  }, []);

  // ============================================================================
  // Derived State
  // ============================================================================

  const isAuthenticated = state.status === 'authenticated';
  const isLoading = state.status === 'checking';

  // ============================================================================
  // Return Value
  // ============================================================================

  return useMemo<UseCdssoReturn>(
    () => ({
      state,
      isAuthenticated,
      isLoading,
      user: state.user,
      token: state.token,
      error: state.error,
      authenticate,
      checkStatus,
      logout,
      clearToken,
      getBearerToken,
    }),
    [state, isAuthenticated, isLoading, authenticate, checkStatus, logout, clearToken, getBearerToken]
  );
}

// ============================================================================
// Auto-Auth Hook
// ============================================================================

/**
 * useCdssoAutoAuth hook
 *
 * Like useCdsso, but automatically attempts authentication on mount.
 *
 * @param config - Optional Merkos CDSSO configuration
 * @returns CDSSO state and methods
 */
export function useCdssoAutoAuth(config?: Partial<CdssoMerkosConfig>): UseCdssoReturn {
  const cdsso = useCdsso(config);
  const hasAttemptedAuth = useRef(false);

  // Attempt authentication on mount
  useEffect(() => {
    if (hasAttemptedAuth.current) return;
    if (cdsso.isAuthenticated) return;
    if (cdsso.isLoading) return;

    hasAttemptedAuth.current = true;
    void cdsso.authenticate();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run on mount and status changes
  }, [cdsso.isAuthenticated, cdsso.isLoading]);

  return cdsso;
}

// ============================================================================
// Auto-Refresh Hook
// ============================================================================

/**
 * Token lifecycle state for the auto-refresh hook
 */
export type { TokenState } from './token-lifecycle';
export type { TokenLifecycleConfig } from './token-lifecycle';

/**
 * Return type for useCdssoAutoRefresh hook
 */
export interface UseCdssoAutoRefreshReturn {
  /** Current token lifecycle state */
  tokenState: TokenState;
  /** Whether the token is currently valid */
  isValid: boolean;
  /** Whether the token is expiring soon */
  isExpiring: boolean;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Whether refresh has failed after max retries */
  hasFailed: boolean;
  /** Manually trigger a refresh attempt */
  retryNow: () => Promise<string | null>;
  /** Start the auto-refresh manager */
  start: () => void;
  /** Stop the auto-refresh manager */
  stop: () => void;
}

/**
 * useCdssoAutoRefresh hook
 *
 * Monitors token expiration and automatically refreshes before expiry.
 * Includes retry logic with configurable intervals.
 *
 * @param config - Token lifecycle configuration
 * @param merkosConfig - Optional Merkos CDSSO configuration
 * @returns Token lifecycle state and controls
 *
 * @example
 * ```tsx
 * import { useCdssoAutoRefresh } from '@chabaduniverse/auth-sdk';
 *
 * function MyComponent() {
 *   const { tokenState, isValid, retryNow } = useCdssoAutoRefresh({
 *     expirationBuffer: 60,
 *     retryInterval: 60000,
 *   });
 *
 *   if (!isValid) return <p>Token: {tokenState}</p>;
 *   return <p>Authenticated</p>;
 * }
 * ```
 */
export function useCdssoAutoRefresh(
  config?: TokenLifecycleConfig,
  merkosConfig?: Partial<CdssoMerkosConfig>,
): UseCdssoAutoRefreshReturn {
  const clientRef = useRef<CdssoClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new CdssoClient(merkosConfig);
  }

  const [tokenState, setTokenState] = useState<TokenState>('idle');

  const effectiveConfig = useMemo(
    () => ({
      autoRefresh: true,
      ...config,
      onTokenStateChange: (state: TokenState) => {
        setTokenState(state);
        config?.onTokenStateChange?.(state);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config is typically stable
    []
  );

  // Start auto-refresh on mount, stop on unmount
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    client.startAutoRefresh(effectiveConfig);

    return () => {
      client.stopAutoRefresh();
    };
  }, [effectiveConfig]);

  const retryNow = useCallback(async (): Promise<string | null> => {
    const client = clientRef.current;
    if (!client) return null;
    return client.authenticate().then((user) => user ? client.getBearerToken() : null);
  }, []);

  const start = useCallback((): void => {
    clientRef.current?.startAutoRefresh(effectiveConfig);
  }, [effectiveConfig]);

  const stop = useCallback((): void => {
    clientRef.current?.stopAutoRefresh();
  }, []);

  return useMemo<UseCdssoAutoRefreshReturn>(
    () => ({
      tokenState,
      isValid: tokenState === 'valid',
      isExpiring: tokenState === 'expiring',
      isRefreshing: tokenState === 'refreshing',
      hasFailed: tokenState === 'failed',
      retryNow,
      start,
      stop,
    }),
    [tokenState, retryNow, start, stop]
  );
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * useCdssoToken hook
 *
 * Returns only the bearer token (for use in API calls).
 *
 * @param config - Optional Merkos CDSSO configuration
 * @returns Bearer token or null
 */
export function useCdssoToken(config?: Partial<CdssoMerkosConfig>): string | null {
  const { token } = useCdsso(config);
  return token;
}

/**
 * useCdssoUser hook
 *
 * Returns only the user data.
 *
 * @param config - Optional Merkos CDSSO configuration
 * @returns User data or null
 */
export function useCdssoUser(config?: Partial<CdssoMerkosConfig>): CdssoUser | null {
  const { user } = useCdsso(config);
  return user;
}

// ============================================================================
// Exports
// ============================================================================

export default useCdsso;
