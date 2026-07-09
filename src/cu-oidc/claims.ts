/**
 * cu-oidc — claim accessors + token-lifecycle helpers (framework-agnostic).
 *
 * All accessors operate on the DECODED claim set (`decodeJwtPayload`). Decoding
 * does not verify the signature — call `verifyIdToken` (jwks.ts) before trusting
 * claims for an authorization decision.
 */

import { decodeJwtPayload } from './crypto-utils';
import type {
  CuChabaduniverseClaims,
  CuMerkosClaims,
  CuOidcClaims,
  CuOidcNamespace,
  CuValuClaims,
} from './types';

/** Decode an id_token into its structured claim set, or `null` if malformed. */
export function getClaims(token: string): CuOidcClaims | null {
  return decodeJwtPayload(token);
}

/** Namespace-return type helper. */
type NamespaceValue<N extends CuOidcNamespace> = N extends 'chabaduniverse'
  ? CuChabaduniverseClaims
  : N extends 'valu'
    ? CuValuClaims
    : CuMerkosClaims;

/**
 * Read one of the three claim namespaces (`chabaduniverse` | `valu` | `merkos`)
 * from a token or an already-decoded claim set. Returns `null` when absent.
 */
export function getNamespace<N extends CuOidcNamespace>(
  source: string | CuOidcClaims | null,
  namespace: N,
): NamespaceValue<N> | null {
  const claims = typeof source === 'string' ? getClaims(source) : source;
  if (!claims) return null;
  const value = claims[namespace];
  if (!value || typeof value !== 'object') return null;
  return value as NamespaceValue<N>;
}

/**
 * Resolve shliach status from a token/claim set. Prefers the canonical
 * `chabaduniverse.is_shliach` flag, falling back to `merkos.shliachAccess`.
 * Returns `false` when neither is truthy.
 */
export function getShliachStatus(source: string | CuOidcClaims | null): boolean {
  const claims = typeof source === 'string' ? getClaims(source) : source;
  if (!claims) return false;
  const cu = getNamespace(claims, 'chabaduniverse');
  if (cu && typeof cu.is_shliach === 'boolean') return cu.is_shliach;
  const merkos = getNamespace(claims, 'merkos');
  if (merkos && typeof merkos.shliachAccess === 'boolean') return merkos.shliachAccess;
  return false;
}

/**
 * The `exp` of an id_token in milliseconds since epoch, or `null` if absent /
 * malformed.
 */
export function getTokenExpiration(token: string): number | null {
  const claims = getClaims(token);
  if (!claims || typeof claims.exp !== 'number') return null;
  return claims.exp * 1000;
}

/**
 * Whether an id_token is expired (or invalid). `bufferSeconds` (default 60)
 * treats a token expiring within the window as already expired so callers
 * refresh proactively.
 */
export function isTokenExpired(token: string, bufferSeconds: number = 60): boolean {
  const expMs = getTokenExpiration(token);
  if (expMs === null) return true;
  return Date.now() >= expMs - bufferSeconds * 1000;
}
