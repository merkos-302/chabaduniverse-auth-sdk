import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  UniverseAuthProvider,
  useUniverseAuthContext,
} from './UniverseAuthProvider';
import { AuthStatus } from '../types/context';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <UniverseAuthProvider>{children}</UniverseAuthProvider>
);

describe('UniverseAuthProvider', () => {
  it('provides default auth state', () => {
    const { result } = renderHook(() => useUniverseAuthContext(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe(AuthStatus.Loading);
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
