/**
 * Provider configuration types for @chabaduniverse/auth-sdk
 *
 * These types are specific to the UniverseAuthProvider component.
 * For user and state types, see src/types/
 */

import type { ReactNode } from 'react';

/**
 * Configuration options for the UniverseAuthProvider
 */
export interface UniverseAuthConfig {
  /**
   * Application ID for multi-tenant support
   */
  appId?: string;

  /**
   * Enable Merkos Platform authentication
   * @default true
   */
  enableMerkos?: boolean;

  /**
   * Enable Valu Social authentication
   * @default false
   */
  enableValu?: boolean;

  /**
   * Enable Cross-Domain SSO
   * @default false
   */
  enableCDSSO?: boolean;

  /**
   * Auto-initialize on mount
   * @default true
   */
  autoInitialize?: boolean;

  /**
   * Merkos Platform configuration
   */
  merkos?: MerkosConfig;

  /**
   * Valu API configuration
   */
  valu?: ValuConfig;

  /**
   * CDSSO configuration
   */
  cdsso?: CdssoConfig;

  /**
   * Callback when auth state changes
   */
  onAuthChange?: (isAuthenticated: boolean) => void;

  /**
   * Callback on authentication error
   */
  onError?: (error: Error) => void;
}

/**
 * Merkos Platform specific configuration
 */
export interface MerkosConfig {
  /** API base URL */
  apiUrl?: string;
  /** Client ID for OAuth */
  clientId?: string;
  /** Default site ID for multi-tenant */
  siteId?: string;
  /** Whether to auto-fetch enrichment on login */
  autoFetchEnrichment?: boolean;
}

/**
 * Valu API specific configuration
 */
export interface ValuConfig {
  /** API base URL */
  apiUrl?: string;
  /** Client ID */
  clientId?: string;
  /** Whether to auto-connect when in iframe */
  autoConnect?: boolean;
  /** Connection timeout in ms */
  connectionTimeout?: number;
}

/**
 * CDSSO specific configuration
 */
export interface CdssoConfig {
  /** Allowed domains for CDSSO */
  domains?: string[];
  /** Token sync interval in ms */
  syncInterval?: number;
  /** Storage key prefix */
  storageKeyPrefix?: string;
  /** Whether to auto-check for CDSSO callback on mount */
  autoCheckCallback?: boolean;
}

/**
 * Props for UniverseAuthProvider component
 */
export interface UniverseAuthProviderProps {
  /** Child components */
  children: ReactNode;
  /** Provider configuration */
  config?: UniverseAuthConfig;
}

/**
 * Default configuration values
 */
export const defaultConfig: UniverseAuthConfig = {
  enableMerkos: true,
  enableValu: false,
  enableCDSSO: false,
  autoInitialize: true,
};

/**
 * Default Merkos configuration
 */
export const defaultMerkosConfig: MerkosConfig = {
  autoFetchEnrichment: true,
};

/**
 * Default Valu configuration
 */
export const defaultValuConfig: ValuConfig = {
  autoConnect: true,
  connectionTimeout: 5000,
};

/**
 * Default CDSSO configuration
 */
export const defaultCdssoConfig: CdssoConfig = {
  syncInterval: 5000,
  storageKeyPrefix: 'cdsso_',
  autoCheckCallback: true,
};
