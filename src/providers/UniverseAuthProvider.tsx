/**
 * UniverseAuthProvider - Main unified authentication provider
 *
 * Composes Valu and Merkos providers to provide a unified authentication
 * context for Chabad Universe applications.
 *
 * @example
 * ```tsx
 * import { UniverseAuthProvider, useUniverseAuth } from '@chabaduniverse/auth-sdk';
 *
 * function App() {
 *   return (
 *     <UniverseAuthProvider config={{
 *       enableMerkos: true,
 *       enableValu: true,
 *       merkos: { apiUrl: 'https://org.merkos302.com' },
 *     }}>
 *       <MyApp />
 *     </UniverseAuthProvider>
 *   );
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { UniverseAuthConfig, UniverseAuthProviderProps } from './types';
import { defaultConfig } from './types';
import type { UniverseUser } from '../types/user';
import type { ProvidersState } from '../types/providers';
import {
  initialProvidersState,
  initialValuProviderState,
  initialMerkosProviderState,
} from '../types/providers';
import { AuthStatus } from '../types/context';
import type { AuthError, AuthErrorCode, LoginOptions, LogoutOptions } from '../types/context';

// Import provider hooks
import { useCdsso } from '../cdsso';
import { useValuSafe, type UseValuReturn, type UseValuSafeReturn } from '../valu';
import { useMerkosSafe, isMerkosAvailable } from '../merkos';

// Import state merger utilities
import {
  mergeUserStates,
  determineAuthStatus,
  buildUniverseProviderState,
} from './state-merger';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create an AuthError
 */
function createAuthError(
  code: AuthErrorCode,
  message: string,
  provider?: 'merkos' | 'valu'
): AuthError {
  const error = new Error(message) as AuthError;
  error.name = 'AuthError';
  error.code = code;
  if (provider !== undefined) {
    error.provider = provider;
  }
  return error;
}

/**
 * Check if valu hook result is a full return (not safe fallback)
 */
function isValuAvailable(
  result: UseValuReturn | UseValuSafeReturn
): result is UseValuReturn {
  return !('isAvailable' in result && result.isAvailable === false);
}

// ============================================================================
// Context
// ============================================================================

/**
 * Auth context
 */
const UniverseAuthContext = createContext<UniverseAuthContextValue | null>(
  null
);

// ============================================================================
// Main Provider Component
// ============================================================================

/**
 * UniverseAuthProvider - Main authentication provider for Chabad Universe apps
 *
 * Wraps your application and provides unified authentication state from
 * both Merkos Platform and Valu Social providers.
 */
