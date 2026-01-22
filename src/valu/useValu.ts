/**
 * useValu Hook - Main hook for accessing Valu Social integration
 *
 * This hook provides access to Valu API functionality including connection
 * state, user authentication, and API methods.
 *
 * @example
 * ```tsx
 * import { useValu } from '@chabaduniverse/auth-sdk';
 *
 * function MyComponent() {
 *   const {
 *     isConnected,
 *     isReady,
 *     user,
 *     sendIntent,
 *     openTextChat,
 *   } = useValu();
 *
 *   if (!isConnected) {
 *     return <div>Not connected to Valu Social</div>;
 *   }
 *
 *   return <button onClick={() => openTextChat()}>Chat</button>;
 * }
 * ```
 */

import { useMemo } from 'react';
import { useValuContext, useValuContextSafe } from './ValuProvider';
import type { ValuUser } from '../types/user';
import type {
  ValuApiConnectionState,
  ValuIntentResponse,
  ValuIntentParams,
  ValuHealthCheckResult,
  RawValuUser,
} from './valu-types';
import { formatValuUser, isInIframe } from './valu-utils';

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useValu hook
 */
export interface UseValuReturn {
  // === Connection State ===

  /** Whether running in a Valu Social iframe */
  isInIframe: boolean;
  /** Whether connected to Valu parent */
  isConnected: boolean;
  /** Whether API is ready for operations */
  isReady: boolean;
  /** Connection error message if any */
  error: string | null;
  /** Full connection state object */
  connectionState: ValuApiConnectionState;

  // === User State ===

  /** Current Valu user (formatted) */
  user: ValuUser | null;
  /** Raw Valu user data */
  rawUser: RawValuUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;

  // === Connection Actions ===

  /** Connect to Valu API */
  connect: () => Promise<boolean>;
  /** Disconnect from Valu API */
  disconnect: () => Promise<void>;
  /** Reconnect to Valu API */
  reconnect: () => Promise<boolean>;

  // === API Methods ===

  /** Send an intent to a Valu application */
  sendIntent: (
    applicationId: string,
    action?: string,
    params?: ValuIntentParams
  ) => Promise<ValuIntentResponse>;

  /** Call a Valu service */
  callService: (
    applicationId: string,
    action?: string,
    params?: ValuIntentParams
  ) => Promise<ValuIntentResponse>;

  /** Run a Valu console command */
  runConsoleCommand: (command: string) => Promise<unknown>;

  // === Quick Actions ===

  /** Open text chat with optional user */
  openTextChat: (userId?: string) => Promise<ValuIntentResponse>;

  /** Open video chat with optional user */
  openVideoChat: (userId?: string) => Promise<ValuIntentResponse>;

  // === Health Monitoring ===

  /** Perform a health check */
  healthCheck: () => Promise<ValuHealthCheckResult>;

