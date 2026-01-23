import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUniverseAuth } from '../useUniverseAuth';
import { useProviders, useValuProvider, useMerkosProvider } from '../useProviders';
import { useAuthStatus, useIsAuthenticated, useIsLoading } from '../useAuthStatus';
import { UniverseAuthProvider } from '../../providers/UniverseAuthProvider';
import type { ReactNode } from 'react';

// Mock the provider hooks
vi.mock('../../cdsso', () => ({
  useCdsso: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    token: null,
    error: null,
    authenticate: vi.fn(),
    logout: vi.fn().mockResolvedValue(true),
    checkStatus: vi.fn(),
    clearToken: vi.fn(),
    getBearerToken: vi.fn().mockReturnValue(null),
    state: {
      status: 'unauthenticated',
      user: null,
      token: null,
      error: null,
    },
  }),
}));

vi.mock('../../valu', () => ({
  useValuSafe: () => ({
    isInIframe: false,
    isConnected: false,
    isReady: false,
    error: null,
    connectionState: {
      isInIframe: false,
      isConnected: false,
      isReady: false,
      isNavigatingApp: false,
      error: null,
    },
    user: null,
    rawUser: null,
    isAuthenticated: false,
    isAuthenticating: false,
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
    reconnect: vi.fn().mockResolvedValue(true),
    sendIntent: vi.fn(),
    callService: vi.fn(),
    runConsoleCommand: vi.fn(),
    openTextChat: vi.fn(),
    openVideoChat: vi.fn(),
    healthCheck: vi.fn(),
    getHealthStatus: vi.fn(),
  }),
  isValuAvailable: (result: unknown) =>
    !('isAvailable' in (result as Record<string, unknown>) && (result as Record<string, unknown>).isAvailable === false),
  UseValuReturn: {},
  UseValuSafeReturn: {},
}));

vi.mock('../../merkos', () => ({
  useMerkosSafe: () => ({
    isAuthenticated: false,
    isLoading: false,
    hasBearerToken: false,
    user: null,
    token: null,
    error: null,
    state: {
      status: 'unauthenticated',
      user: null,
      token: null,
      error: null,
      hasBearerToken: false,
      lastCheck: null,
    },
    loginWithCredentials: vi.fn().mockResolvedValue(null),
    loginWithBearerToken: vi.fn().mockResolvedValue(null),
    loginWithGoogle: vi.fn().mockResolvedValue(null),
    loginWithChabadOrg: vi.fn().mockResolvedValue(null),
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    v2Request: vi.fn(),
  }),
  isMerkosAvailable: (result: unknown) =>
    !('isAvailable' in (result as Record<string, unknown>) && (result as Record<string, unknown>).isAvailable === false),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <UniverseAuthProvider>{children}</UniverseAuthProvider>
);

describe('useUniverseAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth state', () => {
    const { result } = renderHook(() => useUniverseAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.providers).toBeDefined();
  });

  it('returns login and logout functions', () => {
    const { result } = renderHook(() => useUniverseAuth(), { wrapper });

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.loginWithBearerToken).toBe('function');
    expect(typeof result.current.linkAccount).toBe('function');
    expect(typeof result.current.refreshAuth).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('returns helper functions', () => {
    const { result } = renderHook(() => useUniverseAuth(), { wrapper });

    expect(typeof result.current.isAuthenticatedWith).toBe('function');
    expect(typeof result.current.hasRole).toBe('function');
    expect(typeof result.current.hasPermission).toBe('function');
  });

  it('isAuthenticatedWith returns correct values', () => {
    const { result } = renderHook(() => useUniverseAuth(), { wrapper });

    expect(result.current.isAuthenticatedWith('merkos')).toBe(false);
    expect(result.current.isAuthenticatedWith('valu')).toBe(false);
  });

  it('hasRole and hasPermission return false without enrichment', () => {
    const { result } = renderHook(() => useUniverseAuth(), { wrapper });

    expect(result.current.hasRole('admin')).toBe(false);
    expect(result.current.hasPermission('read')).toBe(false);
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useUniverseAuth());
    }).toThrow('useUniverseAuthContext must be used within a UniverseAuthProvider');
  });
});

describe('useProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns provider states', () => {
    const { result } = renderHook(() => useProviders(), { wrapper });

    expect(result.current.providers).toBeDefined();
    expect(result.current.valu).toBeDefined();
    expect(result.current.merkos).toBeDefined();
  });

  it('returns helper functions', () => {
    const { result } = renderHook(() => useProviders(), { wrapper });

    expect(typeof result.current.isProviderAuthenticated).toBe('function');
    expect(typeof result.current.getProviderUser).toBe('function');
  });

  it('isProviderAuthenticated returns correct values', () => {
    const { result } = renderHook(() => useProviders(), { wrapper });

    expect(result.current.isProviderAuthenticated('merkos')).toBe(false);
    expect(result.current.isProviderAuthenticated('valu')).toBe(false);
  });

  it('getProviderUser returns null when not authenticated', () => {
    const { result } = renderHook(() => useProviders(), { wrapper });

    expect(result.current.getProviderUser('merkos')).toBeNull();
    expect(result.current.getProviderUser('valu')).toBeNull();
  });
});

describe('useValuProvider', () => {
  it('returns valu state', () => {
    const { result } = renderHook(() => useValuProvider(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isConnected).toBe(false);
  });
});

describe('useMerkosProvider', () => {
  it('returns merkos state', () => {
    const { result } = renderHook(() => useMerkosProvider(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});

describe('useAuthStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns status values', () => {
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    expect(result.current.status).toBeDefined();
    expect(typeof result.current.isFullyAuthenticated).toBe('boolean');
    expect(typeof result.current.isPartiallyAuthenticated).toBe('boolean');
    expect(typeof result.current.needsLinking).toBe('boolean');
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.hasError).toBe('boolean');
  });

  it('returns getStatusMessage function', () => {
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    expect(typeof result.current.getStatusMessage).toBe('function');
    const message = result.current.getStatusMessage();
    expect(typeof message).toBe('string');
  });

  it('isFullyAuthenticated is false when not authenticated', () => {
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    expect(result.current.isFullyAuthenticated).toBe(false);
  });

  it('needsLinking is false when not authenticated with both', () => {
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    expect(result.current.needsLinking).toBe(false);
  });
});

describe('useIsAuthenticated', () => {
  it('returns false when not authenticated', () => {
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

    expect(result.current).toBe(false);
  });
});

describe('useIsLoading', () => {
  it('returns loading state', () => {
    const { result } = renderHook(() => useIsLoading(), { wrapper });

    expect(typeof result.current).toBe('boolean');
  });
});
