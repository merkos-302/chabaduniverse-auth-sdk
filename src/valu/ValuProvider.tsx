/**
 * ValuProvider - React Context Provider for Valu Social integration
 *
 * This provider manages the Valu API connection lifecycle and provides
 * access to Valu features through React context.
 *
 * @example
 * ```tsx
 * import { ValuProvider, useValu } from '@chabaduniverse/auth-sdk';
 *
 * function App() {
 *   return (
 *     <ValuProvider config={{ autoConnect: true }}>
 *       <MyComponent />
 *     </ValuProvider>
 *   );
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { ValuApi, Intent } from '@arkeytyp/valu-api';
import type {
  ValuProviderConfig,
  ValuContextValue,
  ValuInternalState,
  ValuApiConnectionState,
  ValuHealthCheckResult,
  ValuIntentResponse,
  ValuIntentParams,
  ValuEventType,
  ValuEventHandler,
  RawValuUser,
} from './valu-types';
import {
  defaultValuProviderConfig,
  initialValuInternalState,
} from './valu-types';
import {
  isInIframe,
  canPostMessageToParent,
  valuLogger,
  withTimeout,
  isPostRunResultError,
} from './valu-utils';

// ============================================================================
// Context Definition
// ============================================================================

const ValuContext = createContext<ValuContextValue | null>(null);

/**
 * Props for ValuProvider component
 */
export interface ValuProviderProps {
  /** Child components */
  children: ReactNode;
  /** Provider configuration */
  config?: Partial<ValuProviderConfig>;
  /** Callback when connection state changes */
  onConnectionChange?: (isConnected: boolean) => void;
  /** Callback when user is authenticated */
  onUserAuthenticated?: (user: RawValuUser) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// ============================================================================
// Provider Implementation
// ============================================================================

/**
 * ValuProvider component
 *
 * Manages Valu API connection lifecycle and provides context to children.
 */
export function ValuProvider({
  children,
  config: userConfig,
  onConnectionChange,
  onUserAuthenticated: _onUserAuthenticated,
  onError,
}: ValuProviderProps) {
  // Note: _onUserAuthenticated is reserved for future use when user auth is added to this provider
  // Merge user config with defaults
  const config = useMemo(
    () => ({ ...defaultValuProviderConfig, ...userConfig }),
    [userConfig]
  );

  // Internal state
  const [state, setState] = useState<ValuInternalState>(initialValuInternalState);

  // Refs for stable references
  const apiRef = useRef<ValuApi | null>(null);
  const eventListenersRef = useRef<Map<string, Set<ValuEventHandler>>>(new Map());
  const healthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);

  // ============================================================================
  // Connection State Management
  // ============================================================================

  /**
   * Update connection state
   */
  const updateConnectionState = useCallback(
    (updates: Partial<ValuApiConnectionState>) => {
      setState((prev) => ({
        ...prev,
        connection: { ...prev.connection, ...updates },
      }));
    },
    []
  );

  /**
   * Notify listeners of API events
   */
  const notifyEventListeners = useCallback(
    (event: ValuEventType, data: unknown) => {
      const listeners = eventListenersRef.current.get(event);
      if (listeners) {
        listeners.forEach((handler) => {
          try {
            handler(data);
          } catch (err) {
            valuLogger.error('Error in event listener', err);
          }
        });
      }
    },
    []
  );

  // ============================================================================
  // API Initialization
  // ============================================================================

