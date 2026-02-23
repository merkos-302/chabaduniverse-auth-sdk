/**
 * Token Lifecycle Manager
 *
 * Handles automatic token expiration watching, refresh, and retry logic
 * for CDSSO authentication tokens.
 *
 * @example
 * ```ts
 * const manager = new TokenLifecycleManager(
 *   () => client.checkRemoteSession(),
 *   () => client.getBearerToken(),
 *   { autoRefresh: true, expirationBuffer: 120 },
 *   'merkos_auth_token',
 *   false
 * );
 *
 * manager.start();
 * // ... later
 * manager.destroy();
 * ```
 *
 * @see cdsso-client.ts for CdssoClient integration
 * @see cdsso-utils.ts for token utility functions
 */

import { isTokenExpired, getTokenExpiration, createCdssoLogger } from './cdsso-utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents the current state of a managed token.
 *
 * - `idle` — Manager has not started or no token has been evaluated yet
 * - `valid` — Token exists and is not near expiration
 * - `expiring` — Token exists but will expire within the configured buffer
 * - `expired` — Token is missing or past its expiration time
 * - `refreshing` — A refresh attempt is currently in progress
 * - `failed` — Maximum retry attempts have been exhausted
 */
export type TokenState = 'valid' | 'expiring' | 'expired' | 'refreshing' | 'failed' | 'idle';

/**
 * Configuration options for the TokenLifecycleManager.
 */
export interface TokenLifecycleConfig {
  /** Enable automatic token refresh. @default false */
  autoRefresh?: boolean;

  /** Seconds before expiry to trigger refresh. @default 60 */
  expirationBuffer?: number;

  /** Milliseconds between retry attempts on failure. @default 60000 */
  retryInterval?: number;

  /** Maximum consecutive retries before giving up. @default 10 */
  maxRetries?: number;

  /** Milliseconds between expiration checks. @default 30000 */
  checkInterval?: number;

  /** Callback when token state changes */
  onTokenStateChange?: (state: TokenState) => void;
}

// ============================================================================
// Defaults
// ============================================================================

/**
 * Default token lifecycle configuration values.
 */
export const defaultTokenLifecycleConfig = {
  autoRefresh: false,
  expirationBuffer: 60,
  retryInterval: 60_000,
  maxRetries: 10,
  checkInterval: 30_000,
} satisfies Omit<TokenLifecycleConfig, 'onTokenStateChange'>;

// ============================================================================
// TokenLifecycleManager
// ============================================================================

/**
 * Manages the lifecycle of a CDSSO authentication token.
 *
 * Periodically checks whether the current token is valid, expiring, or expired,
 * and optionally triggers automatic refresh with configurable retry logic.
 */
export class TokenLifecycleManager {
  /** Merged configuration */
  private readonly config: Required<Omit<TokenLifecycleConfig, 'onTokenStateChange'>> & { onTokenStateChange?: (state: TokenState) => void };

  /** Function that performs the actual token refresh (e.g. checkRemoteSession) */
  private readonly refreshFn: () => Promise<string | null>;

  /** Function that returns the current token (e.g. getBearerToken) */
  private readonly getTokenFn: () => string | null;

  /** Logger instance */
  private readonly logger: ReturnType<typeof createCdssoLogger>;

  /** Current token state */
  private tokenState: TokenState = 'idle';

  /** Handle for the periodic check interval */
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;

  /** Handle for the retry timeout */
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Consecutive failed refresh attempts */
  private retryCount: number = 0;

  /** Whether a refresh is currently in-flight (prevents concurrent refreshes) */
  private refreshInFlight: boolean = false;

  /**
   * Create a new TokenLifecycleManager.
   *
   * @param refreshFn - Async function that fetches a fresh token (e.g. `CdssoClient.checkRemoteSession`)
   * @param getTokenFn - Function that returns the current token (e.g. `CdssoClient.getBearerToken`)
   * @param config - Lifecycle configuration (merged with defaults)
   * @param storageKey - localStorage key for token storage
   * @param debug - Whether to enable debug logging
   */
  constructor(
    refreshFn: () => Promise<string | null>,
    getTokenFn: () => string | null,
    config: TokenLifecycleConfig = {},
    debug: boolean = false,
  ) {
    this.refreshFn = refreshFn;
    this.getTokenFn = getTokenFn;
    this.config = { ...defaultTokenLifecycleConfig, ...config };
    this.logger = createCdssoLogger({ debug });
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Start the lifecycle manager.
   *
   * Sets up a periodic interval that checks token validity every `checkInterval` ms.
   * Also performs an immediate check on start.
   */
  start(): void {
    if (this.checkIntervalId !== null) {
      this.logger.debug('TokenLifecycleManager already running, ignoring start()');
      return;
    }

    this.logger.debug('TokenLifecycleManager starting', {
      autoRefresh: this.config.autoRefresh,
      expirationBuffer: this.config.expirationBuffer,
      checkInterval: this.config.checkInterval,
    });

    // Perform an immediate check
    this.tick();

    // Set up the periodic check
    this.checkIntervalId = setInterval(() => {
      this.tick();
    }, this.config.checkInterval);
  }

  /**
   * Stop the lifecycle manager.
   *
   * Clears the periodic check interval and any pending retry timeout.
   * Resets the retry count.
   */
  stop(): void {
    this.logger.debug('TokenLifecycleManager stopping');

    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }

    this.clearRetryTimeout();
    this.retryCount = 0;
  }

  /**
   * Returns the current token state.
   */
  getTokenState(): TokenState {
    return this.tokenState;
  }

