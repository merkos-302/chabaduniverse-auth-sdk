/**
 * cu-oidc — the composed client. `createCuOidcClient(config)` returns a small
 * object bundling the whole surface (login, silent SSO, verify, claims, token
 * lifecycle, logout) bound to one resolved configuration. All methods delegate
 * to the framework-agnostic functions in the sibling modules, so tree-shaking
 * consumers can also import those directly.
 */

import {
  getClaims,
  getNamespace,
  getShliachStatus,
  getTokenExpiration,
  isTokenExpired,
} from './claims';
import { resolveCuOidcConfig } from './config';
import { verifyIdToken, type JwkSet } from './jwks';
import {
  handleLoginCallback,
  refreshTokens,
  startLogin,
  type HandleLoginCallbackOptions,
  type NavigateFn,
  type RefreshTokensOptions,
  type StartLoginOptions,
} from './login';
import {
  handleReceiver,
  startSilentSso,
  type HandleReceiverOptions,
  type StartSilentSsoOptions,
} from './silent-sso';
import { clearIdToken, readIdToken } from './storage';
import type {
  CuOidcClaims,
  CuOidcConfig,
  CuOidcLoginResult,
  CuOidcNamespace,
  CuOidcSilentResult,
  CuOidcTokens,
  ResolvedCuOidcConfig,
} from './types';

/** Options for {@link CuOidcClient.verify}. */
export interface ClientVerifyOptions {
  jwks?: JwkSet;
  fetchImpl?: typeof fetch;
  clockToleranceSec?: number;
}

/** Options for {@link CuOidcClient.logout}. */
export interface LogoutOptions {
  /** `post_logout_redirect_uri` sent to `/oidc/session/end`. */
  postLogoutRedirectUri?: string;
  /** `id_token_hint`. Defaults to the stored id_token when present. */
  idTokenHint?: string;
  /** Opaque `state` echoed back after logout. */
  state?: string;
  /** When `false`, return the end-session URL instead of navigating. Default `true`. */
  redirect?: boolean;
  /** Custom navigation (defaults to `window.location.assign`). */
  navigate?: NavigateFn;
  /** Clear the first-party stored id_token (default `true`). */
  clearStored?: boolean;
}

/** The composed cu-oidc client surface. */
export interface CuOidcClient {
  /** The resolved configuration (issuer, endpoints, defaults applied). */
  readonly config: ResolvedCuOidcConfig;

  // --- login (authorization code + PKCE) ---
  /** Start a login: mint PKCE, stash it, navigate to `/oidc/auth`. */
  login(opts?: StartLoginOptions): Promise<string>;
  /** Complete a login on the redirect-back page (code exchange + verify). */
  handleLoginCallback(opts?: HandleLoginCallbackOptions): Promise<CuOidcLoginResult>;

  // --- silent cross-domain SSO ---
  /** Start a silent-SSO probe: navigate top-level to `/sso/check`. */
  silentSSO(opts?: StartSilentSsoOptions): string;
  /** Handle the silent-SSO return hop. `not_authenticated` → fall back to `login`. */
  handleReceiver(opts?: HandleReceiverOptions): Promise<CuOidcSilentResult>;

  // --- verification + claims ---
  /** Verify a token (JWKS signature + iss + exp). Throws on failure. */
  verify(token: string, opts?: ClientVerifyOptions): Promise<CuOidcClaims>;
  /** Decode a token's claim set (UNVERIFIED). */
  getClaims(token: string): CuOidcClaims | null;
  /** Read one of the three claim namespaces. */
  getNamespace<N extends CuOidcNamespace>(
    source: string | CuOidcClaims | null,
    namespace: N,
  ): ReturnType<typeof getNamespace<N>>;
  /** Resolve shliach status from a token/claim set. */
  getShliachStatus(source: string | CuOidcClaims | null): boolean;

  // --- token lifecycle ---
  /** The first-party stored id_token, or `null`. */
  getStoredToken(): string | null;
  /** Decoded claims of the stored id_token (UNVERIFIED), or `null`. */
  getCurrentUser(): CuOidcClaims | null;
  /** Whether a non-expired id_token is stored first-party. */
  isAuthenticated(bufferSeconds?: number): boolean;
  /** Whether a token (default: the stored one) is expired/invalid. */
  isTokenExpired(token?: string, bufferSeconds?: number): boolean;
  /** `exp` in ms of a token (default: the stored one), or `null`. */
  getTokenExpiration(token?: string): number | null;
  /** Exchange a refresh_token for a fresh token set. */
  refresh(refreshToken: string, opts?: RefreshTokensOptions): Promise<CuOidcTokens>;

  // --- logout ---
  /** Clear the stored token and navigate to `/oidc/session/end`. */
  logout(opts?: LogoutOptions): string;
}

/** Build a cu-oidc client bound to a resolved configuration. */
export function createCuOidcClient(config: CuOidcConfig): CuOidcClient {
  const resolved = resolveCuOidcConfig(config);

  const client: CuOidcClient = {
    config: resolved,

    login: (opts) => startLogin(resolved, opts),
    handleLoginCallback: (opts) => handleLoginCallback(resolved, opts),

    silentSSO: (opts) => startSilentSso(resolved, opts),
    handleReceiver: (opts) => handleReceiver(resolved, opts),

    verify: (token, opts = {}) =>
      verifyIdToken(token, {
        jwksUri: resolved.endpoints.jwks,
        issuer: resolved.issuer,
        ...(opts.jwks ? { jwks: opts.jwks } : {}),
        ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
        ...(opts.clockToleranceSec !== undefined
          ? { clockToleranceSec: opts.clockToleranceSec }
          : {}),
      }),
    getClaims: (token) => getClaims(token),
    getNamespace: (source, namespace) => getNamespace(source, namespace),
    getShliachStatus: (source) => getShliachStatus(source),

    getStoredToken: () => readIdToken(resolved.tokenStorageKey),
    getCurrentUser: () => {
      const token = readIdToken(resolved.tokenStorageKey);
      return token ? getClaims(token) : null;
    },
    isAuthenticated: (bufferSeconds) => {
      const token = readIdToken(resolved.tokenStorageKey);
      return token !== null && !isTokenExpired(token, bufferSeconds);
    },
    isTokenExpired: (token, bufferSeconds) => {
      const t = token ?? readIdToken(resolved.tokenStorageKey);
      if (!t) return true;
      return isTokenExpired(t, bufferSeconds);
    },
    getTokenExpiration: (token) => {
      const t = token ?? readIdToken(resolved.tokenStorageKey);
      return t ? getTokenExpiration(t) : null;
    },
    refresh: (refreshToken, opts) => refreshTokens(resolved, refreshToken, opts),

    logout: (opts = {}) => {
      const hint = opts.idTokenHint ?? readIdToken(resolved.tokenStorageKey) ?? undefined;
      if (opts.clearStored !== false) clearIdToken(resolved.tokenStorageKey);

      const u = new URL(resolved.endpoints.endSession);
      if (hint) u.searchParams.set('id_token_hint', hint);
      if (opts.postLogoutRedirectUri) {
        u.searchParams.set('post_logout_redirect_uri', opts.postLogoutRedirectUri);
      }
      if (opts.state) u.searchParams.set('state', opts.state);
      const url = u.toString();

      if (opts.redirect !== false) {
        const navigate: NavigateFn =
          opts.navigate ??
          ((target) => {
            if (typeof window !== 'undefined') window.location.assign(target);
          });
        navigate(url);
      }
      return url;
    },
  };

  return client;
}
