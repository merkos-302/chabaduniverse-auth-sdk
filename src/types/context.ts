/**
 * Context and auth status type definitions for @chabaduniverse/auth-sdk
 *
 * These types define the authentication context value and
 * various status enums used throughout the SDK.
 */

import type { UniverseUser, AuthProvider, AuthMethod } from './user';
import type { ProvidersState } from './providers';

/**
 * Authentication status enum
 * Represents the current state of authentication
 */
export enum AuthStatus {
  /** Initial state, checking auth */
  Loading = 'loading',
  /** User is fully authenticated (all required providers) */
  Authenticated = 'authenticated',
  /** User is partially authenticated (some providers) */
  Partial = 'partial',
  /** User is not authenticated */
  Unauthenticated = 'unauthenticated',
  /** Authentication error occurred */
  Error = 'error',
}

/**
 * Authentication error with provider context
 */
export interface AuthError extends Error {
  /** Error code for programmatic handling */
  code: AuthErrorCode;
  /** Provider that caused the error (if applicable) */
  provider?: AuthProvider;
  /** Original error from provider */
  cause?: Error;
  /** Additional error context */
  context?: Record<string, unknown>;
}

/**
 * Error codes for authentication errors
 */
export type AuthErrorCode =
  | 'INITIALIZATION_FAILED'
  | 'LOGIN_FAILED'
  | 'LOGOUT_FAILED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_REFRESH_FAILED'
  | 'PROVIDER_NOT_AVAILABLE'
  | 'PROVIDER_CONNECTION_FAILED'
  | 'USER_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'CDSSO_FAILED'
  | 'LINK_FAILED'
  | 'UNKNOWN_ERROR';

/**
 * Options for login action
 */
export interface LoginOptions {
  /** Specific provider to authenticate with */
  provider?: AuthProvider;
  /** Authentication method to use */
  method?: AuthMethod;
  /** Credentials for username/password login */
  credentials?: {
    username: string;
    password: string;
  };
  /** Bearer token for token-based login */
  bearerToken?: string;
  /** Google auth code for Google OAuth */
  googleCode?: string;
  /** Chabad.org key for Chabad.org SSO */
  chabadOrgKey?: string;
  /** Site ID for multi-tenant apps */
  siteId?: string;
  /** Redirect URL after login */
  redirectUrl?: string;
  /** Whether to remember the user */
  rememberMe?: boolean;
}

/**
 * Options for logout action
 */
export interface LogoutOptions {
  /** Specific provider to logout from (default: all) */
  provider?: AuthProvider;
  /** Whether to redirect after logout */
  redirect?: boolean;
  /** URL to redirect to after logout */
  redirectUrl?: string;
  /** Whether to clear all stored tokens */
  clearTokens?: boolean;
}

/**
 * Options for linking accounts
 */
export interface LinkAccountOptions {
  /** Provider to link */
  provider: AuthProvider;
  /** Auth method to use for linking */
  method?: AuthMethod;
  /** Optional credentials */
  credentials?: {
    username: string;
    password: string;
  };
}

/**
 * Value provided by the UniverseAuthContext
 * This is the full interface available in the auth context
 */
export interface UniverseAuthContextValue {
  // === State ===

  /** Unified user object (null if not authenticated) */
  user: UniverseUser | null;
  /** Whether user is authenticated with any provider */
  isAuthenticated: boolean;
  /** Whether authentication is being checked/processed */
  isLoading: boolean;
  /** Whether initial auth check is complete */
  isInitialized: boolean;
  /** Current authentication status */
  status: AuthStatus;
  /** Current error (if any) */
  error: AuthError | null;
  /** Individual provider states */
  providers: ProvidersState;

  // === Actions ===

  /**
   * Login with the specified options
   * @param options - Login configuration
   */
  login: (options?: LoginOptions) => Promise<void>;

  /**
   * Logout from one or all providers
   * @param options - Logout configuration
   */
  logout: (options?: LogoutOptions) => Promise<void>;

  /**
   * Login using a bearer token (typically from CDSSO)
   * @param token - The bearer token
   * @param siteId - Optional site ID for multi-tenant
   */
  loginWithBearerToken: (token: string, siteId?: string) => Promise<void>;

  /**
   * Link an additional provider account
   * @param options - Link configuration
   */
  linkAccount: (options: LinkAccountOptions) => Promise<void>;

  /**
   * Unlink a provider account
   * @param provider - Provider to unlink
   */
  unlinkAccount: (provider: AuthProvider) => Promise<void>;

  /**
   * Refresh the current authentication state
   */
  refreshAuth: () => Promise<void>;

  /**
   * Clear any current error
   */
  clearError: () => void;

  /**
   * Get enrichment data for Merkos user
   */
  getMerkosEnrichment: () => Promise<void>;
}

/**
 * Subset of context value for state-only access
 */
export interface UniverseAuthState {
  user: UniverseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  status: AuthStatus;
  error: AuthError | null;
  providers: ProvidersState;
}

/**
 * Subset of context value for actions-only access
 */
export interface UniverseAuthActions {
  login: (options?: LoginOptions) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  loginWithBearerToken: (token: string, siteId?: string) => Promise<void>;
  linkAccount: (options: LinkAccountOptions) => Promise<void>;
  unlinkAccount: (provider: AuthProvider) => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  getMerkosEnrichment: () => Promise<void>;
}
