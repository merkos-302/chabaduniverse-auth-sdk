/**
 * Hook return type definitions for @chabaduniverse/auth-sdk
 *
 * These types define what each hook returns to consumers.
 */

import type { UniverseUser, AuthProvider, ValuUser, MerkosUser } from './user';
import type {
  ValuProviderState,
  MerkosProviderState,
  ProvidersState,
} from './providers';
import type {
  AuthStatus,
  AuthError,
  LoginOptions,
  LogoutOptions,
  LinkAccountOptions,
} from './context';

/**
 * Return type for useUniverseAuth hook
 * Main hook for accessing unified authentication
 */
export interface UseUniverseAuthReturn {
  // === Unified State ===

  /** Unified user object (null if not authenticated) */
  user: UniverseUser | null;
  /** Whether user is authenticated with any provider */
  isAuthenticated: boolean;
  /** Whether authentication is being processed */
  isLoading: boolean;
  /** Whether initial auth check is complete */
  isInitialized: boolean;
  /** Current authentication status */
  status: AuthStatus;
  /** Current error (if any) */
  error: AuthError | null;

  // === Provider Access ===

  /** Individual provider states */
  providers: ProvidersState;

  // === Actions ===

  /** Login with the specified options */
  login: (options?: LoginOptions) => Promise<void>;
  /** Logout from one or all providers */
  logout: (options?: LogoutOptions) => Promise<void>;
  /** Login using a bearer token (typically from CDSSO) */
  loginWithBearerToken: (token: string, siteId?: string) => Promise<void>;
  /** Link an additional provider account */
  linkAccount: (options: LinkAccountOptions) => Promise<void>;
  /** Refresh authentication state */
  refreshAuth: () => Promise<void>;
  /** Clear current error */
  clearError: () => void;

  // === Helper Methods ===

  /** Check if authenticated with a specific provider */
  isAuthenticatedWith: (provider: AuthProvider) => boolean;
  /** Check if the user has a specific role */
  hasRole: (role: string) => boolean;
  /** Check if the user has a specific permission */
  hasPermission: (permission: string) => boolean;
}

/**
 * Return type for useProviders hook
 * Direct access to individual provider states
 */
export interface UseProvidersReturn {
  /** All provider states */
  providers: ProvidersState;
  /** Valu provider state */
  valu: ValuProviderState;
  /** Merkos provider state */
  merkos: MerkosProviderState;
  /** Check if a specific provider is authenticated */
  isProviderAuthenticated: (provider: AuthProvider) => boolean;
  /** Get user from a specific provider */
  getProviderUser: (provider: AuthProvider) => ValuUser | MerkosUser | null;
}

/**
 * Return type for useValuProvider hook
 * Valu-specific state and actions
 */
export interface UseValuProviderReturn extends ValuProviderState {
  /** Connect to Valu (if not already connected) */
  connect: () => Promise<void>;
  /** Disconnect from Valu */
  disconnect: () => Promise<void>;
  /** Send an intent to Valu */
  sendIntent: (intent: ValuIntent) => Promise<unknown>;
  /** Get the raw Valu API instance (null if not connected) */
  getApi: () => unknown;
}

/**
 * Return type for useMerkosProvider hook
 * Merkos-specific state and actions
 */
export interface UseMerkosProviderReturn extends Omit<MerkosProviderState, 'refreshToken'> {
  /** The stored refresh token value (from state) */
  refreshTokenValue: string | null | undefined;
  /** Login with credentials */
  loginWithCredentials: (
    username: string,
    password: string,
    siteId?: string
  ) => Promise<void>;
  /** Login with bearer token */
  loginWithBearerToken: (token: string, siteId?: string) => Promise<void>;
  /** Login with Google OAuth */
  loginWithGoogle: (code: string, host?: string, siteId?: string) => Promise<void>;
  /** Refresh the auth token */
  refreshAuthToken: () => Promise<void>;
  /** Fetch enrichment data (organizations, roles) */
  fetchEnrichment: () => Promise<void>;
  /** Logout from Merkos */
  logout: () => Promise<void>;
}

/**
 * Return type for useAuthStatus hook
 * Computed authentication status helpers
 */
export interface UseAuthStatusReturn {
  /** Current status enum */
  status: AuthStatus;
  /** Whether user is authenticated with all configured providers */
  isFullyAuthenticated: boolean;
  /** Whether user is authenticated with at least one provider */
  isPartiallyAuthenticated: boolean;
  /** Whether authenticated but accounts not linked */
  needsLinking: boolean;
  /** Whether currently loading/checking auth */
  isLoading: boolean;
  /** Whether there's an error */
  hasError: boolean;
  /** Get status message for display */
  getStatusMessage: () => string;
}

/**
 * Return type for useCdsso hook
 * Cross-Domain SSO operations
 */
export interface UseCdssoReturn {
  /** Whether CDSSO is in progress */
  isProcessing: boolean;
  /** Whether CDSSO completed successfully */
  isComplete: boolean;
  /** CDSSO error if any */
  error: Error | null;
  /** Initiate CDSSO flow */
  initiate: (options?: CdssoInitiateOptions) => Promise<void>;
  /** Handle CDSSO callback (auto-called on mount) */
  handleCallback: () => Promise<boolean>;
  /** Get stored bearer token */
  getBearerToken: () => string | null;
  /** Clear CDSSO session */
  clearSession: () => void;
}

/**
 * Options for initiating CDSSO flow
 */
export interface CdssoInitiateOptions {
  /** Target domain for SSO */
  targetDomain?: string;
  /** Return URL after SSO */
  returnUrl?: string;
  /** Additional state to pass through */
  state?: Record<string, string>;
}

/**
 * Valu Intent type (simplified)
 * Full intent types from @arkeytyp/valu-api
 */
export interface ValuIntent {
  /** Intent type */
  type: string;
  /** Intent payload */
  payload?: Record<string, unknown>;
}
