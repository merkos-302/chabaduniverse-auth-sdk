/**
 * CDSSO Client - Cross-Domain Single Sign-On Client
 *
 * Provides two main capabilities:
 * 1. Merkos Platform authentication flow (checkRemoteSession, applyTokenToPortal)
 * 2. Cross-tab/domain sync via localStorage events
 *
 * @example
 * ```ts
 * // Using Merkos Platform CDSSO
 * const client = new CdssoClient();
 * const user = await client.authenticate();
 *
 * // Get bearer token for API calls
 * const token = client.getBearerToken();
 *
 * // Logout
 * await client.logout();
 * ```
 *
 * @see types.ts for type definitions
 * @see universe-portal/lib/cdsso-utils.ts for reference implementation
 */

import type {
  CdssoMerkosConfig,
  CdssoCrossDomainConfig,
  CdssoUser,
  CdssoState,
  CDSSOToken,
  CDSSOMessage,
  RemoteSessionResponse,
  PortalAuthResponse,
} from './types';
import {
  defaultMerkosConfig,
  defaultCrossDomainConfig,
  initialCdssoState,
} from './types';
import {
  getStoredToken,
  storeToken,
  removeToken,
  hasAuthCookie,
  createCdssoLogger,
} from './cdsso-utils';

// ============================================================================
// Merkos Platform CDSSO Client
// ============================================================================

/**
 * CDSSO Client for Merkos Platform authentication
 *
 * Implements two-step authentication flow:
 * 1. Retrieve authentication token from id.merkos302.com
 * 2. Validate token with portal backend and set cookies
 */
export class CdssoClient {
  private config: Required<CdssoMerkosConfig>;
  private logger: ReturnType<typeof createCdssoLogger>;
  private state: CdssoState = { ...initialCdssoState };
  private listeners: Set<(state: CdssoState) => void> = new Set();

  constructor(config: Partial<CdssoMerkosConfig> = {}) {
    this.config = { ...defaultMerkosConfig, ...config };
    this.logger = createCdssoLogger(this.config);

    // Check for existing token on construction
    this.initializeFromStorage();
  }

  /**
   * Initialize state from localStorage if token exists
   */
  private initializeFromStorage(): void {
    const storedToken = getStoredToken(this.config.storageKey);
    if (storedToken) {
      this.state = {
        ...this.state,
        token: storedToken,
        isTokenStored: true,
      };
      this.logger.debug('Initialized with stored token');
    }
  }

