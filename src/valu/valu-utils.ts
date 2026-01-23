/**
 * Valu utility functions for @chabaduniverse/auth-sdk
 *
 * These utilities handle iframe detection, user data formatting,
 * and other Valu-specific helper functions.
 */

import type { ValuUser } from '../types/user';
import type { RawValuUser, ValuConnectionHealth } from './valu-types';

// ============================================================================
// Iframe Detection
// ============================================================================

/**
 * Check if the current window is running inside an iframe
 *
 * Uses multiple detection strategies for reliability:
 * 1. Primary: window !== window.parent comparison
 * 2. Fallback: window.frameElement check
 * 3. Fallback: window.self !== window.top check
 *
 * @returns true if running in an iframe
 */
export function isInIframe(): boolean {
  try {
    // Primary check: Compare window to parent
    if (typeof window !== 'undefined' && window.parent && window !== window.parent) {
      return true;
    }

    // Fallback: Check frameElement (may be null due to cross-origin restrictions)
    if (typeof window !== 'undefined' && window.frameElement !== null) {
      return true;
    }

    // Fallback: Check self vs top
    if (typeof window !== 'undefined' && window.self !== window.top) {
      return true;
    }

    return false;
  } catch {
    // Cross-origin iframe - if we can't access parent, we're in an iframe
    return true;
  }
}

/**
 * Check if running inside a Valu Social iframe specifically
 *
 * Attempts to detect if the parent window is Valu Social by checking
 * for expected message events or parent domain patterns.
 *
 * @returns true if likely running in Valu Social iframe
 */
export function isInValuSocialIframe(): boolean {
  if (!isInIframe()) {
    return false;
  }

  try {
    // Check if parent has postMessage capability
    if (typeof window !== 'undefined' && window.parent) {
      return typeof window.parent.postMessage === 'function';
    }
    return false;
  } catch {
    // Cross-origin restrictions may prevent access
    return true; // Assume Valu if we can't verify
  }
}

/**
 * Check if postMessage is available to parent
 */
export function canPostMessageToParent(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.parent &&
      window !== window.parent &&
      typeof window.parent.postMessage === 'function'
    );
  } catch {
    return false;
  }
}

// ============================================================================
// User Data Formatting
// ============================================================================

/**
 * Map Valu API roles to standardized role names
 */
const VALU_ROLE_MAPPING: Record<string, string> = {
  admin: 'admin',
  administrator: 'admin',
  super_admin: 'admin',
  moderator: 'moderator',
  mod: 'moderator',
  community_manager: 'moderator',
  member: 'user',
  user: 'user',
  basic: 'user',
  premium: 'user',
  verified: 'user',
};

/**
 * Map raw Valu roles to standardized portal roles
 *
 * @param valuRoles - Array of roles from Valu API
 * @returns Array of standardized role names
 */
export function mapValuRoles(valuRoles: string[] = []): string[] {
  const mappedRoles = valuRoles
    .map((role) => VALU_ROLE_MAPPING[role.toLowerCase()] || 'user')
    .filter((role, index, array) => array.indexOf(role) === index); // Remove duplicates

  // Ensure at least 'user' role
  if (mappedRoles.length === 0) {
    mappedRoles.push('user');
  }

  return mappedRoles;
}

/**
 * Format a raw Valu user to the standardized ValuUser type
 *
 * @param rawUser - Raw user data from Valu API
 * @returns Formatted ValuUser object
 */
