/**
 * Tests for the useCuOidc React hook wrapper.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCuOidc } from '../useCuOidc';
import { clearJwksCache } from '../jwks';
import { generateTestKey, sampleClaims, signTestJwt, type TestKey } from './test-helpers';

const CONFIG = {
  clientId: 'cu-harness-consumer-b',
  redirectUri: 'https://app.example.com/auth/callback',
  environment: 'staging' as const,
};
let key: TestKey;

beforeEach(async () => {
  clearJwksCache();
  localStorage.clear();
  sessionStorage.clear();
  key = await generateTestKey();
});

afterEach(() => vi.restoreAllMocks());

describe('useCuOidc', () => {
  it('reflects an existing stored token on mount', async () => {
    const token = await signTestJwt(key, sampleClaims());
    localStorage.setItem('cu_id_token', token);

    const { result } = renderHook(() => useCuOidc(CONFIG));
    expect(result.current.token).toBe(token);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isShliach).toBe(true);
    expect(result.current.user?.sub).toBe('cu-user-123');
  });

  it('starts unauthenticated when no token is stored', () => {
    const { result } = renderHook(() => useCuOidc(CONFIG));
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isShliach).toBe(false);
  });

  it('landing a session via handleReceiver flips reactive state', async () => {
    const state = 'STATE-HOOK';
    sessionStorage.setItem('cu_oidc_sso_state', state);
    const token = await signTestJwt(key, sampleClaims());

    const { result } = renderHook(() => useCuOidc(CONFIG));
    await act(async () => {
      const r = await result.current.handleReceiver({
        url: `https://app.example.com/sso/land?token=${encodeURIComponent(token)}&state=${state}`,
        jwks: key.jwks,
        replaceUrl: () => {},
      });
      expect(r.status).toBe('authenticated');
    });

    expect(result.current.token).toBe(token);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout clears reactive state', async () => {
    const token = await signTestJwt(key, sampleClaims());
    localStorage.setItem('cu_id_token', token);
    const { result } = renderHook(() => useCuOidc(CONFIG));
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout({ navigate: () => {} });
    });
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
