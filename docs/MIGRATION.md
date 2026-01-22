# Migration Guide

This guide helps you migrate from direct usage of `@chabaduniverse/auth` or `@arkeytyp/valu-api` to the unified `@chabaduniverse/auth-sdk`.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Migration from @chabaduniverse/auth](#migration-from-chabaduniverseauth)
- [Migration from @arkeytyp/valu-api](#migration-from-arkeytypvalu-api)
- [Migration from Custom CDSSO](#migration-from-custom-cdsso)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What's Changed

The SDK provides a unified layer over:
- `@chabaduniverse/auth` (Merkos Platform)
- `@arkeytyp/valu-api` (Valu Social)

### Benefits

1. **Single Provider** - One `<UniverseAuthProvider>` instead of multiple
2. **Unified State** - One `useUniverseAuth()` hook for all auth state
3. **CDSSO Built-in** - Cross-domain SSO works out of the box
4. **Type Safety** - Full TypeScript support with unified types
5. **Components** - Pre-built UI components

---

## Installation

```bash
# Install the SDK
pnpm add @chabaduniverse/auth-sdk

# Peer dependencies (if not already installed)
pnpm add @chabaduniverse/auth @arkeytyp/valu-api react
```

---

## Migration from @chabaduniverse/auth

### Before: Direct Merkos Usage

```tsx
// Old approach
import { MerkosAPIAdapter } from '@chabaduniverse/auth';
import { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const adapter = new MerkosAPIAdapter();
    const storedToken = localStorage.getItem('merkos_token');
    if (storedToken) {
      adapter.getCurrentUser(storedToken).then(setUser);
    }
  }, []);

  const login = async (email, password) => {
    const adapter = new MerkosAPIAdapter();
    const result = await adapter.loginWithCredentials(email, password);
    setUser(result.user);
    setToken(result.token);
    localStorage.setItem('merkos_token', result.token);
  };

  return <div>{user ? `Hello ${user.name}` : <LoginForm onLogin={login} />}</div>;
}
```

### After: Using the SDK

```tsx
// New approach
import { UniverseAuthProvider, useUniverseAuth, LoginButton } from '@chabaduniverse/auth-sdk';

function App() {
  return (
    <UniverseAuthProvider appId="my-app">
      <MyApp />
    </UniverseAuthProvider>
  );
}

function MyApp() {
  const { user, isAuthenticated } = useUniverseAuth();

  return (
    <div>
      {isAuthenticated ? (
        `Hello ${user.displayName}`
      ) : (
        <LoginButton provider="merkos" />
      )}
    </div>
  );
}
```

### Mapping Old Code to New

| Old Code | New Code |
|----------|----------|
| `new MerkosAPIAdapter()` | Use `useMerkos()` hook |
| `adapter.loginWithCredentials()` | `merkos.loginWithCredentials()` |
| `adapter.getCurrentUser()` | `merkos.getCurrentUser()` |
| `localStorage.getItem('token')` | `merkos.token` or `getBearerToken()` |
| `adapter.logout()` | `logout()` from `useUniverseAuth()` |

### Accessing Merkos Directly

If you need direct Merkos access:

```tsx
import { useMerkos } from '@chabaduniverse/auth-sdk';

function MerkosSpecificFeature() {
  const {
    user,
    token,
    loginWithCredentials,
    loginWithGoogle,
    loginWithChabadOrg,
    v2Request,
  } = useMerkos();

  // Use Merkos-specific functionality
}
```

---

## Migration from @arkeytyp/valu-api

### Before: Direct Valu Usage

```tsx
// Old approach
import { ValuApi, Intent } from '@arkeytyp/valu-api';

function ValuComponent() {
  const [valu] = useState(() => new ValuApi());
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    valu.on('connected', () => setConnected(true));
    valu.on('user', setUser);
    valu.connect();
  }, []);

  const sendMessage = () => {
    valu.send(new Intent.OpenTextChat({ userId: '123' }));
  };

  return connected ? <button onClick={sendMessage}>Chat</button> : <span>Connecting...</span>;
}
```

### After: Using the SDK

```tsx
// New approach
import { UniverseAuthProvider, useUniverseAuth } from '@chabaduniverse/auth-sdk';

function App() {
  return (
    <UniverseAuthProvider appId="my-app">
      <ValuComponent />
    </UniverseAuthProvider>
  );
}

function ValuComponent() {
  const { providers, isAuthenticated } = useUniverseAuth();
  const { valu } = providers;

  if (!valu.isConnected) {
    return <span>Connecting...</span>;
  }

  const sendMessage = () => {
    valu.openTextChat({ userId: '123' });
  };

  return <button onClick={sendMessage}>Chat</button>;
}
```

### Accessing Valu Directly

```tsx
import { useValuSafe, isValuAvailable } from '@chabaduniverse/auth-sdk';

function ValuFeature() {
  const valuResult = useValuSafe();

  if (!isValuAvailable(valuResult)) {
    return <div>Valu not available</div>;
  }

  const {
    isInIframe,
    isConnected,
    user,
    sendIntent,
    openTextChat,
    openVideoChat,
  } = valuResult;

  // Use Valu-specific functionality
}
```

---

## Migration from Custom CDSSO

### Before: Custom CDSSO Implementation

```tsx
// Old approach - often scattered across files
const checkRemoteSession = async () => {
  const response = await fetch('https://auth.chabadorg.com/api/session');
  return response.json();
};

const handleCallback = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    localStorage.setItem('cdsso_token', token);
    // Clean up URL, redirect, etc.
  }
};

useEffect(() => {
  handleCallback();
  checkRemoteSession().then(/* ... */);
}, []);
```

### After: Using SDK's Built-in CDSSO

```tsx
// New approach - CDSSO is automatic
import { UniverseAuthProvider, useUniverseAuth } from '@chabaduniverse/auth-sdk';

function App() {
  return (
    <UniverseAuthProvider
      appId="my-app"
      config={{
        enableCDSSO: true,
        cdsso: {
          authDomain: 'https://auth.chabadorg.com',
          remoteSessionEndpoint: '/api/session',
        },
      }}
    >
      <MyApp />
    </UniverseAuthProvider>
  );
}

function MyApp() {
  // CDSSO is handled automatically!
  const { isAuthenticated, user } = useUniverseAuth();

  return isAuthenticated ? <Dashboard /> : <LoginPage />;
}
```

### Direct CDSSO Access

If you need fine-grained CDSSO control:

```tsx
import { useCdsso } from '@chabaduniverse/auth-sdk';

function CdssoDebug() {
  const {
    isAuthenticated,
    token,
    user,
    authenticate,
    logout,
    checkStatus,
    getBearerToken,
  } = useCdsso();

  return (
    <div>
      <p>CDSSO Status: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}</p>
      <button onClick={() => authenticate()}>Force CDSSO Check</button>
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Conditional Provider Enable

```tsx
// Only enable providers you need
<UniverseAuthProvider
  appId="my-app"
  config={{
    enableMerkos: true,
    enableValu: false,  // Disable if not using Valu
    enableCDSSO: true,
  }}
>
  <App />
</UniverseAuthProvider>
```

### Pattern 2: Protected Routes

```tsx
// Before: Manual checking
function ProtectedPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, []);

  if (!user) return <Loading />;
  return <Dashboard />;
}

// After: Using AuthGuard
import { AuthGuard } from '@chabaduniverse/auth-sdk';

function ProtectedPage() {
  return (
    <AuthGuard
      fallback={<Loading />}
      unauthenticatedFallback={<Redirect to="/login" />}
    >
      <Dashboard />
    </AuthGuard>
  );
}
```

### Pattern 3: User Display

```tsx
// Before: Manual user handling
function UserInfo() {
  const merkosUser = useMerkosUser();
  const valuUser = useValuUser();

  const displayName = merkosUser?.name || valuUser?.displayName || 'User';
  const email = merkosUser?.email || valuUser?.email;

  return <div>{displayName} ({email})</div>;
}

// After: Unified user
import { useUniverseAuth } from '@chabaduniverse/auth-sdk';

function UserInfo() {
  const { user } = useUniverseAuth();

  return user ? <div>{user.displayName} ({user.email})</div> : null;
}
```

### Pattern 4: Logout

```tsx
// Before: Multiple logouts
const handleLogout = async () => {
  await merkosAdapter.logout();
  await valuApi.disconnect();
  localStorage.clear();
  navigate('/');
};

// After: Single logout
import { useUniverseAuth } from '@chabaduniverse/auth-sdk';

function LogoutButton() {
  const { logout } = useUniverseAuth();

  const handleLogout = async () => {
    await logout({ clearAll: true });
    navigate('/');
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

---

## Troubleshooting

### Issue: "useUniverseAuth must be used within UniverseAuthProvider"

**Cause**: Component is not wrapped in provider.

**Solution**:
```tsx
// Ensure provider wraps your app
<UniverseAuthProvider appId="my-app">
  <App />
</UniverseAuthProvider>
```

### Issue: Valu not connecting

**Cause**: Valu requires being in an iframe context.

**Solution**:
```tsx
const { providers } = useUniverseAuth();

// Check if Valu is available
if (!providers.valu.isInIframe) {
  console.log('Valu requires iframe context');
}
```

### Issue: CDSSO not working

**Cause**: Missing or incorrect configuration.

**Solution**:
```tsx
<UniverseAuthProvider
  appId="my-app"
  config={{
    enableCDSSO: true,
    cdsso: {
      authDomain: 'https://auth.chabadorg.com',  // Verify this is correct
      // Check browser console for errors
    },
  }}
>
```

### Issue: Type errors after migration

**Cause**: Different type shapes between old and new code.

**Solution**:
```tsx
// Import types from SDK
import type {
  UniverseUser,
  MerkosUser,
  ValuUser,
  AuthProvider,
} from '@chabaduniverse/auth-sdk';

// Use SDK types instead of custom types
```

### Issue: Multiple auth states

**Cause**: Using both old and new patterns.

**Solution**: Fully migrate to SDK - don't mix old direct usage with new SDK hooks.

---

## Need Help?

- Check the [API Reference](./API.md)
- Review [Examples](./EXAMPLES.md)
- File an issue on GitHub
