/**
 * Merkos Platform Integration Types
 *
 * Type definitions for Merkos Platform authentication and API integration.
 * These types wrap @chabaduniverse/auth with React-specific state management.
 *
 * @see @chabaduniverse/auth for the underlying MerkosAPIAdapter
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Merkos user data
 */
export interface MerkosUserData {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email?: string;
  /** User's display name */
  name?: string;
  /** User's role */
  role?: string;
  /** User's permissions */
  permissions?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Authentication status for Merkos
 */
export type MerkosAuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

/**
 * Merkos authentication state
 */
export interface MerkosAuthState {
  /** Current authentication status */
  status: MerkosAuthStatus;
  /** Authenticated user (if any) */
  user: MerkosUserData | null;
  /** JWT token (if authenticated) */
  token: string | null;
  /** Error message (if error status) */
  error: string | null;
  /** Whether the adapter has a bearer token set */
  hasBearerToken: boolean;
  /** Timestamp of last status check */
  lastCheck: number | null;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Merkos Provider configuration
 */
export interface MerkosProviderConfig {
  /**
   * Base URL for Merkos Platform API
   * @example 'https://org.merkos302.com'
   */
  baseUrl: string;

  /**
   * API version to use
   * @default 'v2'
   */
  apiVersion?: 'v2' | 'v4';

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Site ID for multi-tenant authentication
   */
  siteId?: string;

  /**
   * Auto-login with bearer token from CDSSO if available
   * @default true
   */
  autoLoginWithCdsso?: boolean;

  /**
   * Storage key for token persistence
   * @default 'merkos_auth_token'
   */
  storageKey?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Merkos authentication response
 */
export interface MerkosAuthResponse {
  /** Authenticated user data */
  user: MerkosUserData;
  /** JWT token */
  token: string;
  /** Refresh token (if supported) */
  refreshToken?: string;
  /** Token expiration in seconds */
  expiresIn?: number;
}

/**
 * Merkos error response
 */
export interface MerkosErrorResponse {
  /** Error message */
  err: string;
  /** Error code */
  code?: string;
  /** Additional error details */
  details?: unknown;
}

// ============================================================================
// Login Options
// ============================================================================

/**
 * Credentials login options
 */
export interface CredentialsLoginOptions {
  /** Username or email */
  username: string;
  /** Password */
  password: string;
  /** Optional site ID */
  siteId?: string;
}

/**
 * Bearer token login options
 */
export interface BearerTokenLoginOptions {
  /** JWT token */
  token: string;
  /** Optional site ID */
  siteId?: string;
}

/**
 * Google OAuth login options
 */
export interface GoogleLoginOptions {
  /** OAuth authorization code */
  code: string;
  /** OAuth host/domain */
  host?: string;
  /** Optional site ID */
  siteId?: string;
}

/**
 * Chabad.org SSO login options
 */
export interface ChabadOrgLoginOptions {
  /** SSO key */
  key: string;
  /** Optional site ID */
  siteId?: string;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Return type for useMerkos hook
 */
export interface UseMerkosReturn {
  /** Current Merkos state */
  state: MerkosAuthState;

  /** Whether user is authenticated */
  isAuthenticated: boolean;

  /** Whether authentication is in progress */
  isLoading: boolean;

  /** Whether a bearer token is set */
  hasBearerToken: boolean;

  /** Current user data */
  user: MerkosUserData | null;

  /** Current JWT token */
  token: string | null;

  /** Error message (if any) */
  error: string | null;

  /**
   * Login with username and password
   */
  loginWithCredentials: (options: CredentialsLoginOptions) => Promise<MerkosUserData | null>;

  /**
   * Login with bearer token (JWT)
   */
  loginWithBearerToken: (options: BearerTokenLoginOptions) => Promise<MerkosUserData | null>;

  /**
   * Login with Google OAuth
   */
  loginWithGoogle: (options: GoogleLoginOptions) => Promise<MerkosUserData | null>;

  /**
   * Login with Chabad.org SSO
   */
  loginWithChabadOrg: (options: ChabadOrgLoginOptions) => Promise<MerkosUserData | null>;

  /**
   * Get current user from API
   */
  getCurrentUser: () => Promise<MerkosUserData | null>;

  /**
   * Logout from Merkos
   */
  logout: () => Promise<void>;

  /**
   * Set bearer token manually
   */
  setToken: (token: string) => void;

  /**
   * Clear bearer token
   */
  clearToken: () => void;

  /**
   * Make a v2 API request
   */
  v2Request: <T = unknown>(
    service: string,
    path: string,
    params?: Record<string, unknown>
  ) => Promise<T>;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Merkos context value (internal)
 */
export interface MerkosContextValue extends UseMerkosReturn {
  /** Provider config */
  config: Required<MerkosProviderConfig>;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default Merkos Provider configuration
 */
export const defaultMerkosProviderConfig: Required<MerkosProviderConfig> = {
  baseUrl: 'https://org.merkos302.com',
  apiVersion: 'v2',
  timeout: 30000,
  siteId: '',
  autoLoginWithCdsso: true,
  storageKey: 'merkos_auth_token',
  debug: false,
};

/**
 * Initial Merkos authentication state
 */
export const initialMerkosAuthState: MerkosAuthState = {
  status: 'idle',
  user: null,
  token: null,
  error: null,
  hasBearerToken: false,
  lastCheck: null,
};
