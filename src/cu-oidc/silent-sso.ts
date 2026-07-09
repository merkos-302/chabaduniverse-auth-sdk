/**
 * cu-oidc — silent cross-domain SSO (`/sso/check`), consumer side.
 *
 * Two halves per the wire contract:
 *   1. {@link startSilentSso}   — top-level navigation to
 *      `<issuer>/sso/check?return=<receiver>&state=<opaque>`. NOT a fetch, NOT
 *      an iframe: cu-oidc must run first-party to read its `cu_id_token` cookie.
 *   2. {@link handleReceiver}   — on the return hop, capture `token`/`error`/
 *      `state`, verify `state` (CSRF), `history.replaceState` the token out of
 *      the URL, JWKS-verify the JWT, and store it first-party. On
 *      `error=not_authenticated` the caller should fall back to `startLogin`.
 */

import { CuOidcVerifyError, verifyIdToken, type JwkSet } from './jwks';
import { randomBase64Url } from './crypto-utils';
import { consumeSsoState, saveSsoState, storeIdToken } from './storage';
import type { CuOidcSilentResult, ResolvedCuOidcConfig } from './types';

/** Navigate the TOP-LEVEL window (breaks out of an iframe). Overridable for tests. */
export type TopNavigateFn = (url: string) => void;

const defaultTopNavigate: TopNavigateFn = (url) => {
  if (typeof window === 'undefined') return;
  // Assigning window.top.location.href is a permitted cross-origin navigation
  // (reading it is not). Fall back to same-window when top is inaccessible.
  try {
    if (window.top && window.top !== window) {
      window.top.location.href = url;
      return;
    }
  } catch {
    /* cross-origin top with a hostile ancestor — fall through */
  }
  window.location.href = url;
};

/** Options for {@link startSilentSso}. */
export interface StartSilentSsoOptions {
  /**
   * The receiver URL cu-oidc redirects back to with the token. Defaults to the
   * current page (`window.location.href`). MUST be an origin the provider's
   * `SSO_CHECK_ALLOWED_RETURNS` allowlist accepts, or `/sso/check` returns 400.
   */
  returnUrl?: string;
  /** When `false`, return the URL instead of navigating. Default `true`. */
  redirect?: boolean;
  /** Custom top-level navigation (defaults to navigating `window.top`). */
  navigate?: TopNavigateFn;
}

function currentHref(): string {
  if (typeof window !== 'undefined') return window.location.href;
  throw new Error('[cu-oidc] startSilentSso needs a `returnUrl` outside the browser.');
}

/**
 * Begin a silent-SSO probe: stash an opaque `state`, build the `/sso/check`
 * URL, and navigate the top-level window to it. Returns the URL (also returned,
 * not navigated, when `redirect: false`).
 */
export function startSilentSso(
  config: ResolvedCuOidcConfig,
  opts: StartSilentSsoOptions = {},
): string {
  const returnUrl = opts.returnUrl ?? currentHref();
  const state = randomBase64Url(16);
  saveSsoState(config.storageKeyPrefix, state);

  const u = new URL(config.endpoints.ssoCheck);
  u.searchParams.set('return', returnUrl);
  u.searchParams.set('state', state);
  const url = u.toString();

  if (opts.redirect !== false) {
    (opts.navigate ?? defaultTopNavigate)(url);
  }
  return url;
}

/** Replace the visible URL (strip token/error/state). Overridable for tests. */
export type ReplaceUrlFn = (url: string) => void;

const defaultReplaceUrl: ReplaceUrlFn = (url) => {
  if (typeof window !== 'undefined' && window.history) {
    try {
      window.history.replaceState(window.history.state, '', url);
    } catch {
      /* ignore — cosmetic URL cleanup only */
    }
  }
};

/** Options for {@link handleReceiver}. */
export interface HandleReceiverOptions {
  /** URL to parse (defaults to `window.location.href`). */
  url?: string;
  /** Custom fetch (defaults to global `fetch`). */
  fetchImpl?: typeof fetch;
  /** Pre-fetched JWKS to verify against (skips network fetch — for tests). */
  jwks?: JwkSet;
  /** Persist the verified token first-party (default `true`). */
  persist?: boolean;
  /** Custom URL replacer (defaults to `history.replaceState`). */
  replaceUrl?: ReplaceUrlFn;
}

/**
 * Handle the silent-SSO return hop. Returns:
 *   - `{ status: 'authenticated', token, claims }` on a verified token,
 *   - `{ status: 'not_authenticated' }` on `error=not_authenticated` (fall back
 *     to `startLogin`),
 *   - `{ status: 'no_result' }` when the URL carries neither `token` nor `error`
 *     (this page load is not a receiver hop),
 *   - `{ status: 'error', error }` on a state mismatch, other provider error, or
 *     token verification failure.
 */
export async function handleReceiver(
  config: ResolvedCuOidcConfig,
  opts: HandleReceiverOptions = {},
): Promise<CuOidcSilentResult> {
  const href = opts.url ?? (typeof window !== 'undefined' ? window.location.href : undefined);
  if (!href) return { status: 'no_result' };

  const parsed = new URL(href);
  const params = parsed.searchParams;
  const token = params.get('token');
  const error = params.get('error');
  const returnedState = params.get('state');

  // Not a receiver hop at all — leave the page untouched.
  if (!token && !error) return { status: 'no_result' };

  // CSRF: the echoed state must equal the value we stashed before redirecting.
  const expectedState = consumeSsoState(config.storageKeyPrefix);
  if (!expectedState || returnedState !== expectedState) {
    // Still clean the URL so a stale/forged token isn't left visible.
    cleanUrl(parsed, opts.replaceUrl ?? defaultReplaceUrl);
    return { status: 'error', error: 'state_mismatch' };
  }

  // Strip token/error/state from the visible URL immediately (before any await).
  cleanUrl(parsed, opts.replaceUrl ?? defaultReplaceUrl);

  if (error) {
    return error === 'not_authenticated'
      ? { status: 'not_authenticated' }
      : { status: 'error', error };
  }

  if (!token) return { status: 'error', error: 'no_token' };

  try {
    const claims = await verifyIdToken(token, {
      jwksUri: config.endpoints.jwks,
      issuer: config.issuer,
      ...(opts.jwks ? { jwks: opts.jwks } : {}),
      ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
    });
    if (opts.persist !== false) storeIdToken(config.tokenStorageKey, token);
    return { status: 'authenticated', token, claims };
  } catch (e) {
    const reason = e instanceof CuOidcVerifyError ? e.reason : 'verify_failed';
    return { status: 'error', error: reason };
  }
}

/** Delete our three owned params + fragment and replace the visible URL. */
function cleanUrl(parsed: URL, replace: ReplaceUrlFn): void {
  parsed.searchParams.delete('token');
  parsed.searchParams.delete('error');
  parsed.searchParams.delete('state');
  parsed.hash = '';
  replace(parsed.toString());
}
