/**
 * Tests for CDSSO utility functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isLocalStorageAvailable,
  getStoredToken,
  storeToken,
  removeToken,
  areCookiesAvailable,
  getCookie,
  hasCookie,
  hasAuthCookie,
  generateState,
  storeState,
  validateState,
  parseUrlParams,
  isCdssoCallback,
  decodeJwtPayload,
  isTokenExpired,
  getTokenExpiration,
} from '../cdsso-utils';

// ============================================================================
// Storage Helpers Tests
// ============================================================================

describe('Storage Helpers', () => {
  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });
  });

  describe('getStoredToken', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should return null when no token is stored', () => {
      expect(getStoredToken()).toBeNull();
    });

    it('should return stored token', () => {
      const token = 'test-token-123';
      localStorage.setItem('merkos_auth_token', token);
      expect(getStoredToken()).toBe(token);
    });

    it('should use custom key when provided', () => {
      const token = 'custom-token-456';
      localStorage.setItem('custom_key', token);
      expect(getStoredToken('custom_key')).toBe(token);
    });
  });

  describe('storeToken', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should store token in localStorage', () => {
      storeToken('my-token');
      expect(localStorage.getItem('merkos_auth_token')).toBe('my-token');
    });

    it('should use custom key when provided', () => {
      storeToken('my-token', 'my_custom_key');
      expect(localStorage.getItem('my_custom_key')).toBe('my-token');
    });
  });

  describe('removeToken', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should remove token from localStorage', () => {
      localStorage.setItem('merkos_auth_token', 'to-remove');
      removeToken();
      expect(localStorage.getItem('merkos_auth_token')).toBeNull();
    });

    it('should use custom key when provided', () => {
      localStorage.setItem('my_key', 'to-remove');
      removeToken('my_key');
      expect(localStorage.getItem('my_key')).toBeNull();
    });
  });
});

// ============================================================================
// Cookie Helpers Tests
// ============================================================================

describe('Cookie Helpers', () => {
  describe('areCookiesAvailable', () => {
    it('should return true when document.cookie is available', () => {
      expect(areCookiesAvailable()).toBe(true);
    });
  });

  describe('getCookie', () => {
    beforeEach(() => {
      // Clear all cookies
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0]?.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    });

    afterEach(() => {
      // Clean up cookies
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0]?.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    });

    it('should return null when cookie does not exist', () => {
      expect(getCookie('nonexistent')).toBeNull();
    });

    it('should return cookie value when it exists', () => {
      document.cookie = 'test-cookie=test-value';
      expect(getCookie('test-cookie')).toBe('test-value');
    });
  });

  describe('hasCookie', () => {
    beforeEach(() => {
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0]?.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    });

    it('should return false when cookie does not exist', () => {
      expect(hasCookie('nonexistent')).toBe(false);
    });

    it('should return true when cookie exists', () => {
      document.cookie = 'exists=yes';
      expect(hasCookie('exists')).toBe(true);
    });
  });

  describe('hasAuthCookie', () => {
    beforeEach(() => {
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0]?.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    });

    it('should return false when x-auth-token cookie does not exist', () => {
      expect(hasAuthCookie()).toBe(false);
    });

    it('should return true when x-auth-token cookie exists', () => {
      document.cookie = 'x-auth-token=token-value';
      expect(hasAuthCookie()).toBe(true);
    });

    it('should use custom cookie name when provided', () => {
      document.cookie = 'custom-auth=value';
      expect(hasAuthCookie('custom-auth')).toBe(true);
    });
  });
});

// ============================================================================
// State Validation Tests
// ============================================================================

describe('State Validation', () => {
  describe('generateState', () => {
    it('should generate a string of default length', () => {
      const state = generateState();
      expect(typeof state).toBe('string');
      expect(state.length).toBe(32);
    });

    it('should generate a string of specified length', () => {
      const state = generateState(16);
      expect(state.length).toBe(16);
    });

    it('should generate unique values', () => {
      const states = new Set<string>();
      for (let i = 0; i < 10; i++) {
        states.add(generateState());
      }
      expect(states.size).toBe(10);
    });
  });

  describe('storeState and validateState', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should store and validate state correctly', () => {
      const state = 'test-state-123';
      storeState(state);
      expect(validateState(state)).toBe(true);
    });

    it('should fail validation for wrong state', () => {
      storeState('correct-state');
      expect(validateState('wrong-state')).toBe(false);
    });

    it('should consume state after validation (one-time use)', () => {
      const state = 'one-time-state';
      storeState(state);
      expect(validateState(state)).toBe(true);
      // Second validation should fail because state was consumed
      expect(validateState(state)).toBe(false);
    });
  });
});

// ============================================================================
// URL Helpers Tests
// ============================================================================

describe('URL Helpers', () => {
  describe('parseUrlParams', () => {
    it('should parse empty string to empty object', () => {
      expect(parseUrlParams('')).toEqual({});
    });

    it('should parse single parameter', () => {
      expect(parseUrlParams('foo=bar')).toEqual({ foo: 'bar' });
    });

    it('should parse multiple parameters', () => {
      expect(parseUrlParams('foo=bar&baz=qux')).toEqual({
        foo: 'bar',
        baz: 'qux',
      });
    });

    it('should handle query string with leading ?', () => {
      expect(parseUrlParams('?foo=bar')).toEqual({ foo: 'bar' });
    });

    it('should handle URL-encoded values', () => {
      expect(parseUrlParams('name=John%20Doe')).toEqual({ name: 'John Doe' });
    });

    it('should handle values with = sign', () => {
      expect(parseUrlParams('token=abc=def')).toEqual({ token: 'abc=def' });
    });
  });

  describe('isCdssoCallback', () => {
    it('should return false when no params', () => {
      expect(isCdssoCallback({})).toBe(false);
    });

    it('should return true when cdsso_token is present', () => {
      expect(isCdssoCallback({ cdsso_token: 'abc' })).toBe(true);
    });

    it('should return true when sso_callback is present', () => {
      expect(isCdssoCallback({ sso_callback: '1' })).toBe(true);
    });
  });
});

// ============================================================================
// Token Helpers Tests
// ============================================================================

describe('Token Helpers', () => {
  // Sample JWT: header.payload.signature
  // Payload: { "sub": "1234567890", "name": "John Doe", "iat": 1516239022, "exp": 9999999999 }
  const validToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.signature';

  // Expired token (exp: 1516239022, which is in the past)
  const expiredToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.signature';

  describe('decodeJwtPayload', () => {
    it('should decode valid JWT payload', () => {
      const payload = decodeJwtPayload(validToken);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('1234567890');
      expect(payload?.name).toBe('John Doe');
    });

    it('should return null for invalid token', () => {
      expect(decodeJwtPayload('invalid')).toBeNull();
    });

    it('should return null for token with wrong number of parts', () => {
      expect(decodeJwtPayload('header.payload')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(decodeJwtPayload('')).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for token with future expiration', () => {
      expect(isTokenExpired(validToken)).toBe(false);
    });

    it('should return true for expired token', () => {
      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid')).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration timestamp for valid token', () => {
      const exp = getTokenExpiration(validToken);
      expect(exp).not.toBeNull();
      expect(exp).toBe(9999999999 * 1000); // exp is in seconds, result is in ms
    });

    it('should return null for invalid token', () => {
      expect(getTokenExpiration('invalid')).toBeNull();
    });
  });
});
