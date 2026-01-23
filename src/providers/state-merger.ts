/**
 * State Merger - Merges authentication state from multiple providers
 *
 * Handles merging Valu and Merkos user states into a unified UniverseUser,
 * and determines the overall authentication status.
 */

import type {
  UniverseUser,
  ValuUser,
  MerkosUser,
  AuthProvider,
} from '../types/user';
import type {
  ValuProviderState,
  MerkosProviderState,
  UniverseProviderState,
} from '../types/providers';
import { AuthStatus } from '../types/context';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for merging user states
 */
export interface MergeOptions {
  /** Which provider to prioritize for conflicting data */
  priority?: AuthProvider;
  /** Whether to include enrichment data */
  includeEnrichment?: boolean;
}

/**
 * Result of determining auth status
 */
export interface AuthStatusResult {
  /** The determined auth status */
  status: AuthStatus;
  /** Whether fully authenticated (all enabled providers) */
  isFullyAuthenticated: boolean;
  /** Whether partially authenticated (some providers) */
  isPartiallyAuthenticated: boolean;
  /** List of authenticated providers */
  authenticatedProviders: AuthProvider[];
}

// ============================================================================
// User Merging
// ============================================================================

/**
 * Merge Valu and Merkos user states into a unified UniverseUser
 *
 * @param valuUser - Valu user (may be null)
 * @param merkosUser - Merkos user (may be null)
 * @param options - Merge options
 * @returns Merged UniverseUser or null if no users
 */
export function mergeUserStates(
  valuUser: ValuUser | null,
  merkosUser: MerkosUser | null,
  options: MergeOptions = {}
): UniverseUser | null {
  // If no users, return null
  if (!valuUser && !merkosUser) {
    return null;
  }

  const { priority = 'merkos' } = options;
  // includeEnrichment is reserved for future use
  // const { includeEnrichment = true } = options;

  // Determine linked accounts
  const linkedAccounts: AuthProvider[] = [];
  if (merkosUser) linkedAccounts.push('merkos');
  if (valuUser) linkedAccounts.push('valu');

  // Get primary user based on priority
  const primaryUser = priority === 'merkos'
    ? (merkosUser ?? valuUser)
    : (valuUser ?? merkosUser);

  if (!primaryUser) {
    return null;
  }

  // Build display name
  const displayName = buildDisplayName(valuUser, merkosUser, priority);

  // Build email - prioritize based on priority
  const email = getEmail(valuUser, merkosUser, priority);

  // Build avatar URL
  const avatarUrl = getAvatarUrl(valuUser, merkosUser, priority);

  // Build first/last names
  const { firstName, lastName } = getNames(valuUser, merkosUser, priority);

  // Build the merged user
  const mergedUser: UniverseUser = {
    id: primaryUser.id,
    email: email ?? '',
    displayName,
    linkedAccounts,
  };

  // Add optional fields only if defined
  if (merkosUser) {
    mergedUser.merkosUserId = merkosUser.id;
  }
  if (valuUser) {
    mergedUser.valuUserId = valuUser.id;
  }
  if (firstName !== undefined) {
    mergedUser.firstName = firstName;
  }
  if (lastName !== undefined) {
    mergedUser.lastName = lastName;
  }
  if (avatarUrl !== undefined) {
    mergedUser.avatarUrl = avatarUrl;
  }

  // Add provider-specific raw data
  if (valuUser ?? merkosUser) {
    mergedUser.providerData = {};
    if (merkosUser) {
      mergedUser.providerData.merkos = merkosUser;
    }
    if (valuUser) {
      mergedUser.providerData.valu = valuUser;
    }
  }

  // Add metadata if present
  const metadata = mergeMetadata(valuUser, merkosUser);
  if (metadata) {
    mergedUser.metadata = metadata;
  }

  return mergedUser;
}

/**
 * Build display name from available sources
 */
