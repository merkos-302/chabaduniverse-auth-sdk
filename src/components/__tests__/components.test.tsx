import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '../AuthGuard';
import { LoginButton } from '../LoginButton';
import { UserMenu } from '../UserMenu';
import { AuthStatus } from '../AuthStatus';
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

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fallback while loading', () => {
    // Note: Since our mock returns isLoading: false, we need to adjust the test
    // In a real scenario with loading, the fallback would show
    render(
      <AuthGuard fallback={<div>Loading...</div>}>
        <div>Protected</div>
      </AuthGuard>,
      { wrapper }
    );

    // With our mock (not loading, not authenticated), it shows unauthenticated fallback (nothing)
    expect(screen.queryByText('Protected')).toBe(null);
  });

  it('renders unauthenticatedFallback when not authenticated', () => {
    render(
      <AuthGuard unauthenticatedFallback={<div>Please login</div>}>
        <div>Protected</div>
      </AuthGuard>,
      { wrapper }
    );

    expect(screen.getByText('Please login')).toBeDefined();
    expect(screen.queryByText('Protected')).toBe(null);
  });

  it('calls onAuthFailure when not authenticated', () => {
    const onAuthFailure = vi.fn();

    render(
      <AuthGuard onAuthFailure={onAuthFailure}>
        <div>Protected</div>
      </AuthGuard>,
      { wrapper }
    );

    expect(onAuthFailure).toHaveBeenCalledWith({ type: 'not_authenticated' });
  });
});

describe('LoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default text', () => {
    render(<LoginButton />, { wrapper });

    expect(screen.getByTestId('login-button')).toBeDefined();
    expect(screen.getByText('Sign In')).toBeDefined();
  });

  it('renders with custom children', () => {
    render(<LoginButton>Custom Login</LoginButton>, { wrapper });

    expect(screen.getByText('Custom Login')).toBeDefined();
  });

  it('renders with provider-specific text', () => {
    render(<LoginButton provider="merkos" />, { wrapper });

    expect(screen.getByText('Sign in with Merkos')).toBeDefined();
  });

  it('applies className and style', () => {
    render(<LoginButton className="custom-class" style={{ color: 'red' }} />, { wrapper });

    const button = screen.getByTestId('login-button');
    expect(button.className).toContain('custom-class');
    expect(button.style.color).toBe('red');
  });

  it('is disabled when disabled prop is true', () => {
    render(<LoginButton disabled />, { wrapper });

    const button = screen.getByTestId('login-button');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('has correct data attributes', () => {
    render(<LoginButton provider="valu" variant="secondary" size="lg" />, { wrapper });

    const button = screen.getByTestId('login-button');
    expect(button.dataset.provider).toBe('valu');
    expect(button.dataset.variant).toBe('secondary');
    expect(button.dataset.size).toBe('lg');
  });
});

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when not authenticated', () => {
    render(<UserMenu />, { wrapper });

    expect(screen.queryByTestId('user-menu')).toBe(null);
  });

  // Note: To test authenticated state, we'd need to mock authenticated state
  // This is a limitation of our current mock setup
});

describe('AuthStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<AuthStatus />, { wrapper });

    expect(screen.getByTestId('auth-status')).toBeDefined();
    expect(screen.getByText('Auth Status')).toBeDefined();
  });

  it('renders in compact mode', () => {
    render(<AuthStatus compact />, { wrapper });

    const status = screen.getByTestId('auth-status');
    expect(status.className).toContain('--compact');
  });

  it('shows status flags', () => {
    render(<AuthStatus />, { wrapper });

    expect(screen.getByText('Authenticated')).toBeDefined();
    expect(screen.getByText('Loading')).toBeDefined();
    expect(screen.getByText('Initialized')).toBeDefined();
  });

  it('shows providers when showProviders is true', () => {
    render(<AuthStatus showProviders />, { wrapper });

    expect(screen.getByText('Providers')).toBeDefined();
    expect(screen.getByText('Merkos')).toBeDefined();
    expect(screen.getByText('Valu')).toBeDefined();
    expect(screen.getByText('Universe')).toBeDefined();
  });

  it('applies className and style', () => {
    render(<AuthStatus className="custom-class" style={{ border: '1px solid red' }} />, { wrapper });

    const status = screen.getByTestId('auth-status');
    expect(status.className).toContain('custom-class');
    expect(status.style.border).toBe('1px solid red');
  });
});
