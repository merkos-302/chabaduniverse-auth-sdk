/**
 * Valu-specific type definitions for @chabaduniverse/auth-sdk
 *
 * These types are specific to the Valu Social integration.
 * They complement the types in src/types/user.ts
 */

import type { ValuApi } from '@arkeytyp/valu-api';

/**
 * Connection health status for Valu API
 */
export type ValuConnectionHealth = 'healthy' | 'degraded' | 'disconnected' | 'unknown';

/**
 * Valu API connection state (internal, detailed version)
 * This extends the basic ValuConnectionState from types/providers.ts
 * with additional fields for health monitoring and timing.
 */
export interface ValuApiConnectionState {
  /** Whether running inside a Valu Social iframe */
  isInIframe: boolean;
  /** Whether connected to Valu parent */
  isConnected: boolean;
  /** Whether the API is ready for operations */
  isReady: boolean;
  /** Connection timeout occurred */
  connectionTimeout: boolean;
  /** Connection health status */
  health: ValuConnectionHealth;
  /** Last successful communication timestamp */
  lastSuccessfulCommunication: number | null;
  /** Error message if any */
  error: string | null;
}

/**
 * Health check result from Valu API
 */
export interface ValuHealthCheckResult {
  health: ValuConnectionHealth;
  lastCheck: number;
  lastSuccessfulOperation: number | null;
  details?: string;
}

/**
 * Valu API event types
 */
export type ValuEventType =
  | 'api:ready'
  | 'on_route'
  | 'connection:established'
  | 'connection:lost'
  | 'user:authenticated'
  | 'user:logout';

/**
 * Valu API event handler
 */
export type ValuEventHandler = (data: unknown) => void;

/**
 * Intent parameters for Valu API
 */
export type ValuIntentParams = Record<string, unknown>;

/**
 * Intent response from Valu API
 */
export interface ValuIntentResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  intent?: {
    applicationId: string;
    action?: string;
    params?: ValuIntentParams;
  };
}

/**
 * Queued intent for batch processing
 */
export interface ValuQueuedIntent {
  id: string;
  applicationId: string;
  action?: string | null;
  params?: ValuIntentParams;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  attempts: number;
  maxAttempts: number;
  error?: string;
}

/**
 * Intent queue status
 */
export interface ValuIntentQueueStatus {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  currentlyProcessing: string[];
}

/**
 * Valu provider configuration
 */
export interface ValuProviderConfig {
  /** API base URL (optional override) */
  apiUrl?: string;
  /** Client ID for identification */
  clientId?: string;
  /** Auto-connect when in iframe (default: true) */
  autoConnect?: boolean;
  /** Connection timeout in ms (default: 10000) */
  connectionTimeout?: number;
  /** Health check interval in ms (default: 30000) */
  healthCheckInterval?: number;
  /** Enable automatic reconnection (default: true) */
  enableAutoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 3) */
  maxReconnectAttempts?: number;
}

/**
 * Default Valu provider configuration
 */
export const defaultValuProviderConfig: Required<ValuProviderConfig> = {
  apiUrl: '',
  clientId: '',
  autoConnect: true,
  connectionTimeout: 10000,
  healthCheckInterval: 30000,
  enableAutoReconnect: true,
  maxReconnectAttempts: 3,
};

/**
 * Raw Valu user data from the API
 * This is the raw format returned by Valu API console commands
 */
export interface RawValuUser {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  permissions?: string[];
  profile?: {
    displayName?: string;
    profileImage?: string;
    bio?: string;
  };
  network?: {
    id: string;
    name: string;
    role: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Valu provider internal state
 */
export interface ValuInternalState {
  /** Current connection state */
  connection: ValuApiConnectionState;
  /** Raw API instance */
  api: ValuApi | null;
  /** Current user from Valu */
  user: RawValuUser | null;
  /** Whether user authentication is in progress */
  isAuthenticating: boolean;
  /** Reconnection in progress */
  isReconnecting: boolean;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
}

/**
 * Initial Valu internal state
 */
/**
 * Initial Valu API connection state
 */
export const initialValuApiConnectionState: ValuApiConnectionState = {
  isInIframe: false,
  isConnected: false,
  isReady: false,
  connectionTimeout: false,
  health: 'unknown',
  lastSuccessfulCommunication: null,
  error: null,
};

export const initialValuInternalState: ValuInternalState = {
  connection: initialValuApiConnectionState,
  api: null,
  user: null,
  isAuthenticating: false,
  isReconnecting: false,
  reconnectAttempts: 0,
};

/**
 * Valu context value for React context
 */
export interface ValuContextValue {
  // Connection state
  connection: ValuApiConnectionState;

  // User state
  user: RawValuUser | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;

  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<boolean>;

  // API access
  getApi: () => ValuApi | null;
  runConsoleCommand: (command: string) => Promise<unknown>;

  // Intent system
  sendIntent: (applicationId: string, action?: string, params?: ValuIntentParams) => Promise<ValuIntentResponse>;
  callService: (applicationId: string, action?: string, params?: ValuIntentParams) => Promise<ValuIntentResponse>;

  // Convenience methods
  openTextChat: (userId?: string) => Promise<ValuIntentResponse>;
  openVideoChat: (userId?: string) => Promise<ValuIntentResponse>;

  // Health monitoring
  healthCheck: () => Promise<ValuHealthCheckResult>;
  getHealthStatus: () => ValuHealthCheckResult;

  // Event handling
  addEventListener: (event: ValuEventType, handler: ValuEventHandler) => () => void;
}
