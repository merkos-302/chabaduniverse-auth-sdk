/**
 * Tests for useMerkos hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import {
  useMerkos,
  useMerkosSafe,
  isMerkosAvailable,
  useMerkosUser,
  useMerkosToken,
  useMerkosAuth,
  useMerkosActions,
} from '../useMerkos';
import { MerkosProvider } from '../MerkosProvider';
import { MerkosAPIAdapter } from '@chabaduniverse/auth';
import * as merkosUtils from '../merkos-utils';

// Mock @chabaduniverse/auth
vi.mock('@chabaduniverse/auth', () => {
  return {
    MerkosAPIAdapter: vi.fn().mockImplementation(() => ({
      loginWithCredentials: vi.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        token: 'jwt-token',
      }),
      loginWithBearerToken: vi.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        token: 'jwt-token',
      }),
      loginWithGoogle: vi.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        token: 'jwt-token',
      }),
      loginWithChabadOrg: vi.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        token: 'jwt-token',
      }),
      getCurrentUser: vi.fn().mockResolvedValue({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
      }),
      logout: vi.fn().mockResolvedValue(undefined),
      setToken: vi.fn(),
      clearToken: vi.fn(),
      v2Request: vi.fn().mockResolvedValue({ data: {} }),
    })),
  };
});

// Mock merkos-utils
vi.mock('../merkos-utils', async () => {
  const actual = await vi.importActual<typeof merkosUtils>('../merkos-utils');
  return {
    ...actual,
    formatMerkosUser: vi.fn((user: unknown) => user as Record<string, unknown>),
    parseMerkosError: vi.fn((error: unknown) => ({
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    })),
    extractBearerToken: vi.fn(() => null),
    storeBearerToken: vi.fn(),
    removeBearerToken: vi.fn(),
    createMerkosLogger: vi.fn(() => ({
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  };
});

// Test wrapper with MerkosProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
    {children}
  </MerkosProvider>
);

describe('useMerkos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useMerkos(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasBearerToken).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should provide login methods', () => {
    const { result } = renderHook(() => useMerkos(), { wrapper });

    expect(typeof result.current.loginWithCredentials).toBe('function');
    expect(typeof result.current.loginWithBearerToken).toBe('function');
    expect(typeof result.current.loginWithGoogle).toBe('function');
    expect(typeof result.current.loginWithChabadOrg).toBe('function');
  });

  it('should provide other methods', () => {
    const { result } = renderHook(() => useMerkos(), { wrapper });

    expect(typeof result.current.getCurrentUser).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.setToken).toBe('function');
    expect(typeof result.current.clearToken).toBe('function');
    expect(typeof result.current.v2Request).toBe('function');
  });

  it('should throw error outside MerkosProvider', () => {
    expect(() => renderHook(() => useMerkos())).toThrow(
      'useMerkosContext must be used within a MerkosProvider'
    );
  });

  it('should return state object', () => {
    const { result } = renderHook(() => useMerkos(), { wrapper });

    expect(result.current.state).toEqual({
      status: 'unauthenticated',
      user: null,
      token: null,
      error: null,
      hasBearerToken: false,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      lastCheck: expect.any(Number),
    });
  });
});

describe('useMerkosSafe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return isAvailable: false outside MerkosProvider', () => {
    const { result } = renderHook(() => useMerkosSafe());

    expect(result.current).toEqual({ isAvailable: false });
  });

  it('should return full context inside MerkosProvider', () => {
    const { result } = renderHook(() => useMerkosSafe(), { wrapper });

    // Should have isAuthenticated, not isAvailable
    expect('isAuthenticated' in result.current).toBe(true);
    expect('isAvailable' in result.current).toBe(false);
  });

  it('should provide all methods inside MerkosProvider', () => {
    const { result } = renderHook(() => useMerkosSafe(), { wrapper });

    if (isMerkosAvailable(result.current)) {
      expect(typeof result.current.loginWithCredentials).toBe('function');
      expect(typeof result.current.loginWithBearerToken).toBe('function');
      expect(typeof result.current.logout).toBe('function');
    }
  });
});

describe('isMerkosAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for unavailable result', () => {
    const unavailable = { isAvailable: false as const };
    expect(isMerkosAvailable(unavailable)).toBe(false);
  });

  it('should return true for available result', () => {
    const { result } = renderHook(() => useMerkosSafe(), { wrapper });
    expect(isMerkosAvailable(result.current)).toBe(true);
  });

  it('should work as type guard', () => {
    const { result } = renderHook(() => useMerkosSafe(), { wrapper });

    if (isMerkosAvailable(result.current)) {
      // TypeScript should narrow the type here
      expect(result.current.isAuthenticated).toBe(false);
      expect(typeof result.current.loginWithCredentials).toBe('function');
    }
  });
});

describe('useMerkosUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no user', () => {
    const { result } = renderHook(() => useMerkosUser(), { wrapper });
    expect(result.current).toBeNull();
  });

  it('should throw outside MerkosProvider', () => {
    expect(() => renderHook(() => useMerkosUser())).toThrow(
      'useMerkosContext must be used within a MerkosProvider'
    );
  });
});

describe('useMerkosToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no token', () => {
    const { result } = renderHook(() => useMerkosToken(), { wrapper });
    expect(result.current).toBeNull();
  });

  it('should throw outside MerkosProvider', () => {
    expect(() => renderHook(() => useMerkosToken())).toThrow(
      'useMerkosContext must be used within a MerkosProvider'
    );
  });
});

describe('useMerkosAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return auth status flags', () => {
    const { result } = renderHook(() => useMerkosAuth(), { wrapper });

    expect(result.current).toEqual({
      isAuthenticated: false,
      isLoading: false,
      hasBearerToken: false,
    });
  });

  it('should throw outside MerkosProvider', () => {
    expect(() => renderHook(() => useMerkosAuth())).toThrow(
      'useMerkosContext must be used within a MerkosProvider'
    );
  });
});

describe('useMerkosActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return only action functions', () => {
    const { result } = renderHook(() => useMerkosActions(), { wrapper });

    expect(typeof result.current.loginWithCredentials).toBe('function');
    expect(typeof result.current.loginWithBearerToken).toBe('function');
    expect(typeof result.current.loginWithGoogle).toBe('function');
    expect(typeof result.current.loginWithChabadOrg).toBe('function');
    expect(typeof result.current.getCurrentUser).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.setToken).toBe('function');
    expect(typeof result.current.clearToken).toBe('function');
    expect(typeof result.current.v2Request).toBe('function');

    // Should not have state properties
    expect('isAuthenticated' in result.current).toBe(false);
    expect('user' in result.current).toBe(false);
    expect('token' in result.current).toBe(false);
  });

  it('should throw outside MerkosProvider', () => {
    expect(() => renderHook(() => useMerkosActions())).toThrow(
      'useMerkosContext must be used within a MerkosProvider'
    );
  });

  it('should provide callable functions', () => {
    const { result } = renderHook(() => useMerkosActions(), { wrapper });

    // All actions should be functions that can be called
    expect(typeof result.current.loginWithCredentials).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.v2Request).toBe('function');
  });
});

describe('Hook integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update state after successful login', async () => {
    const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };
    const mockAdapter = {
      loginWithCredentials: vi.fn().mockResolvedValue({ user: mockUser, token: 'jwt-token' }),
      loginWithBearerToken: vi.fn(),
      loginWithGoogle: vi.fn(),
      loginWithChabadOrg: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
      clearToken: vi.fn(),
      v2Request: vi.fn(),
    };
    vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

    const { result } = renderHook(() => useMerkos(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.loginWithCredentials({
        username: 'testuser',
        password: 'testpass',
      });
    });

    await waitFor(() => {
      expect(mockAdapter.loginWithCredentials).toHaveBeenCalledWith(
        'testuser',
        'testpass',
        '' // Default siteId is empty string from defaultMerkosProviderConfig
      );
    });
  });

  it('should clear state after logout', async () => {
    const mockAdapter = {
      loginWithCredentials: vi.fn(),
      loginWithBearerToken: vi.fn(),
      loginWithGoogle: vi.fn(),
      loginWithChabadOrg: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      setToken: vi.fn(),
      clearToken: vi.fn(),
      v2Request: vi.fn(),
    };
    vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

    const { result } = renderHook(() => useMerkos(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(mockAdapter.logout).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});
