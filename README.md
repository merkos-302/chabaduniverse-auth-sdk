# @chabaduniverse/auth-sdk

Unified authentication SDK for the Chabad Universe ecosystem.

## Overview

This SDK provides a unified authentication experience by combining:
- **@chabaduniverse/auth** - Core identity and Merkos Platform integration
- **@arkeytyp/valu-api** - Valu Social integration

## Installation

```bash
npm install @chabaduniverse/auth-sdk
# or
pnpm add @chabaduniverse/auth-sdk
```

## Quick Start

```tsx
import { UniverseAuthProvider, useUniverseAuth } from '@chabaduniverse/auth-sdk';

function App() {
  return (
    <UniverseAuthProvider appId="my-app">
      <MyApp />
    </UniverseAuthProvider>
  );
}

function MyApp() {
  const { user, isAuthenticated, providers } = useUniverseAuth();

  if (!isAuthenticated) {
    return <LoginButton />;
  }

  return <div>Welcome, {user.name}!</div>;
}
```

## Features

- **Unified Auth State** - Single hook for all auth providers
- **Provider-Specific Access** - Direct access to Valu, Merkos, and Universe states
- **CDSSO Support** - Cross-domain SSO out of the box
- **React Components** - Pre-built UI components (LoginButton, AuthGuard, UserMenu)
- **TypeScript** - Full type safety

## Packages

| Package | Description |
|---------|-------------|
| `@chabaduniverse/auth` | Core identity and Merkos adapter |
| `@chabaduniverse/auth-sdk` | Unified SDK (this package) |

## Documentation

See [docs/](./docs/) for detailed documentation.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

## License

MIT
