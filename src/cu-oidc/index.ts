/**
 * cu-oidc-native mode (CU-1029) — public barrel.
 *
 * Speaks directly to the canonical Chabad Universe OIDC provider
 * (`*.oidc.merkos302.com`) as a secretless public PKCE client. Ships ALONGSIDE
 * the relay-based `../oidc` module — a consumer selects cu-oidc mode by
 * importing from here (`@chabaduniverse/auth-sdk/cu-oidc`) or via the root
 * `createCuOidcClient` / `useCuOidc` re-exports.
 *
 * Import the composed client for the common case:
 *   const cu = createCuOidcClient({ clientId, redirectUri, environment: 'staging' });
 *   await cu.login();                       // start PKCE auth-code
 *   await cu.handleLoginCallback();         // on the redirect back
 *   cu.silentSSO();                         // top-level /sso/check probe
 *   const r = await cu.handleReceiver();    // on the return hop
 *
 * ...or import the granular, tree-shakeable functions directly.
 */

// --- composed client + React hook ---
export { createCuOidcClient } from './client';
export type { CuOidcClient, ClientVerifyOptions, LogoutOptions } from './client';
export { useCuOidc } from './useCuOidc';
export type { UseCuOidcReturn } from './useCuOidc';

// --- config ---
export { resolveCuOidcConfig, resolveIssuer, buildEndpoints } from './config';

// --- PKCE + login ---
export { generatePkceParams, buildAuthorizeUrl } from './pkce';
export {
  startLogin,
  handleLoginCallback,
  refreshTokens,
  CuOidcLoginError,
} from './login';
export type {
  NavigateFn,
  StartLoginOptions,
  HandleLoginCallbackOptions,
  RefreshTokensOptions,
} from './login';

// --- silent SSO ---
export { startSilentSso, handleReceiver } from './silent-sso';
export type {
  TopNavigateFn,
  ReplaceUrlFn,
  StartSilentSsoOptions,
  HandleReceiverOptions,
} from './silent-sso';

// --- JWKS verification ---
export {
  verifyIdToken,
  fetchJwks,
  clearJwksCache,
  CuOidcVerifyError,
} from './jwks';
export type { Jwk, JwkSet, VerifyOptions } from './jwks';

// --- claims + token lifecycle ---
export {
  getClaims,
  getNamespace,
  getShliachStatus,
  isTokenExpired,
  getTokenExpiration,
} from './claims';

// --- storage helpers ---
export {
  storeIdToken,
  readIdToken,
  clearIdToken,
} from './storage';

// --- low-level crypto/encoding helpers ---
export {
  decodeJwtPayload,
  decodeJwtHeader,
  randomBase64Url,
  sha256Base64Url,
  bytesToBase64Url,
  base64UrlToBytes,
  base64UrlToString,
} from './crypto-utils';
export type { JwtHeader } from './crypto-utils';

// --- constants + types ---
export {
  CU_OIDC_ISSUERS,
  DEFAULT_CU_OIDC_ENVIRONMENT,
  DEFAULT_CU_OIDC_SCOPE,
  DEFAULT_STORAGE_KEY_PREFIX,
  DEFAULT_TOKEN_STORAGE_KEY,
} from './types';
export type {
  CuOidcEnvironment,
  CuOidcEndpoints,
  CuOidcConfig,
  ResolvedCuOidcConfig,
  PkceParams,
  PkceStash,
  CuOidcTokens,
  CuOidcLoginResult,
  CuOidcSilentResult,
  CuChabaduniverseClaims,
  CuValuClaims,
  CuMerkosClaims,
  CuOidcClaims,
  CuOidcNamespace,
} from './types';
