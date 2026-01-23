/**
 * useMerkos Hook - React hook for Merkos Platform authentication
 *
 * Provides access to the Merkos context with a convenient interface.
 *
 * @example
 * ```tsx
 * import { useMerkos } from '@chabaduniverse/auth-sdk';
 *
 * function MyComponent() {
 *   const {
 *     isAuthenticated,
 *     isLoading,
 *     user,
 *     loginWithCredentials,
 *     logout,
 *   } = useMerkos();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!isAuthenticated) {
 *     return (
 *       <button onClick={() => loginWithCredentials({ username, password })}>
 *         Login
 *       </button>
 *     );
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

import { useMerkosContext, useMerkosContextSafe } from './MerkosProvider';
import type { UseMerkosReturn, MerkosUserData } from './merkos-types';

// ============================================================================
// Main Hook
// ============================================================================

/**
 * useMerkos hook
 *
 * Returns Merkos authentication state and actions.
 * Must be used within a MerkosProvider.
 *
 * @returns UseMerkosReturn - State and actions for Merkos authentication
 * @throws Error if used outside MerkosProvider
 */
export function useMerkos(): UseMerkosReturn {
  const context = useMerkosContext();

  return {
    state: context.state,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    hasBearerToken: context.hasBearerToken,
    user: context.user,
    token: context.token,
    error: context.error,
    loginWithCredentials: context.loginWithCredentials,
    loginWithBearerToken: context.loginWithBearerToken,
    loginWithGoogle: context.loginWithGoogle,
    loginWithChabadOrg: context.loginWithChabadOrg,
    getCurrentUser: context.getCurrentUser,
    logout: context.logout,
    setToken: context.setToken,
    clearToken: context.clearToken,
    v2Request: context.v2Request,
  };
}

// ============================================================================
// Safe Hook (for optional provider usage)
// ============================================================================

/**
 * Return type when Merkos context is not available
 */
export interface UseMerkosSafeReturn {
  /** Whether Merkos context is available */
  isAvailable: false;
}

/**
 * useMerkosSafe hook
 *
 * Safe version of useMerkos that returns null-ish state if used outside MerkosProvider.
 * Useful for components that may or may not be within the Merkos context.
 *
 * @returns UseMerkosReturn if within MerkosProvider, otherwise UseMerkosSafeReturn
 */
export function useMerkosSafe(): UseMerkosReturn | UseMerkosSafeReturn {
  const context = useMerkosContextSafe();

  if (!context) {
    return {
      isAvailable: false,
    };
  }

  return {
    state: context.state,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    hasBearerToken: context.hasBearerToken,
    user: context.user,
    token: context.token,
    error: context.error,
    loginWithCredentials: context.loginWithCredentials,
    loginWithBearerToken: context.loginWithBearerToken,
    loginWithGoogle: context.loginWithGoogle,
    loginWithChabadOrg: context.loginWithChabadOrg,
    getCurrentUser: context.getCurrentUser,
    logout: context.logout,
    setToken: context.setToken,
    clearToken: context.clearToken,
    v2Request: context.v2Request,
  };
}

/**
 * Type guard to check if Merkos result is available
 */
export function isMerkosAvailable(
  result: UseMerkosReturn | UseMerkosSafeReturn
): result is UseMerkosReturn {
  return !('isAvailable' in result && result.isAvailable === false);
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * useMerkosUser hook
 *
 * Returns only the Merkos user data.
 *
 * @returns User data or null
 */
export function useMerkosUser(): MerkosUserData | null {
  const { user } = useMerkosContext();
  return user;
}

/**
 * useMerkosToken hook
 *
 * Returns only the bearer token.
 *
 * @returns Bearer token or null
 */
export function useMerkosToken(): string | null {
  const { token } = useMerkosContext();
  return token;
}

/**
 * useMerkosAuth hook
 *
 * Returns authentication status flags.
 *
 * @returns Object with isAuthenticated, isLoading, hasBearerToken
 */
export function useMerkosAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasBearerToken: boolean;
} {
  const { isAuthenticated, isLoading, hasBearerToken } = useMerkosContext();
  return { isAuthenticated, isLoading, hasBearerToken };
}

/**
 * useMerkosActions hook
 *
 * Returns only the Merkos actions (login, logout, etc.).
 * Useful when you don't need reactive state.
 *
 * @returns Object with authentication actions
 */
export function useMerkosActions(): Pick<
  UseMerkosReturn,
  | 'loginWithCredentials'
  | 'loginWithBearerToken'
  | 'loginWithGoogle'
  | 'loginWithChabadOrg'
  | 'getCurrentUser'
  | 'logout'
  | 'setToken'
  | 'clearToken'
  | 'v2Request'
> {
  const {
    loginWithCredentials,
    loginWithBearerToken,
    loginWithGoogle,
    loginWithChabadOrg,
    getCurrentUser,
    logout,
    setToken,
    clearToken,
    v2Request,
  } = useMerkosContext();

  return {
    loginWithCredentials,
    loginWithBearerToken,
    loginWithGoogle,
    loginWithChabadOrg,
    getCurrentUser,
    logout,
    setToken,
    clearToken,
    v2Request,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default useMerkos;
