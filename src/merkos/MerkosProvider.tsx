/**
 * MerkosProvider - React Context Provider for Merkos Platform Authentication
 *
 * Wraps MerkosAPIAdapter from @chabaduniverse/auth with React state management.
 *
 * @example
 * ```tsx
 * import { MerkosProvider, useMerkos } from '@chabaduniverse/auth-sdk';
 *
 * function App() {
 *   return (
 *     <MerkosProvider config={{ baseUrl: 'https://org.merkos302.com' }}>
 *       <MyApp />
 *     </MerkosProvider>
 *   );
 * }
 *
 * function MyApp() {
 *   const { isAuthenticated, user, loginWithCredentials } = useMerkos();
 *   // ...
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { MerkosAPIAdapter } from '@chabaduniverse/auth';
import type {
  MerkosProviderConfig,
  MerkosAuthState,
  MerkosContextValue,
  MerkosUserData,
  CredentialsLoginOptions,
  BearerTokenLoginOptions,
  GoogleLoginOptions,
  ChabadOrgLoginOptions,
} from './merkos-types';
import {
  defaultMerkosProviderConfig,
  initialMerkosAuthState,
} from './merkos-types';
import {
  formatMerkosUser,
  parseMerkosError,
  extractBearerToken,
  storeBearerToken,
  removeBearerToken,
  createMerkosLogger,
} from './merkos-utils';

// ============================================================================
// Context
// ============================================================================

/**
 * Merkos Context
 */
export const MerkosContext = createContext<MerkosContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

/**
 * MerkosProvider props
 */
export interface MerkosProviderProps {
  /** Child components */
  children: ReactNode;
  /** Merkos configuration */
  config: Partial<MerkosProviderConfig>;
}

// ============================================================================
// Provider Implementation
// ============================================================================

/**
 * MerkosProvider component
 *
 * Provides Merkos Platform authentication context to child components.
 */
