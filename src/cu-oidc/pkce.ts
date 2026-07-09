/**
 * cu-oidc — PKCE parameter generation + authorization URL construction.
 *
 * cu-oidc enforces PKCE S256 provider-wide, so this is the ONLY supported
 * transform. All values come from WebCrypto (`crypto-utils`).
 */

import { randomBase64Url, sha256Base64Url } from './crypto-utils';
import type { PkceParams, ResolvedCuOidcConfig } from './types';

/**
 * Mint a fresh PKCE parameter set: a 32-byte `verifier` (43-char base64url),
 * its S256 `challenge`, plus opaque `state` (CSRF) and `nonce` (id_token replay).
 */
export async function generatePkceParams(): Promise<PkceParams> {
  const verifier = randomBase64Url(32);
  const state = randomBase64Url(16);
  const nonce = randomBase64Url(16);
  const challenge = await sha256Base64Url(verifier);
  return { verifier, challenge, method: 'S256', state, nonce };
}

/**
 * Build the `/oidc/auth` authorization-code request URL for a PKCE public
 * client from resolved config + a minted parameter set.
 */
export function buildAuthorizeUrl(
  config: ResolvedCuOidcConfig,
  pkce: Pick<PkceParams, 'challenge' | 'method' | 'state' | 'nonce'>,
): string {
  const u = new URL(config.endpoints.authorize);
  u.searchParams.set('client_id', config.clientId);
  u.searchParams.set('redirect_uri', config.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', config.scope);
  u.searchParams.set('state', pkce.state);
  u.searchParams.set('nonce', pkce.nonce);
  u.searchParams.set('code_challenge', pkce.challenge);
  u.searchParams.set('code_challenge_method', pkce.method);
  return u.toString();
}