export function formatValuUser(rawUser: RawValuUser): ValuUser {
  const displayName =
    rawUser.profile?.displayName ||
    rawUser.name ||
    `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim() ||
    'Valu User';

  // Build profile object only with defined properties
  let profile: ValuUser['profile'];
  if (rawUser.profile) {
    const profileData: { displayName?: string; profileImage?: string; bio?: string } = {};
    if (rawUser.profile.displayName !== undefined) {
      profileData.displayName = rawUser.profile.displayName;
    }
    if (rawUser.profile.profileImage !== undefined) {
      profileData.profileImage = rawUser.profile.profileImage;
    }
    if (rawUser.profile.bio !== undefined) {
      profileData.bio = rawUser.profile.bio;
    }
    profile = Object.keys(profileData).length > 0 ? profileData : undefined;
  }

  // Build user object, only including properties that have values
  const user: ValuUser = {
    id: rawUser.id,
    displayName,
    roles: mapValuRoles(rawUser.roles),
    permissions: rawUser.permissions || [],
  };

  // Add optional properties only if they're defined
  if (rawUser.email !== undefined) {
    user.email = rawUser.email;
  }
  const avatarUrl = rawUser.profile?.profileImage ?? rawUser.avatar;
  if (avatarUrl !== undefined) {
    user.avatarUrl = avatarUrl;
  }
  if (rawUser.name !== undefined) {
    user.username = rawUser.name;
  }
  if (rawUser.firstName !== undefined) {
    user.firstName = rawUser.firstName;
  }
  if (rawUser.lastName !== undefined) {
    user.lastName = rawUser.lastName;
  }
  if (profile !== undefined) {
    user.profile = profile;
  }
  if (rawUser.network !== undefined) {
    user.network = rawUser.network;
  }
  if (rawUser.metadata !== undefined) {
    user.metadata = rawUser.metadata;
  }

  return user;
}

/**
 * Create a display name from user data
 *
 * @param user - User data object
 * @returns Best available display name
 */
export function getDisplayName(user: {
  displayName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  if (user.displayName) return user.displayName;
  if (user.name) return user.name;

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (fullName) return fullName;

  if (user.email) {
    // Use email prefix as fallback
    const emailPrefix = user.email.split('@')[0];
    if (emailPrefix) return emailPrefix;
  }

  return 'Valu User';
}

// ============================================================================
// Connection Health Utilities
// ============================================================================

/**
 * Get a human-readable description of connection health
 */
export function getHealthDescription(health: ValuConnectionHealth): string {
  switch (health) {
    case 'healthy':
      return 'Connection is healthy';
    case 'degraded':
      return 'Connection is degraded - some features may be slow';
    case 'disconnected':
      return 'Not connected to Valu Social';
    case 'unknown':
    default:
      return 'Connection status unknown';
  }
}

/**
 * Check if health status indicates the connection is usable
 */
export function isConnectionUsable(health: ValuConnectionHealth): boolean {
  return health === 'healthy' || health === 'degraded';
}

// ============================================================================
// Message Validation
// ============================================================================

/**
 * Valu API message structure
 */
interface ValuMessage {
  target?: string;
  name?: string;
  message?: unknown;
}

/**
 * Check if a message event is from Valu API
 *
 * @param event - MessageEvent to validate
 * @returns true if this is a valid Valu API message
 */
export function isValuApiMessage(event: MessageEvent): boolean {
  try {
    const data = event.data as ValuMessage;
    return data?.target === 'valuApi' && typeof data.name === 'string';
  } catch {
    return false;
  }
}

/**
 * Parse a Valu API message
 *
 * @param event - MessageEvent to parse
 * @returns Parsed message data or null if invalid
 */
export function parseValuMessage(event: MessageEvent): {
  name: string;
  message: unknown;
} | null {
  if (!isValuApiMessage(event)) {
    return null;
  }

  const data = event.data as ValuMessage;
  return {
    name: data.name as string,
    message: data.message,
  };
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Create a standardized Valu error
 */
export function createValuError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): Error {
  const error = new Error(message);
  error.name = 'ValuError';
  (error as Error & { code: string }).code = code;
  if (details) {
    (error as Error & { details: Record<string, unknown> }).details = details;
  }
  return error;
}

/**
 * Check if an error is a Valu-specific error
 */
export function isValuError(error: unknown): error is Error & { code: string } {
  return error instanceof Error && error.name === 'ValuError';
}

/**
 * Check if an error is related to postRunResult bug
 * This is a known issue in the Valu API that needs special handling
 */
export function isPostRunResultError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message?.includes('postRunResult') ?? false;
  }
  return false;
}

// ============================================================================
// Timeout Utilities
// ============================================================================

/**
 * Create a promise that rejects after a timeout
 */
export function createTimeoutPromise<T>(
  ms: number,
  message = 'Operation timed out'
): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  return Promise.race([promise, createTimeoutPromise<T>(ms, message)]);
}

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Log levels for Valu integration
 */
export type ValuLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Create a prefixed logger for Valu integration
 */
export function createValuLogger(prefix = 'Valu') {
  const formatMessage = (level: ValuLogLevel, message: string, ...args: unknown[]) => {
    return [`[${prefix}][${level.toUpperCase()}] ${message}`, ...args];
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(...formatMessage('debug', message, ...args));
      }
    },
    info: (message: string, ...args: unknown[]) => {
      console.info(...formatMessage('info', message, ...args));
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(...formatMessage('warn', message, ...args));
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(...formatMessage('error', message, ...args));
    },
  };
}

/**
 * Default Valu logger instance
 */
export const valuLogger = createValuLogger('ValuSDK');
