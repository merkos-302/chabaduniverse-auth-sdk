import { useUniverseAuthContext } from '../providers/UniverseAuthProvider';
import type { AuthProvider } from '../types/user';
import type { UseUniverseAuthReturn } from '../types/hooks';

/**
 * useUniverseAuth - Main hook for accessing authentication state and actions
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
 */
export function useUniverseAuth(): UseUniverseAuthReturn {
  const context = useUniverseAuthContext();

  const isAuthenticatedWith = (provider: AuthProvider): boolean => {
    if (provider === 'merkos') {
      return context.providers.merkos.isAuthenticated;
    }
    if (provider === 'valu') {
      return context.providers.valu.isAuthenticated;
    }
    return false;
  };

  const hasRole = (role: string): boolean => {
    const enrichment = context.providers.merkos.enrichment;
    if (!enrichment) return false;
    return enrichment.roles.some((r) => r.name === role);
  };

  const hasPermission = (permission: string): boolean => {
    const enrichment = context.providers.merkos.enrichment;
    if (!enrichment) return false;
    return enrichment.permissions.includes(permission);
  };

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
    linkAccount: async () => {
      // TODO: Implement in Issue #6
    },
    refreshAuth: context.refreshAuth,
    clearError: context.clearError,

    // Helpers
    isAuthenticatedWith,
    hasRole,
    hasPermission,
  };
}