  /**
   * Whether the lifecycle manager is currently active (interval running).
   */
  isRunning(): boolean {
    return this.checkIntervalId !== null;
  }

  /**
   * Manually trigger a refresh attempt.
   *
   * Can be called regardless of current state. Resets retry count on success.
   *
   * @returns The new token string on success, or null on failure
   */
  async retryNow(): Promise<string | null> {
    this.logger.debug('Manual retry requested');
    return this.attemptRefresh();
  }

  /**
   * Stop the manager and clean up all internal references.
   *
   * After calling destroy(), the manager instance should not be reused.
   */
  destroy(): void {
    this.logger.debug('TokenLifecycleManager destroying');
    this.stop();
    this.setTokenState('idle');
  }

  // ============================================================================
  // Internal — Tick Logic
  // ============================================================================

  /**
   * Evaluate the current token and transition state accordingly.
   * Called on each interval tick and on start.
   */
  private tick(): void {
    // Skip evaluation while a refresh is already in-flight
    if (this.refreshInFlight) {
      this.logger.debug('Tick skipped — refresh in-flight');
      return;
    }

    const token = this.getTokenFn();

    // No token at all
    if (!token) {
      this.logger.debug('Tick: no token found');
      this.setTokenState('expired');
      this.handleExpiredOrExpiring();
      return;
    }

    // Token exists — check if fully expired (buffer = 0)
    if (isTokenExpired(token, 0)) {
      this.logger.debug('Tick: token is expired');
      this.setTokenState('expired');
      this.handleExpiredOrExpiring();
      return;
    }

    // Token exists — check if expiring soon (within buffer)
    if (isTokenExpired(token, this.config.expirationBuffer)) {
      const expiration = getTokenExpiration(token);
      this.logger.debug('Tick: token expiring soon', {
        expiresAt: expiration ? new Date(expiration).toISOString() : 'unknown',
      });
      this.setTokenState('expiring');
      this.handleExpiredOrExpiring();
      return;
    }

    // Token is valid
    this.logger.debug('Tick: token is valid');
    this.setTokenState('valid');
    this.retryCount = 0;
  }

  // ============================================================================
  // Internal — Refresh Logic
  // ============================================================================

  /**
   * Handle an expired or expiring token by triggering a refresh if auto-refresh
   * is enabled.
   */
  private handleExpiredOrExpiring(): void {
    if (!this.config.autoRefresh) {
      this.logger.debug('Auto-refresh disabled, skipping refresh');
      return;
    }

    // If we've already exhausted retries, stay in 'failed' state
    if (this.retryCount >= this.config.maxRetries) {
      this.logger.warn(
        `Max retries reached (${this.config.maxRetries}), not attempting refresh`,
      );
      this.setTokenState('failed');
      return;
    }

    // Trigger refresh (fire-and-forget from the tick's perspective)
    void this.attemptRefresh();
  }

  /**
   * Attempt to refresh the token by calling the provided refreshFn.
   *
   * @returns The new token on success, or null on failure
   */
  private async attemptRefresh(): Promise<string | null> {
    if (this.refreshInFlight) {
      this.logger.debug('Refresh already in-flight, skipping');
      return null;
    }

    this.refreshInFlight = true;
    this.setTokenState('refreshing');

    try {
      this.logger.debug('Attempting token refresh...');
      const newToken = await this.refreshFn();

      if (newToken) {
        this.logger.debug('Token refresh succeeded');
        this.setTokenState('valid');
        this.retryCount = 0;
        this.clearRetryTimeout();
        return newToken;
      }

      // Refresh returned null — treat as failure
      this.logger.warn('Token refresh returned null');
      return this.handleRefreshFailure();
    } catch (error) {
      this.logger.error(
        'Token refresh threw an error:',
        error instanceof Error ? error.message : String(error),
      );
      return this.handleRefreshFailure();
    } finally {
      this.refreshInFlight = false;
    }
  }

  /**
   * Handle a failed refresh attempt: increment retry count, schedule a retry
   * or transition to 'failed' state.
   *
   * @returns null (always)
   */
  private handleRefreshFailure(): null {
    this.retryCount += 1;

    if (this.retryCount >= this.config.maxRetries) {
      this.logger.error(
        `Token refresh failed after ${this.retryCount} attempts, giving up`,
      );
      this.setTokenState('failed');
      return null;
    }

    this.logger.warn(
      `Token refresh failed (attempt ${this.retryCount}/${this.config.maxRetries}), ` +
        `retrying in ${this.config.retryInterval}ms`,
    );

    // Set state back to expired (not refreshing) while we wait
    this.setTokenState('expired');

    // Schedule a retry
    this.clearRetryTimeout();
    this.retryTimeoutId = setTimeout(() => {
      this.retryTimeoutId = null;
      if (this.isRunning() && this.config.autoRefresh) {
        void this.attemptRefresh();
      }
    }, this.config.retryInterval);

    return null;
  }

  // ============================================================================
  // Internal — Helpers
  // ============================================================================

  /**
   * Transition to a new token state, invoking the callback if the state changed.
   */
  private setTokenState(newState: TokenState): void {
    if (this.tokenState === newState) return;

    const previousState = this.tokenState;
    this.tokenState = newState;

    this.logger.debug(`Token state: ${previousState} -> ${newState}`);

    if (this.config.onTokenStateChange) {
      try {
        this.config.onTokenStateChange(newState);
      } catch (error) {
        this.logger.error(
          'onTokenStateChange callback threw:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  /**
   * Clear any pending retry timeout.
   */
  private clearRetryTimeout(): void {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }
}
