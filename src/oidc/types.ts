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

/**
 * Environment names the SDK accepts for the `environment` option.
 *
 * Phase 1 (CU-889): both environments route to the auth-relay. Phase 3
 * (blocked on CU-890) will flip the URLs to cu-oidc-provider endpoints.
 */
export type MerkosEnvironment = 'production' | 'staging';

/**
 * Canonical URLs the SDK uses per environment.
 *
 * Phase 1 (CU-889): staging mirrors production against the staging auth-relay
 * (`test-auth.chabaduniverse.com`). Phase 3 will flip both production and
 * staging to point at `id.chabaduniverse.com` / `staging.id.chabaduniverse.com`
 * once CU-890 ships `/oidc/reconnect` on cu-oidc-provider.
 */
export const ENVIRONMENT_URLS = {
  production: {
    auth: 'https://auth.chabaduniverse.com/merkos/login',
    reconnect: 'https://auth.chabaduniverse.com/merkos/reconnect',
  },
  staging: {
    auth: 'https://test-auth.chabaduniverse.com/merkos/login',
    reconnect: 'https://test-auth.chabaduniverse.com/merkos/reconnect',
  },
} as const satisfies Record<MerkosEnvironment, { auth: string; reconnect: string }>;

/** Default environment when none is supplied. */
export const DEFAULT_ENVIRONMENT: MerkosEnvironment = 'production';

/**
 * Default auth popup URL.
 * @deprecated Use the `environment` option on `useMerkosAuth` / `useMerkosOIDC` instead.
 *   Retained for back-compat; will be removed in a future major version.
 */
export const DEFAULT_AUTH_URL = ENVIRONMENT_URLS.production.auth;

/**
 * Default reconnect popup URL.
 * @deprecated Use the `environment` option on `useMerkosAuth` / `useMerkosOIDC` instead.
 *   Retained for back-compat; will be removed in a future major version.
 */
export const DEFAULT_RECONNECT_URL = ENVIRONMENT_URLS.production.reconnect;

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
  /**
   * Environment to route the popup to. Defaults to `'production'`.
   * Ignored if an explicit `authUrl` is supplied.
   */
  environment?: MerkosEnvironment;
  /**
   * URL to open in the popup.
   * @deprecated Use `environment` instead. When set, overrides `environment` and
   *   emits a one-time deprecation warning.
   */
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
  /**
   * Environment to route auth + reconnect popups to. Defaults to `'production'`.
   * Ignored for whichever URL is explicitly supplied via `authUrl` / `reconnectUrl`.
   */
  environment?: MerkosEnvironment;
  /**
   * URL for the auth login popup.
   * @deprecated Use `environment` instead. When set, overrides `environment` for the
   *   auth popup and emits a one-time deprecation warning.
   */
  authUrl?: string;
  /**
   * URL for the reconnect popup (Step 3 manual reconnect).
   * @deprecated Use `environment` instead. When set, overrides `environment` for the
   *   reconnect popup and emits a one-time deprecation warning.
   */
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
