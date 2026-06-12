/**
 * Tests for useMerkosOIDC hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMerkosOIDC } from '../useMerkosOIDC';
import * as popupAuth from '../popup-auth';

// Mock popup-auth
vi.mock('../popup-auth', () => ({
  openAuthPopup: vi.fn(),
}));

describe('useMerkosOIDC', () => {
  let mockCleanup: ReturnType<typeof vi.fn>;
  let resolvePromise: (value: string) => void;
  let rejectPromise: (reason: Error) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanup = vi.fn();

    (popupAuth.openAuthPopup as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const promise = new Promise<string>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      return { promise, cleanup: mockCleanup };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return isOpen=false initially', () => {
    const { result } = renderHook(() => useMerkosOIDC());
    expect(result.current.isOpen).toBe(false);
  });

  it('should open popup on login() and set isOpen=true', () => {
    const { result } = renderHook(() => useMerkosOIDC());

    act(() => {
      result.current.login();
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
  });

  it('should set isOpen=false when popup resolves', async () => {
    const { result } = renderHook(() => useMerkosOIDC());

    act(() => {
      result.current.login();
    });

    expect(result.current.isOpen).toBe(true);

    await act(async () => {
      resolvePromise('test-token');
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should set isOpen=false when popup rejects', async () => {
    const { result } = renderHook(() => useMerkosOIDC());

    act(() => {
      result.current.login();
    });

    await act(async () => {
      rejectPromise(new Error('popup_closed'));
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should not open second popup while one is active', () => {
    const { result } = renderHook(() => useMerkosOIDC());

    act(() => {
      result.current.login();
    });

    act(() => {
      result.current.login();
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalledTimes(1);
  });

  it('should cleanup popup on unmount', () => {
    const { result, unmount } = renderHook(() => useMerkosOIDC());

    act(() => {
      result.current.login();
    });

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should pass correct options to openAuthPopup', () => {
    const { result } = renderHook(() =>
      useMerkosOIDC({
        authUrl: 'https://custom.example.com/login',
        storageKey: 'custom_key',
      }),
    );

    act(() => {
      result.current.login();
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      'https://custom.example.com/login',
      'https://custom.example.com',
      'custom_key',
    );
  });

  it('should use custom expectedOrigin when provided', () => {
    const { result } = renderHook(() =>
      useMerkosOIDC({
        authUrl: 'https://auth.example.com/login',
        expectedOrigin: 'https://custom-origin.example.com',
      }),
    );

    act(() => {
      result.current.login();
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      'https://auth.example.com/login',
      'https://custom-origin.example.com',
      expect.any(String),
    );
  });
});

// ============================================================================
// environment param (CU-889 Phase 1)
// ============================================================================

describe('useMerkosOIDC – environment param (CU-889)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { __resetDeprecationWarnings } = await import('../deprecation');
    __resetDeprecationWarnings();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    (popupAuth.openAuthPopup as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      promise: new Promise(() => {}),
      cleanup: vi.fn(),
    }));
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('defaults to production URL when no environment is supplied', () => {
    const { result } = renderHook(() => useMerkosOIDC());
    act(() => {
      result.current.login();
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      'https://auth.chabaduniverse.com/merkos/login',
      'https://auth.chabaduniverse.com',
      'merkos_auth_token',
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('routes to staging URL when environment=staging', () => {
    const { result } = renderHook(() => useMerkosOIDC({ environment: 'staging' }));
    act(() => {
      result.current.login();
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      'https://test-auth.chabaduniverse.com/merkos/login',
      'https://test-auth.chabaduniverse.com',
      'merkos_auth_token',
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('falls back to production AND warns once when environment is an unknown string', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { result, rerender } = renderHook(
      ({ env }: { env: string }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useMerkosOIDC({ environment: env as any }),
      { initialProps: { env: 'prod' } },
    );
    act(() => {
      result.current.login();
    });

    // Falls back to production URLs, no crash
    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      'https://auth.chabaduniverse.com/merkos/login',
      'https://auth.chabaduniverse.com',
      'merkos_auth_token',
    );

    // Re-render with another invalid value — still only one warning total
    rerender({ env: 'development' });
    act(() => {
      result.current.login();
    });

    const invalidWarnings = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('Invalid `environment`'),
    );
    expect(invalidWarnings).toHaveLength(1);
  });

  it('explicit authUrl overrides environment AND emits one deprecation warning', () => {
    const customUrl = 'https://override.example.com/login';
    const { result } = renderHook(() =>
      useMerkosOIDC({ environment: 'staging', authUrl: customUrl }),
    );
    act(() => {
      result.current.login();
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      customUrl,
      'https://override.example.com',
      'merkos_auth_token',
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('authUrl');
    expect(warnSpy.mock.calls[0]?.[0]).toContain('deprecated');
  });
});
