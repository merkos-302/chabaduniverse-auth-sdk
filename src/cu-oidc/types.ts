/**
 * cu-oidc-native mode — types & constants (CU-1029).
 *
 * This module speaks directly to the canonical Chabad Universe OpenID Connect
 * Identity Provider (`cu-oidc-provider`, issuer `*.oidc.merkos302.com`) as a
 * secretless public PKCE client. It is the "Phase 3 flip" the relay-mode
 * `../oidc` module's comments anticipated — but it ships ALONGSIDE relay mode,
 * not as a replacement. A consumer opts in by importing from
 * `@chabaduniverse/auth-sdk/cu-oidc` (or the root `createCuOidcClient`).
 *
 * Ground truth for the wire contract: `cu-oidc-provider` +
 * `CU_OIDC_WIRE_CONTRACT.md`. Endpoint paths are hardcoded (NOT discovered)
 * on purpose — cu-oidc only guarantees CORS on `/oidc/token` + `/oidc/me`,
 * so a browser discovery fetch could be CORS-blocked.
 */

// ============================================================================
// Environment / issuer selection
// ============================================================================

/** Deployment targets the SDK knows canonical issuer URLs for. */
export type CuOidcEnvironment = 'staging' | 'production' | 'local';

/**
 * Canonical issuer base URLs per environment.
 *
 * `staging` is the default for now (CU-1029) — production cutover is gated on
 * the pilot go-live. `local` targets a developer's cu-oidc-provider on :4070.
 */
export const CU_OIDC_ISSUERS: Record<CuOidcEnvironment, string> = {
  staging: 'https://staging.oidc.merkos302.com',
  production: 'https://oidc.merkos302.com',
  local: 'http://localhost:4070',
} as const;

/** Default environment when none is supplied. */
export const DEFAULT_CU_OIDC_ENVIRONMENT: CuOidcEnvironment = 'staging';

/** Default OAuth scope. `openid` is mandatory for an id_token. */
export const DEFAULT_CU_OIDC_SCOPE = 'openid email profile';

/** Prefix for per-flow PKCE / state stash keys in web storage. */
export const DEFAULT_STORAGE_KEY_PREFIX = 'cu_oidc_';

/** First-party storage key the verified id_token is persisted under. */
export const DEFAULT_TOKEN_STORAGE_KEY = 'cu_id_token';

// ============================================================================
// Endpoints
// ============================================================================

/** Resolved absolute endpoint URLs for an issuer. */
export interface CuOidcEndpoints {
  /** `GET <issuer>/oidc/auth` — authorization endpoint. */
  authorize: string;
  /** `POST <issuer>/oidc/token` — token endpoint (CORS-enabled for the client). */
  token: string;
  /** `GET <issuer>/oidc/me` — userinfo (node-oidc-provider default; NOT `/oidc/userinfo`). */
  userinfo: string;
  /** `GET <issuer>/oidc/session/end` — RP-initiated logout. */
  endSession: string;
  /** `GET <issuer>/.well-known/jwks.json` — signing keys. */
  jwks: string;
  /** `GET <issuer>/sso/check` — silent cross-domain SSO probe. */
  ssoCheck: string;
}

// ============================================================================
// Configuration
// ============================================================================

/** Consumer-supplied configuration for a cu-oidc client. */
export interface CuOidcConfig {
  /** The public PKCE client_id registered in cu-oidc for this consumer origin. */
  clientId: string;
  /** Redirect URI registered for this client (e.g. `<origin>/auth/callback`). */
  redirectUri: string;
  /**
   * Environment selector. Defaults to `'staging'`. Ignored when an explicit
   * `issuer` is supplied.
   */
  environment?: CuOidcEnvironment;
  /** Explicit issuer base URL override (wins over `environment`). */
  issuer?: string;
  /** OAuth scope. Defaults to `'openid email profile'`. */
  scope?: string;
  /** Prefix for PKCE/state stash keys. Defaults to `'cu_oidc_'`. */
  storageKeyPrefix?: string;
  /** First-party storage key for the id_token. Defaults to `'cu_id_token'`. */
  tokenStorageKey?: string;
  /** Enable debug logging. Defaults to `false`. */
  debug?: boolean;
}

