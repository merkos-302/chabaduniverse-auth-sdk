/**
 * Provider state type definitions for @chabaduniverse/auth-sdk
 *
 * These types represent the state of each authentication provider
 * and the combined providers state object.
 */

import type {
  ValuUser,
  MerkosUser,
  MerkosEnrichment,
  AuthProvider,
} from './user';

/**
 * Connection state for Valu provider
 */
export interface ValuConnectionState {
  /** Whether connected to Valu servers */
  isConnected: boolean;
  /** Whether the Valu API is ready to use */
  isReady: boolean;
  /** Whether running inside a Valu iframe */
  isInIframe: boolean;
  /** Whether currently navigating within Valu app */
  isNavigatingApp: boolean;
  /** Connection error if any */
  error?: string | null;
}

/**
 * Full state for Valu Social provider
 */
export interface ValuProviderState {
  /** Whether connected to Valu */
  isConnected: boolean;
  /** Whether user is authenticated with Valu */
  isAuthenticated: boolean;
  /** Whether Valu is ready */
  isReady: boolean;
  /** Whether running in Valu iframe */
  isInIframe: boolean;
  /** Authenticated Valu user */
  user: ValuUser | null;
  /** Any error */
  error: Error | null;
  /** Connection state details */
  connectionState: ValuConnectionState;
}

/**
 * Full state for Merkos Platform provider
 */
export interface MerkosProviderState {
  /** Whether user is authenticated with Merkos */
  isAuthenticated: boolean;
  /** Whether a bearer token is available */
  hasBearerToken: boolean;
  /** Whether the bearer token has been verified */
  tokenVerified: boolean;
  /** Authenticated Merkos user */
  user: MerkosUser | null;
  /** User's access token */
  token: string | null;
  /** User's refresh token */
  refreshToken?: string | null;
  /** Enrichment data (organizations, roles, etc.) */
  enrichment: MerkosEnrichment | null;
  /** Any error */
  error: Error | null;
}

/**
 * State for the unified Universe identity layer
 */
export interface UniverseProviderState {
  /** Whether identities from multiple providers are linked */
  isLinked: boolean;
  /** List of linked provider accounts */
  linkedProviders: AuthProvider[];
  /** Primary provider used for authentication */
  primaryProvider: AuthProvider | null;
  /** Timestamp of last identity sync */
  lastSyncAt: string | null;
}

/**
 * Combined state of all providers
 * Accessible via useUniverseAuth().providers
 */
export interface ProvidersState {
  /** Valu Social provider state */
  valu: ValuProviderState;
  /** Merkos Platform provider state */
  merkos: MerkosProviderState;
  /** Unified Universe provider state */
  universe: UniverseProviderState;
}

/**
 * Default initial state for Valu provider
 */
export const initialValuProviderState: ValuProviderState = {
  isConnected: false,
  isAuthenticated: false,
  isReady: false,
  isInIframe: false,
  user: null,
  error: null,
  connectionState: {
    isConnected: false,
    isReady: false,
    isInIframe: false,
    isNavigatingApp: false,
    error: null,
  },
};

/**
 * Default initial state for Merkos provider
 */
export const initialMerkosProviderState: MerkosProviderState = {
  isAuthenticated: false,
  hasBearerToken: false,
  tokenVerified: false,
  user: null,
  token: null,
  refreshToken: null,
  enrichment: null,
  error: null,
};

/**
 * Default initial state for Universe provider
 */
export const initialUniverseProviderState: UniverseProviderState = {
  isLinked: false,
  linkedProviders: [],
  primaryProvider: null,
  lastSyncAt: null,
};

/**
 * Default initial state for all providers
 */
export const initialProvidersState: ProvidersState = {
  valu: initialValuProviderState,
  merkos: initialMerkosProviderState,
  universe: initialUniverseProviderState,
};
