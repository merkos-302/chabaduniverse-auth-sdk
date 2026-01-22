/**
 * Merkos Platform Integration Module
 *
 * Provides React integration with Merkos Platform authentication.
 *
 * @example
 * ```tsx
 * import {
 *   MerkosProvider,
 *   useMerkos,
 *   useMerkosUser,
 * } from '@chabaduniverse/auth-sdk/merkos';
 *
 * // Or from main package
 * import { MerkosProvider, useMerkos } from '@chabaduniverse/auth-sdk';
 * ```
 */

// ============================================================================
// Provider
// ============================================================================

export {
  MerkosProvider,
  MerkosContext,
  useMerkosContext,
} from './MerkosProvider';

export type { MerkosProviderProps } from './MerkosProvider';

// ============================================================================
// Hooks
// ============================================================================

export {
  useMerkos,
  useMerkosUser,
  useMerkosToken,
  useMerkosAuth,
  useMerkosActions,
} from './useMerkos';

// ============================================================================
// Types
// ============================================================================

export type {
  MerkosUserData,
  MerkosAuthStatus,
  MerkosAuthState,
  MerkosProviderConfig,
  MerkosAuthResponse,
  MerkosErrorResponse,
  CredentialsLoginOptions,
  BearerTokenLoginOptions,
  GoogleLoginOptions,
  ChabadOrgLoginOptions,
  UseMerkosReturn,
  MerkosContextValue,
} from './merkos-types';

export {
  defaultMerkosProviderConfig,
  initialMerkosAuthState,
} from './merkos-types';

// ============================================================================
// Utilities
// ============================================================================

export {
  // User formatting
  formatMerkosUser,
  getMerkosDisplayName,
  // Error handling
  parseMerkosError,
  isMerkosError,
  isAuthError,
  // Token management
  extractBearerToken,
  storeBearerToken,
  removeBearerToken,
  // Logging
  createMerkosLogger,
  merkosLogger,
} from './merkos-utils';

export type { MerkosError } from './merkos-utils';
