/**
 * Tests for the browser PKCE authorization-code login (start + callback + refresh).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleLoginCallback, refreshTokens, startLogin } from '../login';
import { resolveCuOidcConfig } from '../config';
import { clearJwksCache } from '../jwks';
import { savePkceStash, readIdToken } from '../storage';
import { generateTestKey, sampleClaims, signTestJwt, type TestKey } from './test-helpers';
import type { PkceStash } from '../types';

const config = resolveCuOidcConfig({
  clientId: 'cu-harness-consumer-b',
  redirectUri: 'https://app.example.com/auth/callback',
  environment: 'staging',
});
let key: TestKey;

function tokenResponse(body: Record<string, unknown>, status = 200): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

function stashFor(state: string, nonce: string): void {
  const stash: PkceStash = {
    verifier: 'test-verifier',
    nonce,
    issuer: config.issuer,
    redirectUri: config.redirectUri,
    clientId: config.clientId,
    scope: config.scope,
    createdAt: Date.now(),
  };
  savePkceStash(config.storageKeyPrefix, state, stash);
}

beforeEach(async () => {
  clearJwksCache();
  localStorage.clear();
  key = await generateTestKey();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('startLogin', () => {
  it('mints PKCE, stashes it (keyed by state), and returns the authorize URL', async () => {
    const navigate = vi.fn();
    const url = new URL(await startLogin(config, { navigate }));
    expect(url.origin + url.pathname).toBe('https://staging.oidc.merkos302.com/oidc/auth');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    const state = url.searchParams.get('state')!;
    expect(localStorage.getItem(`cu_oidc_pkce_${state}`)).toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(url.toString());
  });

  it('does not navigate when redirect:false', async () => {
    const navigate = vi.fn();
    await startLogin(config, { redirect: false, navigate });
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('handleLoginCallback', () => {
  it('exchanges the code, verifies the id_token, persists it, and returns claims + tokens', async () => {
    const state = 'S1';
    const nonce = 'N1';
    stashFor(state, nonce);
    const idToken = await signTestJwt(key, sampleClaims({ nonce }));
    const fetchImpl = tokenResponse({
      id_token: idToken,
      access_token: 'AT',
      refresh_token: 'RT',
      token_type: 'Bearer',
      expires_in: 3600,
    });

    const result = await handleLoginCallback(config, {
      url: `${config.redirectUri}?code=AUTH_CODE&state=${state}`,
      fetchImpl,
      jwks: key.jwks,
    });

    expect(result.claims.sub).toBe('cu-user-123');
    expect(result.tokens.access_token).toBe('AT');
    expect(result.tokens.refresh_token).toBe('RT');
    expect(readIdToken('cu_id_token')).toBe(idToken);

    // token endpoint called with an authorization_code grant + code_verifier, no auth header
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = String((init as RequestInit).body);
    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code_verifier=test-verifier');
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });

  it('rejects an unknown/expired state (no stash → CSRF guard)', async () => {
    await expect(
      handleLoginCallback(config, {
        url: `${config.redirectUri}?code=X&state=UNKNOWN`,
        fetchImpl: tokenResponse({}),
        jwks: key.jwks,
      }),
    ).rejects.toMatchObject({ reason: 'unknown_state' });
  });

  it('rejects a nonce mismatch (replay guard)', async () => {
    const state = 'S2';
    stashFor(state, 'EXPECTED_NONCE');
    const idToken = await signTestJwt(key, sampleClaims({ nonce: 'DIFFERENT_NONCE' }));
    await expect(
      handleLoginCallback(config, {
        url: `${config.redirectUri}?code=X&state=${state}`,
        fetchImpl: tokenResponse({ id_token: idToken }),
        jwks: key.jwks,
      }),
    ).rejects.toMatchObject({ reason: 'nonce_mismatch' });
  });

  it('surfaces an OAuth error param', async () => {
    await expect(
      handleLoginCallback(config, {
        url: `${config.redirectUri}?error=access_denied&state=S`,
        fetchImpl: tokenResponse({}),
      }),
    ).rejects.toMatchObject({ reason: 'oauth_error' });
  });

  it('rejects when code or state is missing', async () => {
    await expect(
      handleLoginCallback(config, {
        url: `${config.redirectUri}?state=S`,
        fetchImpl: tokenResponse({}),
      }),
    ).rejects.toMatchObject({ reason: 'missing_params' });
  });

  it('surfaces a token-endpoint error response', async () => {
    const state = 'S3';
    stashFor(state, 'N');
    await expect(
      handleLoginCallback(config, {
        url: `${config.redirectUri}?code=X&state=${state}`,
        fetchImpl: tokenResponse({ error: 'invalid_grant' }, 400),
        jwks: key.jwks,
      }),
    ).rejects.toMatchObject({ reason: 'token_endpoint_error' });
  });
});

describe('refreshTokens', () => {
  it('exchanges a refresh_token and persists the new id_token', async () => {
    const idToken = await signTestJwt(key, sampleClaims());
    const fetchImpl = tokenResponse({ id_token: idToken, refresh_token: 'RT2', access_token: 'AT2' });

    const tokens = await refreshTokens(config, 'OLD_RT', { fetchImpl });
    expect(tokens.id_token).toBe(idToken);
    expect(readIdToken('cu_id_token')).toBe(idToken);

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String((init as RequestInit).body)).toContain('grant_type=refresh_token');
  });

  it('throws when no refresh_token is supplied', async () => {
    await expect(refreshTokens(config, '', { fetchImpl: tokenResponse({}) })).rejects.toMatchObject({
      reason: 'no_refresh_token',
    });
  });

  it('surfaces a failed refresh', async () => {
    await expect(
      refreshTokens(config, 'RT', { fetchImpl: tokenResponse({ error: 'invalid_grant' }, 400) }),
    ).rejects.toMatchObject({ reason: 'refresh_failed' });
  });
});
