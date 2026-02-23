/**
 * Tests for Early Message Buffer
 *
 * @see src/valu/early-message-buffer.ts
 * @see https://github.com/merkos-302/chabaduniverse-auth-sdk/issues/12
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startCapturing,
  stopCapturing,
  replayBufferedMessages,
  getBufferedMessages,
  hasBeenReplayed,
  isBufferCapturing,
  resetBuffer,
} from '../early-message-buffer';

// ============================================================================
// Helpers
// ============================================================================

function dispatchValuMessage(name: string, extra?: Record<string, unknown>) {
  const event = new MessageEvent('message', {
    data: { target: 'valuApi', name, ...extra },
    origin: 'https://valu.social',
  });
  window.dispatchEvent(event);
}

function dispatchApiReadyMessage() {
  const event = new MessageEvent('message', {
    data: { name: 'api:ready', applicationId: 'test-app', action: 'open', params: {} },
    origin: 'https://valu.social',
  });
  window.dispatchEvent(event);
}

function dispatchNonValuMessage() {
  const event = new MessageEvent('message', {
    data: { type: 'other', payload: 'not-valu' },
    origin: 'https://other.com',
  });
  window.dispatchEvent(event);
}

// ============================================================================
// Tests
// ============================================================================

describe('Early Message Buffer', () => {
  beforeEach(() => {
    resetBuffer();
  });

  afterEach(() => {
    resetBuffer();
  });

  // --------------------------------------------------------------------------
  // Auto-capture behavior
  // --------------------------------------------------------------------------

  describe('startCapturing', () => {
    it('should start capturing messages', () => {
      startCapturing();
      expect(isBufferCapturing()).toBe(true);
    });

    it('should not double-start if already capturing', () => {
      startCapturing();
      startCapturing(); // Should be a no-op
      expect(isBufferCapturing()).toBe(true);
    });

    it('should buffer Valu API messages with target=valuApi', () => {
      startCapturing();
      dispatchValuMessage('some:event');

      const messages = getBufferedMessages();
      expect(messages).toHaveLength(1);
      expect((messages[0].data as Record<string, unknown>).name).toBe('some:event');
      expect(messages[0].origin).toBe('https://valu.social');
      expect(messages[0].timestamp).toBeGreaterThan(0);
    });

    it('should buffer api:ready messages (without target=valuApi)', () => {
      startCapturing();
      dispatchApiReadyMessage();

      const messages = getBufferedMessages();
      expect(messages).toHaveLength(1);
      expect((messages[0].data as Record<string, unknown>).name).toBe('api:ready');
    });

    it('should NOT buffer non-Valu messages', () => {
      startCapturing();
      dispatchNonValuMessage();

      const messages = getBufferedMessages();
      expect(messages).toHaveLength(0);
    });

    it('should buffer multiple messages in order', () => {
      startCapturing();
      dispatchValuMessage('first');
      dispatchValuMessage('second');
      dispatchApiReadyMessage();

      const messages = getBufferedMessages();
      expect(messages).toHaveLength(3);
      expect((messages[0].data as Record<string, unknown>).name).toBe('first');
      expect((messages[1].data as Record<string, unknown>).name).toBe('second');
      expect((messages[2].data as Record<string, unknown>).name).toBe('api:ready');
    });

    it('should respect maxBufferSize and drop oldest messages', () => {
      startCapturing({ maxBufferSize: 2 });
      dispatchValuMessage('first');
      dispatchValuMessage('second');
      dispatchValuMessage('third');

      const messages = getBufferedMessages();
      expect(messages).toHaveLength(2);
      expect((messages[0].data as Record<string, unknown>).name).toBe('second');
      expect((messages[1].data as Record<string, unknown>).name).toBe('third');
    });

    it('should ignore messages with non-object data', () => {
      startCapturing();
      const event = new MessageEvent('message', {
        data: 'just-a-string',
        origin: 'https://valu.social',
      });
      window.dispatchEvent(event);

      expect(getBufferedMessages()).toHaveLength(0);
    });

    it('should ignore messages with null data', () => {
      startCapturing();
      const event = new MessageEvent('message', {
        data: null,
        origin: 'https://valu.social',
      });
      window.dispatchEvent(event);

      expect(getBufferedMessages()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // stopCapturing
  // --------------------------------------------------------------------------

  describe('stopCapturing', () => {
    it('should stop capturing messages', () => {
      startCapturing();
      expect(isBufferCapturing()).toBe(true);

      stopCapturing();
      expect(isBufferCapturing()).toBe(false);
    });

    it('should not buffer messages after stopping', () => {
      startCapturing();
      stopCapturing();
      dispatchValuMessage('after-stop');

      expect(getBufferedMessages()).toHaveLength(0);
    });

    it('should be a no-op if not capturing', () => {
      stopCapturing(); // Should not throw
      expect(isBufferCapturing()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // replayBufferedMessages
  // --------------------------------------------------------------------------

  describe('replayBufferedMessages', () => {
    it('should replay buffered messages as synthetic MessageEvents', () => {
      startCapturing();
      dispatchValuMessage('api:ready');

      const handler = vi.fn();
      window.addEventListener('message', handler);

      const replayed = replayBufferedMessages();
      expect(replayed).toBe(1);
      // The handler should have received the synthetic event
      expect(handler).toHaveBeenCalledTimes(1);

      const event = handler.mock.calls[0][0] as MessageEvent;
      expect((event.data as Record<string, unknown>).name).toBe('api:ready');

      window.removeEventListener('message', handler);
    });

    it('should filter out expired messages', () => {
      startCapturing();
      dispatchValuMessage('old-message');

      // Manually age the message
      const messages = getBufferedMessages();
      (messages[0] as { timestamp: number }).timestamp = Date.now() - 60_000;

      const replayed = replayBufferedMessages(30_000);
      expect(replayed).toBe(0);
    });

    it('should clear the buffer after replay', () => {
      startCapturing();
      dispatchValuMessage('msg1');
      dispatchValuMessage('msg2');

      replayBufferedMessages();
      expect(getBufferedMessages()).toHaveLength(0);
    });

    it('should stop capturing after replay', () => {
      startCapturing();
      dispatchValuMessage('msg');

      replayBufferedMessages();
      expect(isBufferCapturing()).toBe(false);
    });

    it('should set hasBeenReplayed to true', () => {
      startCapturing();
      expect(hasBeenReplayed()).toBe(false);

      replayBufferedMessages();
      expect(hasBeenReplayed()).toBe(true);
    });

    it('should return 0 when buffer is empty', () => {
      startCapturing();
      const replayed = replayBufferedMessages();
      expect(replayed).toBe(0);
    });

    it('should replay multiple messages in order', () => {
      startCapturing();
      dispatchValuMessage('first');
      dispatchValuMessage('second');

      const received: string[] = [];
      const handler = (e: MessageEvent) => {
        if (typeof e.data === 'object' && e.data !== null && 'name' in e.data) {
          received.push((e.data as Record<string, unknown>).name as string);
        }
      };
      window.addEventListener('message', handler);

      replayBufferedMessages();
      expect(received).toEqual(['first', 'second']);

      window.removeEventListener('message', handler);
    });

    it('should not re-buffer synthetic events during replay', () => {
      startCapturing();
      dispatchValuMessage('original');

      // Replay stops capturing first, so synthetic events won't be re-buffered
      replayBufferedMessages();
      expect(getBufferedMessages()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // resetBuffer
  // --------------------------------------------------------------------------

  describe('resetBuffer', () => {
    it('should clear all state', () => {
      startCapturing();
      dispatchValuMessage('msg');
      replayBufferedMessages();

      resetBuffer();

      expect(getBufferedMessages()).toHaveLength(0);
      expect(hasBeenReplayed()).toBe(false);
      expect(isBufferCapturing()).toBe(false);
    });

    it('should allow re-starting after reset', () => {
      startCapturing();
      replayBufferedMessages();

      resetBuffer();
      startCapturing();

      expect(isBufferCapturing()).toBe(true);
      dispatchValuMessage('after-reset');
      expect(getBufferedMessages()).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // getBufferedMessages
  // --------------------------------------------------------------------------

  describe('getBufferedMessages', () => {
    it('should return a copy (not the internal buffer)', () => {
      startCapturing();
      dispatchValuMessage('msg');

      const messages1 = getBufferedMessages();
      const messages2 = getBufferedMessages();

      expect(messages1).not.toBe(messages2);
      expect(messages1).toEqual(messages2);
    });
  });

  // --------------------------------------------------------------------------
  // Integration: race condition scenario
  // --------------------------------------------------------------------------

  describe('race condition scenario', () => {
    it('should capture api:ready sent before ValuApi is created and replay it after', () => {
      // 1. Module loads, startCapturing is called automatically
      startCapturing();

      // 2. Valu Social parent sends api:ready immediately
      dispatchApiReadyMessage();

      // 3. Verify the message was buffered
      expect(getBufferedMessages()).toHaveLength(1);

      // 4. Simulate React mounting and creating ValuApi
      const handler = vi.fn();
      window.addEventListener('message', handler);

      // 5. Replay buffered messages
      const replayed = replayBufferedMessages();
      expect(replayed).toBe(1);

      // 6. ValuApi's listener should receive the synthetic event
      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as MessageEvent;
      expect((event.data as Record<string, unknown>).name).toBe('api:ready');
      expect(event.origin).toBe('https://valu.social');

      window.removeEventListener('message', handler);
    });
  });
});
