# Valu Social Iframe Integration Guide

This guide covers integrating `@chabaduniverse/auth-sdk` with Valu Social iframe applications, including solutions for common timing issues and best practices.

## Table of Contents

- [Overview](#overview)
- [The Race Condition Problem](#the-race-condition-problem)
- [Solution: Early Message Buffering](#solution-early-message-buffering)
- [Implementation Guide](#implementation-guide)
- [Connection Troubleshooting](#connection-troubleshooting)
- [Best Practices](#best-practices)
- [Complete Example](#complete-example)

---

## Overview

When your React application runs inside a Valu Social iframe, it communicates with the parent Valu Social window via the `postMessage` API. The `@arkeytyp/valu-api` package handles this communication, but there's a critical timing issue that developers must address.

### How Valu Social Communication Works

```
┌─────────────────────────────────────────────────────────────┐
│  Valu Social (Parent Window)                                │
│                                                             │
│   1. Loads iframe with your app                             │
│   2. Sends `api:ready` message IMMEDIATELY                  │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ postMessage('api:ready')
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Your React App (Iframe)                                    │
│                                                             │
│   1. HTML loads                                             │
│   2. JavaScript bundles load                                │
│   3. React initializes  ← api:ready already sent!           │
│   4. ValuApi instantiated (too late!)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## The Race Condition Problem

### What Happens

1. Valu Social loads your iframe and immediately sends an `api:ready` message
2. Your iframe is still loading (HTML parsing, JS bundle fetching)
3. React hasn't initialized yet
4. By the time `ValuApi` is instantiated and starts listening, `api:ready` was already sent
5. Result: `api.connected` returns `false` and the connection never establishes

### Console Evidence

**From Valu Social parent window:**
```
localhost3000 -> api:ready:: {applicationId: 'localhost3000', action: 'open', params: {...}}
```

**From your iframe application:**
```
ValuApiSingleton: Timeout - API_READY not received. Connected: false
```

### Why This Happens

The `@arkeytyp/valu-api` package installs its message listener when `new ValuApi()` is called. In a typical React application:

```tsx
// This runs AFTER React initializes (too late!)
function App() {
  useEffect(() => {
    const api = new ValuApi(); // api:ready was sent before this
  }, []);
}
```

---

## Solution: Early Message Buffering

The solution is to install a message listener **immediately when the module loads**, before React initializes. This listener buffers any early `api:ready` messages and replays them when `ValuApi` is ready.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Module Load Time (BEFORE React)                            │
│                                                             │
│   1. Early message listener installed                       │
│   2. Captures api:ready into buffer                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  React Initialization                                       │
│                                                             │
│   1. React mounts                                           │
│   2. ValuApi instantiated                                   │
│   3. Buffered messages replayed                             │
│   4. Connection established!                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Guide

### Step 1: Create the Early Message Buffer Module

Create a file that will be imported at the top of your entry point:

```typescript
// lib/valu-early-buffer.ts

/**
 * Early Message Buffer for Valu API
 *
 * This module MUST be imported at the very top of your application entry point,
 * BEFORE any React code runs. It captures early api:ready messages from Valu Social
 * that would otherwise be missed during React initialization.
 */

interface BufferedMessage {
  data: unknown;
  origin: string;
  source: MessageEventSource | null;
  timestamp: number;
}

// Buffer to store early messages
const earlyMessageBuffer: BufferedMessage[] = [];

// Track if we've already replayed
let hasReplayed = false;

// Track if listener is installed
let listenerInstalled = false;

/**
 * Early message handler - captures Valu API messages before React initializes
 */
function earlyMessageHandler(event: MessageEvent): void {
  // Only buffer Valu API messages
  const data = event.data;
  if (
    data?.target === 'valuApi' ||
    data?.name === 'api:ready' ||
    data?.type === 'valu:ready'
  ) {
    earlyMessageBuffer.push({
      data: event.data,
      origin: event.origin,
      source: event.source,
      timestamp: Date.now(),
    });

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[ValuEarlyBuffer] Captured early message:', data?.name || data?.type);
    }
  }
}

/**
 * Install the early message listener
 * This runs immediately when the module is imported
 */
function installEarlyListener(): void {
  if (listenerInstalled) return;
  if (typeof window === 'undefined') return;

  window.addEventListener('message', earlyMessageHandler);
  listenerInstalled = true;

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[ValuEarlyBuffer] Early message listener installed');
  }
}

/**
 * Replay buffered messages to trigger ValuApi connection
 * Call this AFTER ValuApi has been instantiated
 */
export function replayBufferedMessages(): void {
  if (hasReplayed) return;
  if (typeof window === 'undefined') return;

  hasReplayed = true;

  if (earlyMessageBuffer.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[ValuEarlyBuffer] No buffered messages to replay');
    }
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[ValuEarlyBuffer] Replaying ${earlyMessageBuffer.length} buffered message(s)`);
  }

  // Replay each buffered message
  earlyMessageBuffer.forEach((buffered) => {
    try {
      const syntheticEvent = new MessageEvent('message', {
        data: buffered.data,
        origin: buffered.origin,
        source: buffered.source as Window,
      });
      window.dispatchEvent(syntheticEvent);
    } catch (error) {
      console.error('[ValuEarlyBuffer] Failed to replay message:', error);
    }
  });

  // Clear the buffer
  earlyMessageBuffer.length = 0;
}

/**
 * Get the current buffer state (for debugging)
 */
export function getBufferState(): {
  messageCount: number;
  hasReplayed: boolean;
  listenerInstalled: boolean;
} {
  return {
    messageCount: earlyMessageBuffer.length,
    hasReplayed,
    listenerInstalled,
  };
}

/**
 * Clean up the early listener (call when no longer needed)
 */
export function removeEarlyListener(): void {
  if (typeof window === 'undefined') return;

  window.removeEventListener('message', earlyMessageHandler);
  listenerInstalled = false;
}

// Install listener IMMEDIATELY when module is imported
installEarlyListener();
```

### Step 2: Import at the Top of Your Entry Point

The early buffer module **must** be imported before any other code:

```typescript
// main.tsx or index.tsx

// CRITICAL: Import early buffer FIRST, before React or any other imports
import './lib/valu-early-buffer';

// Now import React and your app
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Step 3: Create a Valu API Singleton with Replay

```typescript
// lib/valu-api-singleton.ts

import { ValuApi } from '@arkeytyp/valu-api';
import { replayBufferedMessages } from './valu-early-buffer';

let valuApiInstance: ValuApi | null = null;
let initPromise: Promise<ValuApi | null> | null = null;

/**
 * Get or create the Valu API singleton instance
 *
 * This ensures only one ValuApi instance exists and handles
 * the early message replay automatically.
 */
export async function getValuApi(): Promise<ValuApi | null> {
  // Return existing instance if available
  if (valuApiInstance?.connected) {
    return valuApiInstance;
  }

  // Return existing initialization promise if in progress
  if (initPromise) {
    return initPromise;
  }

  // Check if we're in an iframe
  if (typeof window === 'undefined' || window === window.parent) {
    console.debug('[ValuApiSingleton] Not in iframe, skipping Valu API initialization');
    return null;
  }

  initPromise = initializeValuApi();
  return initPromise;
}

async function initializeValuApi(): Promise<ValuApi | null> {
  try {
    console.debug('[ValuApiSingleton] Initializing Valu API');

    // Create the API instance
    valuApiInstance = new ValuApi();

    // Replay any buffered early messages
    replayBufferedMessages();

    // Wait for connection with timeout
    const connected = await waitForConnection(valuApiInstance, 10000);

    if (connected) {
      console.debug('[ValuApiSingleton] Connected successfully');
      return valuApiInstance;
    } else {
      console.warn('[ValuApiSingleton] Connection timeout');
      return valuApiInstance; // Return anyway, might connect later
    }
  } catch (error) {
    console.error('[ValuApiSingleton] Initialization failed:', error);
    return null;
  }
}

function waitForConnection(api: ValuApi, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if already connected
    if (api.connected) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve(api.connected);
    }, timeout);

    // Listen for ready event
    const readyHandler = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };

    api.addEventListener(ValuApi.API_READY, readyHandler);
  });
}

/**
 * Get the current API instance (may be null or disconnected)
 */
export function getValuApiSync(): ValuApi | null {
  return valuApiInstance;
}

/**
 * Check if the Valu API is connected
 */
export function isValuApiConnected(): boolean {
  return valuApiInstance?.connected ?? false;
}
```

### Step 4: Use in Your React Components

```tsx
// App.tsx
import { useEffect, useState } from 'react';
import { getValuApi, isValuApiConnected } from './lib/valu-api-singleton';

function App() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    async function initValu() {
      const api = await getValuApi();
      setIsConnected(api?.connected ?? false);
    }

    initValu();
  }, []);

  return (
    <div>
      <p>Valu Connected: {isConnected ? 'Yes' : 'No'}</p>
      {/* Your app content */}
    </div>
  );
}
```

---

## Connection Troubleshooting

### Problem: `api.connected` Always Returns `false`

**Symptoms:**
- Console shows: "Timeout - API_READY not received"
- `api.connected` is always `false`
- Intent calls fail with "not connected"

**Diagnosis Steps:**

1. **Check if running in iframe:**
   ```typescript
   console.log('In iframe:', window !== window.parent);
   ```

2. **Check if parent can receive messages:**
   ```typescript
   console.log('Can post to parent:', typeof window.parent?.postMessage === 'function');
   ```

3. **Check buffer state:**
   ```typescript
   import { getBufferState } from './lib/valu-early-buffer';
   console.log('Buffer state:', getBufferState());
   ```

4. **Check for early messages in console:**
   - Open browser DevTools
   - Look for `[ValuEarlyBuffer] Captured early message` logs
   - If you don't see these, the early buffer isn't installed correctly

**Solutions:**

| Issue | Solution |
|-------|----------|
| No early messages captured | Ensure early buffer is imported FIRST in entry point |
| Messages captured but not replayed | Call `replayBufferedMessages()` after ValuApi instantiation |
| Not in iframe | The API only works inside Valu Social iframes |
| Cross-origin blocked | Check Valu Social configuration for your domain |

### Problem: Intermittent Connection Failures

**Symptoms:**
- Sometimes connects, sometimes doesn't
- Connection depends on page load speed

**Solution:**
This is the classic race condition. Ensure you're using the early message buffer pattern described above.

### Problem: Connection Works in Development, Fails in Production

**Symptoms:**
- Works with dev server
- Fails when deployed

**Possible Causes:**
1. **Bundle splitting** - Early buffer might load in a separate chunk
2. **CDN caching** - Old code without the fix is cached

**Solutions:**
1. Ensure early buffer is in the main entry chunk (not lazy-loaded)
2. Clear CDN cache after deploying the fix
3. Add cache-busting version to your bundle

### Problem: `postRunResult` Errors

**Symptoms:**
- Console errors mentioning `postRunResult`
- Some operations fail silently

**Solution:**
The SDK includes patches for known `postRunResult` bugs. Ensure you're using the latest version. If using `ValuApi` directly, implement error handling:

```typescript
try {
  await api.runConsoleCommand(command);
} catch (error) {
  if (error.message?.includes('postRunResult')) {
    // Suppress this known bug - operation may have succeeded
    console.warn('postRunResult error (suppressed)');
    return;
  }
  throw error;
}
```

---

## Best Practices

### 1. Initialize Message Listeners at Module Load Time

**Do:**
```typescript
// At the top level of a module (runs immediately on import)
if (typeof window !== 'undefined') {
  window.addEventListener('message', handler);
}
```

**Don't:**
```typescript
// Inside React lifecycle (too late!)
useEffect(() => {
  window.addEventListener('message', handler);
}, []);
```

### 2. Always Check `api.connected` Before Operations

```typescript
async function sendValuIntent(applicationId: string, action: string) {
  const api = getValuApiSync();

  if (!api?.connected) {
    console.warn('Valu API not connected, operation skipped');
    return null;
  }

  return api.sendIntent(new Intent(applicationId, action));
}
```

### 3. Implement Graceful Fallbacks

```typescript
function ValuFeature() {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    getValuApi().then(api => {
      setIsAvailable(api?.connected ?? false);
    });
  }, []);

  if (!isAvailable) {
    return <FallbackUI />;
  }

  return <ValuIntegration />;
}
```

### 4. Use TypeScript for Type Safety

```typescript
import type { ValuApi } from '@arkeytyp/valu-api';

