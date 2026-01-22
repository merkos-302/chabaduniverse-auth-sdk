/**
 * Integration tests for the full authentication flow
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UniverseAuthProvider } from '../../providers/UniverseAuthProvider';
import { useUniverseAuth } from '../../hooks/useUniverseAuth';
import { useProviders } from '../../hooks/useProviders';
import { useAuthStatus } from '../../hooks/useAuthStatus';
import { LoginButton } from '../../components/LoginButton';
import { AuthGuard } from '../../components/AuthGuard';
import type { ReactNode } from 'react';

// Mock the underlying providers
vi.mock('../../cdsso', () => ({
  useCdsso: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    token: null,
    error: null,
    authenticate: vi.fn().mockResolvedValue(undefined),
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

// Test wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <UniverseAuthProvider appId="test-app">{children}</UniverseAuthProvider>
);

describe('Full Auth Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    it('initializes with correct default state', () => {
      function TestComponent() {
        const { isAuthenticated, isLoading, isInitialized, status, user } = useUniverseAuth();
        return (
          <div>
            <span data-testid="authenticated">{String(isAuthenticated)}</span>
            <span data-testid="loading">{String(isLoading)}</span>
            <span data-testid="initialized">{String(isInitialized)}</span>
            <span data-testid="status">{status}</span>
            <span data-testid="user">{user ? user.displayName : 'null'}</span>
          </div>
        );
      }

      render(<TestComponent />, { wrapper });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('initialized').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    it('provides access to all provider states', () => {
      function TestComponent() {
        const { providers } = useProviders();
        return (
          <div>
            <span data-testid="merkos-auth">{String(providers.merkos.isAuthenticated)}</span>
            <span data-testid="valu-auth">{String(providers.valu.isAuthenticated)}</span>
            <span data-testid="universe-linked">{String(providers.universe.isLinked)}</span>
          </div>
        );
      }

      render(<TestComponent />, { wrapper });

      expect(screen.getByTestId('merkos-auth').textContent).toBe('false');
      expect(screen.getByTestId('valu-auth').textContent).toBe('false');
      expect(screen.getByTestId('universe-linked').textContent).toBe('false');
    });
  });

  describe('Auth Status Computation', () => {
    it('computes status correctly when unauthenticated', () => {
      function TestComponent() {
        const { isFullyAuthenticated, isPartiallyAuthenticated, needsLinking, getStatusMessage } =
          useAuthStatus();
        return (
          <div>
            <span data-testid="fully">{String(isFullyAuthenticated)}</span>
            <span data-testid="partially">{String(isPartiallyAuthenticated)}</span>
            <span data-testid="needs-linking">{String(needsLinking)}</span>
            <span data-testid="message">{getStatusMessage()}</span>
          </div>
        );
      }

      render(<TestComponent />, { wrapper });

      expect(screen.getByTestId('fully').textContent).toBe('false');
      expect(screen.getByTestId('partially').textContent).toBe('false');
      expect(screen.getByTestId('needs-linking').textContent).toBe('false');
    });
  });

  describe('Component Integration', () => {
    it('LoginButton renders and is clickable', () => {
      render(<LoginButton testId="test-login" />, { wrapper });

      const button = screen.getByTestId('test-login');
      expect(button).toBeDefined();

      // Button should be enabled
      expect(button.hasAttribute('disabled')).toBe(false);
    });

    it('AuthGuard protects content when unauthenticated', () => {
      render(
        <AuthGuard
          unauthenticatedFallback={<div data-testid="login-prompt">Please login</div>}
        >
          <div data-testid="protected">Protected Content</div>
        </AuthGuard>,
        { wrapper }
      );

      expect(screen.getByTestId('login-prompt')).toBeDefined();
      expect(screen.queryByTestId('protected')).toBeNull();
    });
  });

  describe('Action Handlers', () => {
    it('login action is available', () => {
      let hasLogin = false;

      function TestComponent() {
        const { login } = useUniverseAuth();
        hasLogin = typeof login === 'function';
        return <div>Test</div>;
      }

      render(<TestComponent />, { wrapper });

      expect(hasLogin).toBe(true);
    });

    it('logout action is available', () => {
      let hasLogout = false;

      function TestComponent() {
        const { logout } = useUniverseAuth();
        hasLogout = typeof logout === 'function';
        return <div>Test</div>;
      }

      render(<TestComponent />, { wrapper });

      expect(hasLogout).toBe(true);
    });

    it('linkAccount action is available', () => {
      let hasLinkAccount = false;

      function TestComponent() {
        const { linkAccount } = useUniverseAuth();
        hasLinkAccount = typeof linkAccount === 'function';
        return <div>Test</div>;
      }

      render(<TestComponent />, { wrapper });

      expect(hasLinkAccount).toBe(true);
    });
  });

  describe('Provider Configuration', () => {
    it('accepts custom configuration', () => {
      function TestComponent() {
        const { isInitialized } = useUniverseAuth();
        return <span data-testid="init">{String(isInitialized)}</span>;
      }

      render(
        <UniverseAuthProvider
          appId="custom-app"
          config={{
            enableMerkos: true,
            enableValu: false,
            enableCDSSO: true,
          }}
        >
          <TestComponent />
        </UniverseAuthProvider>
      );

      expect(screen.getByTestId('init').textContent).toBe('true');
    });

    it('handles error callback', () => {
      const onError = vi.fn();

      function TestComponent() {
        return <div>Test</div>;
      }

      render(
        <UniverseAuthProvider appId="test-app" onError={onError}>
          <TestComponent />
        </UniverseAuthProvider>
      );

      // Provider should mount without errors
      expect(screen.getByText('Test')).toBeDefined();
    });

    it('accepts auth change callback prop', () => {
      const onAuthChange = vi.fn();

      function TestComponent() {
        return <div>Test</div>;
      }

      // Provider should accept the callback without error
      render(
        <UniverseAuthProvider appId="test-app" onAuthChange={onAuthChange}>
          <TestComponent />
        </UniverseAuthProvider>
      );

      // Provider should mount successfully
      expect(screen.getByText('Test')).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    it('getUser returns null when not authenticated', () => {
      function TestComponent() {
        const { user } = useUniverseAuth();
        return <span data-testid="user-value">{user === null ? 'null' : user.displayName}</span>;
      }

      render(<TestComponent />, { wrapper });

      expect(screen.getByTestId('user-value').textContent).toBe('null');
    });

    it('isAuthenticatedWith returns false when not authenticated', () => {
      let merkosAuth = true;
      let valuAuth = true;

      function TestComponent() {
        const { isAuthenticatedWith } = useUniverseAuth();
        merkosAuth = isAuthenticatedWith('merkos');
        valuAuth = isAuthenticatedWith('valu');
        return <div>Test</div>;
      }

      render(<TestComponent />, { wrapper });

      expect(merkosAuth).toBe(false);
      expect(valuAuth).toBe(false);
    });
  });
});
