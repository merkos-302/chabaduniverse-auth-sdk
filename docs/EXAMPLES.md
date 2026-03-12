# Examples

Practical examples for using @chabaduniverse/auth-sdk.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Login Flows](#login-flows)
- [Protected Routes](#protected-routes)
- [User Interface](#user-interface)
- [Provider-Specific Features](#provider-specific-features)
- [Merkos OIDC Authentication](#merkos-oidc-authentication)
- [Valu API Race Condition](#valu-api-race-condition)
- [Error Handling](#error-handling)
- [Testing](#testing)

---

## Basic Setup

### Minimal Setup

```tsx
import { UniverseAuthProvider, useUniverseAuth } from '@chabaduniverse/auth-sdk';

function App() {
  return (
    <UniverseAuthProvider appId="my-app">
      <Main />
    </UniverseAuthProvider>
  );
}

function Main() {
  const { isAuthenticated, user } = useUniverseAuth();

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.displayName}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

### Full Configuration

```tsx
import { UniverseAuthProvider } from '@chabaduniverse/auth-sdk';

function App() {
  return (
    <UniverseAuthProvider
      appId="my-app"
      config={{
        enableMerkos: true,
        enableValu: true,
        enableCDSSO: true,
        autoAuthenticate: true,
        merkos: {
          apiBaseUrl: 'https://api.merkos.com',
          storageKey: 'merkos_auth',
        },
        valu: {
          appId: 'my-valu-app',
        },
        cdsso: {
          authDomain: 'https://auth.chabadorg.com',
          clientId: 'my-client-id',
          remoteSessionEndpoint: '/api/session',
        },
      }}
      onError={(error) => {
        console.error('Auth error:', error);
        // Send to error tracking service
      }}
      onAuthChange={(state) => {
        console.log('Auth state changed:', state.status);
      }}
    >
      <App />
    </UniverseAuthProvider>
  );
}
```

---

## Login Flows

### Using LoginButton Component

```tsx
import { LoginButton } from '@chabaduniverse/auth-sdk';

function LoginPage() {
  return (
    <div className="login-options">
      {/* Auto-detect best provider */}
      <LoginButton
        onLoginSuccess={() => navigate('/dashboard')}
        onLoginError={(error) => toast.error(error.message)}
      />

      {/* Specific providers */}
      <LoginButton provider="merkos">Sign in with Merkos</LoginButton>
      <LoginButton provider="valu">Connect with Valu</LoginButton>
    </div>
  );
}
```

### Custom Login Form

```tsx
import { useUniverseAuth } from '@chabaduniverse/auth-sdk';

function CustomLoginForm() {
  const { login, isLoading, error } = useUniverseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login({
        provider: 'merkos',
        method: 'credentials',
        credentials: { email, password },
      });
      navigate('/dashboard');
    } catch (err) {
      // Error is also available via `error` from hook
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        disabled={isLoading}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        disabled={isLoading}
      />
      {error && <p className="error">{error.message}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### OAuth/SSO Login

```tsx
import { useUniverseAuth } from '@chabaduniverse/auth-sdk';

function SSOLogin() {
  const { login } = useUniverseAuth();

  const handleGoogleLogin = () => {
    login({
      provider: 'merkos',
      method: 'oauth',
      redirectUrl: window.location.href,
    });
  };

  const handleChabadOrgLogin = () => {
    login({
      provider: 'merkos',
      method: 'sso',
      redirectUrl: window.location.href,
    });
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>Sign in with Google</button>
      <button onClick={handleChabadOrgLogin}>Sign in with Chabad.org</button>
    </div>
  );
}
```

---

## Protected Routes

### Using AuthGuard

```tsx
import { AuthGuard } from '@chabaduniverse/auth-sdk';
import { Navigate } from 'react-router-dom';

// Simple protection
function ProtectedPage() {
  return (
    <AuthGuard unauthenticatedFallback={<Navigate to="/login" />}>
      <Dashboard />
    </AuthGuard>
  );
}

// With loading state
function ProtectedWithLoading() {
  return (
    <AuthGuard
      fallback={<LoadingSpinner />}
      unauthenticatedFallback={<Navigate to="/login" />}
    >
      <Dashboard />
    </AuthGuard>
  );
}

// Require specific provider
function MerkosOnlyPage() {
  return (
    <AuthGuard
      requireProvider="merkos"
      unauthenticatedFallback={
        <div>
          <p>This page requires Merkos authentication</p>
          <LoginButton provider="merkos" />
        </div>
      }
    >
      <MerkosFeatures />
    </AuthGuard>
  );
}

// Custom failure handling
function ProtectedWithCallback() {
  return (
    <AuthGuard
      onAuthFailure={({ type }) => {
        if (type === 'not_authenticated') {
          analytics.track('auth_required', { page: 'dashboard' });
        }
      }}
      unauthenticatedFallback={<LoginPrompt />}
    >
      <Dashboard />
    </AuthGuard>
  );
}
```

### Route-Level Protection (React Router)

```tsx
import { useUniverseAuth } from '@chabaduniverse/auth-sdk';
import { Outlet, Navigate } from 'react-router-dom';

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useUniverseAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
}

// In your router
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/profile" element={<Profile />} />
  </Route>
</Routes>
```

---

## User Interface

### User Menu with Dropdown

```tsx
import { UserMenu } from '@chabaduniverse/auth-sdk';

function Header() {
  return (
    <header>
      <nav>
        <Logo />
        <UserMenu
          showEmail
          showProviders
          menuItems={[
            {
              key: 'profile',
              label: 'My Profile',
              onClick: () => navigate('/profile'),
            },
            {
              key: 'settings',
              label: 'Settings',
              href: '/settings',
            },
            {
              key: 'help',
              label: 'Help & Support',
              href: '/help',
              divider: true,
            },
          ]}
          onLogout={() => {
            navigate('/');
            toast.success('Logged out successfully');
          }}
        />
      </nav>
    </header>
  );
}
```

### Custom User Display

```tsx
import { useUniverseAuth } from '@chabaduniverse/auth-sdk';

function UserAvatar() {
  const { user, isAuthenticated, logout } = useUniverseAuth();

  if (!isAuthenticated || !user) {
    return <LoginButton size="sm" />;
  }

  return (
    <div className="user-avatar">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.displayName} />
      ) : (
        <div className="initials">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <span>{user.displayName}</span>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

### Auth Status Debug Panel

```tsx
import { AuthStatusDisplay } from '@chabaduniverse/auth-sdk';

function DebugPanel() {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="debug-panel">
      <AuthStatusDisplay
        showProviders
        showUser
        showErrors
        // WARNING: Never enable in production!
        showTokens={false}
      />
    </div>
  );
}
```

---

## Provider-Specific Features

### Merkos-Specific Operations

```tsx
import { useMerkos } from '@chabaduniverse/auth-sdk';

function MerkosProfile() {
  const {
    user,
    token,
    loginWithCredentials,
    loginWithGoogle,
    getCurrentUser,
    v2Request,
  } = useMerkos();

  // Make authenticated API calls
  const fetchUserData = async () => {
    const response = await v2Request('/user/profile', {
      method: 'GET',
    });
    return response;
  };

  // Login with specific method
  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle({
      idToken: googleIdToken,
    });
    console.log('Logged in:', result);
  };

  return (
    <div>
      <h2>Merkos Profile</h2>
      {user && (
        <div>
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
          <p>ID: {user.id}</p>
        </div>
      )}
    </div>
  );
}
```

### Valu-Specific Operations

```tsx
import { useValuSafe, isValuAvailable } from '@chabaduniverse/auth-sdk';

function ValuChat() {
  const valuResult = useValuSafe();

  if (!isValuAvailable(valuResult)) {
    return <div>Valu is not available in this context</div>;
  }

  const { isConnected, user, openTextChat, openVideoChat, sendIntent } = valuResult;

  if (!isConnected) {
    return <div>Connecting to Valu...</div>;
  }

  const startChat = (recipientId: string) => {
    openTextChat({ userId: recipientId });
  };

  const startVideoCall = (recipientId: string) => {
    openVideoChat({ userId: recipientId });
  };

  return (
    <div>
      <h2>Valu Communication</h2>
      {user && <p>Connected as: {user.displayName}</p>}
      <button onClick={() => startChat('user123')}>Chat</button>
      <button onClick={() => startVideoCall('user123')}>Video Call</button>
    </div>
  );
}
```

### CDSSO Operations

```tsx
import { useCdsso } from '@chabaduniverse/auth-sdk';

function CdssoManager() {
  const {
    isAuthenticated,
    user,
    token,
    authenticate,
    logout,
    checkStatus,
    getBearerToken,
  } = useCdsso();

  const forceReauth = async () => {
    await authenticate({ force: true });
  };

  const checkSession = async () => {
    await checkStatus();
  };

  return (
    <div>
      <h2>CDSSO Status</h2>
      <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
      {user && <p>User: {user.email}</p>}
      <button onClick={forceReauth}>Re-authenticate</button>
      <button onClick={checkSession}>Check Session</button>
    </div>
  );
}
```

---

## Merkos OIDC Authentication

Authentication for mini apps running inside the `chabaduniverse.com` iframe. The `useMerkosOIDCAuth` hook handles a 3-step fallback: localStorage cache → CDSSO → popup reconnect.

> For a full walkthrough, see [MERKOS-OIDC-AUTH.md](./MERKOS-OIDC-AUTH.md).

### Minimal Setup

```tsx
import { useMerkosOIDCAuth } from '@chabaduniverse/auth-sdk/oidc';

function MiniApp() {
  const { token, isAuthenticated, isAuthenticating } = useMerkosOIDCAuth();

  if (isAuthenticating) return <p>Authenticating...</p>;
  if (!isAuthenticated) return <p>Not authenticated</p>;

  return <p>Authenticated! Token: {token?.slice(0, 20)}...</p>;
}
```

### Full Integration with UI

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
    return <div>Signing you in...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Authentication failed: {error}</p>
        <button onClick={login}>Try Again</button>
      </div>
    );
  }

  if (needsReconnect) {
    return (
      <div>
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
    </div>
  );
}
```

### Auto Reconnect Mode

```tsx
import { useMerkosOIDCAuth } from '@chabaduniverse/auth-sdk/oidc';

function AutoAuthApp() {
  const { isAuthenticated, isAuthenticating, token } = useMerkosOIDCAuth({
    reconnectMode: 'auto', // popup opens automatically if needed
    onAuthenticated: (token) => {
      apiClient.setToken(token);
    },
  });

  if (isAuthenticating) return <p>Please wait...</p>;
  if (!isAuthenticated) return <p>Authentication failed.</p>;

  return <Dashboard token={token!} />;
}
```

### Local Development

```tsx
import { useMerkosOIDCAuth } from '@chabaduniverse/auth-sdk/oidc';

function DevApp() {
  const auth = useMerkosOIDCAuth({
    forceEnabled: process.env.NODE_ENV === 'development',
    authUrl: 'http://localhost:3001/merkos/login',
    reconnectUrl: 'http://localhost:3001/merkos/reconnect',
    debug: true,
  });

  return (
    <div>
      <pre>{JSON.stringify(auth, null, 2)}</pre>
    </div>
  );
}
```

### Using the Low-Level useMerkosOIDC Hook

For direct popup control without the 3-step fallback:

```tsx
import { useMerkosOIDC } from '@chabaduniverse/auth-sdk/oidc';

function DirectPopupLogin() {
  const { login, isOpen } = useMerkosOIDC({
    authUrl: 'https://auth.chabaduniverse.com/merkos/login',
  });

  return (
    <button onClick={login} disabled={isOpen}>
      {isOpen ? 'Signing in...' : 'Sign In with Merkos'}
    </button>
  );
}
```

---

## Valu API Race Condition

### The Problem

When a Chabad Universe app runs inside a Valu Social iframe, Valu sends an `api:ready` PostMessage as soon as the iframe loads. Because React applications take time to mount, the ready message often arrives *before* `ValuApi` has been instantiated. The message is lost, and the Valu connection never completes.

A simplified timeline of the problem:

```
1. Browser loads the JS bundle
2. Valu Social sends `api:ready` via postMessage     <-- arrives here
3. React begins rendering
4. ValuProvider mounts
5. ValuApi is created and starts listening            <-- listener installed here
6. ValuApi waits for `api:ready`... which already fired
   → Connection hangs indefinitely
```

### Automatic Fix via ValuProvider

The SDK ships an early message buffer that captures Valu messages at **module load time** -- before React renders anything. When `ValuProvider` mounts and creates `ValuApi`, it replays the buffered messages so the connection proceeds normally.

As a consumer, you do not need to do anything special. The standard setup already handles this:

```tsx
import { UniverseAuthProvider } from '@chabaduniverse/auth-sdk';

function App() {
  return (
    <UniverseAuthProvider
      appId="my-app"
      config={{ enableValu: true }}
    >
      <MyApp />
    </UniverseAuthProvider>
  );
}

// The corrected timeline:
// 1. Browser loads the JS bundle
// 2. Early message buffer listener is installed immediately on import
// 3. Valu Social sends `api:ready` → captured into buffer
// 4. React begins rendering
// 5. ValuProvider mounts, creates ValuApi
// 6. Buffered messages are replayed → ValuApi receives `api:ready`
// 7. Connection succeeds
```

### Manual Buffer Usage (Advanced)

If you are creating a `ValuApi` instance outside of `ValuProvider` (for example, in a non-React context or a custom integration layer), you can replay the buffer manually:

```typescript
import {
  replayBufferedMessages,
  getBufferedMessages,
  hasBeenReplayed,
} from '@chabaduniverse/auth-sdk/valu/early-message-buffer';

// Check what was captured (useful for debugging)
const buffered = getBufferedMessages();
console.log(`${buffered.length} early messages captured`);

// After your custom ValuApi instance is ready:
if (!hasBeenReplayed()) {
  const count = replayBufferedMessages();
  console.log(`Replayed ${count} early messages`);
}
```

You can also pass a custom maximum message age to discard stale messages:

```typescript
// Only replay messages that arrived within the last 10 seconds
const count = replayBufferedMessages(10_000);
```

### Debugging the Buffer

Enable debug logging by calling `startCapturing` with the `debug` option before the default auto-start takes effect. In practice this means calling it at the very top of your entry point:

```typescript
import { resetBuffer, startCapturing } from '@chabaduniverse/auth-sdk/valu/early-message-buffer';

// Reset the auto-started buffer and restart with debug logging
resetBuffer();
startCapturing({ debug: true });

// Now all buffer activity is logged to console.debug with the prefix:
// [ValuSDK][EarlyBuffer] ...
```

---

## Error Handling

### Global Error Handler

```tsx
import { UniverseAuthProvider } from '@chabaduniverse/auth-sdk';

function App() {
  const handleAuthError = (error: AuthError) => {
    switch (error.code) {
      case 'invalid_credentials':
        toast.error('Invalid email or password');
        break;
      case 'network_error':
        toast.error('Network error. Please check your connection.');
        break;
      case 'token_expired':
        toast.warning('Your session has expired. Please log in again.');
        break;
      case 'unauthorized':
        toast.error('You do not have permission to access this resource.');
        navigate('/');
        break;
      default:
        toast.error('An error occurred. Please try again.');
        Sentry.captureException(error);
    }
  };

  return (
    <UniverseAuthProvider appId="my-app" onError={handleAuthError}>
      <App />
    </UniverseAuthProvider>
  );
}
```

### Component-Level Error Handling

```tsx
import { useUniverseAuth } from '@chabaduniverse/auth-sdk';

function LoginForm() {
  const { login, error, isLoading } = useUniverseAuth();

  const handleSubmit = async (credentials: { email: string; password: string }) => {
    try {
      await login({
        provider: 'merkos',
        method: 'credentials',
        credentials,
      });
    } catch (err) {
      // Error is also available via the `error` property
      console.error('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      {error && (
        <div className="error-message">
          {error.code === 'invalid_credentials'
            ? 'Invalid email or password'
            : error.message}
        </div>
      )}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### Error Boundary

```tsx
import { Component, ReactNode } from 'react';

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AuthErrorBoundary extends Component<
  { children: ReactNode },
  AuthErrorBoundaryState
> {
  state: AuthErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Authentication Error</h2>
          <p>Something went wrong with authentication.</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<AuthErrorBoundary>
  <UniverseAuthProvider appId="my-app">
    <App />
  </UniverseAuthProvider>
</AuthErrorBoundary>
```

---

## Testing

### Mocking for Unit Tests

```tsx
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the hook
vi.mock('@chabaduniverse/auth-sdk', () => ({
  useUniverseAuth: () => ({
    user: { id: '1', displayName: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
  UniverseAuthProvider: ({ children }) => children,
}));

describe('Dashboard', () => {
  it('shows user name when authenticated', () => {
    render(<Dashboard />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});
```

### Testing with Provider

```tsx
import { UniverseAuthProvider } from '@chabaduniverse/auth-sdk';

const TestWrapper = ({ children }) => (
  <UniverseAuthProvider appId="test-app" config={{ autoAuthenticate: false }}>
    {children}
  </UniverseAuthProvider>
);

describe('LoginButton', () => {
  it('renders login button', () => {
    render(<LoginButton />, { wrapper: TestWrapper });
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });
});
```

### Integration Testing

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Login Flow', () => {
  it('completes login successfully', async () => {
    const user = userEvent.setup();

    render(
      <UniverseAuthProvider appId="test-app">
        <LoginPage />
        <Dashboard />
      </UniverseAuthProvider>
    );

    // Fill in form
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for authentication
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });
});
```
