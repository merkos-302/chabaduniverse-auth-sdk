/**
 * useMerkosAuth — 3-Step Fallback Orchestrator
 *
 * Provides Merkos authentication for sibling apps inside the
 * Chabad Universe iframe via a 3-step fallback:
 *
 * 1. localStorage cache (instant)
 * 2. CDSSO silent auth (network)
 * 3. Popup reconnect (user interaction)
 *
 * Non-iframe contexts get an idle no-op return.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getStoredToken, removeToken, isTokenExpired } from '../cdsso/cdsso-utils';
import { getDefaultCdssoClient } from '../cdsso/cdsso-client';
import { openAuthPopup } from './popup-auth';
import { warnDeprecatedOption, warnInvalidOption } from './deprecation';
import {
  DEFAULT_STORAGE_KEY,
  DEFAULT_ENVIRONMENT,
  ENVIRONMENT_URLS,
  type MerkosEnvironment,
  type UseMerkosAuthOptions,
  type UseMerkosAuthReturn,
  type MerkosAuthMethod,
} from './types';

// ============================================================================
// Iframe Detection
// ============================================================================

function isQualifyingIframe(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if we're in an iframe
  try {
    if (window.self === window.top) return false;
  } catch {
    // Cross-origin: we ARE in an iframe but can't access top
  }

  // Verify parent is chabaduniverse.com
  // 1. ancestorOrigins (Chrome/Safari — not affected by referrer policy)
  const ancestors = (window.location as { ancestorOrigins?: DOMStringList }).ancestorOrigins;
  if (ancestors && ancestors.length > 0) {
    for (let i = 0; i < ancestors.length; i++) {
      if (ancestors[i]?.includes('chabaduniverse.com')) return true;
    }
    return false;
  }

  // 2. Fallback to document.referrer (Firefox)
  if (document.referrer) {
    return document.referrer.includes('chabaduniverse.com');
  }

  // 3. In an iframe but can't verify parent — allow (fail open for iframes)
  return true;
}

// ============================================================================
// Idle (non-iframe) return
// ============================================================================

const noop = () => {};
const IDLE_RETURN: UseMerkosAuthReturn = {
  token: null,
  isAuthenticating: false,
  isAuthenticated: false,
  method: null,
  error: null,
  needsReconnect: false,
  isIframe: false,
  login: noop,
  logout: noop,
  reconnect: noop,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * useMerkosAuth hook
 *
 * 3-step fallback authentication for Merkos OIDC inside Chabad Universe iframes.
 *
 * @param options - Configuration options
 */
