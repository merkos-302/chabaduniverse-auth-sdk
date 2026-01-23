# Examples

Practical examples for using @chabaduniverse/auth-sdk.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Login Flows](#login-flows)
- [Protected Routes](#protected-routes)
- [User Interface](#user-interface)
- [Provider-Specific Features](#provider-specific-features)
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
import { AuthStatus } from '@chabaduniverse/auth-sdk';

function DebugPanel() {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="debug-panel">
      <AuthStatus
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
