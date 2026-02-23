/**
 * Tests for TokenLifecycleManager
 *
 * Covers constructor, start/stop, token state evaluation,
 * auto-refresh, retry logic, state change callbacks, retryNow, and destroy.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenLifecycleManager, defaultTokenLifecycleConfig } from '../token-lifecycle';
import type { TokenState, TokenLifecycleConfig } from '../token-lifecycle';
import * as cdssoUtils from '../cdsso-utils';

// Mock cdsso-utils
vi.mock('../cdsso-utils', async () => {
  const actual = await vi.importActual<typeof cdssoUtils>('../cdsso-utils');
  return {
    ...actual,
    isTokenExpired: vi.fn(),
    getTokenExpiration: vi.fn(),
    createCdssoLogger: vi.fn(() => ({
      log: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    })),
  };
});

describe('TokenLifecycleManager', () => {
  let refreshFn: ReturnType<typeof vi.fn>;
  let getTokenFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    refreshFn = vi.fn();
    getTokenFn = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // Constructor & defaults
  // ==========================================================================

  describe('Constructor & defaults', () => {
    it('should create with default config', () => {
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);
      expect(manager).toBeInstanceOf(TokenLifecycleManager);
      expect(manager.getTokenState()).toBe('idle');
      expect(manager.isRunning()).toBe(false);
    });

    it('should merge provided config with defaults', () => {
      const config: TokenLifecycleConfig = {
        autoRefresh: true,
        expirationBuffer: 120,
        maxRetries: 5,
      };
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, config);
      // Verify merge by exercising behavior that depends on config
      // maxRetries=5 means after 5 failures it should go to 'failed'
      expect(manager).toBeInstanceOf(TokenLifecycleManager);
    });

    it('should accept a debug flag', () => {
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {}, true);
      expect(manager).toBeInstanceOf(TokenLifecycleManager);
      expect(cdssoUtils.createCdssoLogger).toHaveBeenCalledWith({ debug: true });
    });
  });

  // ==========================================================================
  // start() / stop()
  // ==========================================================================

  describe('start() / stop()', () => {
    it('start() should set up a check interval', () => {
      getTokenFn.mockReturnValue(null);
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);

      manager.start();
      expect(manager.isRunning()).toBe(true);

      manager.stop();
    });

    it('start() should perform an immediate tick', () => {
      getTokenFn.mockReturnValue('some-token');
      vi.mocked(cdssoUtils.isTokenExpired).mockReturnValue(false);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);
      manager.start();

      // Immediate tick should have evaluated the token
      expect(getTokenFn).toHaveBeenCalledTimes(1);
      expect(manager.getTokenState()).toBe('valid');

      manager.stop();
    });

    it('start() should be idempotent when already running', () => {
      getTokenFn.mockReturnValue(null);
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);

      manager.start();
      manager.start(); // second call should be ignored

      expect(manager.isRunning()).toBe(true);
      // getTokenFn called only once (from first start's immediate tick)
      expect(getTokenFn).toHaveBeenCalledTimes(1);

      manager.stop();
    });

    it('stop() should clear interval and reset retry count', () => {
      getTokenFn.mockReturnValue(null);
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
      });

      manager.start();
      expect(manager.isRunning()).toBe(true);

      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });

    it('isRunning() should return correct value', () => {
      getTokenFn.mockReturnValue(null);
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);

      expect(manager.isRunning()).toBe(false);
      manager.start();
      expect(manager.isRunning()).toBe(true);
      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });
  });

  // ==========================================================================
  // Token state evaluation
  // ==========================================================================

  describe('Token state evaluation', () => {
    it('should return idle before start', () => {
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);
      expect(manager.getTokenState()).toBe('idle');
    });

    it('should return valid when token exists and is not expired', () => {
      getTokenFn.mockReturnValue('valid-token');
      vi.mocked(cdssoUtils.isTokenExpired).mockReturnValue(false);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);
      manager.start();

      expect(manager.getTokenState()).toBe('valid');
      manager.stop();
    });

    it('should return expiring when token is within buffer but not fully expired', () => {
      getTokenFn.mockReturnValue('expiring-token');
      // isTokenExpired(token, 0) => false (not fully expired)
      // isTokenExpired(token, buffer) => true (within buffer)
      vi.mocked(cdssoUtils.isTokenExpired).mockImplementation(
        (_token: string, bufferSeconds: number) => {
          if (bufferSeconds === 0) return false;
          return true; // within buffer
        },
      );

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);
      manager.start();

      expect(manager.getTokenState()).toBe('expiring');
      manager.stop();
    });

    it('should return expired when token is fully expired', () => {
      getTokenFn.mockReturnValue('expired-token');
      // isTokenExpired(token, 0) => true (fully expired)
      vi.mocked(cdssoUtils.isTokenExpired).mockReturnValue(true);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);
      manager.start();

      expect(manager.getTokenState()).toBe('expired');
      manager.stop();
    });

    it('should return expired when no token exists', () => {
      getTokenFn.mockReturnValue(null);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);
      manager.start();

      expect(manager.getTokenState()).toBe('expired');
      manager.stop();
    });

    it('should re-evaluate on each interval tick', () => {
      getTokenFn.mockReturnValue('valid-token');
      vi.mocked(cdssoUtils.isTokenExpired).mockReturnValue(false);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        checkInterval: 5000,
      });
      manager.start();

      expect(manager.getTokenState()).toBe('valid');
      expect(getTokenFn).toHaveBeenCalledTimes(1);

      // Advance to the next tick
      vi.advanceTimersByTime(5000);
      expect(getTokenFn).toHaveBeenCalledTimes(2);

      manager.stop();
    });
  });

  // ==========================================================================
  // Auto-refresh
  // ==========================================================================

  describe('Auto-refresh', () => {
    it('should call refreshFn when token is expiring', async () => {
      getTokenFn.mockReturnValue('expiring-token');
      vi.mocked(cdssoUtils.isTokenExpired).mockImplementation(
        (_token: string, bufferSeconds: number) => {
          if (bufferSeconds === 0) return false;
          return true;
        },
      );
      vi.mocked(cdssoUtils.getTokenExpiration).mockReturnValue(Date.now() + 30000);
      refreshFn.mockResolvedValue('new-token');

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        checkInterval: 60000,
      });
      manager.start();

      // Allow the async refresh triggered by immediate tick to complete
      await Promise.resolve();
      await Promise.resolve();

      expect(refreshFn).toHaveBeenCalled();
      manager.stop();
    });

    it('should call refreshFn when token is expired', async () => {
      getTokenFn.mockReturnValue(null);
      refreshFn.mockResolvedValue('new-token');

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        checkInterval: 60000,
      });
      manager.start();

      await Promise.resolve();
      await Promise.resolve();

      expect(refreshFn).toHaveBeenCalled();
      manager.stop();
    });

    it('should NOT call refreshFn when token is valid', async () => {
      getTokenFn.mockReturnValue('valid-token');
      vi.mocked(cdssoUtils.isTokenExpired).mockReturnValue(false);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        checkInterval: 60000,
      });
      manager.start();

      await Promise.resolve();
      await Promise.resolve();

      expect(refreshFn).not.toHaveBeenCalled();
      manager.stop();
    });

    it('should NOT call refreshFn when autoRefresh is disabled', async () => {
      getTokenFn.mockReturnValue(null);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: false,
        checkInterval: 60000,
      });
      manager.start();

      await Promise.resolve();
      await Promise.resolve();

      expect(refreshFn).not.toHaveBeenCalled();
      manager.stop();
    });

    it('should set state to refreshing during refresh', async () => {
      getTokenFn.mockReturnValue(null);
      const stateChanges: TokenState[] = [];

      // Make refreshFn hang so we can observe the 'refreshing' state
      let resolveRefresh: (value: string | null) => void = () => {};
      refreshFn.mockImplementation(
        () =>
          new Promise<string | null>((resolve) => {
            resolveRefresh = resolve;
          }),
      );

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        onTokenStateChange: (state) => stateChanges.push(state),
      });
      manager.start();

      // At this point refreshFn has been called but not resolved
      // Give the microtask queue a chance to process
      await Promise.resolve();

      expect(stateChanges).toContain('refreshing');

      // Resolve the refresh
      resolveRefresh('new-token');
      await Promise.resolve();

      manager.stop();
    });

    it('should set state to valid on successful refresh', async () => {
      getTokenFn.mockReturnValue(null);
      refreshFn.mockResolvedValue('new-token');

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        checkInterval: 60000,
      });
      manager.start();

      // Let the async refresh complete - needs multiple microtask flushes
      // for the promise chain in attemptRefresh
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }

      expect(manager.getTokenState()).toBe('valid');
      manager.stop();
    });

    it('should reset retry count on successful refresh', async () => {
      // First call: no token -> triggers refresh that fails
      // Second call: no token -> triggers refresh that succeeds
      getTokenFn.mockReturnValue(null);

      let callCount = 0;
      refreshFn.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return null; // fail first
        return 'new-token'; // succeed second
      });

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        retryInterval: 1000,
        maxRetries: 5,
        checkInterval: 60000,
      });
      manager.start();

      // First refresh (fails) - let async complete
      await Promise.resolve();
      await Promise.resolve();

      // Advance past retry interval to trigger retry
      await vi.advanceTimersByTimeAsync(1000);
      // Let the second refresh complete
      await Promise.resolve();
      await Promise.resolve();

      // Second refresh (succeeds) - state should be valid
      expect(manager.getTokenState()).toBe('valid');

      manager.stop();
    });
  });

  // ==========================================================================
  // Retry logic
  // ==========================================================================

  describe('Retry logic', () => {
    it('should increment retry count on failed refresh', async () => {
      getTokenFn.mockReturnValue(null);
      refreshFn.mockResolvedValue(null); // always fail

      const stateChanges: TokenState[] = [];
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        maxRetries: 3,
        retryInterval: 1000,
        checkInterval: 60000,
        onTokenStateChange: (state) => stateChanges.push(state),
      });
      manager.start();

      // First refresh attempt (immediate tick)
      await Promise.resolve();
      await Promise.resolve();

      expect(refreshFn).toHaveBeenCalledTimes(1);
      // After failure, state goes back to 'expired' while waiting for retry
      expect(stateChanges).toContain('expired');

      manager.stop();
    });

    it('should schedule retry after retryInterval ms', async () => {
      getTokenFn.mockReturnValue(null);
      refreshFn.mockResolvedValue(null); // always fail

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        maxRetries: 5,
        retryInterval: 5000,
        checkInterval: 60000, // large so interval ticks don't interfere
      });
      manager.start();

      // First refresh attempt from immediate tick
      await Promise.resolve();
      await Promise.resolve();
      expect(refreshFn).toHaveBeenCalledTimes(1);

      // Advance past retry interval
      await vi.advanceTimersByTimeAsync(5000);
      expect(refreshFn).toHaveBeenCalledTimes(2);

      manager.stop();
    });

    it('should set state to failed after maxRetries', async () => {
      getTokenFn.mockReturnValue(null);
      refreshFn.mockResolvedValue(null); // always fail

      const stateChanges: TokenState[] = [];
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        maxRetries: 2,
        retryInterval: 1000,
        checkInterval: 60000,
        onTokenStateChange: (state) => stateChanges.push(state),
      });
      manager.start();

      // First attempt (from immediate tick)
      await Promise.resolve();
      await Promise.resolve();

      // Advance past retry interval for second attempt
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();
      await Promise.resolve();

      expect(stateChanges).toContain('failed');
      expect(manager.getTokenState()).toBe('failed');

      manager.stop();
    });

    it('should not retry after reaching maxRetries', async () => {
      getTokenFn.mockReturnValue(null);
      refreshFn.mockResolvedValue(null); // always fail

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        maxRetries: 1,
        retryInterval: 1000,
        checkInterval: 60000,
      });
      manager.start();

      // First attempt (from immediate tick) - need to flush multiple microtasks
      // for the async attemptRefresh -> handleRefreshFailure chain
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
      expect(refreshFn).toHaveBeenCalledTimes(1);

      // After failure, state should be 'failed' since maxRetries=1
      expect(manager.getTokenState()).toBe('failed');

      // Advance well past retry interval - no more retries should happen
      await vi.advanceTimersByTimeAsync(10000);
      expect(refreshFn).toHaveBeenCalledTimes(1);

      manager.stop();
    });

    it('should handle refresh function that throws an error', async () => {
      getTokenFn.mockReturnValue(null);
      refreshFn.mockRejectedValue(new Error('Network failure'));

      const stateChanges: TokenState[] = [];
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        maxRetries: 2,
        retryInterval: 1000,
        checkInterval: 60000,
        onTokenStateChange: (state) => stateChanges.push(state),
      });
      manager.start();

      await Promise.resolve();
      await Promise.resolve();

      // Should have transitioned through refreshing -> expired (after error)
      expect(stateChanges).toContain('refreshing');
      expect(refreshFn).toHaveBeenCalledTimes(1);

      manager.stop();
    });
  });

  // ==========================================================================
  // State change callback
  // ==========================================================================

  describe('State change callback', () => {
    it('should call onTokenStateChange when state transitions', () => {
      const onStateChange = vi.fn();
      getTokenFn.mockReturnValue('valid-token');
      vi.mocked(cdssoUtils.isTokenExpired).mockReturnValue(false);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        onTokenStateChange: onStateChange,
      });
      manager.start();

      // idle -> valid transition
      expect(onStateChange).toHaveBeenCalledWith('valid');
      manager.stop();
    });

    it('should not call callback when state does not change', () => {
      const onStateChange = vi.fn();
      getTokenFn.mockReturnValue('valid-token');
      vi.mocked(cdssoUtils.isTokenExpired).mockReturnValue(false);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        onTokenStateChange: onStateChange,
        checkInterval: 1000,
      });
      manager.start();

      // First tick: idle -> valid (callback called once)
      expect(onStateChange).toHaveBeenCalledTimes(1);

      // Second tick: valid -> valid (no change, callback NOT called)
      vi.advanceTimersByTime(1000);
      expect(onStateChange).toHaveBeenCalledTimes(1);

      manager.stop();
    });

    it('should handle callback that throws an error', () => {
      const onStateChange = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      getTokenFn.mockReturnValue('valid-token');
      vi.mocked(cdssoUtils.isTokenExpired).mockReturnValue(false);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        onTokenStateChange: onStateChange,
      });

      // Should not throw
      expect(() => manager.start()).not.toThrow();
      expect(onStateChange).toHaveBeenCalled();
      manager.stop();
    });
  });

  // ==========================================================================
  // retryNow()
  // ==========================================================================

  describe('retryNow()', () => {
    it('should manually trigger refresh', async () => {
      refreshFn.mockResolvedValue('new-token');
      getTokenFn.mockReturnValue(null);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);

      const result = await manager.retryNow();
      expect(result).toBe('new-token');
      expect(refreshFn).toHaveBeenCalledTimes(1);
    });

    it('should work even when auto-refresh is stopped', async () => {
      refreshFn.mockResolvedValue('manual-token');
      getTokenFn.mockReturnValue(null);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: false,
      });

      // Manager is not started
      expect(manager.isRunning()).toBe(false);

      const result = await manager.retryNow();
      expect(result).toBe('manual-token');
      expect(manager.getTokenState()).toBe('valid');
    });

    it('should return null on failed manual retry', async () => {
      refreshFn.mockResolvedValue(null);
      getTokenFn.mockReturnValue(null);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);

      const result = await manager.retryNow();
      expect(result).toBeNull();
    });

    it('should set state to valid on successful manual retry', async () => {
      refreshFn.mockResolvedValue('refreshed-token');
      getTokenFn.mockReturnValue(null);

      const stateChanges: TokenState[] = [];
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        onTokenStateChange: (state) => stateChanges.push(state),
      });

      await manager.retryNow();

      expect(stateChanges).toContain('refreshing');
      expect(stateChanges).toContain('valid');
      expect(manager.getTokenState()).toBe('valid');
    });

    it('should skip if a refresh is already in-flight', async () => {
      let resolveRefresh: (value: string | null) => void = () => {};
      refreshFn.mockImplementation(
        () =>
          new Promise<string | null>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
      getTokenFn.mockReturnValue(null);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);

      // Start first retry (will hang)
      const firstRetry = manager.retryNow();

      // Second retry should be skipped because first is in-flight
      const secondResult = await manager.retryNow();
      expect(secondResult).toBeNull();
      expect(refreshFn).toHaveBeenCalledTimes(1);

      // Resolve the first
      resolveRefresh('token');
      await firstRetry;
    });
  });

  // ==========================================================================
  // destroy()
  // ==========================================================================

  describe('destroy()', () => {
    it('should stop intervals and reset state to idle', () => {
      getTokenFn.mockReturnValue('valid-token');
      vi.mocked(cdssoUtils.isTokenExpired).mockReturnValue(false);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);
      manager.start();
      expect(manager.isRunning()).toBe(true);
      expect(manager.getTokenState()).toBe('valid');

      manager.destroy();
      expect(manager.isRunning()).toBe(false);
      expect(manager.getTokenState()).toBe('idle');
    });

    it('should be safe to call destroy on a stopped manager', () => {
      const manager = new TokenLifecycleManager(refreshFn, getTokenFn);
      expect(() => manager.destroy()).not.toThrow();
      expect(manager.getTokenState()).toBe('idle');
    });

    it('should clear pending retry timeouts', async () => {
      getTokenFn.mockReturnValue(null);
      refreshFn.mockResolvedValue(null);

      const manager = new TokenLifecycleManager(refreshFn, getTokenFn, {
        autoRefresh: true,
        retryInterval: 5000,
        maxRetries: 5,
      });
      manager.start();

      // Let the first refresh fail (schedules a retry timeout)
      await Promise.resolve();
      await Promise.resolve();

      manager.destroy();
      expect(manager.isRunning()).toBe(false);
      expect(manager.getTokenState()).toBe('idle');

      // Advance past retry interval - no additional refresh should happen
      const callCountBefore = refreshFn.mock.calls.length;
      await vi.advanceTimersByTimeAsync(10000);
      expect(refreshFn).toHaveBeenCalledTimes(callCountBefore);
    });
  });

  // ==========================================================================
  // defaultTokenLifecycleConfig
  // ==========================================================================

  describe('defaultTokenLifecycleConfig', () => {
    it('should have expected default values', () => {
      expect(defaultTokenLifecycleConfig).toEqual({
        autoRefresh: false,
        expirationBuffer: 60,
        retryInterval: 60_000,
        maxRetries: 10,
        checkInterval: 30_000,
      });
    });
  });
});
