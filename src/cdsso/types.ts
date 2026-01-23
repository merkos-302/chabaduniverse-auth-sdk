/**
 * Cross-Domain SSO (CDSSO) Types
 *
 * Provides type definitions for both:
 * - Cross-tab/domain sync via localStorage events
 * - Merkos Platform authentication flow
 *
 * @see docs/CDSSO_IMPLEMENTATION_PLAN.md
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * User data from successful CDSSO authentication
 */
export interface CdssoUser {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** Additional user properties */
  [key: string]: unknown;
}

/**
 * CDSSO authentication state
 */
export type CdssoAuthStatus =
  | 'idle'
  | 'checking'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

/**
 * CDSSO session state
 */
export interface CdssoState {
  /** Current authentication status */
  status: CdssoAuthStatus;
  /** Authenticated user (if any) */
  user: CdssoUser | null;
  /** JWT token (if authenticated) */
  token: string | null;
  /** Error message (if error status) */
  error: string | null;
  /** Timestamp of last status check */
  lastCheck: number | null;
  /** Whether token is stored in localStorage */
  isTokenStored: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Merkos Platform CDSSO configuration
 */
export interface CdssoMerkosConfig {
  /**
   * Remote SSO endpoint for token retrieval
   * @default 'https://id.merkos302.com/apiv4/users/sso/remote/status'
   */
  remoteEndpoint?: string;

  /**
   * Portal SSO endpoint for token validation
   * @default '/api/sso/remote/status'
   */
  portalEndpoint?: string;

  /**
   * Portal logout endpoint
   * @default '/api/sso/logout'
   */
  logoutEndpoint?: string;

  /**
   * Portal auth status endpoint
   * @default '/api/sso/status'
   */
  statusEndpoint?: string;

  /**
   * LocalStorage key for token storage
   * @default 'merkos_auth_token'
   */
  storageKey?: string;

  /**
   * Cookie name to check for authentication
   * @default 'x-auth-token'
   */
  cookieName?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Cross-domain sync configuration
 */
export interface CdssoCrossDomainConfig {
  /**
   * List of domains to sync auth state with
   */
  domains: string[];

  /**
   * Interval in ms to check for auth state changes
   * @default 5000
   */
  syncInterval?: number;

  /**
   * Storage key prefix for CDSSO tokens
   * @default 'cdsso_'
   */
  storageKeyPrefix?: string;
}

/**
 * Full CDSSO configuration
 */
export interface CdssoConfig {
  /**
   * Merkos Platform-specific configuration
   */
  merkos?: CdssoMerkosConfig;

  /**
   * Cross-domain sync configuration
   */
  crossDomain?: CdssoCrossDomainConfig;

  /**
   * Auto-detect and handle CDSSO callback on initialization
   * @default true
   */
  autoDetectCallback?: boolean;

  /**
   * Callback when authentication state changes
   */
  onAuthStateChange?: (state: CdssoState) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: Error) => void;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from Merkos Platform remote SSO endpoint
 */
export interface RemoteSessionResponse {
  /** Login status */
  status: 'loggedIn' | 'notLoggedIn';
  /** JWT token (only if loggedIn) */
  token?: string;
}

/**
 * Response from portal SSO validation endpoint
 */
export interface PortalAuthResponse {
  /** Response status */
  status: 'success' | 'error';
  /** Authenticated user data */
  user?: CdssoUser;
  /** Error message (if status is error) */
  message?: string;
}

// ============================================================================
// Cross-Domain Sync Types (Legacy Support)
// ============================================================================

/**
 * @deprecated Use CdssoCrossDomainConfig instead
 */
export interface CDSSOConfig {
  domains: string[];
  syncInterval?: number;
  storageKeyPrefix?: string;
}

/**
 * CDSSO token payload for cross-domain sync
 */
export interface CDSSOToken {
  /** User ID */
  userId: string;
  /** Token expiration timestamp */
  expiresAt: number;
  /** Origin domain */
  origin: string;
  /** Token signature for verification */
  signature: string;
}

/**
 * CDSSO sync message
 */
export interface CDSSOMessage {
  type: 'AUTH_STATE_CHANGE' | 'TOKEN_REFRESH' | 'LOGOUT';
  payload: CDSSOToken | null;
  timestamp: number;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Return type for useCdsso hook
 */
export interface UseCdssoReturn {
  /** Current CDSSO state */
  state: CdssoState;

  /** Whether user is authenticated */
  isAuthenticated: boolean;

  /** Whether authentication is in progress */
  isLoading: boolean;

  /** Current user data */
  user: CdssoUser | null;

  /** Current JWT token */
  token: string | null;

  /** Error message (if any) */
  error: string | null;

  /**
   * Initiate CDSSO authentication flow
   * @returns User data if successful, null otherwise
   */
  authenticate: () => Promise<CdssoUser | null>;

  /**
   * Check current authentication status
   * @returns User data if authenticated, null otherwise
   */
  checkStatus: () => Promise<CdssoUser | null>;

  /**
   * Log out from CDSSO session
   * @returns true if logout successful
   */
  logout: () => Promise<boolean>;

  /**
   * Clear local token storage
   */
  clearToken: () => void;

  /**
   * Get the current bearer token
   */
  getBearerToken: () => string | null;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default Merkos CDSSO configuration
 */
export const defaultMerkosConfig: Required<CdssoMerkosConfig> = {
  remoteEndpoint: 'https://id.merkos302.com/apiv4/users/sso/remote/status',
  portalEndpoint: '/api/sso/remote/status',
  logoutEndpoint: '/api/sso/logout',
  statusEndpoint: '/api/sso/status',
  storageKey: 'merkos_auth_token',
  cookieName: 'x-auth-token',
  debug: false,
};

/**
 * Default cross-domain configuration
 */
export const defaultCrossDomainConfig: Required<CdssoCrossDomainConfig> = {
  domains: [],
  syncInterval: 5000,
  storageKeyPrefix: 'cdsso_',
};

/**
 * Initial CDSSO state
 */
export const initialCdssoState: CdssoState = {
  status: 'idle',
  user: null,
  token: null,
  error: null,
  lastCheck: null,
  isTokenStored: false,
};
