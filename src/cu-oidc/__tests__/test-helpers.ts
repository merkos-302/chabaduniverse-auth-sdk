/**
 * Shared test helpers for the cu-oidc suite — NOT a test file (no `.test`
 * suffix, so vitest's include glob skips it). Generates real RSA keypairs and
 * signs real RS256 JWTs via WebCrypto so the JWKS-verify path is exercised
 * end-to-end (no signature-check bypass).
 */

import { bytesToBase64Url } from '../crypto-utils';
import type { JwkSet } from '../jwks';
import type { CuOidcClaims } from '../types';

export interface TestKey {
  keyPair: CryptoKeyPair;
  jwks: JwkSet;
  kid: string;
}

function strToBase64Url(s: string): string {
  return bytesToBase64Url(new TextEncoder().encode(s));
}

/** Generate an RSA-2048 signing keypair + a matching single-key JWKS. */
export async function generateTestKey(kid = 'test-key-1'): Promise<TestKey> {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;

  const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as Record<
    string,
    unknown
  >;
  const jwks: JwkSet = {
    keys: [{ ...publicJwk, kid, use: 'sig', alg: 'RS256' }],
  };
  return { keyPair, jwks, kid };
}

/** Sign a JWT (RS256) with a test key. `kid` defaults to the key's kid. */
export async function signTestJwt(
  key: TestKey,
  payload: Record<string, unknown>,
  opts: { kid?: string; alg?: string } = {},
): Promise<string> {
  const header = { alg: opts.alg ?? 'RS256', typ: 'JWT', kid: opts.kid ?? key.kid };
  const h = strToBase64Url(JSON.stringify(header));
  const p = strToBase64Url(JSON.stringify(payload));
  const signingInput = new Uint8Array(new TextEncoder().encode(`${h}.${p}`));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.keyPair.privateKey, signingInput);
  const s = bytesToBase64Url(new Uint8Array(sig));
  return `${h}.${p}.${s}`;
}

/** Standard claim set with the three cu-oidc namespaces populated. */
export function sampleClaims(overrides: Partial<CuOidcClaims> = {}): CuOidcClaims {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    sub: 'cu-user-123',
    iss: 'https://staging.oidc.merkos302.com',
    aud: 'cu-test-harness',
    iat: nowSec,
    exp: nowSec + 3600,
    email: 'shliach@example.com',
    email_verified: true,
    name: 'Test Shliach',
    chabaduniverse: {
      user_id: 'cu-user-123',
      via: 'magic-link',
      is_shliach: true,
      chabad_org_id: '770',
    },
    valu: { user_id: 'valu-abc' },
    merkos: { sub: 'neo4j-uuid-xyz', shliachAccess: true },
    ...overrides,
  };
}
