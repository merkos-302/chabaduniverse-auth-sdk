/**
 * Popup Authentication Utility
 *
 * Opens a popup window for Merkos OIDC auth and listens for the token
 * via postMessage (primary) or BroadcastChannel (fallback for window.opener=null).
 *
 * @internal Not exported from the barrel — used by useMerkosOIDC and useMerkosAuth.
 */

import {
  MERKOS_AUTH_MESSAGE_TYPE,
  BROADCAST_CHANNEL_NAME,
  type MerkosAuthTokenMessage,
} from './types';
import { storeToken } from '../cdsso/cdsso-utils';

// ============================================================================
// Types
// ============================================================================

export interface PopupAuthResult {
  /** Resolves with the JWT token string */
  promise: Promise<string>;
  /** Call to tear down all listeners and close the popup */
  cleanup: () => void;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Open an auth popup and wait for a token response.
 *
 * @param url - URL to open in the popup
 * @param expectedOrigin - Origin to validate postMessage against
 * @param storageKey - localStorage key to store the token under
 */
export function openAuthPopup(
  url: string,
  expectedOrigin: string,
  storageKey: string,
): PopupAuthResult {
  let settled = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let popup: Window | null = null;
  let channel: BroadcastChannel | null = null;
  let succeed: (token: string) => void;
  let fail: (reason: string) => void;

  // ---- postMessage listener (hoisted so cleanup can reference it) ----
  function onMessage(event: MessageEvent) {
    if (event.origin !== expectedOrigin) return;

    const data = event.data as MerkosAuthTokenMessage | undefined;
    if (data && data.type === MERKOS_AUTH_MESSAGE_TYPE && typeof data.token === 'string') {
      succeed(data.token);
    }
  }

  const cleanup = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    window.removeEventListener('message', onMessage);
    if (channel) {
      channel.close();
      channel = null;
    }
    if (popup && !popup.closed) {
      popup.close();
    }
    popup = null;
  };

  const promise = new Promise<string>((resolve, reject) => {
    // Settle helpers — only the first call wins
    succeed = (token: string) => {
      if (settled) return;
      settled = true;
      storeToken(token, storageKey);
      cleanup();
      resolve(token);
    };

    fail = (reason: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(reason));
    };

    // ---- Open popup ----
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    // Append caller origin so the auth relay can validate & postMessage back
    const popupUrl = new URL(url);
    if (!popupUrl.searchParams.has('origin')) {
      popupUrl.searchParams.set('origin', window.location.origin);
    }

    popup = window.open(
      popupUrl.toString(),
      'merkos_auth_popup',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`,
    );

    if (!popup) {
      fail('popup_blocked');
      return;
    }

    // ---- Register postMessage listener ----
    window.addEventListener('message', onMessage);

    // ---- BroadcastChannel listener (fallback for window.opener=null) ----
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data as MerkosAuthTokenMessage | undefined;
        if (data && data.type === MERKOS_AUTH_MESSAGE_TYPE && typeof data.token === 'string') {
          succeed(data.token);
        }
      };
    } catch {
      // BroadcastChannel not supported — postMessage is the sole path
    }

    // ---- Poll for popup closed ----
    pollTimer = setInterval(() => {
      if (popup && popup.closed) {
        fail('popup_closed');
      }
    }, 500);
  });

  return { promise, cleanup };
}
