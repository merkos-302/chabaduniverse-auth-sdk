/**
 * Tests for Merkos utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatMerkosUser,
  getMerkosDisplayName,
  parseMerkosError,
  isMerkosError,
  isAuthError,
  extractBearerToken,
  storeBearerToken,
  removeBearerToken,
  createMerkosLogger,
  type MerkosError,
} from '../merkos-utils';
import type { MerkosUserData } from '../merkos-types';

// ============================================================================
// User Formatting Tests
// ============================================================================

describe('User Formatting', () => {
  describe('formatMerkosUser', () => {
    it('should format minimal user with only id', () => {
      const rawUser = { id: '123' };
      const result = formatMerkosUser(rawUser);
      expect(result).toEqual({ id: '123' });
    });

    it('should include email when provided', () => {
      const rawUser = { id: '123', email: 'test@example.com' };
      const result = formatMerkosUser(rawUser);
      expect(result).toEqual({ id: '123', email: 'test@example.com' });
    });

    it('should use displayName if available', () => {
      const rawUser = {
        id: '123',
        displayName: 'Display Name',
        name: 'Regular Name',
        firstName: 'First',
        lastName: 'Last',
      };
      const result = formatMerkosUser(rawUser);
      expect(result.name).toBe('Display Name');
    });

    it('should use name if displayName not available', () => {
      const rawUser = {
        id: '123',
        name: 'Regular Name',
        firstName: 'First',
        lastName: 'Last',
      };
      const result = formatMerkosUser(rawUser);
      expect(result.name).toBe('Regular Name');
    });

    it('should build name from firstName and lastName', () => {
      const rawUser = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = formatMerkosUser(rawUser);
      expect(result.name).toBe('John Doe');
    });

    it('should use only firstName if lastName not available', () => {
      const rawUser = {
        id: '123',
        firstName: 'John',
      };
      const result = formatMerkosUser(rawUser);
      expect(result.name).toBe('John');
    });

    it('should use only lastName if firstName not available', () => {
      const rawUser = {
        id: '123',
        lastName: 'Doe',
      };
      const result = formatMerkosUser(rawUser);
      expect(result.name).toBe('Doe');
    });

    it('should include role when provided', () => {
      const rawUser = { id: '123', role: 'admin' };
      const result = formatMerkosUser(rawUser);
      expect(result.role).toBe('admin');
    });

    it('should include permissions when provided', () => {
      const rawUser = { id: '123', permissions: ['read', 'write'] };
      const result = formatMerkosUser(rawUser);
      expect(result.permissions).toEqual(['read', 'write']);
    });

    it('should include metadata when provided', () => {
      const rawUser = { id: '123', metadata: { custom: 'value' } };
      const result = formatMerkosUser(rawUser);
      expect(result.metadata).toEqual({ custom: 'value' });
    });

    it('should not include undefined optional properties', () => {
      const rawUser = { id: '123' };
      const result = formatMerkosUser(rawUser);
      expect('email' in result).toBe(false);
      expect('name' in result).toBe(false);
      expect('role' in result).toBe(false);
    });
  });

  describe('getMerkosDisplayName', () => {
    it('should return name if available', () => {
      const user: MerkosUserData = { id: '123', name: 'John Doe' };
      expect(getMerkosDisplayName(user)).toBe('John Doe');
    });

    it('should return email prefix if no name', () => {
      const user: MerkosUserData = { id: '123', email: 'john.doe@example.com' };
      expect(getMerkosDisplayName(user)).toBe('john.doe');
    });

    it('should return default if no name or email', () => {
      const user: MerkosUserData = { id: '123' };
      expect(getMerkosDisplayName(user)).toBe('Merkos User');
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  describe('parseMerkosError', () => {
    it('should return MerkosError if already is one', () => {
      const error = new Error('Test error') as MerkosError;
      error.name = 'MerkosError';
      error.code = 'TEST_CODE';

      const result = parseMerkosError(error);
      expect(result).toBe(error);
    });

    it('should convert regular Error to MerkosError', () => {
      const error = new Error('Regular error');
      const result = parseMerkosError(error);

      expect(result.name).toBe('MerkosError');
      expect(result.message).toBe('Regular error');
      expect(result.originalError).toBe(error);
    });

    it('should parse Merkos API error format', () => {
      const apiError = { err: 'API Error', code: 'API_ERROR' };
      const result = parseMerkosError(apiError);

      expect(result.name).toBe('MerkosError');
      expect(result.message).toBe('API Error');
      expect(result.code).toBe('API_ERROR');
    });

    it('should handle string error', () => {
      const result = parseMerkosError('String error');

      expect(result.name).toBe('MerkosError');
      expect(result.message).toBe('String error');
    });

    it('should handle unknown error type', () => {
      const result = parseMerkosError(null);

      expect(result.name).toBe('MerkosError');
      expect(result.message).toBe('Unknown Merkos error');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle undefined error', () => {
      const result = parseMerkosError(undefined);

      expect(result.name).toBe('MerkosError');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('isMerkosError', () => {
    it('should return true for MerkosError', () => {
      const error = new Error('Test') as MerkosError;
      error.name = 'MerkosError';
      expect(isMerkosError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Test');
      expect(isMerkosError(error)).toBe(false);
    });

    it('should return false for non-Error', () => {
      expect(isMerkosError('string')).toBe(false);
      expect(isMerkosError(null)).toBe(false);
      expect(isMerkosError(undefined)).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('should return true for auth error codes', () => {
      const authCodes = [
        'UNAUTHORIZED',
        'INVALID_CREDENTIALS',
        'TOKEN_EXPIRED',
        'TOKEN_INVALID',
        'FORBIDDEN',
      ];

      authCodes.forEach((code) => {
        const error = new Error('Test') as MerkosError;
        error.name = 'MerkosError';
        error.code = code;
        expect(isAuthError(error)).toBe(true);
      });
    });

    it('should return false for non-auth error codes', () => {
      const error = new Error('Test') as MerkosError;
      error.name = 'MerkosError';
      error.code = 'SOME_OTHER_ERROR';
      expect(isAuthError(error)).toBe(false);
    });

    it('should return false for non-MerkosError', () => {
      const error = new Error('Test');
      expect(isAuthError(error)).toBe(false);
    });

    it('should return false for MerkosError without code', () => {
      const error = new Error('Test') as MerkosError;
      error.name = 'MerkosError';
      expect(isAuthError(error)).toBe(false);
    });
  });
});

// ============================================================================
// Token Management Tests
// ============================================================================

describe('Token Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('extractBearerToken', () => {
    it('should return provided token if given', () => {
      const result = extractBearerToken('provided-token');
      expect(result).toBe('provided-token');
    });

    it('should extract from localStorage with default key', () => {
      localStorage.setItem('merkos_auth_token', 'stored-token');
      const result = extractBearerToken();
      expect(result).toBe('stored-token');
    });

    it('should extract from localStorage with custom key', () => {
      localStorage.setItem('custom_key', 'custom-token');
      const result = extractBearerToken(undefined, { storageKey: 'custom_key' });
      expect(result).toBe('custom-token');
    });

    it('should return null if no token found', () => {
      const result = extractBearerToken();
      expect(result).toBeNull();
    });

    it('should fallback to CDSSO key', () => {
      localStorage.setItem('merkos_auth_token', 'cdsso-token');
      const result = extractBearerToken(undefined, { storageKey: 'nonexistent' });
      expect(result).toBe('cdsso-token');
    });
  });

  describe('storeBearerToken', () => {
    it('should store token with default key', () => {
      storeBearerToken('new-token');
      expect(localStorage.getItem('merkos_auth_token')).toBe('new-token');
    });

    it('should store token with custom key', () => {
      storeBearerToken('custom-token', { storageKey: 'custom_key' });
      expect(localStorage.getItem('custom_key')).toBe('custom-token');
    });
  });

  describe('removeBearerToken', () => {
    it('should remove token with default key', () => {
      localStorage.setItem('merkos_auth_token', 'to-remove');
      removeBearerToken();
      expect(localStorage.getItem('merkos_auth_token')).toBeNull();
    });

    it('should remove token with custom key', () => {
      localStorage.setItem('custom_key', 'to-remove');
      removeBearerToken({ storageKey: 'custom_key' });
      expect(localStorage.getItem('custom_key')).toBeNull();
    });
  });
});

// ============================================================================
// Logger Tests
// ============================================================================

describe('Logger', () => {
  describe('createMerkosLogger', () => {
    it('should create logger with debug disabled by default', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const logger = createMerkosLogger();

      logger.debug('Test debug');
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log debug when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const logger = createMerkosLogger({ debug: true });

      logger.debug('Test debug');
      expect(consoleSpy).toHaveBeenCalledWith('[Merkos] Test debug');

      consoleSpy.mockRestore();
    });

    it('should always log info', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const logger = createMerkosLogger();

      logger.info('Test info');
      expect(consoleSpy).toHaveBeenCalledWith('[Merkos] Test info');

      consoleSpy.mockRestore();
    });

    it('should always log warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logger = createMerkosLogger();

      logger.warn('Test warn');
      expect(consoleSpy).toHaveBeenCalledWith('[Merkos] Test warn');

      consoleSpy.mockRestore();
    });

    it('should always log error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = createMerkosLogger();

      logger.error('Test error');
      expect(consoleSpy).toHaveBeenCalledWith('[Merkos] Test error');

      consoleSpy.mockRestore();
    });

    it('should pass additional arguments', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const logger = createMerkosLogger();

      logger.info('Test', { data: 'value' }, 123);
      expect(consoleSpy).toHaveBeenCalledWith('[Merkos] Test', { data: 'value' }, 123);

      consoleSpy.mockRestore();
    });
  });
});
