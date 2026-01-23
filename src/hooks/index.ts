/**
 * Hooks Module for @chabaduniverse/auth-sdk
 *
 * Provides React hooks for authentication state and actions.
 *
 * @example
 * ```tsx
 * import {
 *   useUniverseAuth,
 *   useProviders,
 *   useAuthStatus,
 * } from '@chabaduniverse/auth-sdk';
 * ```
 */

// Main authentication hook
export { useUniverseAuth } from './useUniverseAuth';

// Provider access hooks
export {
  useProviders,
  useValuProvider,
  useMerkosProvider,
  useUniverseProvider,
} from './useProviders';

// Auth status hooks
export {
  useAuthStatus,
  useIsAuthenticated,
  useIsLoading,
  useAuthError,
} from './useAuthStatus';

// Types are exported from src/types/hooks.ts
// Import from '@chabaduniverse/auth-sdk' or '@chabaduniverse/auth-sdk/types'
