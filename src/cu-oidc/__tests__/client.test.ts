/**
 * Tests for the composed cu-oidc client factory.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCuOidcClient } from '../client';
import { clearJwksCache } from '../jwks';
import { generateTestKey, sampleClaims, signTestJwt, type TestKey } from './test-helpers';

function makeClient() {
  return createCuOidcClient({
    clientId: 'cu-harness-consumer-b',
    redirectUri: 'https://app.example.com/auth/callback',
    environment: 'staging',
  });
}

let key: TestKey;

beforeEach(async () => {
  clearJwksCache();
  localStorage.clear();
  sessionStorage.clear();
  key = await generateTestKey();
});

afterEach(() => vi.restoreAllMocks());

describe('createCuOidcClient — config', () => {
  it('exposes the resolved config + endpoints', () => {
    const c = makeClient();
    expect(c.config.issuer).toBe('https://staging.oidc.merkos302.com');
    expect(c.config.endpoints.token).toBe('https://staging.oidc.merkos302.com/oidc/token');
  });
});

describe('token-lifecycle accessors', () => {
  it('reflects a stored token via getStoredToken / getCurrentUser / isAuthenticated', async () => {
    const c = makeClient();
    expect(c.getStoredToken()).toBeNull();
    expect(c.isAuthenticated()).toBe(false);

    const token = await signTestJwt(key, sampleClaims());
    localStorage.setItem('cu_id_token', token);

    expect(c.getStoredToken()).toBe(token);
    expect(c.getCurrentUser()?.sub).toBe('cu-user-123');
    expect(c.isAuthenticated()).toBe(true);
    expect(c.isTokenExpired()).toBe(false);
    expect(typeof c.getTokenExpiration()).toBe('number');
    expect(c.getShliachStatus(c.getCurrentUser())).toBe(true);
    expect(c.getNamespace(token, 'merkos')?.sub).toBe('neo4j-uuid-xyz');
  });

  it('treats an expired stored token as unauthenticated', async () => {
    const c = makeClient();
    const past = Math.floor(Date.now() / 1000) - 3600;
    const token = await signTestJwt(key, sampleClaims({ exp: past }));
    localStorage.setItem('cu_id_token', token);
    // A stored-but-expired token ⇒ not authenticated.
    expect(c.getStoredToken()).toBe(token);
    expect(c.isAuthenticated()).toBe(false);
  });
});

describe('verify', () => {
  it('delegates to verifyIdToken with the client issuer + jwks endpoint', async () => {
    const c = makeClient();
    const token = await signTestJwt(key, sampleClaims());
    const claims = await c.verify(token, { jwks: key.jwks });
    expect(claims.sub).toBe('cu-user-123');
  });
});

describe('login / silentSSO delegation', () => {
  it('login returns the authorize URL without navigating (redirect:false)', async () => {
    const c = makeClient();
    const navigate = vi.fn();
    const url = await c.login({ redirect: false, navigate });
    expect(url).toContain('/oidc/auth');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('silentSSO returns the /sso/check URL', () => {
    const c = makeClient();
    const url = c.silentSSO({ returnUrl: 'https://app.example.com/sso/land', redirect: false });
    expect(url).toContain('/sso/check');
    expect(url).toContain('return=');
  });
});

describe('logout', () => {
  it('builds the end-session URL with id_token_hint and clears the stored token', async () => {
    const c = makeClient();
    const token = await signTestJwt(key, sampleClaims());
    localStorage.setItem('cu_id_token', token);
    const navigate = vi.fn();

    const url = new URL(
      c.logout({ postLogoutRedirectUri: 'https://app.example.com/', navigate }),
    );
    expect(url.origin + url.pathname).toBe('https://staging.oidc.merkos302.com/oidc/session/end');
    expect(url.searchParams.get('id_token_hint')).toBe(token);
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('https://app.example.com/');
    expect(navigate).toHaveBeenCalled();
    // stored token cleared
    expect(c.getStoredToken()).toBeNull();
  });
});