export function useMerkosAuth(options: UseMerkosAuthOptions = {}): UseMerkosAuthReturn {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    reconnectMode = 'auto',
    environment = DEFAULT_ENVIRONMENT,
    authUrl: explicitAuthUrl,
    reconnectUrl: explicitReconnectUrl,
    expectedOrigin,
    onAuthenticated,
    debug = false,
    forceEnabled = false,
  } = options;

  // Resolution: explicit URL wins over the env default; deprecation warning fires
  // exactly once per option name across the module's lifetime (Set in deprecation.ts).
  if (explicitAuthUrl !== undefined) {
    warnDeprecatedOption('authUrl', 'Use the `environment` option instead.');
  }
  if (explicitReconnectUrl !== undefined) {
    warnDeprecatedOption('reconnectUrl', 'Use the `environment` option instead.');
  }

  // Runtime fallback for non-TS callers passing an unknown environment string.
  const envEntry = ENVIRONMENT_URLS[environment as MerkosEnvironment];
  if (!envEntry) {
    warnInvalidOption(
      'environment',
      `received "${environment}". Valid: 'production' | 'staging'. Falling back to production.`,
    );
  }
  const envUrls = envEntry ?? ENVIRONMENT_URLS.production;
  const authUrl = explicitAuthUrl ?? envUrls.auth;
  const reconnectUrl = explicitReconnectUrl ?? envUrls.reconnect;

  // Derive per-URL origins; explicit expectedOrigin overrides both
  const authExpectedOrigin = expectedOrigin ?? new URL(authUrl).origin;
  const reconnectExpectedOrigin = expectedOrigin ?? new URL(reconnectUrl).origin;

  // Iframe guard — computed once on client mount (SSR always returns false)
  const [isIframe, setIsIframe] = useState(false);
  const iframeChecked = useRef(false);

  useEffect(() => {
    if (iframeChecked.current) return;
    iframeChecked.current = true;
    setIsIframe(forceEnabled || isQualifyingIframe());
  }, [forceEnabled]);

  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [method, setMethod] = useState<MerkosAuthMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  const hasRun = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const log = useCallback(
    (msg: string, ...args: unknown[]) => {
      if (debug) console.debug('[MerkosAuth]', msg, ...args);
    },
    [debug],
  );

  // ---- Core: run the 3-step fallback ----
  const runFallback = useCallback(async () => {
    setIsAuthenticating(true);
    setError(null);
    setNeedsReconnect(false);

    try {
      // Step 1: localStorage cache
      log('Step 1: checking localStorage cache');
      const cached = getStoredToken(storageKey);
      if (cached && !isTokenExpired(cached)) {
        log('Step 1 hit — cached token valid');
        setToken(cached);
        setMethod('cached');
        setIsAuthenticating(false);
        onAuthenticated?.(cached, 'cached');
        return;
      }

      // Step 2: CDSSO silent auth
      log('Step 2: attempting CDSSO silent auth');
      try {
        const client = getDefaultCdssoClient();
        const user = await client.authenticate();
        if (user) {
          const cdssoToken = client.getBearerToken();
          if (cdssoToken) {
            log('Step 2 hit — CDSSO auth succeeded');
            setToken(cdssoToken);
            setMethod('cdsso');
            setIsAuthenticating(false);
            onAuthenticated?.(cdssoToken, 'cdsso');
            return;
          }
        }
      } catch (err) {
        log('Step 2 failed', err);
      }

      // Step 3: Popup reconnect
      log('Step 3: popup reconnect');
      if (reconnectMode === 'manual') {
        log('Reconnect mode is manual — waiting for user action');
        setNeedsReconnect(true);
        setIsAuthenticating(false);
        return;
      }

      // Auto mode — open login popup
      await openPopupAndWait(authUrl, authExpectedOrigin);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (msg !== 'popup_closed') {
        setError(msg);
      }
      setIsAuthenticating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, reconnectMode, authUrl, authExpectedOrigin, reconnectUrl, reconnectExpectedOrigin, debug]);

  // ---- Popup helper ----
  const openPopupAndWait = useCallback(async (popupUrl: string, popupOrigin: string) => {
    cleanupRef.current?.();
    const { promise, cleanup } = openAuthPopup(popupUrl, popupOrigin, storageKey);
    cleanupRef.current = cleanup;

    try {
      const popupToken = await promise;
      log('Step 3 hit — popup auth succeeded');
      setToken(popupToken);
      setMethod('popup');
      setIsAuthenticating(false);
      setNeedsReconnect(false);
      onAuthenticated?.(popupToken, 'popup');
    } catch (err) {
      cleanupRef.current = null;
      throw err;
    }
    cleanupRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, debug]);

  // ---- Public actions ----
  const login = useCallback(() => {
    void runFallback();
  }, [runFallback]);

  const logout = useCallback(() => {
    removeToken(storageKey);
    cleanupRef.current?.();
    cleanupRef.current = null;
    setToken(null);
    setMethod(null);
    setError(null);
    setNeedsReconnect(false);
    setIsAuthenticating(false);
  }, [storageKey]);

  const reconnect = useCallback(() => {
    setNeedsReconnect(false);
    setIsAuthenticating(true);
    setError(null);
    openPopupAndWait(reconnectUrl, reconnectExpectedOrigin).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Reconnect failed';
      if (msg !== 'popup_closed') {
        setError(msg);
      }
      setIsAuthenticating(false);
    });
  }, [openPopupAndWait, reconnectUrl, reconnectExpectedOrigin]);

  // ---- Auto-run once iframe is detected ----
  useEffect(() => {
    if (!isIframe) return;
    if (hasRun.current) return;
    hasRun.current = true;
    void runFallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIframe]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  // Non-iframe → idle
  if (!isIframe) return IDLE_RETURN;

  return {
    token,
    isAuthenticating,
    isAuthenticated: token !== null,
    method,
    error,
    needsReconnect,
    isIframe: true,
    login,
    logout,
    reconnect,
  };
}