interface ValuState {
  api: ValuApi | null;
  isConnected: boolean;
  error: Error | null;
}
```

### 5. Handle Reconnection Scenarios

```typescript
function useValuConnection() {
  const [state, setState] = useState({ isConnected: false });

  useEffect(() => {
    let mounted = true;

    async function connect() {
      const api = await getValuApi();
      if (!mounted) return;

      setState({ isConnected: api?.connected ?? false });

      // Monitor for disconnection
      const interval = setInterval(() => {
        if (!mounted) return;
        const connected = isValuApiConnected();
        setState(prev => {
          if (prev.isConnected !== connected) {
            return { isConnected: connected };
          }
          return prev;
        });
      }, 5000);

      return () => clearInterval(interval);
    }

    connect();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
```

### 6. Log Strategically for Debugging

```typescript
const DEBUG = process.env.NODE_ENV !== 'production';

function valuLog(message: string, ...args: unknown[]) {
  if (DEBUG) {
    console.debug(`[Valu] ${message}`, ...args);
  }
}
```

---

## Complete Example

Here's a complete example of a properly configured Valu Social iframe application:

### Project Structure

```
src/
├── lib/
│   ├── valu-early-buffer.ts    # Import FIRST
│   └── valu-api-singleton.ts   # Singleton with replay
├── components/
│   └── ValuFeatures.tsx        # Valu-dependent UI
├── App.tsx
└── main.tsx                    # Entry point
```

### Entry Point (main.tsx)

```typescript
// CRITICAL: Import early buffer FIRST
import './lib/valu-early-buffer';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { UniverseAuthProvider } from '@chabaduniverse/auth-sdk';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UniverseAuthProvider appId="my-valu-app">
      <App />
    </UniverseAuthProvider>
  </React.StrictMode>
);
```

### App Component (App.tsx)

```tsx
import { useEffect, useState } from 'react';
import { getValuApi } from './lib/valu-api-singleton';
import ValuFeatures from './components/ValuFeatures';

function App() {
  const [valuState, setValuState] = useState({
    isLoading: true,
    isConnected: false,
    error: null as Error | null,
  });

  useEffect(() => {
    let mounted = true;

    async function initValu() {
      try {
        const api = await getValuApi();
        if (!mounted) return;

        setValuState({
          isLoading: false,
          isConnected: api?.connected ?? false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;
        setValuState({
          isLoading: false,
          isConnected: false,
          error: error as Error,
        });
      }
    }

    initValu();

    return () => {
      mounted = false;
    };
  }, []);

  if (valuState.isLoading) {
    return <div>Connecting to Valu Social...</div>;
  }

  if (valuState.error) {
    return <div>Error: {valuState.error.message}</div>;
  }

  return (
    <div>
      <header>
        <h1>My Valu App</h1>
        <span>Status: {valuState.isConnected ? 'Connected' : 'Standalone'}</span>
      </header>

      {valuState.isConnected ? (
        <ValuFeatures />
      ) : (
        <div>Running in standalone mode (not in Valu Social iframe)</div>
      )}
    </div>
  );
}

export default App;
```

### Valu Features Component

```tsx
import { useState } from 'react';
import { getValuApiSync } from '../lib/valu-api-singleton';
import { Intent } from '@arkeytyp/valu-api';

function ValuFeatures() {
  const [result, setResult] = useState<string>('');

  const openChat = async () => {
    const api = getValuApiSync();
    if (!api?.connected) {
      setResult('Not connected to Valu');
      return;
    }

    try {
      await api.sendIntent(new Intent('textchat', Intent.ACTION_OPEN));
      setResult('Chat opened');
    } catch (error) {
      setResult(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div>
      <h2>Valu Features</h2>
      <button onClick={openChat}>Open Chat</button>
      {result && <p>{result}</p>}
    </div>
  );
}

export default ValuFeatures;
```

---

## Using with @chabaduniverse/auth-sdk

When using the SDK's `ValuProvider`, the early message buffer is still recommended:

```tsx
// main.tsx
import './lib/valu-early-buffer';

import { UniverseAuthProvider } from '@chabaduniverse/auth-sdk';

function App() {
  return (
    <UniverseAuthProvider
      appId="my-app"
      config={{
        enableValu: true,
        valu: {
          autoConnect: true,
          connectionTimeout: 10000,
        }
      }}
    >
      <MyApp />
    </UniverseAuthProvider>
  );
}
```

The SDK's `ValuProvider` handles most connection logic, but the early buffer ensures no messages are lost during initial load.

---

## References

- [Valu API Documentation](https://github.com/arkeytyp/valu-api)
- [Universe Portal Reference Implementation](https://github.com/merkos-302/universe-portal)
- [@chabaduniverse/auth-sdk API Reference](./API.md)