  /** Get current health status */
  getHealthStatus: () => ValuHealthCheckResult;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * useValu hook
 *
 * Main hook for accessing Valu Social integration features.
 * Must be used within a ValuProvider.
 *
 * @throws Error if used outside of ValuProvider
 */
export function useValu(): UseValuReturn {
  const context = useValuContext();

  // Format raw user to ValuUser type
  const formattedUser = useMemo<ValuUser | null>(() => {
    if (!context.user) return null;
    return formatValuUser(context.user);
  }, [context.user]);

  return useMemo<UseValuReturn>(
    () => ({
      // Connection state
      isInIframe: context.connection.isInIframe,
      isConnected: context.connection.isConnected,
      isReady: context.connection.isReady,
      error: context.connection.error,
      connectionState: context.connection,

      // User state
      user: formattedUser,
      rawUser: context.user,
      isAuthenticated: context.isAuthenticated,
      isAuthenticating: context.isAuthenticating,

      // Connection actions
      connect: context.connect,
      disconnect: context.disconnect,
      reconnect: context.reconnect,

      // API methods
      sendIntent: context.sendIntent,
      callService: context.callService,
      runConsoleCommand: context.runConsoleCommand,

      // Quick actions
      openTextChat: context.openTextChat,
      openVideoChat: context.openVideoChat,

      // Health monitoring
      healthCheck: context.healthCheck,
      getHealthStatus: context.getHealthStatus,
    }),
    [context, formattedUser]
  );
}

// ============================================================================
// Safe Hook (for optional Valu usage)
// ============================================================================

/**
 * Return type for useValuSafe hook when not in ValuProvider
 */
export interface UseValuSafeReturn {
  /** Whether Valu context is available */
  isAvailable: false;
  /** Whether running in iframe (can check even without context) */
  isInIframe: boolean;
}

/**
 * useValuSafe hook
 *
 * Safe version of useValu that returns null if used outside ValuProvider.
 * Useful for components that may or may not be within the Valu context.
 *
 * @returns UseValuReturn if within ValuProvider, otherwise UseValuSafeReturn
 */
export function useValuSafe(): UseValuReturn | UseValuSafeReturn {
  const context = useValuContextSafe();

  // Check if we're in iframe even without context
  const inIframe = useMemo(() => isInIframe(), []);

  // Format user if context available
  const formattedUser = useMemo<ValuUser | null>(() => {
    if (!context?.user) return null;
    return formatValuUser(context.user);
  }, [context?.user]);

  if (!context) {
    return {
      isAvailable: false,
      isInIframe: inIframe,
    };
  }

  return {
    // Connection state
    isInIframe: context.connection.isInIframe,
    isConnected: context.connection.isConnected,
    isReady: context.connection.isReady,
    error: context.connection.error,
    connectionState: context.connection,

    // User state
    user: formattedUser,
    rawUser: context.user,
    isAuthenticated: context.isAuthenticated,
    isAuthenticating: context.isAuthenticating,

    // Connection actions
    connect: context.connect,
    disconnect: context.disconnect,
    reconnect: context.reconnect,

    // API methods
    sendIntent: context.sendIntent,
    callService: context.callService,
    runConsoleCommand: context.runConsoleCommand,

    // Quick actions
    openTextChat: context.openTextChat,
    openVideoChat: context.openVideoChat,

    // Health monitoring
    healthCheck: context.healthCheck,
    getHealthStatus: context.getHealthStatus,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * useValuConnection hook
 *
 * Focused hook for connection state only.
 */
export function useValuConnection() {
  const context = useValuContext();

  return useMemo(
    () => ({
      isInIframe: context.connection.isInIframe,
      isConnected: context.connection.isConnected,
      isReady: context.connection.isReady,
      health: context.connection.health,
      error: context.connection.error,
      connect: context.connect,
      disconnect: context.disconnect,
      reconnect: context.reconnect,
      healthCheck: context.healthCheck,
      getHealthStatus: context.getHealthStatus,
    }),
    [context]
  );
}

/**
 * useValuUser hook
 *
 * Focused hook for user state only.
 */
export function useValuUser() {
  const context = useValuContext();

  const formattedUser = useMemo<ValuUser | null>(() => {
    if (!context.user) return null;
    return formatValuUser(context.user);
  }, [context.user]);

  return useMemo(
    () => ({
      user: formattedUser,
      rawUser: context.user,
      isAuthenticated: context.isAuthenticated,
      isAuthenticating: context.isAuthenticating,
    }),
    [formattedUser, context.user, context.isAuthenticated, context.isAuthenticating]
  );
}

/**
 * useValuIntents hook
 *
 * Focused hook for intent system.
 */
export function useValuIntents() {
  const context = useValuContext();

  return useMemo(
    () => ({
      sendIntent: context.sendIntent,
      callService: context.callService,
      openTextChat: context.openTextChat,
      openVideoChat: context.openVideoChat,
      isReady: context.connection.isReady,
    }),
    [context]
  );
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if useValuSafe result is a full UseValuReturn
 */
export function isValuAvailable(
  result: UseValuReturn | UseValuSafeReturn
): result is UseValuReturn {
  return !('isAvailable' in result && result.isAvailable === false);
}

// ============================================================================
// Exports
// ============================================================================

export default useValu;
