/**
 * Tests for the silent cross-domain SSO flow (`/sso/check`), consumer side.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleReceiver, startSilentSso } from '../silent-sso';
import { resolveCuOidcConfig } from '../config';
import { clearJwksCache } from '../jwks';
import { readIdToken } from '../storage';
import { generateTestKey, sampleClaims, signTestJwt, type TestKey } from './test-helpers';

const config = resolveCuOidcConfig({
  clientId: 'cu-harness-consumer-b',
  redirectUri: 'https://app.example.com/auth/callback',
  environment: 'staging',
});
const RECEIVER = 'https://app.example.com/sso/land';
let key: TestKey;

beforeEach(async () => {
  clearJwksCache();
  localStorage.clear();
  sessionStorage.clear();
  key = await generateTestKey();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('startSilentSso', () => {
  it('builds a /sso/check URL with return + state and stashes the state', () => {
    const navigate = vi.fn();
    const url = new URL(
      startSilentSso(config, { returnUrl: RECEIVER, navigate }),
    );
    expect(url.origin + url.pathname).toBe('https://staging.oidc.merkos302.com/sso/check');
    expect(url.searchParams.get('return')).toBe(RECEIVER);
    const state = url.searchParams.get('state');
    expect(state).toBeTruthy();
    // state was stashed for the receiver to compare against
    expect(sessionStorage.getItem('cu_oidc_sso_state')).toBe(state);
    expect(navigate).toHaveBeenCalledWith(url.toString());
  });

  it('does not navigate when redirect:false', () => {
    const navigate = vi.fn();
    startSilentSso(config, { returnUrl: RECEIVER, redirect: false, navigate });
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('handleReceiver', () => {
  it('returns no_result when the URL carries neither token nor error', async () => {
    const r = await handleReceiver(config, { url: 'https://app.example.com/sso/land' });
    expect(r.status).toBe('no_result');
  });

  it('authenticates on a valid token with a matching state, stores it, and cleans the URL', async () => {
    const state = 'STATE-XYZ';
    sessionStorage.setItem('cu_oidc_sso_state', state);
    const token = await signTestJwt(key, sampleClaims());
    const replaceUrl = vi.fn();

    const r = await handleReceiver(config, {
      url: `${RECEIVER}?token=${encodeURIComponent(token)}&state=${state}`,
      jwks: key.jwks,
      replaceUrl,
    });

    expect(r.status).toBe('authenticated');
    if (r.status === 'authenticated') {
      expect(r.claims.sub).toBe('cu-user-123');
      expect(r.token).toBe(token);
    }
    // token persisted first-party
    expect(readIdToken('cu_id_token')).toBe(token);
    // URL cleaned of token/state/error
    const cleaned = new URL(replaceUrl.mock.calls[0]![0] as string);
    expect(cleaned.searchParams.get('token')).toBeNull();
    expect(cleaned.searchParams.get('state')).toBeNull();
  });

  it('signals not_authenticated (fall back to login) and cleans the URL', async () => {
    const state = 'STATE-1';
    sessionStorage.setItem('cu_oidc_sso_state', state);
    const replaceUrl = vi.fn();

    const r = await handleReceiver(config, {
      url: `${RECEIVER}?error=not_authenticated&state=${state}`,
      replaceUrl,
    });
    expect(r.status).toBe('not_authenticated');
    expect(replaceUrl).toHaveBeenCalled();
  });

  it('rejects a state mismatch (CSRF)', async () => {
    sessionStorage.setItem('cu_oidc_sso_state', 'EXPECTED');
    const token = await signTestJwt(key, sampleClaims());
    const r = await handleReceiver(config, {
      url: `${RECEIVER}?token=${encodeURIComponent(token)}&state=FORGED`,
      jwks: key.jwks,
    });
    expect(r).toMatchObject({ status: 'error', error: 'state_mismatch' });
    // did NOT store the token
    expect(readIdToken('cu_id_token')).toBeNull();
  });

  it('rejects when no state was stashed', async () => {
    const token = await signTestJwt(key, sampleClaims());
    const r = await handleReceiver(config, {
      url: `${RECEIVER}?token=${encodeURIComponent(token)}&state=ANY`,
      jwks: key.jwks,
    });
    expect(r).toMatchObject({ status: 'error', error: 'state_mismatch' });
  });

  it('surfaces a verification failure as an error (bad signature)', async () => {
    const state = 'STATE-BAD';
    sessionStorage.setItem('cu_oidc_sso_state', state);
    const otherKey = await generateTestKey('other');
    // Token signed by other key but presenting our kid so key selection matches.
    const token = await signTestJwt(otherKey, sampleClaims(), { kid: key.kid });
    const r = await handleReceiver(config, {
      url: `${RECEIVER}?token=${encodeURIComponent(token)}&state=${state}`,
      jwks: key.jwks,
    });
    expect(r).toMatchObject({ status: 'error', error: 'bad_signature' });
    expect(readIdToken('cu_id_token')).toBeNull();
  });

  it('passes an unknown provider error through as error', async () => {
    const state = 'STATE-E';
    sessionStorage.setItem('cu_oidc_sso_state', state);
    const r = await handleReceiver(config, {
      url: `${RECEIVER}?error=server_error&state=${state}`,
    });
    expect(r).toMatchObject({ status: 'error', error: 'server_error' });
  });
});
