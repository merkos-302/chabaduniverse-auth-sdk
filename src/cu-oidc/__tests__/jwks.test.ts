/**
 * Tests for JWKS fetch + RS256 id_token verification.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearJwksCache,
  CuOidcVerifyError,
  fetchJwks,
  verifyIdToken,
} from '../jwks';
import { generateTestKey, sampleClaims, signTestJwt, type TestKey } from './test-helpers';

const ISSUER = 'https://staging.oidc.merkos302.com';
const JWKS_URI = `${ISSUER}/.well-known/jwks.json`;

let key: TestKey;

beforeEach(async () => {
  clearJwksCache();
  key = await generateTestKey();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('verifyIdToken — happy path', () => {
  it('verifies a well-formed, correctly-signed token against pre-fetched JWKS', async () => {
    const token = await signTestJwt(key, sampleClaims());
    const claims = await verifyIdToken(token, {
      jwksUri: JWKS_URI,
      issuer: ISSUER,
      jwks: key.jwks,
    });
    expect(claims.sub).toBe('cu-user-123');
    expect(claims.iss).toBe(ISSUER);
    expect(claims.chabaduniverse?.is_shliach).toBe(true);
  });

  it('fetches JWKS via injected fetch when not pre-supplied', async () => {
    const token = await signTestJwt(key, sampleClaims());
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(key.jwks), { status: 200 }),
    ) as unknown as typeof fetch;

    const claims = await verifyIdToken(token, { jwksUri: JWKS_URI, issuer: ISSUER, fetchImpl });
    expect(claims.sub).toBe('cu-user-123');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('verifyIdToken — sad paths', () => {
  it('rejects a token signed by a different key (bad_signature)', async () => {
    const otherKey = await generateTestKey('other-kid');
    // Sign with the OTHER key but present OUR JWKS with a matching kid so key
    // selection succeeds and the signature check is what fails.
    const token = await signTestJwt(otherKey, sampleClaims(), { kid: key.kid });
    await expect(
      verifyIdToken(token, { jwksUri: JWKS_URI, issuer: ISSUER, jwks: key.jwks }),
    ).rejects.toMatchObject({ reason: 'bad_signature' });
  });

  it('rejects an issuer mismatch (iss_mismatch)', async () => {
    const token = await signTestJwt(key, sampleClaims({ iss: 'https://evil.example.com' }));
    await expect(
      verifyIdToken(token, { jwksUri: JWKS_URI, issuer: ISSUER, jwks: key.jwks }),
    ).rejects.toMatchObject({ reason: 'iss_mismatch' });
  });

  it('rejects an expired token (expired)', async () => {
    const past = Math.floor(Date.now() / 1000) - 7200;
    const token = await signTestJwt(key, sampleClaims({ iat: past, exp: past + 60 }));
    await expect(
      verifyIdToken(token, { jwksUri: JWKS_URI, issuer: ISSUER, jwks: key.jwks }),
    ).rejects.toMatchObject({ reason: 'expired' });
  });

  it('rejects a non-RS256 alg (unsupported_alg)', async () => {
    const token = await signTestJwt(key, sampleClaims(), { alg: 'HS256' });
    await expect(
      verifyIdToken(token, { jwksUri: JWKS_URI, issuer: ISSUER, jwks: key.jwks }),
    ).rejects.toMatchObject({ reason: 'unsupported_alg' });
  });

  it('rejects a malformed JWT (malformed_jwt)', async () => {
    await expect(
      verifyIdToken('not-a-jwt', { jwksUri: JWKS_URI, issuer: ISSUER, jwks: key.jwks }),
    ).rejects.toMatchObject({ reason: 'malformed_jwt' });
  });

  it('rejects when no JWKS key matches the kid (no_matching_key)', async () => {
    const token = await signTestJwt(key, sampleClaims(), { kid: 'unknown-kid' });
    const emptyJwks = { keys: [] };
    await expect(
      verifyIdToken(token, { jwksUri: JWKS_URI, issuer: ISSUER, jwks: emptyJwks }),
    ).rejects.toMatchObject({ reason: 'no_matching_key' });
  });
});

describe('fetchJwks', () => {
  it('caches results per-URL and only fetches once', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(key.jwks), { status: 200 }),
    ) as unknown as typeof fetch;

    await fetchJwks(JWKS_URI, { fetchImpl });
    await fetchJwks(JWKS_URI, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cache with forceRefresh', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(key.jwks), { status: 200 }),
    ) as unknown as typeof fetch;

    await fetchJwks(JWKS_URI, { fetchImpl });
    await fetchJwks(JWKS_URI, { fetchImpl, forceRefresh: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws on a non-OK response (jwks_fetch_failed)', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    await expect(fetchJwks(JWKS_URI, { fetchImpl })).rejects.toBeInstanceOf(CuOidcVerifyError);
  });
});