export function UniverseAuthProvider({
  children,
  config: userConfig,
}: UniverseAuthProviderProps): React.ReactElement {
  // Merge config with defaults
  const config = useMemo<Required<UniverseAuthConfig>>(
    () => ({
      ...defaultConfig,
      ...userConfig,
      merkos: { ...userConfig?.merkos },
      valu: { ...userConfig?.valu },
      cdsso: { ...userConfig?.cdsso },
    }) as Required<UniverseAuthConfig>,
    [userConfig]
  );

  const [state, setState] = useState<InternalAuthState>(initialState);
  const initRef = useRef(false);

  // Get provider states - always call hooks unconditionally (React rules of hooks)
  // Then conditionally use results based on config
  const cdssoResult = useCdsso();
  const cdsso = config.enableCDSSO ? cdssoResult : null;

  const valuResult = useValuSafe(); // Safe version - works without ValuProvider
  const valu = isValuAvailable(valuResult) && config.enableValu ? valuResult : null;

  const merkosResult = useMerkosSafe(); // Safe version - works without MerkosProvider
  const merkos = isMerkosAvailable(merkosResult) && config.enableMerkos ? merkosResult : null;

  // ============================================================================
  // Error Handling
  // ============================================================================

  const clearError = useCallback((): void => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const setError = useCallback((error: AuthError): void => {
    setState((prev) => ({ ...prev, error, status: AuthStatus.Error }));
    config.onError?.(new Error(error.message));
  }, [config]);

  // ============================================================================
  // State Synchronization
  // ============================================================================

  useEffect(() => {
    // Build Valu state
    const valuState = valu ? {
      isConnected: valu.isConnected,
      isAuthenticated: valu.isAuthenticated,
      isReady: valu.isReady,
      isInIframe: valu.isInIframe,
      user: valu.user,
      error: valu.error ? new Error(valu.error) : null,
      connectionState: {
        isConnected: valu.isConnected,
        isReady: valu.isReady,
        isInIframe: valu.isInIframe,
        isNavigatingApp: false,
        error: valu.error ?? null,
      },
    } : initialValuProviderState;

    // Build Merkos state
    const merkosState = merkos ? {
      isAuthenticated: merkos.isAuthenticated,
      hasBearerToken: merkos.hasBearerToken,
      tokenVerified: merkos.isAuthenticated,
      user: merkos.user,
      token: merkos.token,
      refreshToken: null,
      enrichment: null,
      error: merkos.error ? new Error(merkos.error) : null,
    } : initialMerkosProviderState;

    // Check loading states
    const merkosLoading = merkos ? merkos.isLoading : false;
    const valuLoading = valu ? valu.isAuthenticating : false;
    const isLoading = merkosLoading || valuLoading;

    // Determine auth status
    const authStatusResult = determineAuthStatus(
      valuState,
      merkosState,
      config.enableValu ?? false,
      config.enableMerkos ?? false
    );

    // Merge user states
    const mergedUser = mergeUserStates(
      valuState.user,
      merkosState.user,
      { priority: 'merkos' }
    );

    // Build universe state
    const universeState = buildUniverseProviderState(
      valuState,
      merkosState,
      'merkos'
    );

    // Combine into providers state
    const providersState: ProvidersState = {
      valu: valuState,
      merkos: merkosState,
      universe: universeState,
    };

    // Update state
    setState((prev) => {
      const newStatus = isLoading ? AuthStatus.Loading : authStatusResult.status;
      const isAuthenticated = newStatus === AuthStatus.Authenticated ||
                              newStatus === AuthStatus.Partial;

      // Only update if something actually changed
      if (
        prev.isLoading === isLoading &&
        prev.status === newStatus &&
        prev.isAuthenticated === isAuthenticated &&
        prev.user?.id === mergedUser?.id
      ) {
        return prev;
      }

      return {
        ...prev,
        user: mergedUser,
        isAuthenticated,
        isLoading,
        isInitialized: !isLoading,
        status: newStatus,
        providers: providersState,
      };
    });

    // Notify on auth state change
    if (!isLoading && authStatusResult.status !== AuthStatus.Loading) {
      const isAuth = authStatusResult.status === AuthStatus.Authenticated ||
                     authStatusResult.status === AuthStatus.Partial;
      config.onAuthChange?.(isAuth);
    }
  }, [valu, merkos, config]);

  // ============================================================================
  // Authentication Actions
  // ============================================================================

  const login = useCallback(async (options?: LoginOptions): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      status: AuthStatus.Loading,
    }));

    try {
      const provider = options?.provider ?? 'merkos';
      const method = options?.method ?? 'credentials';

      if (provider === 'merkos' && merkos) {
        if (method === 'credentials' && options?.credentials) {
          const credentialOpts: { username: string; password: string; siteId?: string } = {
            username: options.credentials.username,
            password: options.credentials.password,
          };
          if (options.siteId !== undefined) {
            credentialOpts.siteId = options.siteId;
          }
          await merkos.loginWithCredentials(credentialOpts);
        } else if (method === 'google' && options?.googleCode) {
          const googleOpts: { code: string; siteId?: string } = {
            code: options.googleCode,
          };
          if (options.siteId !== undefined) {
            googleOpts.siteId = options.siteId;
          }
          await merkos.loginWithGoogle(googleOpts);
        } else if (method === 'chabad-org' && options?.chabadOrgKey) {
          const chabadOpts: { key: string; siteId?: string } = {
            key: options.chabadOrgKey,
          };
          if (options.siteId !== undefined) {
            chabadOpts.siteId = options.siteId;
          }
          await merkos.loginWithChabadOrg(chabadOpts);
        } else if (method === 'bearer-token' && options?.bearerToken) {
          const bearerOpts: { token: string; siteId?: string } = {
            token: options.bearerToken,
          };
          if (options.siteId !== undefined) {
            bearerOpts.siteId = options.siteId;
          }
          await merkos.loginWithBearerToken(bearerOpts);
        }
      } else if (provider === 'valu' && valu) {
        // Valu authentication happens through connection
        // User must be in iframe for Valu auth
        if (!valu.isConnected) {
          await valu.connect();
        }
      }
    } catch (error) {
      const authError = createAuthError(
        'LOGIN_FAILED',
        error instanceof Error ? error.message : 'Login failed',
        options?.provider
      );
      setError(authError);
    }
  }, [merkos, valu, setError]);

  const logout = useCallback(async (options?: LogoutOptions): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, status: AuthStatus.Loading }));

    try {
      const targetProvider = options?.provider;

      // Logout from providers
      const logoutPromises: Promise<void>[] = [];

      if ((!targetProvider || targetProvider === 'merkos') && merkos) {
        logoutPromises.push(merkos.logout());
      }

      if ((!targetProvider || targetProvider === 'valu') && valu) {
        logoutPromises.push(valu.disconnect());
      }

      if (cdsso) {
        logoutPromises.push(cdsso.logout().then(() => undefined));
      }

      await Promise.all(logoutPromises);

      // Clear local state
      setState({
        ...initialState,
        isLoading: false,
        isInitialized: true,
        status: AuthStatus.Unauthenticated,
      });
    } catch (error) {
      const authError = createAuthError(
        'LOGOUT_FAILED',
        error instanceof Error ? error.message : 'Logout failed'
      );
      setError(authError);
    }
  }, [merkos, valu, cdsso, setError]);

  const loginWithBearerToken = useCallback(async (
    token: string,
    siteId?: string
  ): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      status: AuthStatus.Loading,
    }));

    try {
      if (merkos) {
        const loginOptions: { token: string; siteId?: string } = { token };
        if (siteId !== undefined) {
          loginOptions.siteId = siteId;
        }
        await merkos.loginWithBearerToken(loginOptions);
      } else {
        throw new Error('Merkos provider is not enabled');
      }
    } catch (error) {
      const authError = createAuthError(
        'LOGIN_FAILED',
        error instanceof Error ? error.message : 'Bearer token login failed',
        'merkos'
      );
      setError(authError);
    }
  }, [merkos, setError]);

  const refreshAuth = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, status: AuthStatus.Loading }));

    try {
      const refreshPromises: Promise<unknown>[] = [];

      if (merkos && merkos.token) {
        refreshPromises.push(merkos.getCurrentUser());
      }

      if (valu && valu.isConnected) {
        refreshPromises.push(valu.reconnect());
      }

      await Promise.all(refreshPromises);
    } catch (error) {
      const authError = createAuthError(
        'TOKEN_REFRESH_FAILED',
        error instanceof Error ? error.message : 'Auth refresh failed'
      );
      setError(authError);
    }
  }, [merkos, valu, setError]);

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    if (initRef.current) return;
    if (!config.autoInitialize) return;

    initRef.current = true;
    // Initialization happens automatically through provider hooks
  }, [config]);

  // ============================================================================
  // Context Value
  // ============================================================================

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
    [state, config, login, logout, loginWithBearerToken, refreshAuth, clearError]
  );

  return (
    <UniverseAuthContext.Provider value={contextValue}>
      {children}
    </UniverseAuthContext.Provider>
  );
}

// ============================================================================
// Context Hook
// ============================================================================

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

// ============================================================================
// Exports
// ============================================================================

export { UniverseAuthContext };
export default UniverseAuthProvider;
