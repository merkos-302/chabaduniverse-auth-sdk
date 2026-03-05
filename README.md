# @chabaduniverse/auth-sdk

Unified authentication SDK for the Chabad Universe ecosystem.

## Overview

This SDK provides a unified authentication experience by combining:
- **@chabaduniverse/auth** - Core identity and Merkos Platform integration
- **@arkeytyp/valu-api** - Valu Social integration
- **CDSSO** - Cross-Domain Single Sign-On

## Installation

```bash
npm install @chabaduniverse/auth-sdk
# or
pnpm add @chabaduniverse/auth-sdk
# or
yarn add @chabaduniverse/auth-sdk
```

### Peer Dependencies

```bash
pnpm add @chabaduniverse/auth @arkeytyp/valu-api react react-dom
```

## Quick Start

```tsx
import { UniverseAuthProvider, useUniverseAuth, LoginButton } from '@chabaduniverse/auth-sdk';

function App() {
  return (
    <UniverseAuthProvider appId="my-app">
      <MyApp />
    </UniverseAuthProvider>
  );
}

function MyApp() {
  const { user, isAuthenticated, isLoading, logout } = useUniverseAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginButton />;
  }

  return (
    <div>
      <p>Welcome, {user.displayName}!</p>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

## Features

- **Unified Auth State** - Single hook for all auth providers
- **Provider-Specific Access** - Direct access to Valu, Merkos, and Universe states
- **CDSSO Support** - Cross-domain SSO out of the box
- **OIDC Iframe Auth** - 3-step fallback authentication for iframe-embedded mini apps
- **React Components** - Pre-built UI components (LoginButton, AuthGuard, UserMenu)
- **TypeScript** - Full type safety with strict mode
- **Tree-Shakeable** - Import only what you need via sub-path exports
- **Code Splitting** - Shared chunks minimize bundle duplication

## Sub-Path Imports

Import only the modules you need for smaller bundles:

```tsx
// Full SDK
import { useUniverseAuth, LoginButton } from '@chabaduniverse/auth-sdk';

// Individual modules
import { MerkosProvider, useMerkos } from '@chabaduniverse/auth-sdk/merkos';
import { ValuProvider, useValu } from '@chabaduniverse/auth-sdk/valu';
import { CdssoClient, useCdsso } from '@chabaduniverse/auth-sdk/cdsso';
import { UniverseAuthProvider } from '@chabaduniverse/auth-sdk/providers';
import { useUniverseAuth } from '@chabaduniverse/auth-sdk/hooks';
import { LoginButton, AuthGuard } from '@chabaduniverse/auth-sdk/components';
import { useMerkosOIDCAuth } from '@chabaduniverse/auth-sdk/oidc';
```

## Components

### LoginButton

```tsx
import { LoginButton } from '@chabaduniverse/auth-sdk';

<LoginButton
  provider="merkos"
  variant="primary"
  size="md"
  onLoginSuccess={() => navigate('/dashboard')}
/>
```

### AuthGuard

```tsx
import { AuthGuard } from '@chabaduniverse/auth-sdk';

<AuthGuard
  fallback={<Loading />}
  unauthenticatedFallback={<LoginPage />}
>
  <ProtectedContent />
</AuthGuard>
```

### UserMenu

```tsx
import { UserMenu } from '@chabaduniverse/auth-sdk';

<UserMenu
  showProviders
  showEmail
  onLogout={() => navigate('/')}
/>
```

## Hooks

### useUniverseAuth

Main hook for accessing authentication state and actions.

```tsx
const {
  // State
  user,              // UniverseUser | null
  isAuthenticated,   // boolean
  isLoading,         // boolean
  status,            // AuthStatus
  error,             // AuthError | null
  providers,         // Provider states

  // Actions
  login,             // (options) => Promise<void>
  logout,            // (options) => Promise<void>
  linkAccount,       // (options) => Promise<void>
} = useUniverseAuth();
```

### useProviders

Direct access to individual provider states.

```tsx
const { valu, merkos, universe, isProviderAuthenticated } = useProviders();
```

### useAuthStatus

Computed authentication status.

```tsx
const {
  isFullyAuthenticated,
  isPartiallyAuthenticated,
  needsLinking,
  getStatusMessage,
} = useAuthStatus();
```

## Configuration

```tsx
<UniverseAuthProvider
  appId="my-app"
  config={{
    enableMerkos: true,
    enableValu: true,
    enableCDSSO: true,
    autoAuthenticate: false,
    merkos: {
      apiBaseUrl: 'https://api.merkos.com',
    },
    cdsso: {
      authDomain: 'https://auth.chabadorg.com',
    },
  }}
  onError={(error) => console.error(error)}
  onAuthChange={(state) => console.log(state)}
>
  <App />
</UniverseAuthProvider>
```

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](./docs/API.md) | Complete API documentation |
| [Examples](./docs/EXAMPLES.md) | Usage examples and patterns |
| [Migration Guide](./docs/MIGRATION.md) | Migrating from existing auth |
| [Architecture](./docs/ARCHITECTURE.md) | Technical architecture |
| [OIDC Auth Guide](./docs/MERKOS-OIDC-AUTH.md) | 3-step iframe auth flow & integration |

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Build
pnpm build

# Lint
pnpm lint

# Type check
pnpm type-check
```

## Packages

| Package | Description |
|---------|-------------|
| `@chabaduniverse/auth` | Core identity and Merkos adapter |
| `@arkeytyp/valu-api` | Valu Social API client |
| `@chabaduniverse/auth-sdk` | Unified SDK (this package) |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
