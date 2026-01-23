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
