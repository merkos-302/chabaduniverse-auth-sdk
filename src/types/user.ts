/**
 * User type definitions for @chabaduniverse/auth-sdk
 *
 * These types represent user data from different authentication providers
 * and the unified user model that merges them.
 */

/**
 * Base user properties shared across all providers
 */
export interface BaseUser {
  /** Unique identifier from the provider */
  id: string;
  /** User's email address */
  email?: string;
  /** User's display name */
  displayName?: string;
  /** URL to user's avatar/profile image */
  avatarUrl?: string;
}

/**
 * User data from Valu Social provider
 * Represents a user authenticated through the Valu platform
 */
export interface ValuUser extends BaseUser {
  /** Valu username */
  username?: string;
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** User's roles in Valu */
  roles?: string[];
  /** User's permissions */
  permissions?: string[];
  /** Extended profile information */
  profile?: {
    displayName?: string;
    profileImage?: string;
    bio?: string;
  };
  /** User's network information */
  network?: {
    id: string;
    name: string;
    role: string;
  };
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * User data from Merkos Platform provider
 * Represents a user authenticated through the Merkos platform
 */
export interface MerkosUser extends BaseUser {
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** Full name */
  name?: string;
  /** User's role in the system */
  role?: string;
  /** User's permissions */
  permissions?: string[];
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Organization that a user belongs to (Merkos)
 */
export interface Organization {
  /** Organization ID */
  id: string;
  /** Organization name */
  name: string;
  /** Organization type */
  type?: string;
  /** User's role in this organization */
  role?: string;
  /** Whether this is the user's primary organization */
  isPrimary?: boolean;
}

/**
 * Role assigned to a user
 */
export interface Role {
  /** Role ID */
  id: string;
  /** Role name */
  name: string;
  /** Scope of the role (organization ID or 'global') */
  scope?: string;
  /** Permissions granted by this role */
  permissions?: string[];
}

/**
 * Merkos-specific enrichment data
 * Contains additional data fetched from Merkos Platform
 */
export interface MerkosEnrichment {
  /** User's organizations */
  organizations: Organization[];
  /** User's roles */
  roles: Role[];
  /** Aggregated permissions from all roles */
  permissions: string[];
  /** Whether data is from cache */
  fromCache?: boolean;
  /** When enrichment was fetched */
  fetchedAt?: string;
  /** When enrichment expires */
  expiresAt?: string;
}

/**
 * Valu-specific enrichment data (future use)
 * Contains additional data fetched from Valu platform
 */
export interface ValuEnrichment {
  /** User's communities in Valu */
  communities?: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
  /** User's network information */
  network?: {
    id: string;
    name: string;
  };
  /** Number of connections */
  connectionsCount?: number;
  /** Whether data is from cache */
  fromCache?: boolean;
  /** When enrichment was fetched */
  fetchedAt?: string;
}

/**
 * Unified user model that merges data from all providers
 * This is the canonical user type returned by useUniverseAuth
 */
export interface UniverseUser {
  /** Primary universe user ID */
  id: string;
  /** Linked Merkos user ID (if authenticated with Merkos) */
  merkosUserId?: string;
  /** Linked Valu user ID (if authenticated with Valu) */
  valuUserId?: string;
  /** Primary email address */
  email: string;
  /** Display name (merged from providers) */
  displayName: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Avatar URL (best available from providers) */
  avatarUrl?: string;
  /** Whether email is verified */
  emailVerified?: boolean;
  /** List of linked provider accounts */
  linkedAccounts: AuthProvider[];
  /** When user was created */
  createdAt?: string;
  /** When user was last updated */
  updatedAt?: string;
  /** Provider-specific raw data */
  providerData?: {
    merkos?: MerkosUser;
    valu?: ValuUser;
  };
  /** Enrichment data from Merkos */
  merkosEnrichment?: MerkosEnrichment;
  /** Enrichment data from Valu */
  valuEnrichment?: ValuEnrichment;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Authentication provider types
 */
export type AuthProvider = 'merkos' | 'valu';

/**
 * All authentication methods supported
 */
export type AuthMethod =
  | 'bearer-token'
  | 'credentials'
  | 'google'
  | 'chabad-org'
  | 'cdsso'
  | 'valu-iframe'
  | 'valu-oauth';
