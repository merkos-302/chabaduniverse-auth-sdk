/**
 * @chabaduniverse/auth-sdk
 *
 * Unified authentication SDK for Chabad Universe ecosystem.
 * Composes @chabaduniverse/auth and @arkeytyp/valu-api into a single,
 * easy-to-use authentication layer.
 */

// ============================================================================
// Providers
// ============================================================================

export {
  UniverseAuthProvider,
  useUniverseAuthContext,
  UniverseAuthContext,
  type UniverseAuthContextValue,
} from './providers';

export type {
  UniverseAuthConfig,
  MerkosConfig,
  ValuConfig,
  UniverseAuthProviderProps,
} from './providers';

export {
  defaultConfig,
  defaultValuConfig,
} from './providers';

// Also export the provider-specific CDSSO config with a different name
export type { CdssoConfig as ProviderCdssoConfig } from './providers/types';
export {
  defaultCdssoConfig as defaultProviderCdssoConfig,
  defaultMerkosConfig as defaultProviderMerkosConfig,
} from './providers/types';

// ============================================================================
// Hooks
// ============================================================================

export * from './hooks';

// ============================================================================
// Components
// ============================================================================

export * from './components';

// ============================================================================
// CDSSO Module
// ============================================================================

export {
  // Client
  CdssoClient,
  CDSSOClient,
  getDefaultCdssoClient,
  authenticate,
  logout,
  checkRemoteSession,
  applyTokenToPortal,
  isAuthenticated,
  getAuthStatus,
  getBearerToken,
  CDSSOUtils,
  // Hooks
  useCdsso,
  useCdssoAutoAuth,
  useCdssoToken,
  useCdssoUser,
  // Default values
  defaultMerkosConfig,
  defaultCrossDomainConfig,
  initialCdssoState,
  // Utilities
  isLocalStorageAvailable,
  getStoredToken,
  storeToken,
  removeToken,
  areCookiesAvailable,
  getCookie,
  hasCookie,
  hasAuthCookie,
  generateState,
  storeState,
  validateState,
  parseUrlParams,
  isCdssoCallback,
  buildCdssoUrl,
  decodeJwtPayload,
  isTokenExpired,
  getTokenExpiration,
  createCdssoLogger,
  cdssoLogger,
} from './cdsso';

export type {
  CdssoUser,
  CdssoAuthStatus,
  CdssoState,
  CdssoMerkosConfig,
  CdssoCrossDomainConfig,
  CdssoConfig,
  RemoteSessionResponse,
  PortalAuthResponse,
  UseCdssoReturn,
  CDSSOConfig,
  CDSSOToken,
  CDSSOMessage,
} from './cdsso';

// ============================================================================
// Merkos Module
// ============================================================================

export {
  // Provider
  MerkosProvider,
  MerkosContext,
  useMerkosContext,
  // Hooks
  useMerkos,
  useMerkosUser,
  useMerkosToken,
  useMerkosAuth,
  useMerkosActions,
  // Default values (aliased to avoid conflict with CDSSO)
  defaultMerkosProviderConfig,
  initialMerkosAuthState,
  // Utilities
  formatMerkosUser,
  getMerkosDisplayName,
  parseMerkosError,
  isMerkosError,
  isAuthError,
  extractBearerToken,
  storeBearerToken,
  removeBearerToken,
  createMerkosLogger,
  merkosLogger,
} from './merkos';

export type {
  MerkosProviderProps,
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
  MerkosError,
} from './merkos';

// ============================================================================
// Valu Module
// ============================================================================

export * from './valu';

// ============================================================================
// Core Types
// ============================================================================

export type {
  // User types
  BaseUser,
  MerkosUser,
  ValuUser,
  UniverseUser,
  AuthProvider,
  AuthMethod,
  Organization,
  Role,
  MerkosEnrichment,
  ValuEnrichment,
  // Provider state types
  ValuConnectionState,
  ValuProviderState,
  MerkosProviderState,
  UniverseProviderState,
  ProvidersState,
  // Context types
  AuthError,
  AuthErrorCode,
  LoginOptions,
  LogoutOptions,
  LinkAccountOptions,
  UniverseAuthState,
  UniverseAuthActions,
  // Hook types
  UseUniverseAuthReturn,
  UseProvidersReturn,
  UseValuProviderReturn,
  UseMerkosProviderReturn,
  UseAuthStatusReturn,
  CdssoInitiateOptions,
  ValuIntent,
  // Component types
  AuthComponentBaseProps,
  LoginButtonProps,
  AuthGuardProps,
  AuthGuardFailureReason,
  UserMenuProps,
  UserMenuItem,
  AuthStatusProps,
  ProviderButtonProps,
  LinkedAccountsProps,
  // Type helpers
  ProviderUser,
  ProviderState,
} from './types';

export {
  AuthStatus,
  initialValuProviderState,
  initialMerkosProviderState,
  initialUniverseProviderState,
  initialProvidersState,
  isAuthenticatedStatus,
  isLoadingStatus,
  isErrorStatus,
} from './types';