export function MerkosProvider({
  children,
  config: configProp,
}: MerkosProviderProps): React.ReactElement {
  // Merge config with defaults
  const config = useMemo<Required<MerkosProviderConfig>>(
    () => ({
      ...defaultMerkosProviderConfig,
      ...configProp,
    }),
    [configProp]
  );

  // Create logger
  const logger = useMemo(() => createMerkosLogger(config), [config]);

  // Create adapter ref
  const adapterRef = useRef<MerkosAPIAdapter | null>(null);

  // Initialize adapter
  if (!adapterRef.current) {
    adapterRef.current = new MerkosAPIAdapter({
      baseUrl: config.baseUrl,
      apiVersion: config.apiVersion,
      timeout: config.timeout,
    });
    logger.debug('MerkosAPIAdapter initialized', { baseUrl: config.baseUrl });
  }

  // State
  const [state, setState] = useState<MerkosAuthState>(initialMerkosAuthState);

  // ============================================================================
  // State Updates
  // ============================================================================

  /**
   * Update state to loading
   */
  const setLoading = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
    }));
  }, []);

  /**
   * Update state to authenticated
   */
  const setAuthenticated = useCallback(
    (user: MerkosUserData, token: string) => {
      setState({
        status: 'authenticated',
        user,
        token,
        error: null,
        hasBearerToken: true,
        lastCheck: Date.now(),
      });
    },
    []
  );

  /**
   * Update state to unauthenticated
   */
  const setUnauthenticated = useCallback(() => {
    setState({
      status: 'unauthenticated',
      user: null,
      token: null,
      error: null,
      hasBearerToken: false,
      lastCheck: Date.now(),
    });
  }, []);

  /**
   * Update state to error
   */
  const setError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      status: 'error',
      error,
    }));
  }, []);

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  /**
   * Login with username and password
   */
  const loginWithCredentials = useCallback(
    async (options: CredentialsLoginOptions): Promise<MerkosUserData | null> => {
      const adapter = adapterRef.current;
      if (!adapter) return null;

      try {
        setLoading();
        logger.debug('Logging in with credentials', { username: options.username });

        const response = await adapter.loginWithCredentials(
          options.username,
          options.password,
          options.siteId ?? config.siteId ?? null
        );

        const user = formatMerkosUser(response.user);

        // Store token
        storeBearerToken(response.token, config);

        setAuthenticated(user, response.token);
        logger.debug('Login successful', { userId: user.id });

        return user;
      } catch (error) {
        const merkosError = parseMerkosError(error);
        setError(merkosError.message);
        logger.error('Login failed', merkosError);
        return null;
      }
    },
    [config, setLoading, setAuthenticated, setError, logger]
  );

  /**
   * Login with bearer token (JWT)
   */
  const loginWithBearerToken = useCallback(
    async (options: BearerTokenLoginOptions): Promise<MerkosUserData | null> => {
      const adapter = adapterRef.current;
      if (!adapter) return null;

      try {
        setLoading();
        logger.debug('Logging in with bearer token');

        const response = await adapter.loginWithBearerToken(
          options.token,
          options.siteId ?? config.siteId ?? null
        );

        const user = formatMerkosUser(response.user);

        // Store token
        storeBearerToken(response.token, config);

        setAuthenticated(user, response.token);
        logger.debug('Bearer token login successful', { userId: user.id });

        return user;
      } catch (error) {
        const merkosError = parseMerkosError(error);
        setError(merkosError.message);
        logger.error('Bearer token login failed', merkosError);
        return null;
      }
    },
    [config, setLoading, setAuthenticated, setError, logger]
  );

  /**
   * Login with Google OAuth
   */
  const loginWithGoogle = useCallback(
    async (options: GoogleLoginOptions): Promise<MerkosUserData | null> => {
      const adapter = adapterRef.current;
      if (!adapter) return null;

      try {
        setLoading();
        logger.debug('Logging in with Google OAuth');

        const response = await adapter.loginWithGoogle(
          options.code,
          options.host ?? null,
          options.siteId ?? config.siteId ?? null
        );

        const user = formatMerkosUser(response.user);

        // Store token
        storeBearerToken(response.token, config);

        setAuthenticated(user, response.token);
        logger.debug('Google login successful', { userId: user.id });

        return user;
      } catch (error) {
        const merkosError = parseMerkosError(error);
        setError(merkosError.message);
        logger.error('Google login failed', merkosError);
        return null;
      }
    },
    [config, setLoading, setAuthenticated, setError, logger]
  );

  /**
   * Login with Chabad.org SSO
   */
  const loginWithChabadOrg = useCallback(
    async (options: ChabadOrgLoginOptions): Promise<MerkosUserData | null> => {
      const adapter = adapterRef.current;
      if (!adapter) return null;

      try {
        setLoading();
        logger.debug('Logging in with Chabad.org SSO');

        const response = await adapter.loginWithChabadOrg(
          options.key,
          options.siteId ?? config.siteId ?? null
        );

        const user = formatMerkosUser(response.user);

        // Store token
        storeBearerToken(response.token, config);

        setAuthenticated(user, response.token);
        logger.debug('Chabad.org login successful', { userId: user.id });

        return user;
      } catch (error) {
        const merkosError = parseMerkosError(error);
        setError(merkosError.message);
        logger.error('Chabad.org login failed', merkosError);
        return null;
      }
    },
    [config, setLoading, setAuthenticated, setError, logger]
  );

  /**
   * Get current user from API
   */
  const getCurrentUser = useCallback(async (): Promise<MerkosUserData | null> => {
    const adapter = adapterRef.current;
    if (!adapter) return null;

    try {
      setLoading();
      logger.debug('Getting current user');

      const response = await adapter.getCurrentUser();
      const user = formatMerkosUser(response);

      setState((prev) => ({
        ...prev,
        status: 'authenticated',
        user,
        error: null,
        lastCheck: Date.now(),
      }));

      logger.debug('Got current user', { userId: user.id });
      return user;
    } catch (error) {
      const merkosError = parseMerkosError(error);
      setError(merkosError.message);
      logger.error('Failed to get current user', merkosError);
      return null;
    }
  }, [setLoading, setError, logger]);

  /**
   * Logout from Merkos
   */
  const logout = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    try {
      logger.debug('Logging out');
      await adapter.logout();
    } catch (error) {
      logger.warn('Logout API call failed, proceeding with local logout', error);
    }

    // Always clear local state and storage
    removeBearerToken(config);
    setUnauthenticated();
    logger.debug('Logout complete');
  }, [config, setUnauthenticated, logger]);

  /**
   * Set bearer token manually
   */
  const setToken = useCallback(
    (token: string): void => {
      const adapter = adapterRef.current;
      if (!adapter) return;

      adapter.setToken(token);
      storeBearerToken(token, config);

      setState((prev) => ({
        ...prev,
        token,
        hasBearerToken: true,
      }));

      logger.debug('Token set manually');
    },
    [config, logger]
  );

  /**
   * Clear bearer token
   */
  const clearToken = useCallback((): void => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    adapter.clearToken();
    removeBearerToken(config);

    setState((prev) => ({
      ...prev,
      token: null,
      hasBearerToken: false,
    }));

    logger.debug('Token cleared');
  }, [config, logger]);

  /**
   * Make a v2 API request
   */
  const v2Request = useCallback(
    async <T = unknown>(
      service: string,
      path: string,
      params?: Record<string, unknown>
    ): Promise<T> => {
      const adapter = adapterRef.current;
      if (!adapter) {
        throw new Error('Merkos adapter not initialized');
      }

      return adapter.v2Request<T>(service, path, params ?? {});
    },
    []
  );

  // ============================================================================
  // Auto-Login Effect
  // ============================================================================

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    // Check for existing token
    const existingToken = extractBearerToken(undefined, config);

    if (existingToken && config.autoLoginWithCdsso) {
      logger.debug('Found existing token, attempting auto-login');
      adapter.setToken(existingToken);

      setState((prev) => ({
        ...prev,
        token: existingToken,
        hasBearerToken: true,
        status: 'loading',
      }));

      // Attempt to validate token by getting current user
      void (async () => {
        try {
          const response = await adapter.getCurrentUser();
          const user = formatMerkosUser(response);
          setAuthenticated(user, existingToken);
          logger.debug('Auto-login successful', { userId: user.id });
        } catch (error) {
          logger.warn('Auto-login failed, token may be invalid', error);
          // Clear invalid token
          adapter.clearToken();
          removeBearerToken(config);
          setUnauthenticated();
        }
      })();
    } else {
      // No token, set to unauthenticated
      setState((prev) => ({
        ...prev,
        status: 'unauthenticated',
        lastCheck: Date.now(),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run once on mount
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue = useMemo<MerkosContextValue>(
    () => ({
      state,
      isAuthenticated: state.status === 'authenticated',
      isLoading: state.status === 'loading',
      hasBearerToken: state.hasBearerToken,
      user: state.user,
      token: state.token,
      error: state.error,
      config,
      loginWithCredentials,
      loginWithBearerToken,
      loginWithGoogle,
      loginWithChabadOrg,
      getCurrentUser,
      logout,
      setToken,
      clearToken,
      v2Request,
    }),
    [
      state,
      config,
      loginWithCredentials,
      loginWithBearerToken,
      loginWithGoogle,
      loginWithChabadOrg,
      getCurrentUser,
      logout,
      setToken,
      clearToken,
      v2Request,
    ]
  );

  return (
    <MerkosContext.Provider value={contextValue}>
      {children}
    </MerkosContext.Provider>
  );
}

// ============================================================================
// Context Hook
// ============================================================================

/**
 * useMerkosContext hook
 *
 * Returns the Merkos context value.
 * Must be used within a MerkosProvider.
 */
export function useMerkosContext(): MerkosContextValue {
  const context = useContext(MerkosContext);
  if (!context) {
    throw new Error('useMerkosContext must be used within a MerkosProvider');
  }
  return context;
}

/**
 * useMerkosContextSafe hook
 *
 * Returns the Merkos context value or null if outside MerkosProvider.
 * Useful for optional Merkos integration.
 */
export function useMerkosContextSafe(): MerkosContextValue | null {
  return useContext(MerkosContext);
}

// ============================================================================
// Exports
// ============================================================================

export default MerkosProvider;