  /**
   * Initialize Valu API connection
   */
  const initializeApi = useCallback(async (): Promise<boolean> => {
    // Prevent double initialization
    if (initializingRef.current || apiRef.current) {
      valuLogger.debug('API already initializing or initialized');
      return apiRef.current !== null;
    }

    // Check environment
    const inIframe = isInIframe();
    updateConnectionState({ isInIframe: inIframe });

    if (!inIframe) {
      valuLogger.info('Not running in iframe, skipping Valu API initialization');
      return false;
    }

    if (!canPostMessageToParent()) {
      valuLogger.warn('Cannot post messages to parent window');
      updateConnectionState({ error: 'Cannot communicate with parent window' });
      return false;
    }

    initializingRef.current = true;

    try {
      valuLogger.info('Initializing Valu API connection');

      // Create API instance
      const api = new ValuApi();
      apiRef.current = api;

      // Apply monkey patches for known issues
      applyApiPatches(api);

      // Wait for API_READY event with timeout
      const connected = await withTimeout(
        new Promise<boolean>((resolve) => {
          const readyHandler = () => {
            valuLogger.info('Valu API ready event received');
            resolve(true);
          };

          api.addEventListener(ValuApi.API_READY, readyHandler);

          // Also set a fallback timer
          setTimeout(() => {
            if (!mountedRef.current) return;
            // Even if API_READY doesn't fire, the API might still work
            if (api.connected) {
              resolve(true);
            }
          }, 2000);
        }),
        config.connectionTimeout,
        'Valu API connection timeout'
      );

      if (!mountedRef.current) return false;

      // Update state on successful connection
      setState((prev) => ({
        ...prev,
        api,
        connection: {
          ...prev.connection,
          isConnected: connected,
          isReady: connected,
          health: connected ? 'healthy' : 'disconnected',
          connectionTimeout: false,
          lastSuccessfulCommunication: connected ? Date.now() : null,
          error: null,
        },
      }));

      // Notify listeners
      notifyEventListeners('connection:established', { connected });
      onConnectionChange?.(connected);

      // Start health monitoring if connected
      if (connected && config.healthCheckInterval > 0) {
        startHealthMonitoring();
      }

      valuLogger.info('Valu API initialization complete', { connected });
      return connected;
    } catch (error) {
      valuLogger.error('Valu API initialization failed', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      updateConnectionState({
        isConnected: false,
        isReady: false,
        health: 'disconnected',
        connectionTimeout: errorMessage.includes('timeout'),
        error: errorMessage,
      });

      onError?.(error instanceof Error ? error : new Error(errorMessage));
      return false;
    } finally {
      initializingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- startHealthMonitoring is intentionally excluded to avoid circular deps
  }, [
    config.connectionTimeout,
    config.healthCheckInterval,
    updateConnectionState,
    notifyEventListeners,
    onConnectionChange,
    onError,
  ]);

  /**
   * Apply monkey patches to fix known Valu API issues
   */
  function applyApiPatches(api: ValuApi): void {
    // Patch runConsoleCommand to handle postRunResult errors
    const originalRunConsoleCommand = (api as unknown as { runConsoleCommand: (cmd: string) => Promise<unknown> }).runConsoleCommand;
    if (originalRunConsoleCommand) {
      (api as unknown as { runConsoleCommand: (cmd: string) => Promise<unknown> }).runConsoleCommand = async function (command: string) {
        try {
          return await originalRunConsoleCommand.call(this, command);
        } catch (error) {
          if (isPostRunResultError(error)) {
            valuLogger.warn('Caught postRunResult error in runConsoleCommand');
            if (command.includes('app open')) {
              return { success: true, warning: 'postRunResult error suppressed' };
            }
            return null;
          }
          throw error;
        }
      };
    }

    // Patch sendIntent to handle postRunResult errors
    const originalSendIntent = (api as unknown as { sendIntent: (intent: Intent) => Promise<unknown> }).sendIntent;
    if (originalSendIntent) {
      (api as unknown as { sendIntent: (intent: Intent) => Promise<unknown> }).sendIntent = async function (intent: Intent) {
        try {
          return await originalSendIntent.call(this, intent);
        } catch (error) {
          if (isPostRunResultError(error)) {
            valuLogger.warn('Caught postRunResult error in sendIntent');
            return { success: true, data: { warning: 'postRunResult error suppressed' } };
          }
          throw error;
        }
      };
    }
  }

  // ============================================================================
  // Health Monitoring
  // ============================================================================

  /**
   * Perform a health check (defined early for use in startHealthMonitoring)
   */
  const performHealthCheckSync = (): ValuHealthCheckResult => {
    const now = Date.now();

    if (!apiRef.current) {
      return {
        health: 'disconnected',
        lastCheck: now,
        lastSuccessfulOperation: null,
        details: 'No API instance',
      };
    }

    try {
      // Check if API is connected
      if (!apiRef.current.connected) {
        return {
          health: 'disconnected',
          lastCheck: now,
          lastSuccessfulOperation: state.connection.lastSuccessfulCommunication,
          details: 'API not connected',
        };
      }

      // API appears healthy
      return {
        health: 'healthy',
        lastCheck: now,
        lastSuccessfulOperation: now,
        details: 'API connected and responsive',
      };
    } catch (error) {
      return {
        health: 'degraded',
        lastCheck: now,
        lastSuccessfulOperation: state.connection.lastSuccessfulCommunication,
        details: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  };

  /**
   * Stop health monitoring (defined before startHealthMonitoring to avoid circular deps)
   */
  const stopHealthMonitoringFn = (): void => {
    if (healthIntervalRef.current) {
      clearInterval(healthIntervalRef.current);
      healthIntervalRef.current = null;
    }
  };

  /**
   * Start health monitoring interval
   */
  const startHealthMonitoring = useCallback(() => {
    stopHealthMonitoringFn();

    if (config.healthCheckInterval <= 0) return;

    healthIntervalRef.current = setInterval(() => {
      if (!mountedRef.current || !apiRef.current) return;

      try {
        const health = performHealthCheckSync();
        if (!mountedRef.current) return;

        updateConnectionState({
          health: health.health,
          lastSuccessfulCommunication:
            health.health === 'healthy'
              ? Date.now()
              : state.connection.lastSuccessfulCommunication,
        });
      } catch (error) {
        valuLogger.debug('Health check failed', error);
      }
    }, config.healthCheckInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- performHealthCheckSync is defined outside useCallback to avoid re-renders
  }, [config.healthCheckInterval, state.connection.lastSuccessfulCommunication, updateConnectionState]);

  /**
   * Stop health monitoring (wrapper for the sync function)
   */
  const stopHealthMonitoring = useCallback(() => {
    stopHealthMonitoringFn();
  }, []);

  /**
   * Perform a health check (async wrapper)
   */
  const performHealthCheck = useCallback((): Promise<ValuHealthCheckResult> => {
    return Promise.resolve(performHealthCheckSync());
  // eslint-disable-next-line react-hooks/exhaustive-deps -- performHealthCheckSync is defined outside useCallback to avoid re-renders
  }, []);

  // ============================================================================
  // Public Actions
  // ============================================================================

  /**
   * Connect to Valu API
   */
  const connect = useCallback(async (): Promise<boolean> => {
    return initializeApi();
  }, [initializeApi]);

  /**
   * Disconnect from Valu API
   */
  const disconnect = useCallback((): Promise<void> => {
    valuLogger.info('Disconnecting from Valu API');

    stopHealthMonitoring();

    // Clear event listeners
    eventListenersRef.current.clear();

    // Reset state
    apiRef.current = null;
    setState(initialValuInternalState);

    notifyEventListeners('connection:lost', {});
    onConnectionChange?.(false);

    return Promise.resolve();
  }, [stopHealthMonitoring, notifyEventListeners, onConnectionChange]);

  /**
   * Reconnect to Valu API
   */
  const reconnect = useCallback(async (): Promise<boolean> => {
    if (state.isReconnecting) {
      valuLogger.debug('Reconnection already in progress');
      return false;
    }

    if (state.reconnectAttempts >= config.maxReconnectAttempts) {
      valuLogger.warn('Max reconnection attempts reached');
      return false;
    }

    setState((prev) => ({
      ...prev,
      isReconnecting: true,
      reconnectAttempts: prev.reconnectAttempts + 1,
    }));

    try {
      await disconnect();
      const success = await initializeApi();

      setState((prev) => ({
        ...prev,
        isReconnecting: false,
        reconnectAttempts: success ? 0 : prev.reconnectAttempts,
      }));

      return success;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isReconnecting: false,
      }));
      return false;
    }
  }, [
    state.isReconnecting,
    state.reconnectAttempts,
    config.maxReconnectAttempts,
    disconnect,
    initializeApi,
  ]);

  /**
   * Get raw API instance
   */
  const getApi = useCallback((): ValuApi | null => {
    return apiRef.current;
  }, []);

  /**
   * Run a console command
   */
  const runConsoleCommand = useCallback(
    async (command: string): Promise<unknown> => {
      if (!apiRef.current) {
        throw new Error('Valu API not connected');
      }

      try {
        // Cast to unknown since Valu API returns any
        const result: unknown = await (apiRef.current.runConsoleCommand(command) as Promise<unknown>);

        // Record successful operation
        updateConnectionState({
          health: 'healthy',
          lastSuccessfulCommunication: Date.now(),
        });

        return result;
      } catch (error) {
        valuLogger.error('Console command failed', { command, error });
        throw error;
      }
    },
    [updateConnectionState]
  );

  /**
   * Send an intent to a Valu application
   */
  const sendIntent = useCallback(
    async (
      applicationId: string,
      action?: string,
      params?: ValuIntentParams
    ): Promise<ValuIntentResponse> => {
      if (!apiRef.current) {
        return {
          success: false,
          error: 'Valu API not connected',
        };
      }

      try {
        const intent = new Intent(applicationId, action, params);
        // Cast to unknown since Valu API returns any
        const result: unknown = await (apiRef.current.sendIntent(intent) as Promise<unknown>);

        updateConnectionState({
          health: 'healthy',
          lastSuccessfulCommunication: Date.now(),
        });

        const intentInfo: ValuIntentResponse['intent'] = { applicationId };
        if (action !== undefined) intentInfo.action = action;
        if (params !== undefined) intentInfo.params = params;

        return {
          success: true,
          data: result,
          intent: intentInfo,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Intent failed';
        const intentInfo: ValuIntentResponse['intent'] = { applicationId };
        if (action !== undefined) intentInfo.action = action;
        if (params !== undefined) intentInfo.params = params;

        return {
          success: false,
          error: errorMessage,
          intent: intentInfo,
        };
      }
    },
    [updateConnectionState]
  );

  /**
   * Call a Valu service
   */
  const callService = useCallback(
    async (
      applicationId: string,
      action?: string,
      params?: ValuIntentParams
    ): Promise<ValuIntentResponse> => {
      if (!apiRef.current) {
        return {
          success: false,
          error: 'Valu API not connected',
        };
      }

      try {
        const intent = new Intent(applicationId, action, params);
        // Cast to unknown since Valu API returns any
        const result: unknown = await (apiRef.current.callService(intent) as Promise<unknown>);

        updateConnectionState({
          health: 'healthy',
          lastSuccessfulCommunication: Date.now(),
        });

        const intentInfo: ValuIntentResponse['intent'] = { applicationId };
        if (action !== undefined) intentInfo.action = action;
        if (params !== undefined) intentInfo.params = params;

        return {
          success: true,
          data: result,
          intent: intentInfo,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Service call failed';
        const intentInfo: ValuIntentResponse['intent'] = { applicationId };
        if (action !== undefined) intentInfo.action = action;
        if (params !== undefined) intentInfo.params = params;

        return {
          success: false,
          error: errorMessage,
          intent: intentInfo,
        };
      }
    },
    [updateConnectionState]
  );

  /**
   * Open text chat
   */
  const openTextChat = useCallback(
    async (userId?: string): Promise<ValuIntentResponse> => {
      return sendIntent('textchat', Intent.ACTION_OPEN, userId ? { userId } : undefined);
    },
    [sendIntent]
  );

  /**
   * Open video chat
   */
  const openVideoChat = useCallback(
    async (userId?: string): Promise<ValuIntentResponse> => {
      return sendIntent('videochat', Intent.ACTION_OPEN, userId ? { userId } : undefined);
    },
    [sendIntent]
  );

  /**
   * Perform health check
   */
  const healthCheck = useCallback(async (): Promise<ValuHealthCheckResult> => {
    return performHealthCheck();
  }, [performHealthCheck]);

  /**
   * Get current health status
   */
  const getHealthStatus = useCallback((): ValuHealthCheckResult => {
    return {
      health: state.connection.health,
      lastCheck: Date.now(),
      lastSuccessfulOperation: state.connection.lastSuccessfulCommunication,
    };
  }, [state.connection.health, state.connection.lastSuccessfulCommunication]);

  /**
   * Add event listener
   */
  const addEventListener = useCallback(
    (event: ValuEventType, handler: ValuEventHandler): (() => void) => {
      if (!eventListenersRef.current.has(event)) {
        eventListenersRef.current.set(event, new Set());
      }
      eventListenersRef.current.get(event)!.add(handler);

      // Also add to API if available
      if (apiRef.current && (event === 'api:ready' || event === 'on_route')) {
        apiRef.current.addEventListener(event, handler);
      }

      return () => {
        eventListenersRef.current.get(event)?.delete(handler);
        if (apiRef.current) {
          apiRef.current.removeEventListener(event, handler);
        }
      };
    },
    []
  );

  // ============================================================================
  // Lifecycle Effects
  // ============================================================================

  /**
   * Auto-connect on mount if configured
   */
  useEffect(() => {
    mountedRef.current = true;

    if (config.autoConnect) {
      void initializeApi();
    }

    return () => {
      mountedRef.current = false;
      stopHealthMonitoring();
    };
  }, [config.autoConnect, initializeApi, stopHealthMonitoring]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue = useMemo<ValuContextValue>(
    () => ({
      // Connection state
      connection: state.connection,

      // User state
      user: state.user,
      isAuthenticated: state.user !== null,
      isAuthenticating: state.isAuthenticating,

      // Actions
      connect,
      disconnect,
      reconnect,

      // API access
      getApi,
      runConsoleCommand,

      // Intent system
      sendIntent,
      callService,

      // Convenience methods
      openTextChat,
      openVideoChat,

      // Health monitoring
      healthCheck,
      getHealthStatus,

      // Event handling
      addEventListener,
    }),
    [
      state.connection,
      state.user,
      state.isAuthenticating,
      connect,
      disconnect,
      reconnect,
      getApi,
      runConsoleCommand,
      sendIntent,
      callService,
      openTextChat,
      openVideoChat,
      healthCheck,
      getHealthStatus,
      addEventListener,
    ]
  );

  return (
    <ValuContext.Provider value={contextValue}>{children}</ValuContext.Provider>
  );
}

// ============================================================================
// Context Hook
// ============================================================================

/**
 * Hook to access Valu context
 *
 * @throws Error if used outside of ValuProvider
 */
export function useValuContext(): ValuContextValue {
  const context = useContext(ValuContext);
  if (!context) {
    throw new Error('useValuContext must be used within a ValuProvider');
  }
  return context;
}

/**
 * Hook to safely access Valu context (returns null if outside provider)
 */
export function useValuContextSafe(): ValuContextValue | null {
  return useContext(ValuContext);
}

// Export context for advanced use cases
export { ValuContext };
