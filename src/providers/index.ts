/**
 * Provider exports for @chabaduniverse/auth-sdk
 */

export {
  UniverseAuthProvider,
  useUniverseAuthContext,
  UniverseAuthContext,
} from './UniverseAuthProvider';

export type { UniverseAuthContextValue } from './UniverseAuthProvider';

// Export provider configuration types
export type {
  UniverseAuthConfig,
  UniverseAuthProviderProps,
  MerkosConfig,
  ValuConfig,
  CdssoConfig,
} from './types';

export {
  defaultConfig,
  defaultMerkosConfig,
  defaultValuConfig,
  defaultCdssoConfig,
} from './types';

// State merger utilities
export {
  mergeUserStates,
  determineAuthStatus,
  prioritizeProvider,
  buildUniverseProviderState,
  needsLinking,
} from './state-merger';

export type {
  MergeOptions,
  AuthStatusResult,
} from './state-merger';

// Note: User, state, and provider types are exported from src/types/
// Import from '@chabaduniverse/auth-sdk' to get all types