function buildDisplayName(
  valuUser: ValuUser | null,
  merkosUser: MerkosUser | null,
  priority: AuthProvider
): string {
  // Try priority user first
  if (priority === 'merkos' && merkosUser) {
    if (merkosUser.displayName) return merkosUser.displayName;
    if (merkosUser.name) return merkosUser.name;
    if (merkosUser.firstName ?? merkosUser.lastName) {
      return `${merkosUser.firstName ?? ''} ${merkosUser.lastName ?? ''}`.trim();
    }
  } else if (priority === 'valu' && valuUser) {
    if (valuUser.displayName) return valuUser.displayName;
    if (valuUser.profile?.displayName) return valuUser.profile.displayName;
    if (valuUser.firstName ?? valuUser.lastName) {
      return `${valuUser.firstName ?? ''} ${valuUser.lastName ?? ''}`.trim();
    }
    if (valuUser.username) return valuUser.username;
  }

  // Try fallback user
  if (valuUser) {
    if (valuUser.displayName) return valuUser.displayName;
    if (valuUser.profile?.displayName) return valuUser.profile.displayName;
    if (valuUser.firstName ?? valuUser.lastName) {
      return `${valuUser.firstName ?? ''} ${valuUser.lastName ?? ''}`.trim();
    }
    if (valuUser.username) return valuUser.username;
  }

  if (merkosUser) {
    if (merkosUser.displayName) return merkosUser.displayName;
    if (merkosUser.name) return merkosUser.name;
    if (merkosUser.firstName ?? merkosUser.lastName) {
      return `${merkosUser.firstName ?? ''} ${merkosUser.lastName ?? ''}`.trim();
    }
  }

  // Last resort: use email prefix or 'User'
  const email = getEmail(valuUser, merkosUser, priority);
  if (email) {
    const prefix = email.split('@')[0];
    if (prefix) return prefix;
  }

  return 'User';
}

/**
 * Get email from users based on priority
 */
function getEmail(
  valuUser: ValuUser | null,
  merkosUser: MerkosUser | null,
  priority: AuthProvider
): string | undefined {
  if (priority === 'merkos') {
    return merkosUser?.email ?? valuUser?.email;
  }
  return valuUser?.email ?? merkosUser?.email;
}

/**
 * Get avatar URL from users based on priority
 */
function getAvatarUrl(
  valuUser: ValuUser | null,
  merkosUser: MerkosUser | null,
  priority: AuthProvider
): string | undefined {
  if (priority === 'merkos') {
    return merkosUser?.avatarUrl ?? valuUser?.avatarUrl ?? valuUser?.profile?.profileImage;
  }
  return valuUser?.avatarUrl ?? valuUser?.profile?.profileImage ?? merkosUser?.avatarUrl;
}

/**
 * Get first and last names from users based on priority
 */
function getNames(
  valuUser: ValuUser | null,
  merkosUser: MerkosUser | null,
  priority: AuthProvider
): { firstName?: string; lastName?: string } {
  const result: { firstName?: string; lastName?: string } = {};

  let firstName: string | undefined;
  let lastName: string | undefined;

  if (priority === 'merkos' && merkosUser) {
    firstName = merkosUser.firstName ?? valuUser?.firstName;
    lastName = merkosUser.lastName ?? valuUser?.lastName;
  } else if (valuUser) {
    firstName = valuUser.firstName ?? merkosUser?.firstName;
    lastName = valuUser.lastName ?? merkosUser?.lastName;
  } else if (merkosUser) {
    firstName = merkosUser.firstName;
    lastName = merkosUser.lastName;
  }

  if (firstName !== undefined) {
    result.firstName = firstName;
  }
  if (lastName !== undefined) {
    result.lastName = lastName;
  }

  return result;
}

/**
 * Merge metadata from both users
 */
function mergeMetadata(
  valuUser: ValuUser | null,
  merkosUser: MerkosUser | null
): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {};
  let hasMetadata = false;

  if (merkosUser?.metadata) {
    Object.assign(metadata, merkosUser.metadata);
    hasMetadata = true;
  }
  if (valuUser?.metadata) {
    Object.assign(metadata, valuUser.metadata);
    hasMetadata = true;
  }

  return hasMetadata ? metadata : undefined;
}

