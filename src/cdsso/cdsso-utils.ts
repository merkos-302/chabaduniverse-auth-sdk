/**
 * CDSSO Utility Functions
 *
 * Provides utility functions for:
 * - Token storage (localStorage, cookies)
 * - Cookie management
 * - Debug logging
 *
 * @see types.ts for type definitions
 */

import type { CdssoMerkosConfig } from './types';
import { defaultMerkosConfig } from './types';

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const testKey = '__cdsso_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a token from localStorage
 *
 * @param key - Storage key
 * @returns Token string or null
 */
export function getStoredToken(key: string = defaultMerkosConfig.storageKey): string | null {
  if (!isLocalStorageAvailable()) return null;

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Store a token in localStorage
 *
 * @param token - Token to store
 * @param key - Storage key
 */
export function storeToken(token: string, key: string = defaultMerkosConfig.storageKey): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.setItem(key, token);
  } catch {
    // Storage might be full or blocked
  }
}

/**
 * Remove a token from localStorage
 *
 * @param key - Storage key
 */
export function removeToken(key: string = defaultMerkosConfig.storageKey): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

// ============================================================================
// Cookie Helpers
// ============================================================================

/**
 * Check if cookies are available
 */
export function areCookiesAvailable(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    return typeof document.cookie === 'string';
  } catch {
    return false;
  }
}

/**
 * Get a cookie value by name
 *
 * @param name - Cookie name
 * @returns Cookie value or null
 */
export function getCookie(name: string): string | null {
  if (!areCookiesAvailable()) return null;

  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieName, ...rest] = cookie.split('=');
      if (cookieName && cookieName.trim() === name) {
        return rest.join('=').trim();
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a cookie exists
 *
 * @param name - Cookie name
 * @returns true if cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

/**
 * Check if the x-auth-token cookie is present
 *
 * @param cookieName - Cookie name to check (default: 'x-auth-token')
 * @returns true if cookie exists
 */
export function hasAuthCookie(cookieName: string = defaultMerkosConfig.cookieName): boolean {
  return hasCookie(cookieName);
}

// ============================================================================
// State Validation Helpers
// ============================================================================

/**
 * Generate a random state value for CSRF protection
 *
 * @param length - Length of the state string
 * @returns Random state string
 */
export function generateState(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      const randomValue = randomValues[i];
      if (randomValue !== undefined) {
        result += chars[randomValue % chars.length];
      }
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return result;
}

/**
 * Store state value for later validation
 *
 * @param state - State value to store
 * @param key - Storage key prefix
 */
export function storeState(state: string, key: string = 'cdsso_state'): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.setItem(key, state);
  } catch {
    // Ignore errors
  }
}

/**
 * Validate and consume a state value
 *
 * @param state - State value to validate
 * @param key - Storage key prefix
 * @returns true if state is valid
 */
export function validateState(state: string, key: string = 'cdsso_state'): boolean {
  if (!isLocalStorageAvailable()) return false;

  try {
    const storedState = localStorage.getItem(key);
    if (storedState === state) {
      // Consume the state (one-time use)
      localStorage.removeItem(key);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================================
// URL Helpers
// ============================================================================

/**
 * Parse URL parameters
 *
 * @param search - URL search string (e.g., "?token=abc&state=xyz")
 * @returns Object with parsed parameters
 */
export function parseUrlParams(search: string = ''): Record<string, string> {
  const params: Record<string, string> = {};
  const searchStr = search.startsWith('?') ? search.slice(1) : search;

  if (!searchStr) return params;

  const pairs = searchStr.split('&');
  for (const pair of pairs) {
    const [key, ...rest] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(rest.join('=') || '');
    }
  }

  return params;
}

/**
 * Check if the current URL indicates a CDSSO callback
 *
 * @param params - URL parameters to check
 * @returns true if this is a CDSSO callback
 */
export function isCdssoCallback(params?: Record<string, string>): boolean {
  const urlParams = params ?? parseUrlParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  return Boolean(urlParams['cdsso_token'] || urlParams['sso_callback']);
}

/**
 * Build a CDSSO redirect URL
 *
 * @param baseUrl - Base URL for the SSO endpoint
 * @param params - Additional parameters to include
 * @returns Full redirect URL
 */
export function buildCdssoUrl(
  baseUrl: string,
  params: Record<string, string> = {}
): string {
  const url = new URL(baseUrl);

  // Add state for CSRF protection
  const state = generateState();
  storeState(state);
  url.searchParams.set('state', state);

  // Add return URL
  if (typeof window !== 'undefined') {
    url.searchParams.set('return_url', window.location.href);
  }

  // Add any additional params
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

// ============================================================================
// Logging Helpers
// ============================================================================

/**
 * Create a CDSSO logger
 *
 * @param config - Merkos config (uses debug flag)
 * @returns Logger object
 */
export function createCdssoLogger(config?: Partial<CdssoMerkosConfig>) {
  const isDebug = config?.debug ?? defaultMerkosConfig.debug;

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (isDebug) {
        console.debug(`[CDSSO] ${message}`, ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      console.info(`[CDSSO] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`[CDSSO] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`[CDSSO] ${message}`, ...args);
    },
    log: (message: string, ...args: unknown[]) => {
      console.log(`[CDSSO] ${message}`, ...args);
    },
  };
}

/**
 * Default CDSSO logger
 */
export const cdssoLogger = createCdssoLogger();

// ============================================================================
// Token Helpers
// ============================================================================

/**
 * Decode a JWT token payload (without verification)
 *
 * @param token - JWT token string
 * @returns Decoded payload or null
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadB64 = parts[1];
    if (!payloadB64) return null;

    // Handle URL-safe base64
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const jsonString = atob(base64 + padding);

    return JSON.parse(jsonString) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired
 *
 * @param token - JWT token string
 * @param bufferSeconds - Extra seconds to consider as buffer (default: 60)
 * @returns true if token is expired or invalid
 */
export function isTokenExpired(token: string, bufferSeconds: number = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;

  const exp = payload['exp'];
  if (typeof exp !== 'number') return true;

  // exp is in seconds, Date.now() is in ms
  const expiresAt = exp * 1000;
  const now = Date.now();
  const buffer = bufferSeconds * 1000;

  return now >= expiresAt - buffer;
}

/**
 * Get the expiration time of a JWT token
 *
 * @param token - JWT token string
 * @returns Expiration timestamp in ms, or null if invalid
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const exp = payload['exp'];
  if (typeof exp !== 'number') return null;

  return exp * 1000;
}
