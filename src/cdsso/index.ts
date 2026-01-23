/**
 * CDSSO Module - Cross-Domain Single Sign-On for @chabaduniverse/auth-sdk
 *
 * Provides CDSSO functionality for the Chabad Universe ecosystem:
 * - Merkos Platform authentication (id.merkos302.com)
 * - Cross-tab/domain state synchronization
 * - Bearer token management
 *
 * @example
 * ```tsx
 * // React Hook usage
 * import { useCdsso } from '@chabaduniverse/auth-sdk';
 *
 * function MyComponent() {
 *   const { isAuthenticated, user, authenticate, logout } = useCdsso();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={authenticate}>Login</button>;
 *   }
 *
 *   return <p>Welcome, {user?.name}</p>;
 * }
 * ```
 *
 * @example
 * ```ts
 * // Direct client usage
 * import { CdssoClient, authenticate, getBearerToken } from '@chabaduniverse/auth-sdk';
 *
 * // Quick authenticate
 * const user = await authenticate();
 *
 * // Get token for API calls
 * const token = getBearerToken();
 * ```
 */

// ============================================================================
// Client
// ============================================================================

export {
  // Main Merkos Platform client
  CdssoClient,
  // Legacy cross-domain sync client
  CDSSOClient,
  // Convenience functions
  getDefaultCdssoClient,
  authenticate,
  logout,
  checkRemoteSession,
  applyTokenToPortal,
  isAuthenticated,
  getAuthStatus,
  getBearerToken,
  // Namespace for compatibility with universe-portal
  CDSSOUtils,
} from './cdsso-client';

// ============================================================================
// Hooks
// ============================================================================

export {
  useCdsso,
  useCdssoAutoAuth,
  useCdssoToken,
  useCdssoUser,
} from './useCdsso';

// ============================================================================
// Types
// ============================================================================

export type {
  // Core types
  CdssoUser,
  CdssoAuthStatus,
  CdssoState,

  // Configuration types
  CdssoMerkosConfig,
  CdssoCrossDomainConfig,
  CdssoConfig,

  // API response types
  RemoteSessionResponse,
  PortalAuthResponse,

  // Hook types
  UseCdssoReturn,

  // Legacy types (for backward compatibility)
  CDSSOConfig,
  CDSSOToken,
  CDSSOMessage,
} from './types';

export {
  defaultMerkosConfig,
  defaultCrossDomainConfig,
  initialCdssoState,
} from './types';

// ============================================================================
// Utilities
// ============================================================================

export {
  // Storage helpers
  isLocalStorageAvailable,
  getStoredToken,
  storeToken,
  removeToken,

  // Cookie helpers
  areCookiesAvailable,
  getCookie,
  hasCookie,
  hasAuthCookie,

  // State validation
  generateState,
  storeState,
  validateState,

  // URL helpers
  parseUrlParams,
  isCdssoCallback,
  buildCdssoUrl,

  // Token helpers
  decodeJwtPayload,
  isTokenExpired,
  getTokenExpiration,

  // Logging
  createCdssoLogger,
  cdssoLogger,
} from './cdsso-utils';
