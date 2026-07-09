/**
 * Tests for PKCE parameter generation + authorize URL construction.
 */

import { describe, expect, it } from 'vitest';
import { buildAuthorizeUrl, generatePkceParams } from '../pkce';
import { sha256Base64Url } from '../crypto-utils';
import { resolveCuOidcConfig } from '../config';

describe('generatePkceParams', () => {
  it('produces a 43-char verifier, S256 method, and distinct state/nonce', async () => {
    const p = await generatePkceParams();
    expect(p.verifier).toHaveLength(43);
    expect(p.method).toBe('S256');
    expect(p.state).toBeTruthy();
    expect(p.nonce).toBeTruthy();
    expect(p.state).not.toBe(p.nonce);
  });

  it('derives challenge = base64url(SHA-256(verifier))', async () => {
    const p = await generatePkceParams();
    expect(p.challenge).toBe(await sha256Base64Url(p.verifier));
  });

  it('mints unique parameter sets across calls', async () => {
    const [a, b] = await Promise.all([generatePkceParams(), generatePkceParams()]);
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.state).not.toBe(b.state);
  });
});

describe('buildAuthorizeUrl', () => {
  const config = resolveCuOidcConfig({
    clientId: 'cu-harness-consumer-b',
    redirectUri: 'https://app.example.com/auth/callback',
    environment: 'staging',
  });

  it('sets every required authorization-code + PKCE parameter', () => {
    const url = new URL(
      buildAuthorizeUrl(config, {
        challenge: 'CHALLENGE',
        method: 'S256',
        state: 'STATE',
        nonce: 'NONCE',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://staging.oidc.merkos302.com/oidc/auth');
    const q = url.searchParams;
    expect(q.get('client_id')).toBe('cu-harness-consumer-b');
    expect(q.get('redirect_uri')).toBe('https://app.example.com/auth/callback');
    expect(q.get('response_type')).toBe('code');
    expect(q.get('scope')).toBe('openid email profile');
    expect(q.get('state')).toBe('STATE');
    expect(q.get('nonce')).toBe('NONCE');
    expect(q.get('code_challenge')).toBe('CHALLENGE');
    expect(q.get('code_challenge_method')).toBe('S256');
  });
});
