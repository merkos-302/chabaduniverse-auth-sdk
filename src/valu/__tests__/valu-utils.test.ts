/**
 * Tests for Valu utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  isInIframe,
  canPostMessageToParent,
  mapValuRoles,
  formatValuUser,
  getDisplayName,
  getHealthDescription,
  isConnectionUsable,
  isValuApiMessage,
  parseValuMessage,
  createValuError,
  isValuError,
  isPostRunResultError,
  withTimeout,
} from '../valu-utils';
import type { RawValuUser } from '../valu-types';

describe('Iframe Detection', () => {
  describe('isInIframe', () => {
    it('should detect iframe environment correctly', () => {
      // Note: jsdom simulates an iframe environment where window !== window.parent
      // The function should correctly detect this
      const result = isInIframe();
      expect(typeof result).toBe('boolean');
      // In jsdom, this returns true due to the simulated environment
      expect(result).toBe(true);
    });
  });

  describe('canPostMessageToParent', () => {
    it('should return false when not in iframe', () => {
      expect(canPostMessageToParent()).toBe(false);
    });
  });
});

describe('Role Mapping', () => {
  describe('mapValuRoles', () => {
    it('should map admin roles correctly', () => {
      expect(mapValuRoles(['admin'])).toContain('admin');
      expect(mapValuRoles(['administrator'])).toContain('admin');
      expect(mapValuRoles(['super_admin'])).toContain('admin');
    });

    it('should map moderator roles correctly', () => {
      expect(mapValuRoles(['moderator'])).toContain('moderator');
      expect(mapValuRoles(['mod'])).toContain('moderator');
      expect(mapValuRoles(['community_manager'])).toContain('moderator');
    });

    it('should map user roles correctly', () => {
      expect(mapValuRoles(['member'])).toContain('user');
      expect(mapValuRoles(['user'])).toContain('user');
      expect(mapValuRoles(['basic'])).toContain('user');
    });

    it('should default to user role for unknown roles', () => {
      expect(mapValuRoles(['unknown_role'])).toEqual(['user']);
    });

    it('should default to user role for empty array', () => {
      expect(mapValuRoles([])).toEqual(['user']);
    });

    it('should default to user role for undefined', () => {
      expect(mapValuRoles(undefined)).toEqual(['user']);
    });

    it('should remove duplicate roles', () => {
      const roles = mapValuRoles(['admin', 'administrator', 'super_admin']);
      expect(roles.filter((r) => r === 'admin').length).toBe(1);
    });
  });
});

describe('User Formatting', () => {
  describe('formatValuUser', () => {
    it('should format a complete user correctly', () => {
      const rawUser: RawValuUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['admin'],
        permissions: ['read', 'write'],
        profile: {
          displayName: 'Johnny',
          profileImage: 'https://example.com/profile.jpg',
          bio: 'A test user',
        },
        network: {
          id: 'network-1',
          name: 'Test Network',
          role: 'admin',
        },
      };

      const formatted = formatValuUser(rawUser);

      expect(formatted.id).toBe('user-123');
      expect(formatted.email).toBe('john@example.com');
      expect(formatted.displayName).toBe('Johnny');
      expect(formatted.avatarUrl).toBe('https://example.com/profile.jpg');
      expect(formatted.firstName).toBe('John');
      expect(formatted.lastName).toBe('Doe');
      expect(formatted.roles).toContain('admin');
      expect(formatted.permissions).toEqual(['read', 'write']);
    });

    it('should use fallback display name from name field', () => {
      const rawUser: RawValuUser = {
        id: 'user-123',
        name: 'John Doe',
      };

      const formatted = formatValuUser(rawUser);
      expect(formatted.displayName).toBe('John Doe');
    });

    it('should use fallback display name from firstName/lastName', () => {
      const rawUser: RawValuUser = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const formatted = formatValuUser(rawUser);
      expect(formatted.displayName).toBe('John Doe');
    });

    it('should use default display name when no name data', () => {
      const rawUser: RawValuUser = {
        id: 'user-123',
      };

      const formatted = formatValuUser(rawUser);
      expect(formatted.displayName).toBe('Valu User');
    });

    it('should use avatar as fallback for avatarUrl', () => {
      const rawUser: RawValuUser = {
        id: 'user-123',
        avatar: 'https://example.com/avatar.jpg',
      };

      const formatted = formatValuUser(rawUser);
      expect(formatted.avatarUrl).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('getDisplayName', () => {
    it('should prefer displayName', () => {
      expect(
        getDisplayName({
          displayName: 'Display Name',
          name: 'Name',
          firstName: 'First',
          lastName: 'Last',
        })
      ).toBe('Display Name');
    });

    it('should fallback to name', () => {
      expect(
        getDisplayName({
          name: 'Name',
          firstName: 'First',
          lastName: 'Last',
        })
      ).toBe('Name');
    });

    it('should fallback to firstName lastName', () => {
      expect(
        getDisplayName({
          firstName: 'First',
          lastName: 'Last',
        })
      ).toBe('First Last');
    });

    it('should fallback to email prefix', () => {
      expect(
        getDisplayName({
          email: 'user@example.com',
        })
      ).toBe('user');
    });

    it('should return default for empty user', () => {
      expect(getDisplayName({})).toBe('Valu User');
    });
  });
});

describe('Connection Health', () => {
  describe('getHealthDescription', () => {
    it('should return correct descriptions', () => {
      expect(getHealthDescription('healthy')).toBe('Connection is healthy');
      expect(getHealthDescription('degraded')).toContain('degraded');
      expect(getHealthDescription('disconnected')).toContain('Not connected');
      expect(getHealthDescription('unknown')).toContain('unknown');
    });
  });

  describe('isConnectionUsable', () => {
    it('should return true for healthy and degraded', () => {
      expect(isConnectionUsable('healthy')).toBe(true);
      expect(isConnectionUsable('degraded')).toBe(true);
    });

    it('should return false for disconnected and unknown', () => {
      expect(isConnectionUsable('disconnected')).toBe(false);
      expect(isConnectionUsable('unknown')).toBe(false);
    });
  });
});

describe('Message Validation', () => {
  describe('isValuApiMessage', () => {
    it('should return true for valid Valu messages', () => {
      const event = {
        data: {
          target: 'valuApi',
          name: 'api:ready',
          message: {},
        },
      } as MessageEvent;

      expect(isValuApiMessage(event)).toBe(true);
    });

    it('should return false for non-Valu messages', () => {
      const event = {
        data: {
          target: 'other',
          name: 'some-event',
        },
      } as MessageEvent;

      expect(isValuApiMessage(event)).toBe(false);
    });

    it('should return false for invalid data', () => {
      const event = {
        data: 'invalid',
      } as MessageEvent;

      expect(isValuApiMessage(event)).toBe(false);
    });
  });

  describe('parseValuMessage', () => {
    it('should parse valid messages', () => {
      const event = {
        data: {
          target: 'valuApi',
          name: 'api:ready',
          message: { test: 'data' },
        },
      } as MessageEvent;

      const result = parseValuMessage(event);
      expect(result).toEqual({
        name: 'api:ready',
        message: { test: 'data' },
      });
    });

    it('should return null for invalid messages', () => {
      const event = {
        data: 'invalid',
      } as MessageEvent;

      expect(parseValuMessage(event)).toBeNull();
    });
  });
});

describe('Error Handling', () => {
  describe('createValuError', () => {
    it('should create error with code', () => {
      const error = createValuError('TEST_ERROR', 'Test message');
      expect(error.name).toBe('ValuError');
      expect(error.message).toBe('Test message');
      expect((error as Error & { code: string }).code).toBe('TEST_ERROR');
    });

    it('should include details when provided', () => {
      const error = createValuError('TEST_ERROR', 'Test message', {
        extra: 'data',
      });
      expect((error as Error & { details: Record<string, unknown> }).details).toEqual({
        extra: 'data',
      });
    });
  });

  describe('isValuError', () => {
    it('should return true for Valu errors', () => {
      const error = createValuError('TEST', 'Test');
      expect(isValuError(error)).toBe(true);
    });

    it('should return false for regular errors', () => {
      const error = new Error('Test');
      expect(isValuError(error)).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isValuError('string')).toBe(false);
      expect(isValuError(null)).toBe(false);
    });
  });

  describe('isPostRunResultError', () => {
    it('should detect postRunResult errors', () => {
      const error = new Error('apiPointer.postRunResult is not a function');
      expect(isPostRunResultError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new Error('Some other error');
      expect(isPostRunResultError(error)).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isPostRunResultError('string')).toBe(false);
    });
  });
});

describe('Timeout Utilities', () => {
  describe('withTimeout', () => {
    it('should resolve if promise completes in time', async () => {
      const fastPromise = Promise.resolve('success');
      const result = await withTimeout(fastPromise, 1000);
      expect(result).toBe('success');
    });

    it('should reject if promise times out', async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      await expect(withTimeout(slowPromise, 10, 'Timed out')).rejects.toThrow(
        'Timed out'
      );
    });
  });
});
