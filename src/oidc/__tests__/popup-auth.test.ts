/**
 * Tests for popup-auth utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openAuthPopup } from '../popup-auth';
import * as cdssoUtils from '../../cdsso/cdsso-utils';

// Mock cdsso-utils
vi.mock('../../cdsso/cdsso-utils', async () => {
  const actual = await vi.importActual<typeof cdssoUtils>('../../cdsso/cdsso-utils');
  return {
    ...actual,
    storeToken: vi.fn(),
    isLocalStorageAvailable: vi.fn(() => true),
  };
});

describe('openAuthPopup', () => {
  const TEST_URL = 'https://auth.chabaduniverse.com/merkos/login';
  const TEST_ORIGIN = 'https://auth.chabaduniverse.com';
  const TEST_STORAGE_KEY = 'merkos_auth_token';
  const MOCK_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test.sig';

  let mockPopup: { closed: boolean; close: ReturnType<typeof vi.fn> };
  let messageListeners: ((event: MessageEvent) => void)[];
  let originalOpen: typeof window.open;
  let mockBroadcastChannel: {
    onmessage: ((event: MessageEvent) => void) | null;
    close: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    messageListeners = [];
    mockPopup = { closed: false, close: vi.fn() };

    originalOpen = window.open;
    window.open = vi.fn(() => mockPopup as unknown as Window);

    // Capture addEventListener calls for 'message'
    const origAdd = window.addEventListener.bind(window);
    const origRemove = window.removeEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options?) => {
      if (type === 'message') {
        messageListeners.push(listener as (event: MessageEvent) => void);
      }
      origAdd(type, listener as EventListenerOrEventListenerObject, options);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options?) => {
      if (type === 'message') {
        messageListeners = messageListeners.filter((l) => l !== listener);
      }
      origRemove(type, listener as EventListenerOrEventListenerObject, options);
    });

    // Mock BroadcastChannel
    mockBroadcastChannel = {
      onmessage: null,
      close: vi.fn(),
      postMessage: vi.fn(),
    };
    (globalThis as Record<string, unknown>).BroadcastChannel = vi.fn(
      () => mockBroadcastChannel,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    window.open = originalOpen;
    vi.restoreAllMocks();
  });

  it('should open popup with correct URL and origin param', () => {
    const { cleanup } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(TEST_URL),
      'merkos_auth_popup',
      expect.stringContaining('width=500'),
    );
    // Should append origin query param
    const calledUrl = (window.open as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('origin')).toBe(window.location.origin);
    cleanup();
  });

  it('should reject when popup is blocked', async () => {
    (window.open as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const { promise } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);
    await expect(promise).rejects.toThrow('popup_blocked');
  });

  it('should resolve on postMessage with correct origin', async () => {
    const { promise } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);

    // Simulate postMessage from popup
    const event = new MessageEvent('message', {
      origin: TEST_ORIGIN,
      data: { type: 'MERKOS_AUTH_TOKEN', token: MOCK_TOKEN },
    });
    window.dispatchEvent(event);

    const result = await promise;
    expect(result).toBe(MOCK_TOKEN);
    expect(cdssoUtils.storeToken).toHaveBeenCalledWith(MOCK_TOKEN, TEST_STORAGE_KEY);
  });

  it('should ignore postMessage from wrong origin', async () => {
    const { promise, cleanup } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);

    // Wrong origin — should be ignored
    const badEvent = new MessageEvent('message', {
      origin: 'https://evil.com',
      data: { type: 'MERKOS_AUTH_TOKEN', token: 'stolen' },
    });
    window.dispatchEvent(badEvent);

    // Now close the popup to end the test
    mockPopup.closed = true;
    vi.advanceTimersByTime(600);

    await expect(promise).rejects.toThrow('popup_closed');
    expect(cdssoUtils.storeToken).not.toHaveBeenCalled();
    cleanup();
  });

  it('should resolve via BroadcastChannel fallback', async () => {
    const { promise } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);

    // Simulate BroadcastChannel message
    mockBroadcastChannel.onmessage?.({
      data: { type: 'MERKOS_AUTH_TOKEN', token: MOCK_TOKEN },
    } as MessageEvent);

    const result = await promise;
    expect(result).toBe(MOCK_TOKEN);
    expect(cdssoUtils.storeToken).toHaveBeenCalledWith(MOCK_TOKEN, TEST_STORAGE_KEY);
  });

  it('should reject when popup is closed by user', async () => {
    const { promise } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);

    mockPopup.closed = true;
    vi.advanceTimersByTime(600);

    await expect(promise).rejects.toThrow('popup_closed');
  });

  it('should store token as raw string (not JSON.stringify)', async () => {
    const { promise } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);

    const event = new MessageEvent('message', {
      origin: TEST_ORIGIN,
      data: { type: 'MERKOS_AUTH_TOKEN', token: MOCK_TOKEN },
    });
    window.dispatchEvent(event);

    await promise;
    // Verify storeToken was called with raw string, not JSON
    expect(cdssoUtils.storeToken).toHaveBeenCalledWith(MOCK_TOKEN, TEST_STORAGE_KEY);
    const storedValue = (cdssoUtils.storeToken as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(storedValue).toBe(MOCK_TOKEN);
    expect(storedValue).not.toContain('"'); // Not JSON-stringified
  });

  it('should cleanup all listeners on resolve', async () => {
    const { promise } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);

    const event = new MessageEvent('message', {
      origin: TEST_ORIGIN,
      data: { type: 'MERKOS_AUTH_TOKEN', token: MOCK_TOKEN },
    });
    window.dispatchEvent(event);

    await promise;

    expect(mockBroadcastChannel.close).toHaveBeenCalled();
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it('should cleanup all listeners on manual cleanup()', () => {
    const { cleanup } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);

    cleanup();

    expect(mockBroadcastChannel.close).toHaveBeenCalled();
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it('should only settle once even if multiple signals arrive', async () => {
    const { promise } = openAuthPopup(TEST_URL, TEST_ORIGIN, TEST_STORAGE_KEY);

    // Send token via postMessage
    const event = new MessageEvent('message', {
      origin: TEST_ORIGIN,
      data: { type: 'MERKOS_AUTH_TOKEN', token: MOCK_TOKEN },
    });
    window.dispatchEvent(event);

    // Also send via BroadcastChannel
    mockBroadcastChannel.onmessage?.({
      data: { type: 'MERKOS_AUTH_TOKEN', token: 'second-token' },
    } as MessageEvent);

    const result = await promise;
    expect(result).toBe(MOCK_TOKEN);
    // storeToken called only once
    expect(cdssoUtils.storeToken).toHaveBeenCalledTimes(1);
  });
});
