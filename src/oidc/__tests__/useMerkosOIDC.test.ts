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
