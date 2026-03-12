/**
 * OIDC Module Types
 *
 * Type definitions and constants for the Merkos OIDC authentication module.
 * This module provides the 3-step fallback authentication flow for
 * sibling apps inside the Chabad Universe iframe.
 */

// ============================================================================
// Constants
// ============================================================================

/** PostMessage type for Merkos auth token messages */
export const MERKOS_AUTH_MESSAGE_TYPE = 'MERKOS_AUTH_TOKEN' as const;

/** Default auth popup URL */
export const DEFAULT_AUTH_URL = 'https://auth.chabaduniverse.com/merkos/login' as const;

/** Default reconnect popup URL */
export const DEFAULT_RECONNECT_URL = 'https://auth.chabaduniverse.com/merkos/reconnect' as const;

/** Default localStorage key for the token */
export const DEFAULT_STORAGE_KEY = 'merkos_auth_token' as const;

/** BroadcastChannel name for cross-tab auth communication */
export const BROADCAST_CHANNEL_NAME = 'merkos_auth' as const;

// ============================================================================
// Message Types
// ============================================================================

/**
 * PostMessage payload received from the auth popup
 */
export interface MerkosAuthTokenMessage {
  type: typeof MERKOS_AUTH_MESSAGE_TYPE;
  token: string;
}

// ============================================================================
// Auth Method & Mode Types
// ============================================================================

/** How the token was obtained */
export type MerkosAuthMethod = 'cached' | 'cdsso' | 'popup';

/** How to handle Step 3 reconnect */
export type MerkosReconnectMode = 'auto' | 'manual';

// ============================================================================
// useMerkosOIDC Types (Step 3 primitive)
// ============================================================================

/**
 * Options for useMerkosOIDC hook
 */
export interface UseMerkosOIDCOptions {
  /** URL to open in the popup */
  authUrl?: string;
  /** Expected origin for postMessage validation */
  expectedOrigin?: string;
  /** localStorage key for token storage */
  storageKey?: string;
}

/**
 * Return type for useMerkosOIDC hook
 */
export interface UseMerkosOIDCReturn {
  /** Open the auth popup */
  login: () => void;
  /** Whether the popup is currently open */
  isOpen: boolean;
}

// ============================================================================
// useMerkosAuth Types (3-step orchestrator)
// ============================================================================

/**
 * Options for useMerkosAuth hook
 */
export interface UseMerkosAuthOptions {
  /** localStorage key for token storage */
  storageKey?: string;
  /** How to handle Step 3: 'auto' opens popup automatically, 'manual' sets needsReconnect */
  reconnectMode?: MerkosReconnectMode;
  /** URL for the auth login popup (defaults to production auth relay) */
  authUrl?: string;
  /** URL for the reconnect popup (Step 3 manual reconnect) */
  reconnectUrl?: string;
  /** Expected origin for postMessage validation */
  expectedOrigin?: string;
  /** Callback when authentication succeeds */
  onAuthenticated?: (token: string, method: MerkosAuthMethod) => void;
  /** Enable debug logging */
  debug?: boolean;
  /**
   * Bypass the iframe guard for local development/testing.
   * When true, the hook runs the 3-step fallback even outside an iframe.
   * @default false
   */
  forceEnabled?: boolean;
}

/**
 * Return type for useMerkosAuth hook
 */
export interface UseMerkosAuthReturn {
  /** Current JWT token, or null */
  token: string | null;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** How the token was obtained */
  method: MerkosAuthMethod | null;
  /** Error message if authentication failed */
  error: string | null;
  /** Whether manual reconnect is needed (only when reconnectMode='manual') */
  needsReconnect: boolean;
  /** Whether this hook is running inside a qualifying iframe */
  isIframe: boolean;
  /** Trigger login (runs the 3-step fallback) */
  login: () => void;
  /** Clear token and reset state */
  logout: () => void;
  /** Open reconnect popup manually (for reconnectMode='manual') */
  reconnect: () => void;
}
