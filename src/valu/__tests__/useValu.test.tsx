/**
 * Tests for useValu hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import {
  useValu,
  useValuSafe,
  isValuAvailable,
  useValuConnection,
  useValuUser,
  useValuIntents,
} from '../useValu';
import { ValuProvider } from '../ValuProvider';
// ValuApi and Intent are mocked below
import * as valuUtils from '../valu-utils';

// Mock @arkeytyp/valu-api
vi.mock('@arkeytyp/valu-api', () => {
  return {
    ValuApi: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(false),
      runConsoleCommand: vi.fn().mockResolvedValue({ result: 'ok' }),
      sendIntent: vi.fn().mockResolvedValue({ success: true }),
      callService: vi.fn().mockResolvedValue({ success: true }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    Intent: vi.fn().mockImplementation((appId: string, action: string, params: Record<string, unknown>) => ({
      applicationId: appId,
      action,
      params,
    })),
  };
});

// Mock valu-utils
vi.mock('../valu-utils', async () => {
  const actual = await vi.importActual<typeof valuUtils>('../valu-utils');
  return {
    ...actual,
    isInIframe: vi.fn(() => false),
    canPostMessageToParent: vi.fn(() => false),
    valuLogger: {
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    withTimeout: vi.fn(<T,>(promise: Promise<T>) => promise),
    isPostRunResultError: vi.fn(() => false),
    formatValuUser: vi.fn((user: { id: string; email: string; name: string }) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      provider: 'valu' as const,
      raw: user,
    })),
  };
});

// Test wrapper with ValuProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ValuProvider config={{ autoConnect: false }}>
    {children}
  </ValuProvider>
);

describe('useValu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useValu(), { wrapper });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReady).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAuthenticating).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.rawUser).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return connection state', () => {
    const { result } = renderHook(() => useValu(), { wrapper });

    expect(result.current.connectionState).toEqual({
      isInIframe: false,
      isConnected: false,
      isReady: false,
      health: 'unknown',
      error: null,
      lastSuccessfulCommunication: null,
      connectionTimeout: false,
    });
  });

  it('should provide connection actions', () => {
    const { result } = renderHook(() => useValu(), { wrapper });

    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.reconnect).toBe('function');
  });

  it('should provide API methods', () => {
    const { result } = renderHook(() => useValu(), { wrapper });

    expect(typeof result.current.sendIntent).toBe('function');
    expect(typeof result.current.callService).toBe('function');
    expect(typeof result.current.runConsoleCommand).toBe('function');
  });

  it('should provide quick actions', () => {
    const { result } = renderHook(() => useValu(), { wrapper });

    expect(typeof result.current.openTextChat).toBe('function');
    expect(typeof result.current.openVideoChat).toBe('function');
  });

  it('should provide health monitoring', () => {
    const { result } = renderHook(() => useValu(), { wrapper });

    expect(typeof result.current.healthCheck).toBe('function');
    expect(typeof result.current.getHealthStatus).toBe('function');
  });

  it('should throw error outside ValuProvider', () => {
    expect(() => renderHook(() => useValu())).toThrow(
      'useValuContext must be used within a ValuProvider'
    );
  });
});

describe('useValuSafe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(valuUtils.isInIframe).mockReturnValue(false);
  });

  it('should return isAvailable: false and isInIframe outside ValuProvider', () => {
    const { result } = renderHook(() => useValuSafe());

    expect(result.current).toEqual({
      isAvailable: false,
      isInIframe: false,
    });
  });

  it('should return isInIframe true when in iframe', () => {
    vi.mocked(valuUtils.isInIframe).mockReturnValue(true);

    const { result } = renderHook(() => useValuSafe());

    expect(result.current).toEqual({
      isAvailable: false,
      isInIframe: true,
    });
  });

  it('should return full context inside ValuProvider', () => {
    const { result } = renderHook(() => useValuSafe(), { wrapper });

    // Should have isConnected, not isAvailable
    expect('isConnected' in result.current).toBe(true);
    expect('isAvailable' in result.current).toBe(false);
  });

  it('should provide all methods inside ValuProvider', () => {
    const { result } = renderHook(() => useValuSafe(), { wrapper });

    if (isValuAvailable(result.current)) {
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.sendIntent).toBe('function');
      expect(typeof result.current.healthCheck).toBe('function');
    }
  });
});

describe('isValuAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for unavailable result', () => {
    const unavailable = { isAvailable: false as const, isInIframe: false };
    expect(isValuAvailable(unavailable)).toBe(false);
  });

  it('should return true for available result', () => {
    const { result } = renderHook(() => useValuSafe(), { wrapper });
    expect(isValuAvailable(result.current)).toBe(true);
  });

  it('should work as type guard', () => {
    const { result } = renderHook(() => useValuSafe(), { wrapper });

    if (isValuAvailable(result.current)) {
      // TypeScript should narrow the type here
      expect(result.current.isConnected).toBe(false);
      expect(typeof result.current.connect).toBe('function');
    }
  });
});

describe('useValuConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return connection state and actions', () => {
    const { result } = renderHook(() => useValuConnection(), { wrapper });

    expect(result.current.isInIframe).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReady).toBe(false);
    expect(result.current.health).toBe('unknown');
    expect(result.current.error).toBeNull();
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.reconnect).toBe('function');
    expect(typeof result.current.healthCheck).toBe('function');
    expect(typeof result.current.getHealthStatus).toBe('function');
  });

  it('should throw outside ValuProvider', () => {
    expect(() => renderHook(() => useValuConnection())).toThrow(
      'useValuContext must be used within a ValuProvider'
    );
  });
});

describe('useValuUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null user when not authenticated', () => {
    const { result } = renderHook(() => useValuUser(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.rawUser).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAuthenticating).toBe(false);
  });

  it('should throw outside ValuProvider', () => {
    expect(() => renderHook(() => useValuUser())).toThrow(
      'useValuContext must be used within a ValuProvider'
    );
  });
});

describe('useValuIntents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return intent methods', () => {
    const { result } = renderHook(() => useValuIntents(), { wrapper });

    expect(typeof result.current.sendIntent).toBe('function');
    expect(typeof result.current.callService).toBe('function');
    expect(typeof result.current.openTextChat).toBe('function');
    expect(typeof result.current.openVideoChat).toBe('function');
    expect(result.current.isReady).toBe(false);
  });

  it('should throw outside ValuProvider', () => {
    expect(() => renderHook(() => useValuIntents())).toThrow(
      'useValuContext must be used within a ValuProvider'
    );
  });
});
