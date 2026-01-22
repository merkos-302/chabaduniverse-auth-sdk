/**
 * Merkos Platform Utility Functions
 *
 * Provides utility functions for Merkos Platform integration:
 * - User data formatting
 * - Error parsing
 * - Token extraction
 */

import type { MerkosUserData, MerkosProviderConfig } from './merkos-types';
import { defaultMerkosProviderConfig } from './merkos-types';

// ============================================================================
// User Formatting
// ============================================================================

/**
 * Raw user data from Merkos API
 *
 * Compatible with User type from @chabaduniverse/auth
 */
interface RawMerkosUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
  // Additional fields that may come from API
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

/**
 * Format raw Merkos user data to standardized MerkosUserData type
 *
 * @param rawUser - Raw user data from API
 * @returns Formatted MerkosUserData
 */
export function formatMerkosUser(rawUser: RawMerkosUser): MerkosUserData {
  const user: MerkosUserData = {
    id: rawUser.id,
  };

  // Add optional properties only if they're defined
  if (rawUser.email !== undefined) {
    user.email = rawUser.email;
  }

  // Build name from various sources
  const name = rawUser.displayName ??
    rawUser.name ??
    (rawUser.firstName || rawUser.lastName
      ? `${rawUser.firstName ?? ''} ${rawUser.lastName ?? ''}`.trim()
      : undefined);
  if (name !== undefined) {
    user.name = name;
  }

  if (rawUser.role !== undefined) {
    user.role = rawUser.role;
  }

  if (rawUser.permissions !== undefined) {
    user.permissions = rawUser.permissions;
  }

  if (rawUser.metadata !== undefined) {
    user.metadata = rawUser.metadata;
  }

  return user;
}

/**
 * Get display name from user data
 *
 * @param user - User data
 * @returns Best available display name
 */
export function getMerkosDisplayName(user: MerkosUserData): string {
  if (user.name) return user.name;

  if (user.email) {
    // Use email prefix as fallback
    const emailPrefix = user.email.split('@')[0];
    if (emailPrefix) return emailPrefix;
  }

  return 'Merkos User';
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Merkos error with code
 */
export interface MerkosError extends Error {
  code?: string;
  originalError?: unknown;
}

/**
 * Parse error from Merkos API response
 *
 * @param error - Error from API or unknown
 * @returns Parsed error with message and code
 */
export function parseMerkosError(error: unknown): MerkosError {
  // Already a MerkosError
  if (error instanceof Error && 'code' in error) {
    return error as MerkosError;
  }

  // Regular Error
  if (error instanceof Error) {
    const merkosError = new Error(error.message) as MerkosError;
    merkosError.name = 'MerkosError';
    merkosError.originalError = error;
    return merkosError;
  }

  // Object with err field (Merkos API error format)
  if (typeof error === 'object' && error !== null && 'err' in error) {
    const apiError = error as { err: string; code?: string; details?: unknown };
    const merkosError = new Error(apiError.err) as MerkosError;
    merkosError.name = 'MerkosError';
    if (apiError.code !== undefined) {
      merkosError.code = apiError.code;
    }
    merkosError.originalError = error;
    return merkosError;
  }

  // String error
  if (typeof error === 'string') {
    const merkosError = new Error(error) as MerkosError;
    merkosError.name = 'MerkosError';
    return merkosError;
  }

  // Unknown error
  const merkosError = new Error('Unknown Merkos error') as MerkosError;
  merkosError.name = 'MerkosError';
  merkosError.code = 'UNKNOWN_ERROR';
  merkosError.originalError = error;
  return merkosError;
}

/**
 * Check if an error is a Merkos-specific error
 */
export function isMerkosError(error: unknown): error is MerkosError {
  return error instanceof Error && error.name === 'MerkosError';
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (!isMerkosError(error)) return false;

  const authCodes = [
    'UNAUTHORIZED',
    'INVALID_CREDENTIALS',
    'TOKEN_EXPIRED',
    'TOKEN_INVALID',
    'FORBIDDEN',
  ];

  return error.code ? authCodes.includes(error.code) : false;
}

// ============================================================================
// Token Extraction
// ============================================================================

/**
 * Extract bearer token from various sources
 *
 * Searches in order:
 * 1. Provided token parameter
 * 2. localStorage (with config key)
 * 3. CDSSO storage (merkos_auth_token)
 *
 * @param token - Optional token to use
 * @param config - Merkos config
 * @returns Bearer token or null
 */
export function extractBearerToken(
  token?: string,
  config?: Partial<MerkosProviderConfig>
): string | null {
  // Use provided token if available
  if (token) return token;

  // Try localStorage with config key
  if (typeof window !== 'undefined') {
    const storageKey = config?.storageKey ?? defaultMerkosProviderConfig.storageKey;
    try {
      const storedToken = localStorage.getItem(storageKey);
      if (storedToken) return storedToken;
    } catch {
      // localStorage not available
    }

    // Try CDSSO default key as fallback
    try {
      const cdssoToken = localStorage.getItem('merkos_auth_token');
      if (cdssoToken) return cdssoToken;
    } catch {
      // localStorage not available
    }
  }

  return null;
}

/**
 * Store bearer token in localStorage
 *
 * @param token - Token to store
 * @param config - Merkos config
 */
export function storeBearerToken(
  token: string,
  config?: Partial<MerkosProviderConfig>
): void {
  if (typeof window === 'undefined') return;

  const storageKey = config?.storageKey ?? defaultMerkosProviderConfig.storageKey;
  try {
    localStorage.setItem(storageKey, token);
  } catch {
    // localStorage not available
  }
}

/**
 * Remove bearer token from localStorage
 *
 * @param config - Merkos config
 */
export function removeBearerToken(config?: Partial<MerkosProviderConfig>): void {
  if (typeof window === 'undefined') return;

  const storageKey = config?.storageKey ?? defaultMerkosProviderConfig.storageKey;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // localStorage not available
  }
}

// ============================================================================
// Logging
// ============================================================================

/**
 * Create a Merkos logger
 *
 * @param config - Merkos config (uses debug flag)
 * @returns Logger object
 */
export function createMerkosLogger(config?: Partial<MerkosProviderConfig>) {
  const isDebug = config?.debug ?? defaultMerkosProviderConfig.debug;

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (isDebug) {
        console.debug(`[Merkos] ${message}`, ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      console.info(`[Merkos] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`[Merkos] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`[Merkos] ${message}`, ...args);
    },
    log: (message: string, ...args: unknown[]) => {
      console.log(`[Merkos] ${message}`, ...args);
    },
  };
}

/**
 * Default Merkos logger instance
 */
export const merkosLogger = createMerkosLogger();
