/**
 * Tests for useMerkosAuth hook (3-step fallback orchestrator)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMerkosAuth } from '../useMerkosAuth';
import * as cdssoUtils from '../../cdsso/cdsso-utils';
import * as cdssoClient from '../../cdsso/cdsso-client';
import * as popupAuth from '../popup-auth';

// Mock dependencies
vi.mock('../../cdsso/cdsso-utils', async () => {
  const actual = await vi.importActual<typeof cdssoUtils>('../../cdsso/cdsso-utils');
  return {
    ...actual,
    getStoredToken: vi.fn(() => null),
    removeToken: vi.fn(),
    isTokenExpired: vi.fn(() => true),
    storeToken: vi.fn(),
    isLocalStorageAvailable: vi.fn(() => true),
  };
});

vi.mock('../../cdsso/cdsso-client', () => {
  const mockClient = {
    authenticate: vi.fn(() => Promise.resolve(null)),
    getBearerToken: vi.fn(() => null),
  };
  return {
    getDefaultCdssoClient: vi.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

vi.mock('../popup-auth', () => ({
  openAuthPopup: vi.fn(),
}));

// Helper to get the mock CDSSO client
function getMockCdssoClient() {
  return (cdssoClient as unknown as { __mockClient: {
    authenticate: ReturnType<typeof vi.fn>;
    getBearerToken: ReturnType<typeof vi.fn>;
  } }).__mockClient;
}

describe('useMerkosAuth', () => {
  const MOCK_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test.sig';
  const AUTH_URL = 'https://auth.chabaduniverse.com/merkos/login';

  let mockCleanup: ReturnType<typeof vi.fn>;
  let resolvePopup: (value: string) => void;
  let rejectPopup: (reason: Error) => void;

  // Helpers for iframe simulation
  function simulateIframe() {
    Object.defineProperty(window, 'self', { value: {}, writable: true, configurable: true });
    Object.defineProperty(window, 'top', { value: window, writable: true, configurable: true });
    Object.defineProperty(document, 'referrer', {
      value: 'https://portal.chabaduniverse.com/',
      writable: true,
      configurable: true,
    });
  }

  function simulateNonIframe() {
    const w = window;
    Object.defineProperty(window, 'self', { value: w, writable: true, configurable: true });
    Object.defineProperty(window, 'top', { value: w, writable: true, configurable: true });
    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true,
      configurable: true,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockCleanup = vi.fn();
    (popupAuth.openAuthPopup as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const promise = new Promise<string>((resolve, reject) => {
        resolvePopup = resolve;
        rejectPopup = reject;
      });
      return { promise, cleanup: mockCleanup };
    });

    // Default: simulate iframe
    simulateIframe();
  });

  afterEach(() => {
    simulateNonIframe();
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Iframe guard
  // ========================================================================

  it('should return idle state when not in iframe', () => {
    simulateNonIframe();
    const { result } = renderHook(() => useMerkosAuth());

    expect(result.current.isIframe).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAuthenticating).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('should not trigger any side effects when not in iframe', () => {
    simulateNonIframe();
    renderHook(() => useMerkosAuth());

    expect(cdssoUtils.getStoredToken).not.toHaveBeenCalled();
    expect(cdssoClient.getDefaultCdssoClient).not.toHaveBeenCalled();
    expect(popupAuth.openAuthPopup).not.toHaveBeenCalled();
  });

  it('should have noop login/logout/reconnect when not in iframe', () => {
    simulateNonIframe();
    const { result } = renderHook(() => useMerkosAuth());

    // These should not throw
    act(() => {
      result.current.login();
      result.current.logout();
      result.current.reconnect();
    });

    expect(cdssoUtils.getStoredToken).not.toHaveBeenCalled();
  });

  // ========================================================================
  // Step 1: Cache hit
  // ========================================================================

  it('should use cached token when valid (Step 1)', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(MOCK_TOKEN);
    (cdssoUtils.isTokenExpired as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const onAuthenticated = vi.fn();
    const { result } = renderHook(() =>
      useMerkosAuth({ onAuthenticated }),
    );

    // Wait for the auto-run effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.token).toBe(MOCK_TOKEN);
    expect(result.current.method).toBe('cached');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAuthenticating).toBe(false);
    expect(onAuthenticated).toHaveBeenCalledWith(MOCK_TOKEN, 'cached');
  });

  // ========================================================================
  // Step 1 expired → Step 2
  // ========================================================================

  it('should fall through to Step 2 when cached token is expired', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(MOCK_TOKEN);
    (cdssoUtils.isTokenExpired as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue({ id: '1', email: 'test@test.com', name: 'Test' });
    mockClient.getBearerToken.mockReturnValue('cdsso-token');

    const { result } = renderHook(() => useMerkosAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.token).toBe('cdsso-token');
    expect(result.current.method).toBe('cdsso');
  });

  // ========================================================================
  // Step 2: CDSSO success
  // ========================================================================

  it('should authenticate via CDSSO (Step 2)', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue({ id: '1', email: 'test@test.com', name: 'Test' });
    mockClient.getBearerToken.mockReturnValue('cdsso-token');

    const onAuthenticated = vi.fn();
    const { result } = renderHook(() =>
      useMerkosAuth({ onAuthenticated }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.token).toBe('cdsso-token');
    expect(result.current.method).toBe('cdsso');
    expect(result.current.isAuthenticated).toBe(true);
    expect(onAuthenticated).toHaveBeenCalledWith('cdsso-token', 'cdsso');
  });

  // ========================================================================
  // Step 2 failure → Step 3
  // ========================================================================

  it('should fall through to Step 3 auto popup when CDSSO fails', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useMerkosAuth({ reconnectMode: 'auto' }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Step 3 auto uses authUrl (login), not reconnectUrl
    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      AUTH_URL,
      'https://auth.chabaduniverse.com',
      'merkos_auth_token',
    );
    expect(result.current.isAuthenticating).toBe(true);

    // Resolve popup
    await act(async () => {
      resolvePopup('popup-token');
    });

    expect(result.current.token).toBe('popup-token');
    expect(result.current.method).toBe('popup');
    expect(result.current.isAuthenticated).toBe(true);
  });

  // ========================================================================
  // Step 3 manual mode
  // ========================================================================

  it('should set needsReconnect=true when reconnectMode is manual', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useMerkosAuth({ reconnectMode: 'manual' }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.needsReconnect).toBe(true);
    expect(result.current.isAuthenticating).toBe(false);
    expect(popupAuth.openAuthPopup).not.toHaveBeenCalled();
  });

  it('should open popup when reconnect() is called in manual mode', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useMerkosAuth({ reconnectMode: 'manual' }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.needsReconnect).toBe(true);

    act(() => {
      result.current.reconnect();
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalled();
    expect(result.current.isAuthenticating).toBe(true);

    await act(async () => {
      resolvePopup('reconnect-token');
    });

    expect(result.current.token).toBe('reconnect-token');
    expect(result.current.method).toBe('popup');
    expect(result.current.needsReconnect).toBe(false);
  });

  // ========================================================================
  // authUrl option
  // ========================================================================

  it('should use custom authUrl for Step 3 auto popup', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue(null);

    const customAuthUrl = 'https://test-auth.chabaduniverse.com/merkos/login';

    renderHook(() =>
      useMerkosAuth({ reconnectMode: 'auto', authUrl: customAuthUrl }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      customAuthUrl,
      'https://test-auth.chabaduniverse.com',
      'merkos_auth_token',
    );
  });

  it('should use reconnectUrl (not authUrl) for manual reconnect popup', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue(null);

    const customAuthUrl = 'https://test-auth.chabaduniverse.com/merkos/login';
    const customReconnectUrl = 'https://test-auth.chabaduniverse.com/merkos/reconnect';

    const { result } = renderHook(() =>
      useMerkosAuth({
        reconnectMode: 'manual',
        authUrl: customAuthUrl,
        reconnectUrl: customReconnectUrl,
      }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.needsReconnect).toBe(true);
    expect(popupAuth.openAuthPopup).not.toHaveBeenCalled();

    act(() => {
      result.current.reconnect();
    });

    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      customReconnectUrl,
      'https://test-auth.chabaduniverse.com',
      'merkos_auth_token',
    );
  });

  it('should derive expectedOrigin from authUrl and reconnectUrl independently', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue(null);

    // Different hosts for auth vs reconnect
    const customAuthUrl = 'https://auth-a.example.com/login';
    const customReconnectUrl = 'https://auth-b.example.com/reconnect';

    const { result } = renderHook(() =>
      useMerkosAuth({
        reconnectMode: 'manual',
        authUrl: customAuthUrl,
        reconnectUrl: customReconnectUrl,
      }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Step 3 auto didn't fire (manual mode), trigger reconnect
    act(() => {
      result.current.reconnect();
    });

    // reconnect should use reconnectUrl's origin
    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      customReconnectUrl,
      'https://auth-b.example.com',
      'merkos_auth_token',
    );
  });

  it('should use explicit expectedOrigin for both auth and reconnect popups', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue(null);

    const customOrigin = 'https://custom-origin.example.com';

    renderHook(() =>
      useMerkosAuth({
        reconnectMode: 'auto',
        authUrl: 'https://test-auth.chabaduniverse.com/merkos/login',
        expectedOrigin: customOrigin,
      }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Auth popup should use the explicit expectedOrigin, not derived from authUrl
    expect(popupAuth.openAuthPopup).toHaveBeenCalledWith(
      'https://test-auth.chabaduniverse.com/merkos/login',
      customOrigin,
      'merkos_auth_token',
    );
  });

  // ========================================================================
  // Popup cancel
  // ========================================================================

  it('should handle popup cancel gracefully', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useMerkosAuth({ reconnectMode: 'auto' }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      rejectPopup(new Error('popup_closed'));
    });

    // popup_closed is not treated as an error
    expect(result.current.error).toBeNull();
    expect(result.current.isAuthenticating).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  // ========================================================================
  // Logout
  // ========================================================================

  it('should clear token and reset state on logout', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(MOCK_TOKEN);
    (cdssoUtils.isTokenExpired as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { result } = renderHook(() => useMerkosAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(cdssoUtils.removeToken).toHaveBeenCalledWith('merkos_auth_token');
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.method).toBeNull();
  });

  // ========================================================================
  // onAuthenticated callback
  // ========================================================================

  it('should call onAuthenticated with correct method for popup', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockResolvedValue(null);

    const onAuthenticated = vi.fn();
    renderHook(() =>
      useMerkosAuth({ reconnectMode: 'auto', onAuthenticated }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      resolvePopup('popup-token');
    });

    expect(onAuthenticated).toHaveBeenCalledWith('popup-token', 'popup');
  });

  // ========================================================================
  // Error handling
  // ========================================================================

  it('should set error when CDSSO throws and popup fails', async () => {
    (cdssoUtils.getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const mockClient = getMockCdssoClient();
    mockClient.authenticate.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() =>
      useMerkosAuth({ reconnectMode: 'auto' }),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // After CDSSO failure, popup should be opened
    expect(popupAuth.openAuthPopup).toHaveBeenCalled();

    await act(async () => {
      rejectPopup(new Error('popup_blocked'));
    });

    expect(result.current.error).toBe('popup_blocked');
    expect(result.current.isAuthenticating).toBe(false);
  });
});
