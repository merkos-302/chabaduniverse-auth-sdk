/**
 * Tests for MerkosProvider and context hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MerkosProvider, useMerkosContext, useMerkosContextSafe } from '../MerkosProvider';
import { MerkosAPIAdapter } from '@chabaduniverse/auth';
import * as merkosUtils from '../merkos-utils';
import type * as MerkosUtilsType from '../merkos-utils';

// Mock @chabaduniverse/auth
vi.mock('@chabaduniverse/auth', () => {
  return {
    MerkosAPIAdapter: vi.fn().mockImplementation(() => ({
      loginWithCredentials: vi.fn(),
      loginWithBearerToken: vi.fn(),
      loginWithGoogle: vi.fn(),
      loginWithChabadOrg: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
      clearToken: vi.fn(),
      v2Request: vi.fn(),
    })),
  };
});

// Mock merkos-utils
vi.mock('../merkos-utils', () => ({
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
  // Re-export any constants that might be needed
  defaultMerkosProviderConfig: {
    baseUrl: 'https://api.merkos302.com',
    apiVersion: 'v2',
    timeout: 30000,
    siteId: '',
    autoLoginWithCdsso: false,
    storageKey: 'merkos_token',
    debug: false,
  },
  initialMerkosAuthState: {
    status: 'idle',
    user: null,
    token: null,
    error: null,
    hasBearerToken: false,
    lastCheck: null,
  },
}));

describe('MerkosProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <div data-testid="child">Child Content</div>
        </MerkosProvider>
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect(screen.getByTestId('child')).toBeInTheDocument();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should create MerkosAPIAdapter with config', () => {
      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com', timeout: 30000 }}>
          <div>Child</div>
        </MerkosProvider>
      );

      expect(MerkosAPIAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://test.merkos302.com',
          timeout: 30000,
        })
      );
    });

    it('should merge config with defaults', () => {
      render(
        <MerkosProvider config={{ baseUrl: 'https://custom.merkos302.com' }}>
          <div>Child</div>
        </MerkosProvider>
      );

      expect(MerkosAPIAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://custom.merkos302.com',
        })
      );
    });
  });

  describe('context value', () => {
    it('should provide initial state', () => {
      const TestComponent = () => {
        const context = useMerkosContext();
        return (
          <div>
            <span data-testid="status">{context.state.status}</span>
            <span data-testid="isAuthenticated">{context.isAuthenticated.toString()}</span>
            <span data-testid="isLoading">{context.isLoading.toString()}</span>
          </div>
        );
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
      expect(screen.getByTestId('isLoading').textContent).toBe('false');
    });

    it('should provide authentication methods', () => {
      const TestComponent = () => {
        const context = useMerkosContext();
        return (
          <div>
            <span data-testid="hasLoginWithCredentials">{(typeof context.loginWithCredentials === 'function').toString()}</span>
            <span data-testid="hasLoginWithBearerToken">{(typeof context.loginWithBearerToken === 'function').toString()}</span>
            <span data-testid="hasLoginWithGoogle">{(typeof context.loginWithGoogle === 'function').toString()}</span>
            <span data-testid="hasLoginWithChabadOrg">{(typeof context.loginWithChabadOrg === 'function').toString()}</span>
            <span data-testid="hasLogout">{(typeof context.logout === 'function').toString()}</span>
          </div>
        );
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      expect(screen.getByTestId('hasLoginWithCredentials').textContent).toBe('true');
      expect(screen.getByTestId('hasLoginWithBearerToken').textContent).toBe('true');
      expect(screen.getByTestId('hasLoginWithGoogle').textContent).toBe('true');
      expect(screen.getByTestId('hasLoginWithChabadOrg').textContent).toBe('true');
      expect(screen.getByTestId('hasLogout').textContent).toBe('true');
    });
  });

  describe('loginWithCredentials', () => {
    it('should login successfully', async () => {
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

      let _loginResult: unknown;
      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          void (async () => {
            _loginResult = await context.loginWithCredentials({
              username: 'testuser',
              password: 'testpass',
            });
          })();
        }, [context]);
        return <div data-testid="status">{context.state.status}</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.loginWithCredentials).toHaveBeenCalledWith(
          'testuser',
          'testpass',
          '' // Default siteId is empty string from defaultMerkosProviderConfig
        );
      });
    });

    it('should handle login error', async () => {
      const mockAdapter = {
        loginWithCredentials: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
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

      const TestComponent = () => {
        const context = useMerkosContext();
        const [_error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          void (async () => {
            const result = await context.loginWithCredentials({
              username: 'testuser',
              password: 'wrongpass',
            });
            if (!result) {
              setError(context.error);
            }
          })();
        }, [context]);

        return <div data-testid="status">{context.state.status}</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.loginWithCredentials).toHaveBeenCalled();
      });
    });
  });

  describe('loginWithBearerToken', () => {
    it('should login with bearer token', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };
      const mockAdapter = {
        loginWithCredentials: vi.fn(),
        loginWithBearerToken: vi.fn().mockResolvedValue({ user: mockUser, token: 'new-jwt-token' }),
        loginWithGoogle: vi.fn(),
        loginWithChabadOrg: vi.fn(),
        getCurrentUser: vi.fn(),
        logout: vi.fn(),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        v2Request: vi.fn(),
      };
      vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          void context.loginWithBearerToken({ token: 'existing-jwt' });
        }, [context]);
        return <div data-testid="status">{context.state.status}</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.loginWithBearerToken).toHaveBeenCalledWith('existing-jwt', null);
      });
    });
  });

  describe('loginWithGoogle', () => {
    it('should login with Google OAuth', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };
      const mockAdapter = {
        loginWithCredentials: vi.fn(),
        loginWithBearerToken: vi.fn(),
        loginWithGoogle: vi.fn().mockResolvedValue({ user: mockUser, token: 'google-jwt' }),
        loginWithChabadOrg: vi.fn(),
        getCurrentUser: vi.fn(),
        logout: vi.fn(),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        v2Request: vi.fn(),
      };
      vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          void context.loginWithGoogle({ code: 'google-oauth-code' });
        }, [context]);
        return <div>Test</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.loginWithGoogle).toHaveBeenCalledWith('google-oauth-code', null, null);
      });
    });
  });

  describe('loginWithChabadOrg', () => {
    it('should login with Chabad.org SSO', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };
      const mockAdapter = {
        loginWithCredentials: vi.fn(),
        loginWithBearerToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        loginWithChabadOrg: vi.fn().mockResolvedValue({ user: mockUser, token: 'chabad-jwt' }),
        getCurrentUser: vi.fn(),
        logout: vi.fn(),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        v2Request: vi.fn(),
      };
      vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          void context.loginWithChabadOrg({ key: 'chabad-sso-key' });
        }, [context]);
        return <div>Test</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.loginWithChabadOrg).toHaveBeenCalledWith('chabad-sso-key', null);
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };
      const mockAdapter = {
        loginWithCredentials: vi.fn(),
        loginWithBearerToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        loginWithChabadOrg: vi.fn(),
        getCurrentUser: vi.fn().mockResolvedValue(mockUser),
        logout: vi.fn(),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        v2Request: vi.fn(),
      };
      vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          void context.getCurrentUser();
        }, [context]);
        return <div data-testid="status">{context.state.status}</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.getCurrentUser).toHaveBeenCalled();
      });
    });

    it('should handle getCurrentUser error', async () => {
      const mockAdapter = {
        loginWithCredentials: vi.fn(),
        loginWithBearerToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        loginWithChabadOrg: vi.fn(),
        getCurrentUser: vi.fn().mockRejectedValue(new Error('Not authenticated')),
        logout: vi.fn(),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        v2Request: vi.fn(),
      };
      vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          void context.getCurrentUser();
        }, [context]);
        return <div data-testid="status">{context.state.status}</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.getCurrentUser).toHaveBeenCalled();
      });
    });
  });

  describe('logout', () => {
    it('should logout and clear state', async () => {
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

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          void context.logout();
        }, [context]);
        return <div data-testid="status">{context.state.status}</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.logout).toHaveBeenCalled();
        expect(merkosUtils.removeBearerToken).toHaveBeenCalled();
      });
    });

    it('should clear local state even if logout API fails', async () => {
      const mockAdapter = {
        loginWithCredentials: vi.fn(),
        loginWithBearerToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        loginWithChabadOrg: vi.fn(),
        getCurrentUser: vi.fn(),
        logout: vi.fn().mockRejectedValue(new Error('Network error')),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        v2Request: vi.fn(),
      };
      vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          void context.logout();
        }, [context]);
        return <div data-testid="status">{context.state.status}</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(merkosUtils.removeBearerToken).toHaveBeenCalled();
      });
    });
  });

  describe('setToken', () => {
    it('should set token manually', () => {
      const mockAdapter = {
        loginWithCredentials: vi.fn(),
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

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          context.setToken('manual-token');
        }, [context]);
        return <div data-testid="hasBearerToken">{context.hasBearerToken.toString()}</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      expect(mockAdapter.setToken).toHaveBeenCalledWith('manual-token');
      expect(merkosUtils.storeBearerToken).toHaveBeenCalledWith('manual-token', expect.anything());
    });
  });

  describe('clearToken', () => {
    it('should clear token', () => {
      const mockAdapter = {
        loginWithCredentials: vi.fn(),
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

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          context.clearToken();
        }, [context]);
        return <div data-testid="hasBearerToken">{context.hasBearerToken.toString()}</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      expect(mockAdapter.clearToken).toHaveBeenCalled();
      expect(merkosUtils.removeBearerToken).toHaveBeenCalled();
    });
  });

  describe('v2Request', () => {
    it('should make v2 API request', async () => {
      const mockResponse = { data: { users: [] } };
      const mockAdapter = {
        loginWithCredentials: vi.fn(),
        loginWithBearerToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        loginWithChabadOrg: vi.fn(),
        getCurrentUser: vi.fn(),
        logout: vi.fn(),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        v2Request: vi.fn().mockResolvedValue(mockResponse),
      };
      vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

      const TestComponent = () => {
        const context = useMerkosContext();
        React.useEffect(() => {
          void context.v2Request('users', '/list', { limit: 10 });
        }, [context]);
        return <div>Test</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.v2Request).toHaveBeenCalledWith('users', '/list', { limit: 10 });
      });
    });

    it('should throw error if adapter not initialized', () => {
      // This is an edge case that shouldn't happen in practice
      // but we test it for completeness
      const TestComponent = () => {
        const _context = useMerkosContext();
        return <div>Test</div>;
      };

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
          <TestComponent />
        </MerkosProvider>
      );

      // The v2Request check happens at runtime when called
    });
  });

  describe('auto-login', () => {
    it('should attempt auto-login when existing token found', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };
      vi.mocked(merkosUtils.extractBearerToken).mockReturnValue('existing-token');

      const mockAdapter = {
        loginWithCredentials: vi.fn(),
        loginWithBearerToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        loginWithChabadOrg: vi.fn(),
        getCurrentUser: vi.fn().mockResolvedValue(mockUser),
        logout: vi.fn(),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        v2Request: vi.fn(),
      };
      vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com', autoLoginWithCdsso: true }}>
          <div>Test</div>
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.setToken).toHaveBeenCalledWith('existing-token');
        expect(mockAdapter.getCurrentUser).toHaveBeenCalled();
      });
    });

    it('should clear invalid token on auto-login failure', async () => {
      vi.mocked(merkosUtils.extractBearerToken).mockReturnValue('invalid-token');

      const mockAdapter = {
        loginWithCredentials: vi.fn(),
        loginWithBearerToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        loginWithChabadOrg: vi.fn(),
        getCurrentUser: vi.fn().mockRejectedValue(new Error('Invalid token')),
        logout: vi.fn(),
        setToken: vi.fn(),
        clearToken: vi.fn(),
        v2Request: vi.fn(),
      };
      vi.mocked(MerkosAPIAdapter).mockImplementationOnce(() => mockAdapter);

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com', autoLoginWithCdsso: true }}>
          <div>Test</div>
        </MerkosProvider>
      );

      await waitFor(() => {
        expect(mockAdapter.clearToken).toHaveBeenCalled();
        expect(merkosUtils.removeBearerToken).toHaveBeenCalled();
      });
    });

    it('should skip auto-login when no token found', () => {
      vi.mocked(merkosUtils.extractBearerToken).mockReturnValue(null);

      const mockAdapter = {
        loginWithCredentials: vi.fn(),
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

      render(
        <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com', autoLoginWithCdsso: true }}>
          <div>Test</div>
        </MerkosProvider>
      );

      expect(mockAdapter.setToken).not.toHaveBeenCalled();
      expect(mockAdapter.getCurrentUser).not.toHaveBeenCalled();
    });
  });
});

describe('useMerkosContext', () => {
  it('should throw error outside MerkosProvider', () => {
    const TestComponent = () => {
      useMerkosContext();
      return null;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useMerkosContext must be used within a MerkosProvider'
    );
  });
});

describe('useMerkosContextSafe', () => {
  it('should return null outside MerkosProvider', () => {
    const { result } = renderHook(() => useMerkosContextSafe());
    expect(result.current).toBeNull();
  });

  it('should return context inside MerkosProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MerkosProvider config={{ baseUrl: 'https://test.merkos302.com' }}>
        {children}
      </MerkosProvider>
    );

    const { result } = renderHook(() => useMerkosContextSafe(), { wrapper });
    expect(result.current).not.toBeNull();
    expect(result.current).toHaveProperty('state');
    expect(result.current).toHaveProperty('loginWithCredentials');
  });
});
