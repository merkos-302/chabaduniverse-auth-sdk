/**
 * Tests for useCdsso and related hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCdsso, useCdssoAutoAuth, useCdssoToken, useCdssoUser } from '../useCdsso';
import { CdssoClient } from '../cdsso-client';

// Mock the CdssoClient
vi.mock('../cdsso-client', () => {
  const mockGetState = vi.fn(() => ({
    status: 'idle',
    user: null,
    token: null,
    error: null,
    isTokenStored: false,
    lastCheck: null,
  }));

  const mockOnStateChange = vi.fn((_callback: (state: unknown) => void) => {
    return () => {};
  });

  return {
    CdssoClient: vi.fn().mockImplementation(() => ({
      getState: mockGetState,
      onStateChange: mockOnStateChange,
      authenticate: vi.fn().mockResolvedValue(null),
      getAuthStatus: vi.fn().mockResolvedValue(null),
      logout: vi.fn().mockResolvedValue(true),
      clearSession: vi.fn(),
      getBearerToken: vi.fn().mockReturnValue(null),
    })),
  };
});

describe('useCdsso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useCdsso());

    expect(result.current.state.status).toBe('idle');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should create CdssoClient with config', () => {
    renderHook(() => useCdsso({ debug: true }));

    expect(CdssoClient).toHaveBeenCalledWith({ debug: true });
  });

  it('should provide authenticate function', async () => {
    const { result } = renderHook(() => useCdsso());

    expect(typeof result.current.authenticate).toBe('function');

    await act(async () => {
      await result.current.authenticate();
    });
  });

  it('should provide checkStatus function', async () => {
    const { result } = renderHook(() => useCdsso());

    expect(typeof result.current.checkStatus).toBe('function');

    await act(async () => {
      await result.current.checkStatus();
    });
  });

  it('should provide logout function', async () => {
    const { result } = renderHook(() => useCdsso());

    expect(typeof result.current.logout).toBe('function');

    await act(async () => {
      const logoutResult = await result.current.logout();
      expect(logoutResult).toBe(true);
    });
  });

  it('should provide clearToken function', () => {
    const { result } = renderHook(() => useCdsso());

    expect(typeof result.current.clearToken).toBe('function');

    act(() => {
      result.current.clearToken();
    });
  });

  it('should provide getBearerToken function', () => {
    const { result } = renderHook(() => useCdsso());

    expect(typeof result.current.getBearerToken).toBe('function');
    expect(result.current.getBearerToken()).toBeNull();
  });

  it('should return isAuthenticated true when status is authenticated', () => {
    // Override mock for this test
    vi.mocked(CdssoClient).mockImplementationOnce(() => ({
      getState: vi.fn(() => ({
        status: 'authenticated',
        user: { id: '123', email: 'test@example.com' },
        token: 'test-token',
        error: null,
        isTokenStored: true,
        lastCheck: Date.now(),
      })),
      onStateChange: vi.fn(() => () => {}),
      authenticate: vi.fn(),
      getAuthStatus: vi.fn(),
      logout: vi.fn(),
      clearSession: vi.fn(),
      getBearerToken: vi.fn(),
    }));

    const { result } = renderHook(() => useCdsso());

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should return isLoading true when status is checking', () => {
    vi.mocked(CdssoClient).mockImplementationOnce(() => ({
      getState: vi.fn(() => ({
        status: 'checking',
        user: null,
        token: null,
        error: null,
        isTokenStored: false,
        lastCheck: null,
      })),
      onStateChange: vi.fn(() => () => {}),
      authenticate: vi.fn(),
      getAuthStatus: vi.fn(),
      logout: vi.fn(),
      clearSession: vi.fn(),
      getBearerToken: vi.fn(),
    }));

    const { result } = renderHook(() => useCdsso());

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useCdssoAutoAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should attempt authentication on mount', async () => {
    const mockAuthenticate = vi.fn().mockResolvedValue(null);

    vi.mocked(CdssoClient).mockImplementationOnce(() => ({
      getState: vi.fn(() => ({
        status: 'idle',
        user: null,
        token: null,
        error: null,
        isTokenStored: false,
        lastCheck: null,
      })),
      onStateChange: vi.fn(() => () => {}),
      authenticate: mockAuthenticate,
      getAuthStatus: vi.fn(),
      logout: vi.fn(),
      clearSession: vi.fn(),
      getBearerToken: vi.fn(),
    }));

    renderHook(() => useCdssoAutoAuth());

    await waitFor(() => {
      expect(mockAuthenticate).toHaveBeenCalled();
    });
  });

  it('should not authenticate if already authenticated', () => {
    const mockAuthenticate = vi.fn();

    vi.mocked(CdssoClient).mockImplementationOnce(() => ({
      getState: vi.fn(() => ({
        status: 'authenticated',
        user: { id: '123', email: 'test@example.com' },
        token: 'test-token',
        error: null,
        isTokenStored: true,
        lastCheck: Date.now(),
      })),
      onStateChange: vi.fn(() => () => {}),
      authenticate: mockAuthenticate,
      getAuthStatus: vi.fn(),
      logout: vi.fn(),
      clearSession: vi.fn(),
      getBearerToken: vi.fn(),
    }));

    renderHook(() => useCdssoAutoAuth());

    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('should not authenticate if loading', () => {
    const mockAuthenticate = vi.fn();

    vi.mocked(CdssoClient).mockImplementationOnce(() => ({
      getState: vi.fn(() => ({
        status: 'checking',
        user: null,
        token: null,
        error: null,
        isTokenStored: false,
        lastCheck: null,
      })),
      onStateChange: vi.fn(() => () => {}),
      authenticate: mockAuthenticate,
      getAuthStatus: vi.fn(),
      logout: vi.fn(),
      clearSession: vi.fn(),
      getBearerToken: vi.fn(),
    }));

    renderHook(() => useCdssoAutoAuth());

    expect(mockAuthenticate).not.toHaveBeenCalled();
  });
});

describe('useCdssoToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no token', () => {
    const { result } = renderHook(() => useCdssoToken());

    expect(result.current).toBeNull();
  });

  it('should return token when available', () => {
    vi.mocked(CdssoClient).mockImplementationOnce(() => ({
      getState: vi.fn(() => ({
        status: 'authenticated',
        user: { id: '123', email: 'test@example.com' },
        token: 'my-bearer-token',
        error: null,
        isTokenStored: true,
        lastCheck: Date.now(),
      })),
      onStateChange: vi.fn(() => () => {}),
      authenticate: vi.fn(),
      getAuthStatus: vi.fn(),
      logout: vi.fn(),
      clearSession: vi.fn(),
      getBearerToken: vi.fn(),
    }));

    const { result } = renderHook(() => useCdssoToken());

    expect(result.current).toBe('my-bearer-token');
  });
});

describe('useCdssoUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no user', () => {
    const { result } = renderHook(() => useCdssoUser());

    expect(result.current).toBeNull();
  });

  it('should return user when available', () => {
    const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };

    vi.mocked(CdssoClient).mockImplementationOnce(() => ({
      getState: vi.fn(() => ({
        status: 'authenticated',
        user: mockUser,
        token: 'test-token',
        error: null,
        isTokenStored: true,
        lastCheck: Date.now(),
      })),
      onStateChange: vi.fn(() => () => {}),
      authenticate: vi.fn(),
      getAuthStatus: vi.fn(),
      logout: vi.fn(),
      clearSession: vi.fn(),
      getBearerToken: vi.fn(),
    }));

    const { result } = renderHook(() => useCdssoUser());

    expect(result.current).toEqual(mockUser);
  });
});
