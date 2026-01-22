/**
 * Valu Social integration module for @chabaduniverse/auth-sdk
 *
 * This module provides integration with @arkeytyp/valu-api for Valu Social
 * authentication and API access within the Chabad Universe ecosystem.
 *
 * @example
 * ```tsx
 * import { ValuProvider, useValu } from '@chabaduniverse/auth-sdk';
 *
 * function App() {
 *   return (
 *     <ValuProvider config={{ autoConnect: true }}>
 *       <MyApp />
 *     </ValuProvider>
 *   );
 * }
 *
 * function MyApp() {
 *   const { isConnected, user, openTextChat } = useValu();
 *
 *   if (!isConnected) return <div>Connecting...</div>;
 *
 *   return (
 *     <div>
 *       <p>Hello, {user?.displayName}!</p>
 *       <button onClick={() => openTextChat()}>Open Chat</button>
 *     </div>
 *   );
 * }
 * ```
 */

// ============================================================================
// Provider
// ============================================================================

export {
  ValuProvider,
  ValuContext,
  useValuContext,
  useValuContextSafe,
  type ValuProviderProps,
} from './ValuProvider';

// ============================================================================
// Hooks
// ============================================================================

export {
  useValu,
  useValuSafe,
  useValuConnection,
  useValuUser,
  useValuIntents,
  isValuAvailable,
  type UseValuReturn,
  type UseValuSafeReturn,
} from './useValu';

// ============================================================================
// Types
// ============================================================================

export type {
  // Connection types
  ValuConnectionHealth,
  ValuApiConnectionState,
  ValuHealthCheckResult,

  // Event types
  ValuEventType,
  ValuEventHandler,

  // Intent types
  ValuIntentParams,
  ValuIntentResponse,
  ValuQueuedIntent,
  ValuIntentQueueStatus,

  // Provider types
  ValuProviderConfig,
  ValuContextValue,

  // Internal types (exported for advanced use)
  ValuInternalState,
  RawValuUser,
} from './valu-types';

export {
  defaultValuProviderConfig,
  initialValuApiConnectionState,
  initialValuInternalState,
} from './valu-types';

// ============================================================================
// Utilities
// ============================================================================

export {
  // Iframe detection
  isInIframe,
  isInValuSocialIframe,
  canPostMessageToParent,

  // User formatting
  mapValuRoles,
  formatValuUser,
  getDisplayName,

  // Connection health
  getHealthDescription,
  isConnectionUsable,

  // Message handling
  isValuApiMessage,
  parseValuMessage,

  // Error handling
  createValuError,
  isValuError,
  isPostRunResultError,

  // Timeout utilities
  createTimeoutPromise,
  withTimeout,

  // Logging
  createValuLogger,
  valuLogger,
  type ValuLogLevel,
} from './valu-utils';