  /**
   * Get current authentication state
   */
  getState(): CdssoState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: CdssoState) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<CdssoState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((listener) => listener(this.state));
  }

  // ============================================================================
  // Step 1: Check Remote Session
  // ============================================================================

  /**
   * Check remote session status on id.merkos302.com
   *
   * Makes GET request to Merkos Platform's SSO remote status endpoint.
   * Browser automatically includes id.merkos302.com cookies with credentials: 'include'.
   *
   * @returns JWT token string if user is logged in, null otherwise
   */
  async checkRemoteSession(): Promise<string | null> {
    try {
      this.logger.log('Step 1: Checking remote session at id.merkos302.com...');
      this.updateState({ status: 'checking' });

      const response = await fetch(this.config.remoteEndpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error('Remote session check failed:', response.status, response.statusText);
        return null;
      }

      const data = (await response.json()) as RemoteSessionResponse;

      if (data.status === 'loggedIn' && data.token) {
        this.logger.log('Remote session active, token retrieved');
        return data.token;
      }

      this.logger.log('Remote session not logged in');
      return null;
    } catch (error) {
      this.logger.error('Error checking remote session:', error);
      return null;
    }
  }

  // ============================================================================
  // Step 2: Apply Token to Portal
  // ============================================================================

  /**
   * Apply authentication token to portal backend
   *
   * Sends JWT token to portal's SSO endpoint for validation.
   * Portal backend will:
   * 1. Verify JWT signature using Merkos Platform's JWT_SECRET_KEY
   * 2. Validate token expiration and claims
   * 3. Set x-auth-token cookie for portal domain
   * 4. Return authenticated user data
   *
   * @param token - JWT token from id.merkos302.com
   * @returns User data if token is valid, null otherwise
   */
  async applyTokenToPortal(token: string): Promise<CdssoUser | null> {
    try {
      this.logger.log('Step 2: Applying token to portal backend...');

      const response = await fetch(this.config.portalEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logger.error('Token validation failed: Unauthorized');
        } else {
          this.logger.error('Portal token application failed:', response.status, response.statusText);
        }
        return null;
      }

      const data = (await response.json()) as PortalAuthResponse;

      if (data.status === 'success' && data.user) {
        this.logger.log('Token applied successfully, user authenticated:', data.user.email);

        // Store token in localStorage
        storeToken(token, this.config.storageKey);
        this.logger.log('Token stored in localStorage');

        // Update state
        this.updateState({
          status: 'authenticated',
          user: data.user,
          token,
          isTokenStored: true,
          error: null,
          lastCheck: Date.now(),
        });

        return data.user;
      }

      this.logger.error('Portal response indicates failure:', data.message || 'Unknown error');
      return null;
    } catch (error) {
      this.logger.error('Error applying token to portal:', error);
      return null;
    }
  }

  // ============================================================================
  // Complete Authentication Flow
  // ============================================================================

  /**
   * Complete CDSSO authentication flow
   *
   * Combines both steps:
   * 1. Retrieve token from id.merkos302.com
   * 2. Validate token with portal backend and set cookie
   *
   * @returns Authenticated user data if successful, null otherwise
   */
  async authenticate(): Promise<CdssoUser | null> {
    this.logger.log('Starting authentication flow...');

    try {
      // Step 1: Get token from Merkos Platform
      const token = await this.checkRemoteSession();

      if (!token) {
        this.logger.log('Authentication failed: No token from remote session');
        this.updateState({
          status: 'unauthenticated',
          user: null,
          token: null,
          error: 'No token from remote session',
          lastCheck: Date.now(),
        });
        return null;
      }

      // Step 2: Apply token to portal
      const user = await this.applyTokenToPortal(token);

      if (user) {
        this.logger.log('Authentication complete:', user.email);
      } else {
        this.logger.log('Authentication failed: Token validation failed');
        this.updateState({
          status: 'unauthenticated',
          user: null,
          token: null,
          error: 'Token validation failed',
          lastCheck: Date.now(),
        });
      }

      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.logger.error('Authentication error:', errorMessage);
      this.updateState({
        status: 'error',
        error: errorMessage,
        lastCheck: Date.now(),
      });
      return null;
    }
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Logout from CDSSO session
   *
   * Clears authentication state on portal domain.
   * Note: This does NOT clear the session on id.merkos302.com.
   *
   * @returns true if logout successful, false otherwise
   */
  async logout(): Promise<boolean> {
    try {
      this.logger.log('Logging out...');

      const response = await fetch(this.config.logoutEndpoint, {
        method: 'POST',
        credentials: 'include',
      });

      // Clear local state regardless of server response
      this.clearSession();

      if (!response.ok) {
        this.logger.error('Logout failed:', response.status, response.statusText);
        return false;
      }

      this.logger.log('Logout successful');
      return true;
    } catch (error) {
      this.logger.error('Error during logout:', error);
      // Still clear local state
      this.clearSession();
      return false;
    }
  }

  /**
   * Clear local session data
   */
  clearSession(): void {
    removeToken(this.config.storageKey);
    this.updateState({
      ...initialCdssoState,
      lastCheck: Date.now(),
    });
    this.logger.debug('Local session cleared');
  }

  // ============================================================================
  // Status Check
  // ============================================================================

  /**
   * Check if user is currently authenticated (local check only)
   *
   * Verifies that x-auth-token cookie is present.
   * Does NOT make a network request.
   *
   * @returns true if authenticated cookie exists
   */
  isAuthenticated(): boolean {
    return hasAuthCookie(this.config.cookieName);
  }

  /**
   * Get authentication status from portal backend
   *
   * Makes API call to verify current authentication state.
   * Use this for authoritative check.
   *
   * @returns User data if authenticated, null otherwise
   */
  async getAuthStatus(): Promise<CdssoUser | null> {
    try {
      this.logger.debug('Getting auth status...');

      const response = await fetch(this.config.statusEndpoint, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        this.updateState({
          status: 'unauthenticated',
          user: null,
          lastCheck: Date.now(),
        });
        return null;
      }

      const data = (await response.json()) as PortalAuthResponse;

      if (data.user) {
        this.updateState({
          status: 'authenticated',
          user: data.user,
          lastCheck: Date.now(),
        });
      } else {
        this.updateState({
          status: 'unauthenticated',
          user: null,
          lastCheck: Date.now(),
        });
      }

      return data.user ?? null;
    } catch (error) {
      this.logger.error('Error getting auth status:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to get auth status',
        lastCheck: Date.now(),
      });
      return null;
    }
  }

  // ============================================================================
  // Token Access
  // ============================================================================

  /**
   * Get the current bearer token
   *
   * Returns the stored JWT token for use in API calls.
   *
   * @returns JWT token or null
   */
  getBearerToken(): string | null {
    // First check state
    if (this.state.token) {
      return this.state.token;
    }

    // Fallback to localStorage
    return getStoredToken(this.config.storageKey);
  }

  /**
   * Set a token manually
   *
   * @param token - JWT token to set
   */
  setToken(token: string): void {
    storeToken(token, this.config.storageKey);
    this.updateState({
      token,
      isTokenStored: true,
    });
  }
}

