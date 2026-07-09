/**
 * cu-oidc — browser authorization-code + PKCE login (public/secretless client).
 *
 * The flow spans two page loads, so it is exposed as two halves (mirroring the
 * proven cu-auth-harness split of `app.js` + `auth/callback.js`):
 *   1. {@link startLogin}          — mint PKCE, stash it, navigate to `/oidc/auth`.
 *   2. {@link handleLoginCallback} — on the redirect back, exchange `code` for
 *      tokens at `/oidc/token`, verify `nonce` + the id_token, persist it.
 */

import { getClaims } from './claims';
import { CuOidcVerifyError, verifyIdToken, type JwkSet } from './jwks';
import { buildAuthorizeUrl, generatePkceParams } from './pkce';
import { consumePkceStash, prunePkceStashes, savePkceStash, storeIdToken } from './storage';
import type {
  CuOidcLoginResult,
  CuOidcTokens,
  PkceStash,
  ResolvedCuOidcConfig,
} from './types';

/** Navigate the top-level window. Overridable for tests. */
export type NavigateFn = (url: string) => void;

const defaultNavigate: NavigateFn = (url) => {
  if (typeof window !== 'undefined') window.location.assign(url);
};

/** Options for {@link startLogin}. */
export interface StartLoginOptions {
  /**
   * When `false`, do NOT navigate — return the authorize URL for the caller to
   * use. Default `true` (navigate the top-level window).
   */
  redirect?: boolean;
  /** Custom navigation function (defaults to `window.location.assign`). */
  navigate?: NavigateFn;
}

/**
 * Begin a login: mint PKCE + state + nonce, stash them same-origin (keyed by
 * state), then navigate to the authorization endpoint. Returns the authorize
 * URL (also returned, not navigated, when `redirect: false`).
 */
export async function startLogin(
  config: ResolvedCuOidcConfig,
  opts: StartLoginOptions = {},
): Promise<string> {
  prunePkceStashes(config.storageKeyPrefix);
  const pkce = await generatePkceParams();

  const stash: PkceStash = {
    verifier: pkce.verifier,
    nonce: pkce.nonce,
    issuer: config.issuer,
    redirectUri: config.redirectUri,
    clientId: config.clientId,
    scope: config.scope,
    createdAt: Date.now(),
  };
  savePkceStash(config.storageKeyPrefix, pkce.state, stash);

  const url = buildAuthorizeUrl(config, pkce);
  if (opts.redirect !== false) {
    (opts.navigate ?? defaultNavigate)(url);
  }
  return url;
}

/** Options for {@link handleLoginCallback}. */
export interface HandleLoginCallbackOptions {
  /**
   * The callback URL to parse (must include `?code=&state=`). Defaults to
   * `window.location.href`.
   */
  url?: string;
  /** Custom fetch (defaults to global `fetch`). */
  fetchImpl?: typeof fetch;
  /** Pre-fetched JWKS to verify against (skips the network fetch — for tests). */
  jwks?: JwkSet;
  /**
   * When `true` (default), persist the verified id_token to first-party
   * storage under `config.tokenStorageKey`.
   */
  persist?: boolean;
}

/** Thrown when the login callback cannot be completed. */
export class CuOidcLoginError extends Error {
  reason: string;
  detail?: unknown;
  constructor(reason: string, message?: string, detail?: unknown) {
    super(message ?? reason);
    this.name = 'CuOidcLoginError';
    this.reason = reason;
    if (detail !== undefined) this.detail = detail;
  }
}

function currentHref(explicit: string | undefined): string {
  if (explicit) return explicit;
  if (typeof window !== 'undefined') return window.location.href;
  throw new CuOidcLoginError('no_url', 'No callback URL available (pass `url`).');
}

/**
 * Complete a login on the redirect-back page: verify `state` (CSRF), exchange
 * the authorization `code` at `/oidc/token` (PKCE, no secret), verify the
 * id_token `nonce` (replay) and its signature/iss/exp, then persist it.
 */
