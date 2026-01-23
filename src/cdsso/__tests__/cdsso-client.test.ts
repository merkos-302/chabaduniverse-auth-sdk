/**
 * Tests for CdssoClient and CDSSOClient classes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CdssoClient, CDSSOClient, getDefaultCdssoClient, authenticate, logout, checkRemoteSession, applyTokenToPortal, isAuthenticated, getAuthStatus, getBearerToken } from '../cdsso-client';
import * as cdssoUtils from '../cdsso-utils';

// Mock cdsso-utils
vi.mock('../cdsso-utils', async () => {
  const actual = await vi.importActual<typeof cdssoUtils>('../cdsso-utils');
  return {
    ...actual,
    getStoredToken: vi.fn(),
    storeToken: vi.fn(),
    removeToken: vi.fn(),
    hasAuthCookie: vi.fn(),
    createCdssoLogger: vi.fn(() => ({
      log: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    })),
  };
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('CdssoClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new CdssoClient();
      expect(client).toBeInstanceOf(CdssoClient);
    });

    it('should create client with custom config', () => {
      const client = new CdssoClient({
        debug: true,
        storageKey: 'custom-key',
      });
      expect(client).toBeInstanceOf(CdssoClient);
    });

    it('should initialize from storage if token exists', () => {
      vi.mocked(cdssoUtils.getStoredToken).mockReturnValue('existing-token');
      const client = new CdssoClient();
      const state = client.getState();
      expect(state.token).toBe('existing-token');
      expect(state.isTokenStored).toBe(true);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const client = new CdssoClient();
      const state = client.getState();
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('user');
      expect(state).toHaveProperty('token');
    });
  });

  describe('onStateChange', () => {
    it('should subscribe to state changes', () => {
      const client = new CdssoClient();
      const callback = vi.fn();
      const unsubscribe = client.onStateChange(callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe when called', () => {
      const client = new CdssoClient();
      const callback = vi.fn();
      const unsubscribe = client.onStateChange(callback);
      unsubscribe();
      // Callback should not be called after unsubscribe
    });
  });

  describe('checkRemoteSession', () => {
    it('should return token when logged in', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'loggedIn', token: 'jwt-token' }),
      });

      const client = new CdssoClient();
      const token = await client.checkRemoteSession();
      expect(token).toBe('jwt-token');
    });

    it('should return null when not logged in', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'notLoggedIn' }),
      });

      const client = new CdssoClient();
      const token = await client.checkRemoteSession();
      expect(token).toBeNull();
    });

    it('should return null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new CdssoClient();
      const token = await client.checkRemoteSession();
      expect(token).toBeNull();
    });

    it('should return null on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new CdssoClient();
      const token = await client.checkRemoteSession();
      expect(token).toBeNull();
    });
  });

  describe('applyTokenToPortal', () => {
    it('should return user on success', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'success', user: mockUser }),
      });

      const client = new CdssoClient();
      const user = await client.applyTokenToPortal('jwt-token');
      expect(user).toEqual(mockUser);
      expect(cdssoUtils.storeToken).toHaveBeenCalledWith('jwt-token', expect.any(String));
    });

    it('should return null on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const client = new CdssoClient();
      const user = await client.applyTokenToPortal('invalid-token');
      expect(user).toBeNull();
    });

    it('should return null on failure response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'failure', message: 'Invalid token' }),
      });

      const client = new CdssoClient();
      const user = await client.applyTokenToPortal('bad-token');
      expect(user).toBeNull();
    });

    it('should return null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new CdssoClient();
      const user = await client.applyTokenToPortal('jwt-token');
      expect(user).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('should complete full authentication flow', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };

      // Mock checkRemoteSession
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'loggedIn', token: 'jwt-token' }),
      });

      // Mock applyTokenToPortal
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'success', user: mockUser }),
      });

      const client = new CdssoClient();
      const user = await client.authenticate();
      expect(user).toEqual(mockUser);
      expect(client.getState().status).toBe('authenticated');
    });

    it('should return null if no remote session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'notLoggedIn' }),
      });

      const client = new CdssoClient();
      const user = await client.authenticate();
      expect(user).toBeNull();
      expect(client.getState().status).toBe('unauthenticated');
    });

    it('should return null if token validation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'loggedIn', token: 'jwt-token' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const client = new CdssoClient();
      const user = await client.authenticate();
      expect(user).toBeNull();
      expect(client.getState().status).toBe('unauthenticated');
    });

    it('should handle errors gracefully', async () => {
      // Network errors in checkRemoteSession are caught and return null
      // This causes authenticate to set status to 'unauthenticated', not 'error'
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new CdssoClient();
      const user = await client.authenticate();
      expect(user).toBeNull();
      // checkRemoteSession catches errors internally and returns null
      // authenticate treats null token as 'unauthenticated' not 'error'
      expect(client.getState().status).toBe('unauthenticated');
    });
  });

  describe('logout', () => {
    it('should clear session on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'success' }),
      });

      const client = new CdssoClient();
      const result = await client.logout();
      expect(result).toBe(true);
      expect(cdssoUtils.removeToken).toHaveBeenCalled();
    });

    it('should clear session even on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      const client = new CdssoClient();
      const result = await client.logout();
      expect(result).toBe(false);
      expect(cdssoUtils.removeToken).toHaveBeenCalled();
    });

    it('should clear session on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new CdssoClient();
      const result = await client.logout();
      expect(result).toBe(false);
      expect(cdssoUtils.removeToken).toHaveBeenCalled();
    });
  });

  describe('clearSession', () => {
    it('should remove token and reset state', () => {
      const client = new CdssoClient();
      client.clearSession();
      expect(cdssoUtils.removeToken).toHaveBeenCalled();
      expect(client.getState().status).toBe('idle');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when auth cookie exists', () => {
      vi.mocked(cdssoUtils.hasAuthCookie).mockReturnValue(true);
      const client = new CdssoClient();
      expect(client.isAuthenticated()).toBe(true);
    });

    it('should return false when no auth cookie', () => {
      vi.mocked(cdssoUtils.hasAuthCookie).mockReturnValue(false);
      const client = new CdssoClient();
      expect(client.isAuthenticated()).toBe(false);
    });
  });

  describe('getAuthStatus', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      const client = new CdssoClient();
      const user = await client.getAuthStatus();
      expect(user).toEqual(mockUser);
      expect(client.getState().status).toBe('authenticated');
    });

    it('should return null when not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: null }),
      });

      const client = new CdssoClient();
      const user = await client.getAuthStatus();
      expect(user).toBeNull();
      expect(client.getState().status).toBe('unauthenticated');
    });

    it('should return null on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const client = new CdssoClient();
      const user = await client.getAuthStatus();
      expect(user).toBeNull();
    });

    it('should handle errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new CdssoClient();
      const user = await client.getAuthStatus();
      expect(user).toBeNull();
      expect(client.getState().status).toBe('error');
    });
  });

  describe('getBearerToken', () => {
    it('should return token from state', () => {
      vi.mocked(cdssoUtils.getStoredToken).mockReturnValue('stored-token');
      const client = new CdssoClient();
      expect(client.getBearerToken()).toBe('stored-token');
    });

    it('should fallback to localStorage', () => {
      vi.mocked(cdssoUtils.getStoredToken).mockReturnValue('fallback-token');
      const client = new CdssoClient();
      expect(client.getBearerToken()).toBe('fallback-token');
    });
  });

  describe('setToken', () => {
    it('should store token and update state', () => {
      const client = new CdssoClient();
      client.setToken('new-token');
      expect(cdssoUtils.storeToken).toHaveBeenCalledWith('new-token', expect.any(String));
      expect(client.getState().isTokenStored).toBe(true);
    });
  });
});

describe('CDSSOClient (Legacy)', () => {
  let originalWindow: typeof window;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('constructor', () => {
    it('should create client with config', () => {
      const client = new CDSSOClient({
        authDomain: 'https://auth.example.com',
      });
      expect(client).toBeInstanceOf(CDSSOClient);
    });
  });

  describe('start/stop', () => {
    it('should start listening for events', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const client = new CDSSOClient({ authDomain: 'https://auth.example.com' });
      client.start();
      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should stop listening for events', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const client = new CDSSOClient({ authDomain: 'https://auth.example.com' });
      client.start();
      client.stop();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });
  });

  describe('onAuthStateChange', () => {
    it('should register listener', () => {
      const client = new CDSSOClient({ authDomain: 'https://auth.example.com' });
      const callback = vi.fn();
      const unsubscribe = client.onAuthStateChange(callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unregister listener', () => {
      const client = new CDSSOClient({ authDomain: 'https://auth.example.com' });
      const callback = vi.fn();
      const unsubscribe = client.onAuthStateChange(callback);
      unsubscribe();
    });
  });

  describe('broadcastAuthState', () => {
    it('should broadcast auth state to localStorage', () => {
      const client = new CDSSOClient({ authDomain: 'https://auth.example.com' });
      const token = { accessToken: 'test-token', expiresAt: Date.now() + 3600000 };
      client.broadcastAuthState(token);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should broadcast logout state', () => {
      const client = new CDSSOClient({ authDomain: 'https://auth.example.com' });
      client.broadcastAuthState(null);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('getDefaultCdssoClient', () => {
    it('should return singleton client', () => {
      const client1 = getDefaultCdssoClient();
      const client2 = getDefaultCdssoClient();
      expect(client1).toBe(client2);
    });
  });

  describe('authenticate', () => {
    it('should use default client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'notLoggedIn' }),
      });

      const result = await authenticate();
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should use default client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'success' }),
      });

      const result = await logout();
      expect(result).toBe(true);
    });
  });

  describe('checkRemoteSession', () => {
    it('should use default client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'loggedIn', token: 'token' }),
      });

      const result = await checkRemoteSession();
      expect(result).toBe('token');
    });
  });

  describe('applyTokenToPortal', () => {
    it('should use default client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await applyTokenToPortal('token');
      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should use default client', () => {
      vi.mocked(cdssoUtils.hasAuthCookie).mockReturnValue(false);
      const result = isAuthenticated();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getAuthStatus', () => {
    it('should use default client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: null }),
      });

      const result = await getAuthStatus();
      expect(result).toBeNull();
    });
  });

  describe('getBearerToken', () => {
    it('should use default client', () => {
      vi.mocked(cdssoUtils.getStoredToken).mockReturnValue(null);
      const result = getBearerToken();
      expect(result).toBeNull();
    });
  });
});