// ============================================================================
// Cross-Domain Sync Client (Legacy Support)
// ============================================================================

/**
 * CDSSOClient for cross-tab/domain sync
 *
 * Handles synchronization of authentication state across multiple domains
 * using localStorage events.
 *
 * @deprecated Use CdssoClient for Merkos Platform authentication.
 * This class is kept for cross-tab sync functionality.
 */
export class CDSSOClient {
  private config: Required<CdssoCrossDomainConfig>;
  private listeners: Set<(token: CDSSOToken | null) => void> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: CdssoCrossDomainConfig) {
    this.config = { ...defaultCrossDomainConfig, ...config };
  }

  /**
   * Start listening for CDSSO events
   */
  start(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', this.handleStorageEvent);

    this.intervalId = setInterval(() => {
      this.syncAuthState();
    }, this.config.syncInterval);
  }

  /**
   * Stop listening for CDSSO events
   */
  stop(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('storage', this.handleStorageEvent);

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Register a listener for auth state changes
   */
  onAuthStateChange(callback: (token: CDSSOToken | null) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Broadcast auth state to other domains
   */
  broadcastAuthState(token: CDSSOToken | null): void {
    if (typeof window === 'undefined') return;

    const message: CDSSOMessage = {
      type: token ? 'AUTH_STATE_CHANGE' : 'LOGOUT',
      payload: token,
      timestamp: Date.now(),
    };

    localStorage.setItem(
      `${this.config.storageKeyPrefix}sync`,
      JSON.stringify(message)
    );
  }

  /**
   * Handle storage events from other tabs/domains
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    if (!event.key?.startsWith(this.config.storageKeyPrefix)) return;
    if (!event.newValue) return;

    try {
      const message = JSON.parse(event.newValue) as CDSSOMessage;
      if (this.isValidCDSSOMessage(message)) {
        this.notifyListeners(message.payload);
      }
    } catch {
      // Invalid message, ignore
    }
  };

  /**
   * Type guard to validate CDSSO message structure
   */
  private isValidCDSSOMessage(value: unknown): value is CDSSOMessage {
    if (typeof value !== 'object' || value === null) return false;
    const msg = value as Record<string, unknown>;
    return (
      typeof msg['type'] === 'string' &&
      typeof msg['timestamp'] === 'number' &&
      (msg['type'] === 'AUTH_STATE_CHANGE' ||
        msg['type'] === 'TOKEN_REFRESH' ||
        msg['type'] === 'LOGOUT')
    );
  }

  /**
   * Sync auth state with localStorage
   */
  private syncAuthState(): void {
    // Cross-domain sync logic can be implemented here
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyListeners(token: CDSSOToken | null): void {
    this.listeners.forEach((listener) => listener(token));
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Default CDSSO client instance
 */
let defaultClient: CdssoClient | null = null;

/**
 * Get the default CDSSO client instance
 */
export function getDefaultCdssoClient(): CdssoClient {
  if (!defaultClient) {
    defaultClient = new CdssoClient();
  }
  return defaultClient;
}

/**
 * Shorthand for authenticate() using default client
 */
export async function authenticate(): Promise<CdssoUser | null> {
  return getDefaultCdssoClient().authenticate();
}

/**
 * Shorthand for logout() using default client
 */
export async function logout(): Promise<boolean> {
  return getDefaultCdssoClient().logout();
}

/**
 * Shorthand for checkRemoteSession() using default client
 */
export async function checkRemoteSession(): Promise<string | null> {
  return getDefaultCdssoClient().checkRemoteSession();
}

/**
 * Shorthand for applyTokenToPortal() using default client
 */
export async function applyTokenToPortal(token: string): Promise<CdssoUser | null> {
  return getDefaultCdssoClient().applyTokenToPortal(token);
}

/**
 * Shorthand for isAuthenticated() using default client
 */
export function isAuthenticated(): boolean {
  return getDefaultCdssoClient().isAuthenticated();
}

/**
 * Shorthand for getAuthStatus() using default client
 */
export async function getAuthStatus(): Promise<CdssoUser | null> {
  return getDefaultCdssoClient().getAuthStatus();
}

/**
 * Shorthand for getBearerToken() using default client
 */
export function getBearerToken(): string | null {
  return getDefaultCdssoClient().getBearerToken();
}

/**
 * Namespace export for CDSSOUtils (compatibility with universe-portal)
 */
export const CDSSOUtils = {
  checkRemoteSession,
  applyTokenToPortal,
  authenticate,
  logout,
  isAuthenticated,
  getAuthStatus,
};