export async function handleLoginCallback(
  config: ResolvedCuOidcConfig,
  opts: HandleLoginCallbackOptions = {},
): Promise<CuOidcLoginResult> {
  const href = currentHref(opts.url);
  const parsed = new URL(href);
  const params = parsed.searchParams;

  const oauthError = params.get('error');
  if (oauthError) {
    throw new CuOidcLoginError('oauth_error', oauthError, {
      error: oauthError,
      error_description: params.get('error_description'),
    });
  }

  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) {
    throw new CuOidcLoginError('missing_params', 'Callback URL missing `code` or `state`.');
  }

  // Consume the stash (single-use). Its presence proves the `state` is one we
  // issued — this IS the CSRF check.
  const stash = consumePkceStash(config.storageKeyPrefix, state);
  if (!stash) {
    throw new CuOidcLoginError(
      'unknown_state',
      'Unknown or expired `state` — no matching PKCE stash. Most common cause: the ' +
        'callback was opened in a different browser than the one that started sign-in.',
    );
  }

  const tokens = await exchangeCode(config, code, stash, opts.fetchImpl);

  // Replay defense: the id_token nonce must equal the stashed nonce.
  const unverifiedClaims = getClaims(tokens.id_token);
  if (!unverifiedClaims) {
    throw new CuOidcLoginError('malformed_id_token', 'id_token is not decodable.');
  }
  if (stash.nonce && unverifiedClaims.nonce && unverifiedClaims.nonce !== stash.nonce) {
    throw new CuOidcLoginError('nonce_mismatch', 'id_token nonce mismatch (possible replay).');
  }

  // Full signature/iss/exp verification.
  let claims;
  try {
    claims = await verifyIdToken(tokens.id_token, {
      jwksUri: config.endpoints.jwks,
      issuer: config.issuer,
      ...(opts.jwks ? { jwks: opts.jwks } : {}),
      ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
    });
  } catch (e) {
    const reason = e instanceof CuOidcVerifyError ? e.reason : 'verify_failed';
    throw new CuOidcLoginError(reason, e instanceof Error ? e.message : String(e));
  }

  if (opts.persist !== false) {
    storeIdToken(config.tokenStorageKey, tokens.id_token);
  }

  return { tokens, claims, issuer: config.issuer };
}

/** POST the authorization-code grant to `/oidc/token` (public client, PKCE). */
async function exchangeCode(
  config: ResolvedCuOidcConfig,
  code: string,
  stash: PkceStash,
  fetchImpl: typeof fetch | undefined,
): Promise<CuOidcTokens> {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', stash.redirectUri || config.redirectUri);
  body.set('client_id', stash.clientId || config.clientId);
  body.set('code_verifier', stash.verifier);
  // NB: NO Authorization header — public client, PKCE proves possession.

  const doFetch = fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(config.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
  } catch (e) {
    throw new CuOidcLoginError(
      'token_request_failed',
      `Token request failed: ${e instanceof Error ? e.message : String(e)}. ` +
        `If this is a CORS error, confirm this origin is in the client's cors_origins.`,
    );
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  const tokenSet = json as Partial<CuOidcTokens>;
  if (!res.ok || !tokenSet.id_token) {
    throw new CuOidcLoginError('token_endpoint_error', `Token endpoint returned ${res.status}`, json);
  }
  return tokenSet as CuOidcTokens;
}

/** Options for {@link refreshTokens}. */
export interface RefreshTokensOptions {
  fetchImpl?: typeof fetch;
  /** Persist the refreshed id_token first-party (default `true`). */
  persist?: boolean;
}

/**
 * Exchange a `refresh_token` for a new token set at `/oidc/token`. Persists the
 * new id_token first-party unless `persist: false`. Does NOT re-verify the
 * id_token — call `verify()` if you need cryptographic assurance on the result.
 */
export async function refreshTokens(
  config: ResolvedCuOidcConfig,
  refreshToken: string,
  opts: RefreshTokensOptions = {},
): Promise<CuOidcTokens> {
  if (!refreshToken) {
    throw new CuOidcLoginError('no_refresh_token', 'No refresh_token supplied.');
  }
  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);
  body.set('client_id', config.clientId);

  const doFetch = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(config.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
  } catch (e) {
    throw new CuOidcLoginError(
      'token_request_failed',
      `Refresh request failed: ${e instanceof Error ? e.message : String(e)}.`,
    );
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  const tokenSet = json as Partial<CuOidcTokens>;
  if (!res.ok || !tokenSet.id_token) {
    throw new CuOidcLoginError('refresh_failed', `Refresh returned ${res.status}`, json);
  }
  if (opts.persist !== false) {
    storeIdToken(config.tokenStorageKey, tokenSet.id_token);
  }
  return tokenSet as CuOidcTokens;
}