/** Fully-resolved configuration with defaults applied and endpoints derived. */
export interface ResolvedCuOidcConfig {
  clientId: string;
  redirectUri: string;
  issuer: string;
  scope: string;
  storageKeyPrefix: string;
  tokenStorageKey: string;
  debug: boolean;
  endpoints: CuOidcEndpoints;
}

// ============================================================================
// PKCE
// ============================================================================

/** A freshly-minted PKCE + CSRF/replay parameter set for one authorize request. */
export interface PkceParams {
  /** High-entropy `code_verifier` (base64url). */
  verifier: string;
  /** S256 `code_challenge` = base64url(SHA-256(verifier)). */
  challenge: string;
  /** Always `'S256'` — cu-oidc enforces S256 provider-wide. */
  method: 'S256';
  /** Opaque CSRF `state`. */
  state: string;
  /** Opaque `nonce` (id_token replay defense). */
  nonce: string;
}

/**
 * Values stashed same-origin (localStorage) between the authorize navigation
 * and the callback code-exchange, keyed by `state`. Single-use.
 */
export interface PkceStash {
  verifier: string;
  nonce: string;
  /** Issuer captured at authorize time so the flow can't drift mid-round-trip. */
  issuer: string;
  redirectUri: string;
  clientId: string;
  scope: string;
  createdAt: number;
}

// ============================================================================
// Token responses / results
// ============================================================================

/** Token set returned from `/oidc/token`. */
export interface CuOidcTokens {
  id_token: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

/** Result of a completed authorization-code exchange (login callback). */
export interface CuOidcLoginResult {
  tokens: CuOidcTokens;
  claims: CuOidcClaims;
  issuer: string;
}

/**
 * Result of the silent-SSO receiver hop. `not_authenticated` is the caller's
 * cue to fall back to a full `login()`.
 */
export type CuOidcSilentResult =
  | { status: 'authenticated'; token: string; claims: CuOidcClaims }
  | { status: 'not_authenticated' }
  | { status: 'no_result' }
  | { status: 'error'; error: string };

// ============================================================================
// Claim shape (three namespaces) — see cu-oidc find-account.ts buildNamespaceClaims
// ============================================================================

/**
 * `chabaduniverse` namespace — ecosystem identity + shliach status.
 * Field names mirror cu-oidc's `buildNamespaceClaims`.
 */
export interface CuChabaduniverseClaims {
  user_id?: string;
  via?: string;
  /** Canonical shliach flag for the id_token. */
  is_shliach?: boolean;
  shliach_confirmed_at?: string;
  shliach_confirmed_via?: string;
  sf_contact_id?: string;
  chabad_org_id?: string | number;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

/** `valu` namespace — snapshotted Valu identity. */
export interface CuValuClaims {
  user_id?: string;
  claims_snapshot?: unknown;
  claims_captured_at?: number;
  [key: string]: unknown;
}

/**
 * `merkos` namespace — Merkos-platform shape (byte-equivalent to the HS256
 * merkos_token body). `sub` here is the Neo4j uuid, NOT the top-level OIDC sub.
 */
export interface CuMerkosClaims {
  sub?: string;
  shliachAccess?: boolean | null;
  adminUser?: boolean | null;
  claims_snapshot?: unknown;
  claims_captured_at?: number;
  [key: string]: unknown;
}

/** The full decoded id_token: standard OIDC top level + three namespaces. */
export interface CuOidcClaims {
  sub: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  chabaduniverse?: CuChabaduniverseClaims;
  valu?: CuValuClaims;
  merkos?: CuMerkosClaims;
  [key: string]: unknown;
}

/** Namespace keys addressable via `getNamespace`. */
export type CuOidcNamespace = 'chabaduniverse' | 'valu' | 'merkos';
