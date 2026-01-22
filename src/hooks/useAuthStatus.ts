/**
 * useAuthStatus Hook - Computed authentication status helpers
 *
 * Provides computed status values and helper functions for
 * understanding the current authentication state.
 *
 * @example
 * ```tsx
 * import { useAuthStatus } from '@chabaduniverse/auth-sdk';
 *
 * function MyComponent() {
 *   const {
 *     isFullyAuthenticated,
 *     isPartiallyAuthenticated,
 *     needsLinking,
 *     getStatusMessage,
 *   } = useAuthStatus();
 *
 *   if (needsLinking) {
 *     return <LinkAccountPrompt />;
 *   }
 *
 *   return <div>{getStatusMessage()}</div>;
 * }
 * ```
 */

import { useUniverseAuthContext } from '../providers/UniverseAuthProvider';
import { AuthStatus } from '../types/context';
import type { AuthError } from '../types/context';
import type { UseAuthStatusReturn } from '../types/hooks';

/**
 * useAuthStatus hook
 *
 * Returns computed authentication status values and helpers.
 *
 * @returns UseAuthStatusReturn - Status values and helper functions
 */
export function useAuthStatus(): UseAuthStatusReturn {
  const context = useUniverseAuthContext();

  const { status, isLoading, error, providers, config } = context;

  // Check if fully authenticated (all enabled providers)
  const isFullyAuthenticated = (() => {
    let enabledCount = 0;
    let authenticatedCount = 0;

    if (config.enableMerkos) {
      enabledCount++;
      if (providers.merkos.isAuthenticated) authenticatedCount++;
    }

    if (config.enableValu) {
      enabledCount++;
      if (providers.valu.isAuthenticated) authenticatedCount++;
    }

    return enabledCount > 0 && authenticatedCount === enabledCount;
  })();

  // Check if partially authenticated (at least one provider)
  const isPartiallyAuthenticated: boolean = Boolean(
    (config.enableMerkos && providers.merkos.isAuthenticated) ||
      (config.enableValu && providers.valu.isAuthenticated)
  );

  // Check if needs linking (both authenticated but not linked)
  const needsLinking: boolean = Boolean(
    config.enableValu &&
      providers.valu.isAuthenticated &&
      config.enableMerkos &&
      providers.merkos.isAuthenticated &&
      !providers.universe.isLinked
  );

  const hasError = error !== null;

  // Cache the error message for use in getStatusMessage
  const errorMessage = error?.message ?? 'An error occurred';

  // Get human-readable status message
  const getStatusMessage = (): string => {
    if (isLoading) {
      return 'Checking authentication...';
    }

    if (hasError) {
      return errorMessage;
    }

    switch (status) {
      case AuthStatus.Authenticated:
        return 'You are fully authenticated';
      case AuthStatus.Partial:
        if (providers.merkos.isAuthenticated && !providers.valu.isAuthenticated) {
          return 'Authenticated with Merkos. Connect to Valu for full access.';
        }
        if (providers.valu.isAuthenticated && !providers.merkos.isAuthenticated) {
          return 'Connected to Valu. Login to Merkos for full access.';
        }
        return 'Partially authenticated';
      case AuthStatus.Unauthenticated:
        return 'Please log in to continue';
      case AuthStatus.Loading:
        return 'Loading...';
      case AuthStatus.Error:
        return errorMessage;
      default:
        return 'Unknown status';
    }
  };

  return {
    status,
    isFullyAuthenticated,
    isPartiallyAuthenticated,
    needsLinking,
    isLoading,
    hasError,
    getStatusMessage,
  };
}

/**
 * useIsAuthenticated hook
 *
 * Simple hook that returns only the authentication boolean.
 * Useful for simple auth checks.
 *
 * @returns boolean - Whether the user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const context = useUniverseAuthContext();
  return context.isAuthenticated;
}

/**
 * useIsLoading hook
 *
 * Simple hook that returns only the loading state.
 *
 * @returns boolean - Whether auth is loading
 */
export function useIsLoading(): boolean {
  const context = useUniverseAuthContext();
  return context.isLoading;
}

/**
 * useAuthError hook
 *
 * Simple hook that returns only the error state.
 *
 * @returns AuthError | null - Current error or null
 */
export function useAuthError(): AuthError | null {
  const context = useUniverseAuthContext();
  return context.error;
}
