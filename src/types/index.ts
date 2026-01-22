/**
 * Type exports for @chabaduniverse/auth-sdk
 *
 * This module re-exports all types from the SDK for easy consumption.
 *
 * @example
 * ```ts
 * import type { UniverseUser, AuthStatus, LoginOptions } from '@chabaduniverse/auth-sdk';
 * ```
 */

// ============================================
// User Types
// ============================================

export type {
  BaseUser,
  ValuUser,
  MerkosUser,
  Organization,
  Role,
  MerkosEnrichment,
  ValuEnrichment,
  UniverseUser,
  AuthProvider,
  AuthMethod,
} from './user';

// ============================================
// Provider Types
// ============================================

export type {
  ValuConnectionState,
  ValuProviderState,
  MerkosProviderState,
  UniverseProviderState,
  ProvidersState,
} from './providers';

export {
  initialValuProviderState,
  initialMerkosProviderState,
  initialUniverseProviderState,
  initialProvidersState,
} from './providers';

// ============================================
// Context Types
// ============================================

export { AuthStatus } from './context';

export type {
  AuthError,
  AuthErrorCode,
  LoginOptions,
  LogoutOptions,
  LinkAccountOptions,
  // Note: UniverseAuthContextValue is exported from './providers' to avoid conflicts
  UniverseAuthState,
  UniverseAuthActions,
} from './context';

// ============================================
// Hook Types
// ============================================

export type {
  UseUniverseAuthReturn,
  UseProvidersReturn,
  UseValuProviderReturn,
  UseMerkosProviderReturn,
  UseAuthStatusReturn,
  UseCdssoReturn,
  CdssoInitiateOptions,
  ValuIntent,
} from './hooks';

// ============================================
// Component Types
// ============================================

export type {
  AuthComponentBaseProps,
  LoginButtonProps,
  AuthGuardProps,
  AuthGuardFailureReason,
  UserMenuProps,
  UserMenuItem,
  AuthStatusProps,
  ProviderButtonProps,
  LinkedAccountsProps,
} from './components';

// ============================================
// Type Helpers
// ============================================

/**
 * Helper type to extract provider-specific user type
 */
export type ProviderUser<T extends AuthProvider> = T extends 'merkos'
  ? MerkosUser
  : T extends 'valu'
    ? ValuUser
    : never;

/**
 * Helper type to extract provider-specific state type
 */
export type ProviderState<T extends AuthProvider> = T extends 'merkos'
  ? MerkosProviderState
  : T extends 'valu'
    ? ValuProviderState
    : never;

/**
 * Helper to check if a status indicates authenticated
 */
export function isAuthenticatedStatus(status: AuthStatusEnum): boolean {
  return (
    status === AuthStatusEnum.Authenticated ||
    status === AuthStatusEnum.Partial
  );
}

/**
 * Helper to check if a status indicates loading
 */
export function isLoadingStatus(status: AuthStatusEnum): boolean {
  return status === AuthStatusEnum.Loading;
}

/**
 * Helper to check if a status indicates error
 */
export function isErrorStatus(status: AuthStatusEnum): boolean {
  return status === AuthStatusEnum.Error;
}

// Import types for use in helper functions
import type { MerkosUser, ValuUser, AuthProvider } from './user';
import type { MerkosProviderState, ValuProviderState } from './providers';
import { AuthStatus as AuthStatusEnum } from './context';
