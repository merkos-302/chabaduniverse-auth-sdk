import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  UniverseAuthProvider,
  useUniverseAuthContext,
} from './UniverseAuthProvider';
import type { ReactNode } from 'react';

// Mock the provider hooks
vi.mock('../cdsso', () => ({
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

vi.mock('../valu', () => ({
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
  UseValuReturn: {},
  UseValuSafeReturn: {},
}));

vi.mock('../merkos', () => ({
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

describe('UniverseAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides default auth state', () => {
    const { result } = renderHook(() => useUniverseAuthContext(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.providers).toBeDefined();
    expect(result.current.providers.valu).toBeDefined();
    expect(result.current.providers.merkos).toBeDefined();
    expect(result.current.providers.universe).toBeDefined();
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useUniverseAuthContext());
    }).toThrow('useUniverseAuthContext must be used within a UniverseAuthProvider');
  });

  it('provides login and logout functions', () => {
    const { result } = renderHook(() => useUniverseAuthContext(), { wrapper });

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.loginWithBearerToken).toBe('function');
    expect(typeof result.current.refreshAuth).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('provides config with defaults', () => {
    const { result } = renderHook(() => useUniverseAuthContext(), { wrapper });

    expect(result.current.config).toBeDefined();
    expect(result.current.config.enableMerkos).toBe(true);
    expect(result.current.config.enableValu).toBe(false);
    expect(result.current.config.enableCDSSO).toBe(false);
  });

  it('allows custom config', () => {
    const customWrapper = ({ children }: { children: ReactNode }) => (
      <UniverseAuthProvider config={{ enableValu: true, appId: 'test-app' }}>
        {children}
      </UniverseAuthProvider>
    );

    const { result } = renderHook(() => useUniverseAuthContext(), {
      wrapper: customWrapper,
    });

    expect(result.current.config.enableValu).toBe(true);
    expect(result.current.config.appId).toBe('test-app');
  });
});
