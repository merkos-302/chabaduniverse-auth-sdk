/**
 * cu-oidc — web-storage helpers for the PKCE stash, the CSRF `state` stash,
 * and first-party id_token persistence.
 *
 * Storage choice rationale (mirrors the proven cu-auth-harness):
 *   - PKCE stash uses **localStorage** (not sessionStorage) because a magic-link
 *     callback can land in a NEW top-level tab that does not share sessionStorage
 *     with the tab that started the flow. localStorage is shared same-origin
 *     across tabs. Entries are single-use (deleted on consume) and TTL-pruned.
 *   - The silent-SSO `state` uses **sessionStorage**: the `/sso/check` round-trip
 *     is a same-tab top-level redirect, so sessionStorage is the tighter scope
 *     (per-tab, auto-cleared on tab close) and matches the wire contract.
 *
 * Every accessor is SSR-safe (no-ops when `window`/storage is unavailable).
 */

import type { PkceStash } from './types';

/** TTL for a pending PKCE stash entry before it is pruned as stale. */
const PKCE_TTL_MS = 10 * 60 * 1000;

function getLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// ============================================================================
// PKCE stash (localStorage, keyed by state)
// ============================================================================

function pkceKey(prefix: string, state: string): string {
  return `${prefix}pkce_${state}`;
}

/** Remove any PKCE stash entries older than the TTL. */
export function prunePkceStashes(prefix: string): void {
  const ls = getLocalStorage();
  if (!ls) return;
  const now = Date.now();
  const marker = `${prefix}pkce_`;
  for (let i = ls.length - 1; i >= 0; i--) {
    const k = ls.key(i);
    if (!k || k.indexOf(marker) !== 0) continue;
    try {
      const raw = ls.getItem(k);
      const v = raw ? (JSON.parse(raw) as Partial<PkceStash>) : null;
      if (!v || now - (v.createdAt ?? 0) > PKCE_TTL_MS) ls.removeItem(k);
    } catch {
      ls.removeItem(k);
    }
  }
}

/** Persist a PKCE stash keyed by its `state`. */
export function savePkceStash(prefix: string, state: string, stash: PkceStash): void {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(pkceKey(prefix, state), JSON.stringify(stash));
  } catch {
    // storage disabled — the callback will surface the miss as an error
  }
}

/**
 * Read and CONSUME (single-use) the PKCE stash for a `state`. Returns `null`
 * when absent or malformed.
 */
export function consumePkceStash(prefix: string, state: string): PkceStash | null {
  const ls = getLocalStorage();
  if (!ls) return null;
  const key = pkceKey(prefix, state);
  try {
    const raw = ls.getItem(key);
    if (!raw) return null;
    ls.removeItem(key); // consume immediately
    return JSON.parse(raw) as PkceStash;
  } catch {
    try {
      ls.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
}

// ============================================================================
// Silent-SSO state stash (sessionStorage)
// ============================================================================

function ssoStateKey(prefix: string): string {
  return `${prefix}sso_state`;
}

/** Stash the opaque `state` for the `/sso/check` round-trip. */
export function saveSsoState(prefix: string, state: string): void {
  const ss = getSessionStorage();
  if (!ss) return;
  try {
    ss.setItem(ssoStateKey(prefix), state);
  } catch {
    /* ignore */
  }
}

/**
 * Read and CONSUME (single-use) the stashed silent-SSO `state`, returning it
 * for the caller to compare against the value echoed back in the URL.
 */
export function consumeSsoState(prefix: string): string | null {
  const ss = getSessionStorage();
  if (!ss) return null;
  const key = ssoStateKey(prefix);
  try {
    const v = ss.getItem(key);
    if (v !== null) ss.removeItem(key);
    return v;
  } catch {
    return null;
  }
}

// ============================================================================
// First-party token persistence (localStorage)
// ============================================================================

/** Persist the verified id_token first-party on the consumer's own origin. */
export function storeIdToken(key: string, token: string): void {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(key, token);
  } catch {
    /* ignore */
  }
}

/** Read the stored id_token, or `null`. */
export function readIdToken(key: string): string | null {
  const ls = getLocalStorage();
  if (!ls) return null;
  try {
    return ls.getItem(key);
  } catch {
    return null;
  }
}

/** Remove the stored id_token. */
export function clearIdToken(key: string): void {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(key);
  } catch {
    /* ignore */
  }
}
