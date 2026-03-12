# Merkos OIDC Authentication

Complete guide to the 3-step fallback authentication flow for sibling apps running inside the Chabad Universe iframe.

## Table of Contents

**Part 1 — How It Works**
- [Overview](#overview)
- [Architecture](#architecture)
- [3-Step Fallback Walkthrough](#3-step-fallback-walkthrough)
- [Auth Relay Reconnect Flow](#auth-relay-reconnect-flow)
- [Iframe Detection](#iframe-detection)
- [Security](#security)

**Part 2 — Developer Integration Guide**
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Minimal Integration](#minimal-integration)
- [Full Integration Example](#full-integration-example)
- [Configuration Options](#configuration-options)
- [Return Values](#return-values)
- [Reconnect Mode](#reconnect-mode)
- [Local Development](#local-development)
- [onAuthenticated Callback](#onauthenticated-callback)
- [Error Handling](#error-handling)

**Part 3 — Troubleshooting**
- [Common Issues](#common-issues)

---

# Part 1 — How It Works

## Overview

Mini apps embedded inside `chabaduniverse.com` (e.g., Pan Kloli, Chinuch Universe) run inside an iframe. They need a Merkos JWT token to make authenticated API calls, but they can't redirect the user to a login page — the iframe can't navigate the parent.

`useMerkosOIDCAuth` solves this with a **3-step fallback** that tries the cheapest method first and escalates only when necessary:

| Step | Method | Cost | User Interaction |
|------|--------|------|------------------|
| 1 | localStorage cache | Instant, zero network | None |
| 2 | CDSSO silent auth | One network round-trip | None |
| 3 | Popup reconnect | Opens auth relay popup | Click "Reconnect" |

If the user has visited before, Step 1 resolves instantly. If they have an active Chabad.org session, Step 2 handles it silently. Only as a last resort does Step 3 open a popup asking the user to sign in again.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  chabaduniverse.com (parent)                            │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Mini App iframe (e.g. pan-kloli.vercel.app)      │  │
│  │                                                   │  │
│  │  useMerkosOIDCAuth()                              │  │
│  │    │                                              │  │
│  │    ├─ Step 1: localStorage.getItem(storageKey)    │  │
│  │    │   └─ HIT? → done (method: 'cached')         │  │
│  │    │                                              │  │
│  │    ├─ Step 2: CdssoClient.authenticate()          │  │
│  │    │   └─ HIT? → done (method: 'cdsso')          │  │
│  │    │                                              │  │
│  │    └─ Step 3: openAuthPopup(reconnectUrl)         │  │
│  │        │                                          │  │
│  │        │  ┌──────────────────────────────────┐    │  │
│  │        └──│  Popup: auth.chabaduniverse.com  │    │  │
│  │           │  /merkos/reconnect               │    │  │
│  │           │                                  │    │  │
│  │           │  User clicks "Reconnect"         │    │  │
│  │           │    → /merkos/login?origin=...    │    │  │
│  │           │    → Merkos OIDC flow            │    │  │
│  │           │    → callback with token         │    │  │
│  │           │    → postMessage / Broadcast     │    │  │
│  │           └──────────────────────────────────┘    │  │
│  │                                                   │  │
│  │  Token received → stored in localStorage          │  │
│  │  → onAuthenticated(token, 'popup')                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 3-Step Fallback Walkthrough

### Step 1: localStorage Cache

The hook checks `localStorage` for an existing JWT under the configured `storageKey` (default: `merkos_auth_token`). If found and not expired, it's used immediately — zero latency, zero network.

```
Token found + not expired → setToken(cached) → done
Token missing or expired  → continue to Step 2
```

### Step 2: CDSSO Silent Auth

The hook calls `CdssoClient.authenticate()` which checks for an active Chabad.org SSO session. This works via a cookie-based session check to `auth.chabadorg.com`. If the user has a valid session, a JWT is returned silently.

```
CDSSO succeeds → setToken(cdssoToken) → done
CDSSO fails    → continue to Step 3
```

> **Note:** Step 2 will fail when third-party cookies are blocked (Safari, Firefox strict mode, Chrome with tracking prevention). This is expected — the hook falls through to Step 3.

### Step 3: Popup Reconnect

As a last resort, the hook opens a popup to the auth relay at `auth.chabaduniverse.com/merkos/reconnect`. The popup presents a "Session Expired" screen with a "Reconnect" button.

When the user clicks Reconnect:
1. The popup navigates to `/merkos/login?origin=<mini-app-origin>`
2. Merkos OIDC authorization flow runs (redirect to Merkos, user authenticates, callback)
3. The callback page sends the token back to the opener via `postMessage` and `BroadcastChannel`
4. The mini app receives the token, stores it in localStorage, and resolves

## Auth Relay Reconnect Flow

The auth relay is a Next.js app deployed at `auth.chabaduniverse.com`. The reconnect page handles the popup flow:

```
Popup opens:
  auth.chabaduniverse.com/merkos/reconnect?origin=https://pan-kloli.vercel.app

User sees:
  ┌─────────────────────────┐
  │    ChabadUniverse        │
  │                          │
  │    Session Expired       │
  │                          │
  │  Your Merkos session     │
  │  could not be            │
  │  established.            │
  │  Sign in again to        │
  │  continue.               │
  │                          │
  │  [🔄 Reconnect]         │
  └─────────────────────────┘

Click "Reconnect":
  → /merkos/login?origin=https://pan-kloli.vercel.app
  → Merkos OIDC authorization
  → Callback with token
  → postMessage({ type: 'MERKOS_AUTH_TOKEN', token }) to opener
  → BroadcastChannel('merkos_auth') as fallback
  → Popup closes
```

The `origin` query parameter is critical — it tells the callback page which origin to validate when sending the `postMessage`.

The auth relay also sets a root-domain cookie (`merkos_auth_token` on `.chabaduniverse.com`) during the callback, so future visits can skip straight to Step 1 or Step 2.

## Iframe Detection

The hook only activates when running inside a qualifying iframe (a frame whose parent is `chabaduniverse.com`). Detection uses a 3-tier check:

1. **`window.self === window.top`** — If equal, we're NOT in an iframe. Return false.

2. **`window.location.ancestorOrigins`** (Chrome/Safari) — Lists parent origins without referrer-policy restrictions. Checks if any ancestor includes `chabaduniverse.com`.

3. **`document.referrer`** (Firefox fallback) — Checks if the referrer includes `chabaduniverse.com`.

4. **Fail-open** — If we're definitely in an iframe but can't verify the parent (no ancestorOrigins, no referrer), the hook activates anyway. This prevents silent failure while maintaining security through postMessage origin validation.

Outside an iframe, the hook returns an idle no-op object — all values are null/false, all functions are no-ops. This makes it safe to call unconditionally.

## Security

### Origin Validation

- **postMessage** — The `message` event listener checks `event.origin` against the expected origin (derived from `authUrl` for login popups, `reconnectUrl` for reconnect popups, or an explicit `expectedOrigin` override). Messages from other origins are silently dropped.

- **Popup URL** — The popup URL has the caller's `window.location.origin` appended as a query parameter (`?origin=`), so the auth relay can validate the callback target.

### BroadcastChannel Fallback

Some browsers set `window.opener = null` for security. When this happens, `postMessage` can't reach the opener. The SDK falls back to `BroadcastChannel('merkos_auth')`, which works across same-origin tabs without requiring a window reference.

### Root-Domain Cookie

In addition to postMessage and BroadcastChannel, the auth relay sets a root-domain cookie (`merkos_auth_token` scoped to `.chabaduniverse.com`) after a successful OIDC exchange. This cookie persists across tabs and page reloads, and is what makes Step 1 (localStorage cache) and Step 2 (CDSSO) work on subsequent visits — the CDSSO client detects the cookie and retrieves the session without user interaction.

The SDK itself doesn't read this cookie directly. It's consumed by the CDSSO layer in Step 2.

### Token Storage

Tokens are stored in `localStorage` under the configured key. The hook validates token expiration before using cached tokens (Step 1).

---

# Part 2 — Developer Integration Guide

## Prerequisites

- `@chabaduniverse/auth-sdk` v0.3.0 or later
- Auth relay deployed at `auth.chabaduniverse.com` (or your custom URL)
- Your app is embedded as an iframe inside `chabaduniverse.com`
- React 18+

## Installation

```bash
pnpm add @chabaduniverse/auth-sdk
```

Import from the OIDC sub-path for smaller bundles:

```tsx
import { useMerkosOIDCAuth } from '@chabaduniverse/auth-sdk/oidc';
```

Or from the main entry point:

```tsx
import { useMerkosOIDCAuth } from '@chabaduniverse/auth-sdk';
```

## Minimal Integration

```tsx
import { useMerkosOIDCAuth } from '@chabaduniverse/auth-sdk/oidc';

function App() {
  const { token, isAuthenticated, isAuthenticating } = useMerkosOIDCAuth();

  if (isAuthenticating) return <p>Authenticating...</p>;
  if (!isAuthenticated) return <p>Not authenticated</p>;

  return <p>Authenticated! Token: {token?.slice(0, 20)}...</p>;
}
```

That's it. The hook auto-detects the iframe, runs the 3-step fallback on mount, and provides the token.

## Full Integration Example

```tsx
import { useMerkosOIDCAuth } from '@chabaduniverse/auth-sdk/oidc';

function MiniApp() {
  const {
    token,
    isAuthenticated,
    isAuthenticating,
    needsReconnect,
    method,
    error,
    isIframe,
    login,
    logout,
    reconnect,
  } = useMerkosOIDCAuth({
    reconnectMode: 'manual',
    debug: true,
    onAuthenticated: (token, method) => {
      console.log(`Authenticated via ${method}`);
      // Send token to your backend
      fetch('/api/auth', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  });

  if (!isIframe) {
    return <p>This app must be accessed through ChabadUniverse.</p>;
  }

  if (isAuthenticating) {
    return <div className="spinner">Signing you in...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Authentication failed: {error}</p>
        <button onClick={login}>Try Again</button>
      </div>
    );
  }

  if (needsReconnect) {
    return (
      <div className="reconnect-prompt">
        <p>Your session has expired.</p>
        <button onClick={reconnect}>Reconnect to Merkos</button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <button onClick={login}>Sign In</button>;
  }

  return (
    <div>
      <p>Authenticated via: {method}</p>
      <button onClick={logout}>Sign Out</button>
      {/* Your app content */}
    </div>
  );
}
```

## Configuration Options

All fields on `UseMerkosAuthOptions`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storageKey` | `string` | `'merkos_auth_token'` | localStorage key for the JWT token |
| `reconnectMode` | `'auto' \| 'manual'` | `'auto'` | How Step 3 is handled. `'auto'` opens the popup immediately; `'manual'` sets `needsReconnect: true` and waits for `reconnect()` |
| `authUrl` | `string` | `'https://auth.chabaduniverse.com/merkos/login'` | URL for the auth login popup (used by Step 3 auto mode). Override for test environments |
| `reconnectUrl` | `string` | `'https://auth.chabaduniverse.com/merkos/reconnect'` | URL for the reconnect popup (used by manual `reconnect()`) |
| `expectedOrigin` | `string` | Derived per-URL from `authUrl` / `reconnectUrl` | Origin to validate postMessage responses against. If set explicitly, overrides both auth and reconnect origins |
| `onAuthenticated` | `(token: string, method: MerkosAuthMethod) => void` | — | Callback fired when authentication succeeds (any step) |
| `debug` | `boolean` | `false` | Enable `[MerkosAuth]` debug logging to console |
| `forceEnabled` | `boolean` | `false` | Bypass iframe detection. Use for local development/testing |

## Return Values

All fields on `UseMerkosAuthReturn`:

| Field | Type | Description |
|-------|------|-------------|
| `token` | `string \| null` | Current JWT token, or null if not authenticated |
| `isAuthenticating` | `boolean` | Whether the fallback flow is in progress |
| `isAuthenticated` | `boolean` | Whether a valid token exists (`token !== null`) |
| `method` | `'cached' \| 'cdsso' \| 'popup' \| null` | How the token was obtained |
| `error` | `string \| null` | Error message if authentication failed |
| `needsReconnect` | `boolean` | True when `reconnectMode='manual'` and Steps 1+2 failed |
| `isIframe` | `boolean` | Whether the hook detected a qualifying iframe |
| `login()` | `() => void` | Re-run the full 3-step fallback |
| `logout()` | `() => void` | Clear token from state and localStorage, reset all state |
| `reconnect()` | `() => void` | Open the reconnect popup (for `reconnectMode='manual'`) |

### Non-iframe Behavior

When `isIframe` is `false`, all values are idle defaults: `token: null`, `isAuthenticated: false`, all functions are no-ops. This makes the hook safe to call unconditionally — no conditional logic needed.

## Reconnect Mode

### `reconnectMode: 'auto'` (default)

Steps 1 and 2 fail → the popup opens automatically. Best for apps where the user expects seamless auth.

### `reconnectMode: 'manual'`

Steps 1 and 2 fail → `needsReconnect` is set to `true`. Your UI shows a "Reconnect" button. When clicked, call `reconnect()` to open the popup. Best for apps where you want explicit user consent before opening a popup.

```tsx
// Auto: popup opens immediately on Step 3
useMerkosOIDCAuth({ reconnectMode: 'auto' });

// Manual: your UI decides when to trigger the popup
const { needsReconnect, reconnect } = useMerkosOIDCAuth({ reconnectMode: 'manual' });
if (needsReconnect) {
  return <button onClick={reconnect}>Sign In</button>;
}
```

## Local Development

When developing locally, your app isn't in a `chabaduniverse.com` iframe, so the hook would return idle state. Use `forceEnabled` to bypass the iframe check:

```tsx
useMerkosOIDCAuth({
  forceEnabled: process.env.NODE_ENV === 'development',
  debug: true,
  // Point to your local or test auth relay
  authUrl: 'http://localhost:3001/merkos/login',
  reconnectUrl: 'http://localhost:3001/merkos/reconnect',
});
```

### Local Auth Relay Setup

1. Run the auth relay on `:3001`: `cd chabaduniverse-auth-relay && pnpm dev`
2. Run your mini app on `:3000`
3. Access via `chabaduniverse.com/localhost3000` (if iframe embedding is available) or use `forceEnabled: true`

## onAuthenticated Callback

The `onAuthenticated` callback fires every time authentication succeeds, regardless of which step provided the token. Use it to forward the token to your backend:

```tsx
useMerkosOIDCAuth({
  onAuthenticated: (token, method) => {
    // Set up API client
    apiClient.setAuthHeader(`Bearer ${token}`);

    // Notify your backend
    fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    // Analytics
    analytics.track('authenticated', { method });
  },
});
```

## Error Handling

Errors are surfaced via the `error` field. The hook distinguishes between user actions (popup closed) and real errors:

- **`popup_blocked`** — Browser blocked the popup. The user needs to allow popups for the auth relay domain.
- **`popup_closed`** — User closed the popup without completing auth. This is NOT set as an error (the hook just stays unauthenticated).
- **Other errors** — Network failures, CDSSO errors, etc. are set in the `error` field.

```tsx
const { error, login } = useMerkosOIDCAuth();

if (error) {
  if (error === 'popup_blocked') {
    return <p>Please allow popups for auth.chabaduniverse.com</p>;
  }
  return (
    <div>
      <p>Error: {error}</p>
      <button onClick={login}>Retry</button>
    </div>
  );
}
```

---

# Part 3 — Troubleshooting

## Common Issues

### Hook returns idle state (all null/false)

**Cause:** The hook detected that it's NOT running inside a qualifying iframe under `chabaduniverse.com`.

**Fix:**
- Verify your app is embedded in a `chabaduniverse.com` iframe
- For local development, set `forceEnabled: true`
- Enable `debug: true` to see detection logs

### Popup opens but no token is received

**Cause:** Origin mismatch. The postMessage from the auth relay is being rejected because `event.origin` doesn't match `expectedOrigin`.

**Fix:**
- Check that `authUrl` and `reconnectUrl` point to the correct auth relay
- If using a custom auth relay URL, verify that origins match or set `expectedOrigin` explicitly
- Verify the auth relay callback is sending `postMessage` to the correct origin

### CDSSO always fails (Step 2 skipped)

**Cause:** Third-party cookies are blocked. CDSSO relies on cookies from `auth.chabadorg.com`, which are third-party in the iframe context.

**Fix:** This is expected behavior in Safari, Firefox (strict mode), and Chrome with tracking prevention. The hook correctly falls through to Step 3. No action needed.

### Hydration mismatch (SSR/Next.js)

**Cause:** The iframe detection runs in `useEffect` (client-only), so server-rendered HTML will always show the non-iframe state.

**Fix:** Use `useEffect` for any UI that depends on `isIframe`:

```tsx
const { isIframe } = useMerkosOIDCAuth();

// This is fine — isIframe is false on server, then updates on client
if (!isIframe) return <p>Loading...</p>;
```

### "popup_blocked" error

**Cause:** The browser blocked `window.open()`. Most browsers only allow popups from direct user interaction (click handlers).

**Fix:**
- Use `reconnectMode: 'manual'` so the popup opens from a button click
- Ensure the `login()` or `reconnect()` call is inside a click handler, not in an async callback chain

---

## Related Documentation

- [API Reference](./API.md#oidc-module) — Full hook signatures and types
- [Architecture](./ARCHITECTURE.md#oidc-authentication-flow) — Technical flow diagram
- [Examples](./EXAMPLES.md#merkos-oidc-authentication) — Copy-paste integration examples
