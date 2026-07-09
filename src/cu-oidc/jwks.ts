/**
 * cu-oidc — JWKS fetch + id_token verification (signature + `iss` + `exp`).
 *
 * cu-oidc (node-oidc-provider) signs id_tokens with RS256. Verification is done
 * with WebCrypto (`RSASSA-PKCS1-v1_5` / SHA-256) so there is no `jose`
 * dependency. Per the wire contract, this "trust iss + signature" check is the
 * consumer's verification for the silent-SSO phase (the token's `aud` is the
 * parent client, not the consumer).
 */

import { base64UrlToBytes, decodeJwtHeader, decodeJwtPayload, splitJwt } from './crypto-utils';
import type { CuOidcClaims } from './types';

/** A single JSON Web Key (RSA public key subset we consume). */
export interface Jwk {
  kty?: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  [key: string]: unknown;
}

/** A JWKS document. */
export interface JwkSet {
  keys: Jwk[];
}

/** Thrown when id_token verification fails. `reason` is a stable machine code. */
export class CuOidcVerifyError extends Error {
  reason: string;
  constructor(reason: string, message?: string) {
    super(message ?? reason);
    this.name = 'CuOidcVerifyError';
    this.reason = reason;
  }
}

/** Options for {@link verifyIdToken}. */
export interface VerifyOptions {
  /** JWKS endpoint URL to fetch signing keys from. */
  jwksUri: string;
  /** Expected `iss`. Verification rejects a token whose `iss` differs. */
  issuer: string;
  /** Clock-skew leeway in seconds applied to `exp`. Defaults to 60. */
  clockToleranceSec?: number;
  /**
   * Optional pre-fetched JWKS (skips the network fetch — used for testing and
   * caller-side caching).
   */
  jwks?: JwkSet;
  /** Optional custom fetch (defaults to global `fetch`). */
  fetchImpl?: typeof fetch;
}

// ============================================================================
// JWKS fetch (with a tiny in-module cache keyed by URL)
// ============================================================================

interface CacheEntry {
  jwks: JwkSet;
  fetchedAt: number;
}
const jwksCache = new Map<string, CacheEntry>();
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch a JWKS document. Results are cached per-URL for 5 minutes; pass
 * `forceRefresh` to bypass (e.g. after a `kid` miss on rotation).
 */
export async function fetchJwks(
  jwksUri: string,
  opts: { fetchImpl?: typeof fetch; forceRefresh?: boolean } = {},
): Promise<JwkSet> {
  const now = Date.now();
  if (!opts.forceRefresh) {
    const cached = jwksCache.get(jwksUri);
    if (cached && now - cached.fetchedAt < JWKS_CACHE_TTL_MS) return cached.jwks;
  }
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(jwksUri, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new CuOidcVerifyError('jwks_fetch_failed', `JWKS fetch returned ${res.status}`);
  }
  const jwks = (await res.json()) as JwkSet;
  if (!jwks || !Array.isArray(jwks.keys)) {
    throw new CuOidcVerifyError('jwks_malformed', 'JWKS response has no `keys` array');
  }
  jwksCache.set(jwksUri, { jwks, fetchedAt: now });
  return jwks;
}

/** Clear the internal JWKS cache (test helper / manual invalidation). */
export function clearJwksCache(): void {
  jwksCache.clear();
}

// ============================================================================
// Verification
// ============================================================================

function selectKey(jwks: JwkSet, kid: string | undefined): Jwk | null {
  if (kid) {
    const byKid = jwks.keys.find((k) => k.kid === kid);
    if (byKid) return byKid;
  }
  // Fall back to the first RSA signing key when no kid is present or matched.
  return jwks.keys.find((k) => (k.kty ?? 'RSA') === 'RSA' && k.n && k.e) ?? null;
}

async function importRsaKey(jwk: Jwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true } as JsonWebKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

/**
 * Verify an id_token end-to-end: RS256 signature against the issuer's JWKS,
 * `iss` match, and `exp` (with clock tolerance). Returns the verified claims,
 * or throws {@link CuOidcVerifyError}.
 */
export async function verifyIdToken(
  token: string,
  options: VerifyOptions,
): Promise<CuOidcClaims> {
  const parts = splitJwt(token);
  if (!parts) throw new CuOidcVerifyError('malformed_jwt', 'Token is not a compact JWS');

  const header = decodeJwtHeader(token);
  if (!header) throw new CuOidcVerifyError('malformed_header', 'Cannot decode JOSE header');
  if (header.alg && header.alg !== 'RS256') {
    throw new CuOidcVerifyError('unsupported_alg', `Unsupported alg: ${header.alg}`);
  }

  const claims = decodeJwtPayload(token);
  if (!claims) throw new CuOidcVerifyError('malformed_payload', 'Cannot decode payload');

  const fetchOpt = options.fetchImpl ? { fetchImpl: options.fetchImpl } : {};
  const jwks = options.jwks ?? (await fetchJwks(options.jwksUri, fetchOpt));
  let jwk = selectKey(jwks, header.kid);
  // On a kid miss with pre-fetched keys unavailable, retry once with a fresh
  // JWKS to tolerate a signing-key rotation.
  if (!jwk && !options.jwks) {
    const fresh = await fetchJwks(options.jwksUri, { ...fetchOpt, forceRefresh: true });
    jwk = selectKey(fresh, header.kid);
  }
  if (!jwk || !jwk.n || !jwk.e) {
    throw new CuOidcVerifyError('no_matching_key', 'No JWKS key matched the token kid');
  }

  const key = await importRsaKey(jwk);
  // Copy into fresh ArrayBuffer-backed views so the types satisfy `BufferSource`
  // under `exactOptionalPropertyTypes` / the ArrayBufferLike-generic lib.
  const signingInput = new Uint8Array(new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  const signature = base64UrlToBytes(parts[2]);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature,
    signingInput,
  );
  if (!valid) throw new CuOidcVerifyError('bad_signature', 'Signature verification failed');

  if (claims.iss !== options.issuer) {
    throw new CuOidcVerifyError('iss_mismatch', `iss "${claims.iss}" != "${options.issuer}"`);
  }

  const tolerance = options.clockToleranceSec ?? 60;
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number') {
    throw new CuOidcVerifyError('missing_exp', 'Token has no numeric exp');
  }
  if (nowSec > claims.exp + tolerance) {
    throw new CuOidcVerifyError('expired', 'Token is expired');
  }

  return claims;
}
