/**
 * Early Message Buffer for Valu API
 *
 * Solves a critical race condition where Valu Social sends `api:ready`
 * via PostMessage BEFORE the React application finishes initializing.
 *
 * This module installs a message listener at **module load time** (i.e.
 * when the JS bundle is first evaluated), capturing any Valu API messages
 * that arrive before `ValuApi` is instantiated. When the provider later
 * calls `replayBufferedMessages()`, the buffered messages are re-dispatched
 * so `ValuApi` can process them normally.
 *
 * @example
 * ```ts
 * // The buffer starts automatically on import:
 * import { replayBufferedMessages, getBufferedMessages } from './early-message-buffer';
 *
 * // Later, after ValuApi is created:
 * const replayed = replayBufferedMessages();
 * console.log(`Replayed ${replayed} early messages`);
 * ```
 *
 * @see https://github.com/merkos-302/chabaduniverse-auth-sdk/issues/12
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A buffered PostMessage event captured before ValuApi initialization.
 */
export interface BufferedMessage {
  /** The message payload (`event.data`) */
  data: unknown;
  /** The origin of the message (`event.origin`) */
  origin: string;
  /** Timestamp when the message was captured */
  timestamp: number;
}

/**
 * Configuration for the early message buffer.
 */
export interface EarlyMessageBufferConfig {
  /** Maximum number of messages to buffer (prevents memory leaks). @default 50 */
  maxBufferSize?: number;
  /** Maximum age in ms for a buffered message to be considered replayable. @default 30000 */
  maxMessageAge?: number;
  /** Enable debug logging. @default false */
  debug?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_BUFFER_SIZE = 50;
const DEFAULT_MAX_MESSAGE_AGE = 30_000; // 30 seconds

// ============================================================================
// Module-level State
// ============================================================================

/** Buffer of captured early messages */
const earlyMessageBuffer: BufferedMessage[] = [];

/** Whether the buffer is actively capturing messages */
let isCapturing = false;

/** Whether messages have already been replayed */
let hasReplayed = false;

/** Debug mode flag */
let debugMode = false;

/** Reference to the installed listener (for cleanup) */
let installedListener: ((event: MessageEvent) => void) | null = null;

// ============================================================================
// Internal Helpers
// ============================================================================

function debugLog(message: string, ...args: unknown[]): void {
  if (debugMode && typeof console !== 'undefined') {
    console.debug(`[ValuSDK][EarlyBuffer] ${message}`, ...args);
  }
}

/**
 * Check if a PostMessage event looks like a Valu API message.
 */
function isValuMessage(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const msg = data as Record<string, unknown>;
  return msg.target === 'valuApi' || msg.name === 'api:ready';
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Start capturing early Valu API messages.
 *
 * This is called automatically when the module is first imported (if
 * `window` is available). It can also be called manually for testing or
 * re-initialization.
 *
 * @param config - Optional configuration overrides
 */
export function startCapturing(config?: EarlyMessageBufferConfig): void {
  if (isCapturing) {
    debugLog('Already capturing, ignoring startCapturing()');
    return;
  }

  const maxBufferSize = config?.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE;
  debugMode = config?.debug ?? false;

  debugLog('Starting early message capture', { maxBufferSize });

  const listener = (event: MessageEvent) => {
    if (!isCapturing) return;

    try {
      if (isValuMessage(event.data)) {
        if (earlyMessageBuffer.length >= maxBufferSize) {
          debugLog('Buffer full, dropping oldest message');
          earlyMessageBuffer.shift();
        }

        earlyMessageBuffer.push({
          data: event.data,
          origin: event.origin,
          timestamp: Date.now(),
        });

        debugLog('Buffered Valu message', {
          name: (event.data as Record<string, unknown>).name,
          bufferSize: earlyMessageBuffer.length,
        });
      }
    } catch {
      // Silently ignore malformed messages
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('message', listener);
    installedListener = listener;
    isCapturing = true;
    debugLog('Early message listener installed');
  }
}

/**
 * Stop capturing messages and remove the event listener.
 *
 * Called automatically after `replayBufferedMessages()`. Can also be
 * called manually for cleanup.
 */
export function stopCapturing(): void {
  if (!isCapturing) return;

  if (typeof window !== 'undefined' && installedListener) {
    window.removeEventListener('message', installedListener);
    installedListener = null;
  }

  isCapturing = false;
  debugLog('Early message capture stopped');
}

/**
 * Replay buffered messages by dispatching synthetic MessageEvents.
 *
 * Filters out messages that are older than `maxMessageAge` before replaying.
 * Automatically stops capturing after replay and clears the buffer.
 *
 * @param maxMessageAge - Maximum age in ms for replayable messages (default: 30000)
 * @returns The number of messages that were replayed
 */
export function replayBufferedMessages(maxMessageAge?: number): number {
  const maxAge = maxMessageAge ?? DEFAULT_MAX_MESSAGE_AGE;
  const now = Date.now();

  // Filter to only recent messages
  const replayable = earlyMessageBuffer.filter(
    (msg) => now - msg.timestamp < maxAge
  );

  debugLog('Replaying buffered messages', {
    total: earlyMessageBuffer.length,
    replayable: replayable.length,
    expired: earlyMessageBuffer.length - replayable.length,
  });

  // Stop capturing before replay to avoid re-buffering our own synthetic events
  stopCapturing();

  let replayed = 0;

  if (typeof window !== 'undefined') {
    for (const buffered of replayable) {
      try {
        const syntheticEvent = new MessageEvent('message', {
          data: buffered.data,
          origin: buffered.origin,
        });
        window.dispatchEvent(syntheticEvent);
        replayed++;
      } catch (error) {
        debugLog('Failed to replay message', error);
      }
    }
  }

  // Clear the buffer
  earlyMessageBuffer.length = 0;
  hasReplayed = true;

  debugLog(`Replayed ${replayed} messages`);
  return replayed;
}

/**
 * Get a snapshot of the current buffer contents (for debugging/testing).
 *
 * @returns A shallow copy of the buffered messages
 */
export function getBufferedMessages(): readonly BufferedMessage[] {
  return [...earlyMessageBuffer];
}

/**
 * Whether the buffer has already been replayed.
 */
export function hasBeenReplayed(): boolean {
  return hasReplayed;
}

/**
 * Whether the buffer is currently capturing messages.
 */
export function isBufferCapturing(): boolean {
  return isCapturing;
}

/**
 * Clear the buffer and reset all state. Primarily for testing.
 */
export function resetBuffer(): void {
  stopCapturing();
  earlyMessageBuffer.length = 0;
  hasReplayed = false;
  debugMode = false;
}

// ============================================================================
// Auto-start
// ============================================================================

// Start capturing immediately when this module is imported.
// This is the key to solving the race condition — the listener is installed
// at bundle evaluation time, before React initializes.
startCapturing();
