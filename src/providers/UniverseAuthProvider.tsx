import { createContext, useContext, useMemo, useState } from 'react';
import type { UniverseAuthConfig, UniverseAuthProviderProps } from './types';
import { defaultConfig } from './types';
import type { UniverseUser } from '../types/user';
import type { ProvidersState } from '../types/providers';
import { initialProvidersState } from '../types/providers';
import { AuthStatus } from '../types/context';
import type { AuthError, LoginOptions, LogoutOptions } from '../types/context';

/**
 * Internal auth state type
 */
interface InternalAuthState {
  user: UniverseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  status: AuthStatus;
  error: AuthError | null;
  providers: ProvidersState;
}

/**
 * Initial auth state
 */
const initialState: InternalAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  status: AuthStatus.Loading,
  error: null,
  providers: initialProvidersState,
};

/**
 * Auth context value type
 */
export interface UniverseAuthContextValue extends InternalAuthState {
  config: UniverseAuthConfig;
  login: (options?: LoginOptions) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  loginWithBearerToken: (token: string, siteId?: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

/**
 * Auth context
 */
const UniverseAuthContext = createContext<UniverseAuthContextValue | null>(
  null
);

/**
 * UniverseAuthProvider - Main authentication provider for Chabad Universe apps
 *
 * Wraps your application and provides unified authentication state from
 * both Merkos Platform and Valu Social providers.
 *
 * @example
 * ```tsx
 * <UniverseAuthProvider config={{ enableValu: true }}>
 *   <App />
 * </UniverseAuthProvider>
 * ```
 */
export function UniverseAuthProvider({
  children,
  config: userConfig,
}: UniverseAuthProviderProps) {
  const config = useMemo(
    () => ({ ...defaultConfig, ...userConfig }),
    [userConfig]
  );

  const [state, setState] = useState<InternalAuthState>(initialState);

  // TODO: Implement actual auth logic in Issue #6
  const login = (_options?: LoginOptions): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      status: AuthStatus.Loading,
    }));
    // Implementation will be added in Issue #6
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isInitialized: true,
      status: AuthStatus.Unauthenticated,
    }));
    return Promise.resolve();
  };

  const logout = (_options?: LogoutOptions): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, status: AuthStatus.Loading }));
    // Implementation will be added in Issue #6
    setState({
      ...initialState,
      isLoading: false,
      isInitialized: true,
      status: AuthStatus.Unauthenticated,
    });
    return Promise.resolve();
  };

  const loginWithBearerToken = (
    _token: string,
    _siteId?: string
  ): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      status: AuthStatus.Loading,
    }));
    // Implementation will be added in Issue #6
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isInitialized: true,
      status: AuthStatus.Unauthenticated,
    }));
    return Promise.resolve();
  };

  const refreshAuth = (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, status: AuthStatus.Loading }));
    // Implementation will be added in Issue #6
    setState((prev) => ({ ...prev, isLoading: false }));
    return Promise.resolve();
  };

  const clearError = (): void => {
    setState((prev) => ({ ...prev, error: null }));
  };

  const contextValue = useMemo<UniverseAuthContextValue>(
    () => ({
      ...state,
      config,
      login,
      logout,
      loginWithBearerToken,
      refreshAuth,
      clearError,
    }),
    [state, config]
  );

  return (
    <UniverseAuthContext.Provider value={contextValue}>
      {children}
    </UniverseAuthContext.Provider>
  );
}

/**
 * Hook to access the UniverseAuth context
 * @throws Error if used outside UniverseAuthProvider
 */
export function useUniverseAuthContext(): UniverseAuthContextValue {
  const context = useContext(UniverseAuthContext);
  if (!context) {
    throw new Error(
      'useUniverseAuthContext must be used within a UniverseAuthProvider'
    );
  }
  return context;
}

// Re-export for convenience
export { UniverseAuthContext };
