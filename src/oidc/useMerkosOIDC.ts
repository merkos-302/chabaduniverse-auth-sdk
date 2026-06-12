/**
 * useMerkosOIDC — Step 3 primitive hook
 *
 * Wraps openAuthPopup() in React lifecycle. Provides a simple
 * `login()` / `isOpen` interface for opening the Merkos OIDC popup.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { openAuthPopup, type PopupAuthResult } from './popup-auth';
import { warnDeprecatedOption, warnInvalidOption } from './deprecation';
import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_STORAGE_KEY,
  ENVIRONMENT_URLS,
  type MerkosEnvironment,
  type UseMerkosOIDCOptions,
  type UseMerkosOIDCReturn,
} from './types';

/**
 * useMerkosOIDC hook
 *
 * Opens a popup to the Merkos OIDC auth server and resolves with a token.
 * Handles cleanup on unmount.
 *
 * @param options - Configuration options
 * @returns `{ login, isOpen }`
 */
export function useMerkosOIDC(options: UseMerkosOIDCOptions = {}): UseMerkosOIDCReturn {
  const {
    environment = DEFAULT_ENVIRONMENT,
    authUrl: explicitAuthUrl,
    expectedOrigin: explicitExpectedOrigin,
    storageKey = DEFAULT_STORAGE_KEY,
  } = options;

  if (explicitAuthUrl !== undefined) {
    warnDeprecatedOption('authUrl', 'Use the `environment` option instead.');
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
  const expectedOrigin = explicitExpectedOrigin ?? new URL(authUrl).origin;

  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<PopupAuthResult | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      popupRef.current?.cleanup();
      popupRef.current = null;
    };
  }, []);

  const login = useCallback(() => {
    // Don't open a second popup
    if (popupRef.current) return;

    const result = openAuthPopup(authUrl, expectedOrigin, storageKey);
    popupRef.current = result;
    setIsOpen(true);

    result.promise
      .catch(() => {
        // Expected: popup_closed, popup_blocked — handled via isOpen state
      })
      .finally(() => {
        popupRef.current = null;
        setIsOpen(false);
      });
  }, [authUrl, expectedOrigin, storageKey]);

  return { login, isOpen };
}
