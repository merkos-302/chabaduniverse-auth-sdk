import { useCallback } from 'react';
import { useUniverseAuthContext } from '../providers/UniverseAuthProvider';
import type { AuthProvider } from '../types/user';
import type { LinkAccountOptions } from '../types/context';
import type { UseUniverseAuthReturn } from '../types/hooks';

/**
 * useUniverseAuth - Main hook for accessing authentication state and actions
 *
 * This is the primary hook for consumers of the SDK. It provides:
 * - Unified user state across all providers
 * - Authentication actions (login, logout, etc.)
 * - Helper methods for checking roles and permissions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user, login, logout } = useUniverseAuth();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={() => login()}>Login</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.displayName}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Login with specific provider
 * const { login } = useUniverseAuth();
 * await login({ provider: 'merkos', method: 'credentials', credentials: { username, password } });
 *
 * // Login with bearer token (from CDSSO)
 * const { loginWithBearerToken } = useUniverseAuth();
 * await loginWithBearerToken(token);
 * ```
 */
export function useUniverseAuth(): UseUniverseAuthReturn {
  const context = useUniverseAuthContext();

  /**
   * Check if authenticated with a specific provider
   */
  const isAuthenticatedWith = useCallback(
    (provider: AuthProvider): boolean => {
      if (provider === 'merkos') {
        return context.providers.merkos.isAuthenticated;
      }
      if (provider === 'valu') {
        return context.providers.valu.isAuthenticated;
      }
      return false;
    },
    [context.providers.merkos.isAuthenticated, context.providers.valu.isAuthenticated]
  );

  /**
   * Check if user has a specific role (from Merkos enrichment)
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      const enrichment = context.providers.merkos.enrichment;
      if (!enrichment) return false;
      return enrichment.roles.some((r) => r.name === role);
    },
    [context.providers.merkos.enrichment]
  );

  /**
   * Check if user has a specific permission (from Merkos enrichment)
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      const enrichment = context.providers.merkos.enrichment;
      if (!enrichment) return false;
      return enrichment.permissions.includes(permission);
    },
    [context.providers.merkos.enrichment]
  );

  /**
   * Link an additional provider account
   *
   * This authenticates with the specified provider while keeping
   * the existing authentication. Used to connect multiple providers
   * to a single user session.
   */
  const linkAccount = useCallback(
    async (options: LinkAccountOptions): Promise<void> => {
      const { provider, method, credentials } = options;

      // Already authenticated with this provider
      if (isAuthenticatedWith(provider)) {
        return;
      }

      // Build login options, only including credentials if defined
      const loginOptions: Parameters<typeof context.login>[0] = {
        provider,
        method: method ?? 'credentials',
      };

      if (credentials) {
        loginOptions.credentials = credentials;
      }

      // Trigger login with the specified provider
      await context.login(loginOptions);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- context.login is stable from context
    [context.login, isAuthenticatedWith]
  );

  return {
    // State
    user: context.user,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    isInitialized: context.isInitialized,
    status: context.status,
    error: context.error,

    // Provider access
    providers: context.providers,

    // Actions
    login: context.login,
    logout: context.logout,
    loginWithBearerToken: context.loginWithBearerToken,
    linkAccount,
    refreshAuth: context.refreshAuth,
    clearError: context.clearError,

    // Helpers
    isAuthenticatedWith,
    hasRole,
    hasPermission,
  };
}
