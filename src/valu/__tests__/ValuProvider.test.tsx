/**
 * Tests for ValuProvider and context hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { ValuProvider, useValuContext, useValuContextSafe } from '../ValuProvider';
// ValuApi and Intent are mocked below
import * as valuUtils from '../valu-utils';

// Mock @arkeytyp/valu-api
vi.mock('@arkeytyp/valu-api', () => {
  return {
    ValuApi: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
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
  };
});

describe('ValuProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      render(
        <ValuProvider>
          <div data-testid="child">Child Content</div>
        </ValuProvider>
      );

      expect(screen.getByTestId('child')).toBeTruthy();
      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('should accept config prop', () => {
      render(
        <ValuProvider config={{ autoConnect: false, debug: true }}>
          <div>Child</div>
        </ValuProvider>
      );

      expect(screen.getByText('Child')).toBeTruthy();
    });

    it('should accept callback props', () => {
      const onConnectionChange = vi.fn();
      const onUserAuthenticated = vi.fn();
      const onError = vi.fn();

      render(
        <ValuProvider
          config={{ autoConnect: false }}
          onConnectionChange={onConnectionChange}
          onUserAuthenticated={onUserAuthenticated}
          onError={onError}
        >
          <div>Child</div>
        </ValuProvider>
      );

      expect(screen.getByText('Child')).toBeTruthy();
    });
  });

  describe('context value', () => {
    it('should provide initial connection state', () => {
      const TestComponent = () => {
        const context = useValuContext();
        return (
          <div>
            <span data-testid="isConnected">{context.connection.isConnected.toString()}</span>
            <span data-testid="isReady">{context.connection.isReady.toString()}</span>
            <span data-testid="isAuthenticated">{context.isAuthenticated.toString()}</span>
          </div>
        );
      };

      render(
        <ValuProvider config={{ autoConnect: false }}>
          <TestComponent />
        </ValuProvider>
      );

      expect(screen.getByTestId('isConnected').textContent).toBe('false');
      expect(screen.getByTestId('isReady').textContent).toBe('false');
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    });

    it('should provide connection actions', () => {
      const TestComponent = () => {
        const context = useValuContext();
        return (
          <div>
            <span data-testid="hasConnect">{(typeof context.connect === 'function').toString()}</span>
            <span data-testid="hasDisconnect">{(typeof context.disconnect === 'function').toString()}</span>
            <span data-testid="hasReconnect">{(typeof context.reconnect === 'function').toString()}</span>
          </div>
        );
      };

      render(
        <ValuProvider config={{ autoConnect: false }}>
          <TestComponent />
        </ValuProvider>
      );

      expect(screen.getByTestId('hasConnect').textContent).toBe('true');
      expect(screen.getByTestId('hasDisconnect').textContent).toBe('true');
      expect(screen.getByTestId('hasReconnect').textContent).toBe('true');
    });

    it('should provide intent methods', () => {
      const TestComponent = () => {
        const context = useValuContext();
        return (
          <div>
            <span data-testid="hasSendIntent">{(typeof context.sendIntent === 'function').toString()}</span>
            <span data-testid="hasCallService">{(typeof context.callService === 'function').toString()}</span>
            <span data-testid="hasOpenTextChat">{(typeof context.openTextChat === 'function').toString()}</span>
            <span data-testid="hasOpenVideoChat">{(typeof context.openVideoChat === 'function').toString()}</span>
          </div>
        );
      };

      render(
        <ValuProvider config={{ autoConnect: false }}>
          <TestComponent />
        </ValuProvider>
      );

      expect(screen.getByTestId('hasSendIntent').textContent).toBe('true');
      expect(screen.getByTestId('hasCallService').textContent).toBe('true');
      expect(screen.getByTestId('hasOpenTextChat').textContent).toBe('true');
      expect(screen.getByTestId('hasOpenVideoChat').textContent).toBe('true');
    });

    it('should provide health monitoring methods', () => {
      const TestComponent = () => {
        const context = useValuContext();
        return (
          <div>
            <span data-testid="hasHealthCheck">{(typeof context.healthCheck === 'function').toString()}</span>
            <span data-testid="hasGetHealthStatus">{(typeof context.getHealthStatus === 'function').toString()}</span>
          </div>
        );
      };

      render(
        <ValuProvider config={{ autoConnect: false }}>
          <TestComponent />
        </ValuProvider>
      );

      expect(screen.getByTestId('hasHealthCheck').textContent).toBe('true');
      expect(screen.getByTestId('hasGetHealthStatus').textContent).toBe('true');
    });

    it('should provide event handling', () => {
      const TestComponent = () => {
        const context = useValuContext();
        return (
          <div>
            <span data-testid="hasAddEventListener">{(typeof context.addEventListener === 'function').toString()}</span>
          </div>
        );
      };

      render(
        <ValuProvider config={{ autoConnect: false }}>
          <TestComponent />
        </ValuProvider>
      );

      expect(screen.getByTestId('hasAddEventListener').textContent).toBe('true');
    });
  });

  describe('sendIntent', () => {
    it('should return error when not connected', async () => {
      const TestComponent = () => {
        const context = useValuContext();
        const [result, setResult] = React.useState<{ success: boolean; error?: string } | null>(null);

        React.useEffect(() => {
          void (async () => {
            const res = await context.sendIntent('testapp', 'open');
            setResult(res);
          })();
        }, [context]);

        if (!result) return <div>Loading</div>;
        return (
          <div>
            <span data-testid="success">{result.success.toString()}</span>
            <span data-testid="error">{result.error || ''}</span>
          </div>
        );
      };

      render(
        <ValuProvider config={{ autoConnect: false }}>
          <TestComponent />
        </ValuProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('success').textContent).toBe('false');
        expect(screen.getByTestId('error').textContent).toBe('Valu API not connected');
      });
    });
  });

  describe('callService', () => {
    it('should return error when not connected', async () => {
      const TestComponent = () => {
        const context = useValuContext();
        const [result, setResult] = React.useState<{ success: boolean; error?: string } | null>(null);

        React.useEffect(() => {
          void (async () => {
            const res = await context.callService('testservice', 'action');
            setResult(res);
          })();
        }, [context]);

        if (!result) return <div>Loading</div>;
        return (
          <div>
            <span data-testid="success">{result.success.toString()}</span>
            <span data-testid="error">{result.error || ''}</span>
          </div>
        );
      };

      render(
        <ValuProvider config={{ autoConnect: false }}>
          <TestComponent />
        </ValuProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('success').textContent).toBe('false');
        expect(screen.getByTestId('error').textContent).toBe('Valu API not connected');
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return current health status', () => {
      const TestComponent = () => {
        const context = useValuContext();
        const status = context.getHealthStatus();
        return (
          <div>
            <span data-testid="health">{status.health}</span>
            <span data-testid="hasLastCheck">{(typeof status.lastCheck === 'number').toString()}</span>
          </div>
        );
      };

      render(
        <ValuProvider config={{ autoConnect: false }}>
          <TestComponent />
        </ValuProvider>
      );

      expect(screen.getByTestId('health').textContent).toBe('unknown');
      expect(screen.getByTestId('hasLastCheck').textContent).toBe('true');
    });
  });

  describe('addEventListener', () => {
    it('should return unsubscribe function', () => {
      const TestComponent = () => {
        const context = useValuContext();
        const [unsubscribeType, setUnsubscribeType] = React.useState<string>('');

        React.useEffect(() => {
          const handler = () => {};
          const unsubscribe = context.addEventListener('connection', handler);
          setUnsubscribeType(typeof unsubscribe);
        }, [context]);

        return <span data-testid="unsubscribeType">{unsubscribeType}</span>;
      };

      render(
        <ValuProvider config={{ autoConnect: false }}>
          <TestComponent />
        </ValuProvider>
      );

      expect(screen.getByTestId('unsubscribeType').textContent).toBe('function');
    });
  });
});

describe('useValuContext', () => {
  it('should throw error outside ValuProvider', () => {
    const TestComponent = () => {
      useValuContext();
      return null;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useValuContext must be used within a ValuProvider'
    );
  });
});

describe('useValuContextSafe', () => {
  it('should return null outside ValuProvider', () => {
    const { result } = renderHook(() => useValuContextSafe());
    expect(result.current).toBeNull();
  });

  it('should return context inside ValuProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ValuProvider config={{ autoConnect: false }}>
        {children}
      </ValuProvider>
    );

    const { result } = renderHook(() => useValuContextSafe(), { wrapper });
    expect(result.current).not.toBeNull();
    expect(result.current).toHaveProperty('connection');
    expect(result.current).toHaveProperty('connect');
  });
});
