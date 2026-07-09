/**
 * cu-oidc — low-level, framework-agnostic crypto & encoding helpers.
 *
 * Uses only WebCrypto (`crypto.getRandomValues` / `crypto.subtle`) + `atob` /
 * `btoa`, all of which are standard in browsers and Node 18+. No dependency on
 * `jose` or any Node-only `crypto` module — this keeps the bundle tiny and lets
 * the same code run in the browser (the only place these flows execute).
 */

import type { CuOidcClaims } from './types';

/** JOSE header fields we read (unverified) to pick a JWKS key. */
export interface JwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
  [key: string]: unknown;
}

// ============================================================================
// base64url <-> bytes / string
// ============================================================================

/** Encode raw bytes as base64url (no padding). */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i] as number);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a base64url (or standard base64) string to raw bytes. */
export function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  let s = String(input).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/** Decode a base64url string to a UTF-8 string. */
export function base64UrlToString(input: string): string {
  return new TextDecoder().decode(base64UrlToBytes(input));
}

// ============================================================================
// randomness
// ============================================================================

/**
 * Generate `nBytes` of CSPRNG randomness, base64url-encoded. A 32-byte value
 * yields a 43-char string — within RFC 7636's 43–128 code_verifier range.
 */
export function randomBase64Url(nBytes: number = 32): string {
  const a = new Uint8Array(nBytes);
  crypto.getRandomValues(a);
  return bytesToBase64Url(a);
}

// ============================================================================
// SHA-256 (for the S256 PKCE challenge)
// ============================================================================

/** `base64url(SHA-256(input))` — the S256 PKCE code_challenge transform. */
export async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64Url(new Uint8Array(digest));
}

// ============================================================================
// JWT decode (UNVERIFIED — signature checked separately in jwks.ts)
// ============================================================================

/** Split a compact JWS into its three segments, or `null` if malformed. */
export function splitJwt(jwt: string): [string, string, string] | null {
  const parts = String(jwt).split('.');
  if (parts.length !== 3) return null;
  return parts as [string, string, string];
}

/** Decode the JOSE header of a JWT without verifying it. */
export function decodeJwtHeader(jwt: string): JwtHeader | null {
  const parts = splitJwt(jwt);
  if (!parts) return null;
  try {
    return JSON.parse(base64UrlToString(parts[0])) as JwtHeader;
  } catch {
    return null;
  }
}

/**
 * Decode the payload (claim set) of a JWT WITHOUT verifying its signature.
 * Use `verifyIdToken` (jwks.ts) before trusting these claims for auth.
 */
export function decodeJwtPayload(jwt: string): CuOidcClaims | null {
  const parts = splitJwt(jwt);
  if (!parts) return null;
  try {
    return JSON.parse(base64UrlToString(parts[1])) as CuOidcClaims;
  } catch {
    return null;
  }
}
