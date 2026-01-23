# API Reference

Complete API documentation for @chabaduniverse/auth-sdk.

## Table of Contents

- [Provider](#provider)
- [Hooks](#hooks)
- [Components](#components)
- [CDSSO Module](#cdsso-module)
- [Merkos Module](#merkos-module)
- [Valu Module](#valu-module)
- [Types](#types)

---

## Provider

### UniverseAuthProvider

The main provider component that wraps your application.

```tsx
import { UniverseAuthProvider } from '@chabaduniverse/auth-sdk';

<UniverseAuthProvider
  appId="my-app"
  config={{
    enableMerkos: true,
    enableValu: true,
    enableCDSSO: true,
  }}
>
  <App />
</UniverseAuthProvider>
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `appId` | `string` | Yes | Unique identifier for your application |
| `config` | `UniverseAuthConfig` | No | Configuration options |
| `children` | `ReactNode` | Yes | Child components |
| `onError` | `(error: AuthError) => void` | No | Error callback |
| `onAuthChange` | `(state: UniverseAuthState) => void` | No | Auth state change callback |

#### UniverseAuthConfig

```typescript
interface UniverseAuthConfig {
  enableMerkos?: boolean;      // Enable Merkos integration (default: true)
  enableValu?: boolean;        // Enable Valu integration (default: true)
  enableCDSSO?: boolean;       // Enable Cross-Domain SSO (default: true)
  autoAuthenticate?: boolean;  // Auto-auth on mount (default: false)
  merkos?: MerkosConfig;       // Merkos-specific config
  valu?: ValuConfig;           // Valu-specific config
  cdsso?: CdssoConfig;         // CDSSO-specific config
}
```

---

## Hooks

### useUniverseAuth

The primary hook for accessing authentication state and actions.

```tsx
import { useUniverseAuth } from '@chabaduniverse/auth-sdk';

function MyComponent() {
  const {
    // State
    user,              // UniverseUser | null
    isAuthenticated,   // boolean
    isLoading,         // boolean
    isInitialized,     // boolean
    status,            // AuthStatus
    error,             // AuthError | null
    providers,         // ProvidersState

    // Actions
    login,             // (options?: LoginOptions) => Promise<void>
    logout,            // (options?: LogoutOptions) => Promise<void>
    linkAccount,       // (options: LinkAccountOptions) => Promise<void>
    refreshToken,      // () => Promise<void>

    // Utilities
    getUser,           // (provider?: AuthProvider) => User | null
    isAuthenticatedWith, // (provider: AuthProvider) => boolean
  } = useUniverseAuth();
}
```

### useProviders

Access provider-specific state directly.

```tsx
import { useProviders } from '@chabaduniverse/auth-sdk';

const {
  providers,  // Full providers state
  valu,       // ValuProviderState
  merkos,     // MerkosProviderState
  universe,   // UniverseProviderState
  isProviderAuthenticated,  // (provider: AuthProvider) => boolean
  getProviderUser,          // (provider: AuthProvider) => User | null
} = useProviders();
```

### useAuthStatus

Get computed authentication status.

```tsx
import { useAuthStatus } from '@chabaduniverse/auth-sdk';

const {
  status,                   // AuthStatus
  isFullyAuthenticated,     // boolean - all enabled providers authenticated
  isPartiallyAuthenticated, // boolean - at least one provider authenticated
  needsLinking,             // boolean - multiple providers, not all linked
  isLoading,                // boolean
  hasError,                 // boolean
  getStatusMessage,         // () => string - user-friendly status message
} = useAuthStatus();
```

### useCdsso

Access CDSSO functionality directly.

```tsx
import { useCdsso } from '@chabaduniverse/auth-sdk';

const {
  isAuthenticated,
  isLoading,
  user,
  token,
  error,
  authenticate,    // (options?: CdssoInitiateOptions) => Promise<void>
  logout,          // () => Promise<boolean>
  checkStatus,     // () => Promise<void>
  clearToken,      // () => void
  getBearerToken,  // () => string | null
} = useCdsso();
```

### useMerkos

Access Merkos functionality directly.

```tsx
import { useMerkos } from '@chabaduniverse/auth-sdk';

const {
  isAuthenticated,
  isLoading,
  user,
  token,
  error,
  loginWithCredentials,  // (options: CredentialsLoginOptions) => Promise<MerkosUserData | null>
  loginWithBearerToken,  // (options: BearerTokenLoginOptions) => Promise<MerkosUserData | null>
  loginWithGoogle,       // (options: GoogleLoginOptions) => Promise<MerkosUserData | null>
  loginWithChabadOrg,    // (options: ChabadOrgLoginOptions) => Promise<MerkosUserData | null>
  getCurrentUser,        // () => Promise<MerkosUserData | null>
  logout,                // () => Promise<void>
  setToken,              // (token: string) => void
  clearToken,            // () => void
} = useMerkos();
```

### useValu

Access Valu functionality directly.

```tsx
import { useValu, useValuSafe } from '@chabaduniverse/auth-sdk';

// Safe version (won't throw if not in ValuProvider)
const valuResult = useValuSafe();

if (isValuAvailable(valuResult)) {
  const {
    isInIframe,
    isConnected,
    isReady,
    user,
    connect,
    disconnect,
    sendIntent,
    // ... more Valu actions
  } = valuResult;
}
```

---

## Components

### LoginButton

Pre-built login button component.

```tsx
import { LoginButton } from '@chabaduniverse/auth-sdk';

<LoginButton
  provider="auto"          // 'auto' | 'merkos' | 'valu'
  variant="primary"        // 'primary' | 'secondary' | 'outline'
  size="md"                // 'sm' | 'md' | 'lg'
  onLoginSuccess={() => navigate('/dashboard')}
  onLoginError={(error) => console.error(error)}
/>

// With custom children
<LoginButton>
  <span>Custom Login Text</span>
</LoginButton>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `provider` | `'auto' \| 'merkos' \| 'valu'` | `'auto'` | Target provider |
| `variant` | `'primary' \| 'secondary' \| 'outline'` | `'primary'` | Visual variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `children` | `ReactNode` | - | Custom button content |
| `disabled` | `boolean` | `false` | Disable button |
| `onBeforeLogin` | `() => Promise<void>` | - | Called before login |
| `onLoginSuccess` | `() => void` | - | Called on success |
| `onLoginError` | `(error: Error) => void` | - | Called on error |
| `redirectUrl` | `string` | - | Redirect URL after login |
| `className` | `string` | - | CSS class |
| `style` | `CSSProperties` | - | Inline styles |

### AuthGuard

Route protection component.

```tsx
import { AuthGuard } from '@chabaduniverse/auth-sdk';

<AuthGuard
  fallback={<LoadingSpinner />}
  unauthenticatedFallback={<LoginPage />}
  onAuthFailure={({ type }) => console.log('Auth failed:', type)}
  requireProvider="merkos"  // Optional: require specific provider
>
  <ProtectedContent />
</AuthGuard>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Protected content |
| `fallback` | `ReactNode` | - | Loading fallback |
| `unauthenticatedFallback` | `ReactNode` | `null` | Unauthenticated fallback |
| `onAuthFailure` | `(reason: AuthGuardFailureReason) => void` | - | Failure callback |
| `requireProvider` | `AuthProvider` | - | Require specific provider |
| `requireAllProviders` | `boolean` | `false` | Require all enabled providers |

### UserMenu

Dropdown menu with user info and logout.

```tsx
import { UserMenu } from '@chabaduniverse/auth-sdk';

<UserMenu
  showProviders
  showEmail
  onLogout={() => navigate('/')}
  menuItems={[
    { key: 'profile', label: 'Profile', onClick: () => navigate('/profile') },
    { key: 'settings', label: 'Settings', href: '/settings', divider: true },
  ]}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showProviders` | `boolean` | `false` | Show provider status |
| `showEmail` | `boolean` | `true` | Show user email |
| `showAvatar` | `boolean` | `true` | Show user avatar |
| `avatarSize` | `'sm' \| 'md' \| 'lg'` | `'md'` | Avatar size |
| `menuItems` | `UserMenuItem[]` | `[]` | Custom menu items |
| `onLogout` | `() => void` | - | Logout callback |
| `logoutText` | `string` | `'Sign Out'` | Logout button text |
| `redirectOnLogout` | `boolean` | `false` | Redirect after logout |
| `logoutRedirectUrl` | `string` | `'/'` | Redirect URL |

### AuthStatus

Debug/status component for development.

```tsx
import { AuthStatus } from '@chabaduniverse/auth-sdk';

// Full status display
<AuthStatus
  showProviders
  showUser
  showTokens  // WARNING: development only!
  showErrors
/>

// Compact mode
<AuthStatus compact />
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showProviders` | `boolean` | `true` | Show provider status |
| `showUser` | `boolean` | `true` | Show user info |
| `showTokens` | `boolean` | `false` | Show tokens (dev only!) |
| `showErrors` | `boolean` | `true` | Show errors |
| `compact` | `boolean` | `false` | Compact display mode |

---

## CDSSO Module

Cross-Domain Single Sign-On utilities.

### CdssoClient

```typescript
import { CdssoClient, getDefaultCdssoClient } from '@chabaduniverse/auth-sdk';

// Create custom client
const client = new CdssoClient(config);

// Or use default
const defaultClient = getDefaultCdssoClient();

// Methods
await client.authenticate();
await client.logout();
await client.checkRemoteSession();
const token = client.getBearerToken();
```

### Utility Functions

```typescript
import {
  // Storage
  isLocalStorageAvailable,
  getStoredToken,
  storeToken,
  removeToken,

  // Cookies
  areCookiesAvailable,
  getCookie,
  hasCookie,
  hasAuthCookie,

  // State management
  generateState,
  storeState,
  validateState,

  // URL parsing
  parseUrlParams,
  isCdssoCallback,
  buildCdssoUrl,

  // JWT
  decodeJwtPayload,
  isTokenExpired,
  getTokenExpiration,
} from '@chabaduniverse/auth-sdk';
```

---

## Merkos Module

Merkos Platform integration.

### MerkosProvider

```tsx
import { MerkosProvider, useMerkos } from '@chabaduniverse/auth-sdk';

<MerkosProvider config={{ apiBaseUrl: 'https://api.merkos.com' }}>
  <App />
</MerkosProvider>
```

### Utility Functions

```typescript
import {
  formatMerkosUser,
  getMerkosDisplayName,
  parseMerkosError,
  isMerkosError,
  isAuthError,
  extractBearerToken,
  storeBearerToken,
  removeBearerToken,
} from '@chabaduniverse/auth-sdk';
```

---

## Valu Module

Valu Social integration.

> **Important:** If you're building an iframe application for Valu Social, see the [Valu Iframe Integration Guide](./VALU_IFRAME_INTEGRATION.md) for critical setup instructions, including how to handle the `api:ready` race condition.

### ValuProvider

```tsx
import { ValuProvider, useValu } from '@chabaduniverse/auth-sdk';

<ValuProvider config={{ appId: 'my-app' }}>
  <App />
</ValuProvider>
```

### Key Functions

```typescript
import {
  useValu,
  useValuSafe,
  isValuAvailable,
  formatValuUser,
  parseValuConnectionState,
  normalizeValuUser,
} from '@chabaduniverse/auth-sdk';
```

---

## Types

### User Types

```typescript
interface BaseUser {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  provider: AuthProvider;
}

interface UniverseUser extends BaseUser {
  linkedAccounts?: AuthProvider[];
  merkosEnrichment?: MerkosEnrichment;
  valuEnrichment?: ValuEnrichment;
}

type AuthProvider = 'merkos' | 'valu' | 'universe';
type AuthMethod = 'credentials' | 'sso' | 'oauth' | 'token';
```

### State Types

```typescript
type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

interface AuthError {
  code: AuthErrorCode;
  message: string;
  provider?: AuthProvider;
  originalError?: unknown;
}

type AuthErrorCode =
  | 'invalid_credentials'
  | 'network_error'
  | 'token_expired'
  | 'unauthorized'
  | 'provider_error'
  | 'configuration_error'
  | 'unknown';
```

### Action Types

```typescript
interface LoginOptions {
  provider?: AuthProvider;
  method?: AuthMethod;
  credentials?: { email: string; password: string };
  redirectUrl?: string;
}

interface LogoutOptions {
  provider?: AuthProvider;
  clearAll?: boolean;
  redirectUrl?: string;
}

interface LinkAccountOptions {
  provider: AuthProvider;
  method?: AuthMethod;
  credentials?: { email: string; password: string };
}
```

---

## Default Values

```typescript
import {
  defaultConfig,
  defaultValuConfig,
  defaultMerkosConfig,
  defaultCrossDomainConfig,
  initialCdssoState,
  initialMerkosAuthState,
  initialValuProviderState,
  initialMerkosProviderState,
  initialUniverseProviderState,
  initialProvidersState,
} from '@chabaduniverse/auth-sdk';
```

---

## Type Guards

```typescript
import {
  isAuthenticatedStatus,
  isLoadingStatus,
  isErrorStatus,
  isValuAvailable,
  isMerkosAvailable,
  isMerkosError,
  isAuthError,
} from '@chabaduniverse/auth-sdk';

// Usage
if (isAuthenticatedStatus(status)) {
  // status is 'authenticated'
}

if (isValuAvailable(valuResult)) {
  // valuResult has full Valu functionality
}
```