// ============================================================================
// Auth Status Determination
// ============================================================================

/**
 * Determine the overall authentication status from provider states
 *
 * @param valuState - Valu provider state
 * @param merkosState - Merkos provider state
 * @param enableValu - Whether Valu is enabled
 * @param enableMerkos - Whether Merkos is enabled
 * @returns Auth status result
 */
export function determineAuthStatus(
  valuState: ValuProviderState,
  merkosState: MerkosProviderState,
  enableValu: boolean,
  enableMerkos: boolean
): AuthStatusResult {
  const authenticatedProviders: AuthProvider[] = [];

  if (enableMerkos && merkosState.isAuthenticated) {
    authenticatedProviders.push('merkos');
  }
  if (enableValu && valuState.isAuthenticated) {
    authenticatedProviders.push('valu');
  }

  // Count enabled providers
  const enabledCount = (enableMerkos ? 1 : 0) + (enableValu ? 1 : 0);
  const authenticatedCount = authenticatedProviders.length;

  // Determine status
  let status: AuthStatus;
  let isFullyAuthenticated = false;
  let isPartiallyAuthenticated = false;

  if (enabledCount === 0) {
    // No providers enabled
    status = AuthStatus.Unauthenticated;
  } else if (authenticatedCount === enabledCount) {
    // All enabled providers authenticated
    status = AuthStatus.Authenticated;
    isFullyAuthenticated = true;
    if (authenticatedCount > 1) {
      isPartiallyAuthenticated = true; // Also partial if authenticated with multiple
    }
  } else if (authenticatedCount > 0) {
    // Some providers authenticated
    status = AuthStatus.Partial;
    isPartiallyAuthenticated = true;
  } else {
    // No providers authenticated
    status = AuthStatus.Unauthenticated;
  }

  // Check for errors
  if (valuState.error ?? merkosState.error) {
    // Keep status but flag error
    // The error state is handled separately
  }

  return {
    status,
    isFullyAuthenticated,
    isPartiallyAuthenticated,
    authenticatedProviders,
  };
}

/**
 * Determine which provider should be considered primary
 *
 * @param valuState - Valu provider state
 * @param merkosState - Merkos provider state
 * @param preferredPriority - User's preferred priority
 * @returns Primary provider or null
 */
export function prioritizeProvider(
  valuState: ValuProviderState,
  merkosState: MerkosProviderState,
  preferredPriority: AuthProvider = 'merkos'
): AuthProvider | null {
  const valuAuth = valuState.isAuthenticated;
  const merkosAuth = merkosState.isAuthenticated;

  // If both authenticated, use preferred priority
  if (valuAuth && merkosAuth) {
    return preferredPriority;
  }

  // If only one authenticated, use that one
  if (merkosAuth) return 'merkos';
  if (valuAuth) return 'valu';

  // Neither authenticated
  return null;
}

/**
 * Build the universe provider state from merged state
 *
 * @param valuState - Valu provider state
 * @param merkosState - Merkos provider state
 * @param preferredPriority - User's preferred priority
 * @returns Universe provider state
 */
export function buildUniverseProviderState(
  valuState: ValuProviderState,
  merkosState: MerkosProviderState,
  preferredPriority: AuthProvider = 'merkos'
): UniverseProviderState {
  const linkedProviders: AuthProvider[] = [];

  if (merkosState.isAuthenticated) {
    linkedProviders.push('merkos');
  }
  if (valuState.isAuthenticated) {
    linkedProviders.push('valu');
  }

  const primaryProvider = prioritizeProvider(valuState, merkosState, preferredPriority);
  const isLinked = linkedProviders.length > 1;

  return {
    isLinked,
    linkedProviders,
    primaryProvider,
    lastSyncAt: isLinked ? new Date().toISOString() : null,
  };
}

/**
 * Check if providers need linking (both auth'd but not linked)
 */
export function needsLinking(
  valuState: ValuProviderState,
  merkosState: MerkosProviderState
): boolean {
  return valuState.isAuthenticated && merkosState.isAuthenticated;
}
