# Architecture

Technical architecture documentation for @chabaduniverse/auth-sdk.

## Table of Contents

- [Overview](#overview)
- [Package Structure](#package-structure)
- [Component Hierarchy](#component-hierarchy)
- [State Management](#state-management)
- [Provider Integration](#provider-integration)
- [CDSSO Flow](#cdsso-flow)
- [Type System](#type-system)
- [Build Output](#build-output)

---

## Overview

### Design Principles

1. **Composition over Inheritance** - The SDK composes multiple auth providers rather than extending them
2. **Peer Dependencies** - Core packages are peer deps, not bundled
3. **Tree-Shakeable** - ESM exports allow unused code to be eliminated
4. **Provider Pattern** - Single context provider wraps all auth functionality
5. **Headless Components** - UI components are CSS-agnostic

### Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    Consumer Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │           @chabaduniverse/auth-sdk                   │   │
│   │                                                       │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│   │  │  Providers  │  │    Hooks    │  │ Components  │  │   │
│   │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │   │
│   │         │                │                │          │   │
│   │  ┌──────┴────────────────┴────────────────┴──────┐  │   │
│   │  │                                                │  │   │
│   │  │   ┌─────────┐   ┌─────────┐   ┌─────────┐    │  │   │
│   │  │   │  CDSSO  │   │ Merkos  │   │  Valu   │    │  │   │
│   │  │   │ Module  │   │ Module  │   │ Module  │    │  │   │
│   │  │   └────┬────┘   └────┬────┘   └────┬────┘    │  │   │
│   │  │        │             │             │          │  │   │
│   │  └────────┼─────────────┼─────────────┼──────────┘  │   │
│   │           │             │             │              │   │
│   └───────────┼─────────────┼─────────────┼──────────────┘   │
│               │             │             │                   │
│   ┌───────────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐           │
│   │ (internal)      │ │@chabad-   │ │@arkeytyp/ │           │
│   │                 │ │universe/  │ │valu-api   │           │
│   │                 │ │auth       │ │           │           │
│   └─────────────────┘ └───────────┘ └───────────┘           │
│         ^                  ^             ^                   │
│         │                  │             │                   │
│         └──── peer dependencies ─────────┘                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Package Structure

```
src/
├── index.ts                    # Main exports
├── types/                      # Shared type definitions
│   ├── user.ts                 # User types (BaseUser, UniverseUser, etc.)
│   ├── providers.ts            # Provider state types
│   ├── context.ts              # Context and action types
│   ├── hooks.ts                # Hook return types
│   ├── components.ts           # Component prop types
│   └── index.ts                # Type exports
│
├── providers/                  # React providers
│   ├── UniverseAuthProvider.tsx # Main unified provider
│   ├── types.ts                # Provider-specific types
│   ├── context.ts              # Context definitions
│   └── index.ts                # Provider exports
│
├── hooks/                      # React hooks
│   ├── useUniverseAuth.ts      # Main unified hook
│   ├── useProviders.ts         # Provider-specific hooks
│   ├── useAuthStatus.ts        # Computed status hooks
│   └── index.ts                # Hook exports
│
├── components/                 # UI components
│   ├── LoginButton.tsx         # Login button
│   ├── AuthGuard.tsx           # Route protection
│   ├── UserMenu.tsx            # User dropdown
│   ├── AuthStatus.tsx          # Debug status display
│   └── index.ts                # Component exports
│
├── cdsso/                      # CDSSO module
│   ├── cdsso-client.ts         # CdssoClient class
│   ├── cdsso-utils.ts          # Utility functions
│   ├── useCdsso.ts             # CDSSO hook
│   ├── types.ts                # CDSSO types
│   └── index.ts                # CDSSO exports
│
├── merkos/                     # Merkos module
│   ├── MerkosProvider.tsx      # Merkos context provider
│   ├── useMerkos.ts            # Merkos hooks
│   ├── merkos-utils.ts         # Utility functions
│   ├── merkos-types.ts         # Merkos types
│   └── index.ts                # Merkos exports
│
├── valu/                       # Valu module
│   ├── ValuProvider.tsx        # Valu context provider
│   ├── useValu.ts              # Valu hooks
│   ├── valu-utils.ts           # Utility functions
│   ├── valu-types.ts           # Valu types
│   └── index.ts                # Valu exports
│
├── utils/                      # Shared utilities
│   └── index.ts
│
└── test/                       # Test configuration
    └── setup.ts
```

---

## Component Hierarchy

```
<UniverseAuthProvider>
│
├── Initializes Configuration
│   ├── Merge defaults with user config
│   └── Set up error handling
│
├── Conditional Provider Wrappers
│   ├── <CdssoProvider> (if enableCDSSO)
│   ├── <MerkosProvider> (if enableMerkos)
│   └── <ValuProvider> (if enableValu)
│
├── State Management
│   ├── Aggregate provider states
│   ├── Compute unified user
│   └── Manage auth status
│
└── <UniverseAuthContext.Provider>
    │
    └── Children (your app)
        │
        ├── useUniverseAuth()     → Unified state + actions
        ├── useProviders()        → Direct provider access
        ├── useAuthStatus()       → Computed status
        ├── useCdsso()            → CDSSO-specific
        ├── useMerkos()           → Merkos-specific
        └── useValu()             → Valu-specific
```

---

## State Management

### State Flow

```
Provider States                    Unified State
─────────────────                 ───────────────

┌─────────────┐
│ CDSSO State │──┐
│  - token    │  │
│  - user     │  │
│  - status   │  │                ┌─────────────────┐
└─────────────┘  │                │ UniverseAuth    │
                 ├── merge ──────▶│                 │
┌─────────────┐  │                │ - user          │
│Merkos State │──┤                │ - isAuth        │
│  - user     │  │                │ - providers     │
│  - token    │  │                │ - status        │
│  - status   │  │                │ - error         │
└─────────────┘  │                │                 │
                 │                │ - login()       │
┌─────────────┐  │                │ - logout()      │
│ Valu State  │──┘                │ - linkAccount() │
│  - user     │                   └─────────────────┘
│  - connected│
│  - inIframe │
└─────────────┘
```

### State Shape

```typescript
interface UniverseAuthState {
  // Unified user (merged from providers)
  user: UniverseUser | null;

  // Overall auth status
  status: AuthStatus;  // 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Error state
  error: AuthError | null;

  // Individual provider states
  providers: {
    merkos: MerkosProviderState;
    valu: ValuProviderState;
    universe: UniverseProviderState;
  };
}
```

### User Merging Strategy

The unified `user` is computed by merging provider users with this priority:

1. **Merkos** - Primary source for identity (email, name)
2. **Valu** - Enrichment data (avatar, display preferences)
3. **CDSSO** - Token-derived claims

```typescript
function computeUnifiedUser(providers: ProvidersState): UniverseUser | null {
  const merkosUser = providers.merkos.user;
  const valuUser = providers.valu.user;

  if (!merkosUser && !valuUser) return null;

  return {
    id: merkosUser?.id ?? valuUser?.id ?? '',
    email: merkosUser?.email ?? valuUser?.email,
    displayName: merkosUser?.name ?? valuUser?.displayName ?? 'User',
    avatarUrl: valuUser?.avatarUrl ?? merkosUser?.avatar,
    provider: merkosUser ? 'merkos' : 'valu',
    linkedAccounts: computeLinkedAccounts(providers),
    merkosEnrichment: merkosUser ? extractMerkosEnrichment(merkosUser) : undefined,
    valuEnrichment: valuUser ? extractValuEnrichment(valuUser) : undefined,
  };
}
```

---

## Provider Integration

### Safe Hook Pattern

To avoid React hook rules violations, we use a "safe hook" pattern:

```typescript
// Problem: Conditional hook calls
if (config.enableMerkos) {
  const merkos = useMerkos();  // ❌ Violates rules of hooks
}

// Solution: Safe hooks
const merkosResult = useMerkosSafe();  // ✅ Always called
const merkos = isMerkosAvailable(merkosResult) && config.enableMerkos
  ? merkosResult
  : null;
```

### Safe Hook Implementation

```typescript
// useMerkosSafe returns either full result or unavailable marker
export function useMerkosSafe(): UseMerkosReturn | { isAvailable: false } {
  const context = useMerkosContextSafe();  // Returns null if no provider

  if (!context) {
    return { isAvailable: false };
  }

  // Return full hook result
  return {
    isAuthenticated: context.state.status === 'authenticated',
    user: context.state.user,
    // ... rest of return value
  };
}

// Type guard to check availability
export function isMerkosAvailable(
  result: UseMerkosReturn | { isAvailable: false }
): result is UseMerkosReturn {
  return !('isAvailable' in result && result.isAvailable === false);
}
```

---

## CDSSO Flow

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │  SDK CDSSO  │     │  Auth Server │
│   (Browser) │     │   Module    │     │ chabadorg    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       │  1. Page Load     │                    │
       │──────────────────▶│                    │
       │                   │                    │
       │                   │  2. Check Cookies  │
       │                   │────────────────────│
       │                   │                    │
       │                   │  3. Check Remote   │
       │                   │─────────Session───▶│
       │                   │                    │
       │                   │  4. Session Data   │
       │                   │◀───────────────────│
       │                   │                    │
       │                   │  5. Store Token    │
       │                   │────────────────────│
       │                   │                    │
       │  6. Auth Complete │                    │
       │◀──────────────────│                    │
       │                   │                    │
```

### Token Management

```typescript
// Token flow
1. Check localStorage for existing token
2. Check cookies for auth indicators
3. If indicators present, call remote session endpoint
4. Remote returns JWT token
5. Store JWT in localStorage
6. Parse JWT for user claims
7. Validate token expiration
8. Refresh before expiry
```

---

## Type System

### Type Hierarchy

```
BaseUser
├── MerkosUser (extends BaseUser + Merkos-specific fields)
├── ValuUser (extends BaseUser + Valu-specific fields)
└── UniverseUser (extends BaseUser + merged fields + enrichment)

AuthProvider = 'merkos' | 'valu' | 'universe'
AuthMethod = 'credentials' | 'sso' | 'oauth' | 'token'
AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
```

### Type Guards

```typescript
// Status type guards
function isAuthenticatedStatus(status: AuthStatus): status is 'authenticated' {
  return status === 'authenticated';
}

// Provider availability guards
function isValuAvailable(result: UseValuReturn | { isAvailable: false }): result is UseValuReturn;
function isMerkosAvailable(result: UseMerkosReturn | { isAvailable: false }): result is UseMerkosReturn;

// Error guards
function isMerkosError(error: unknown): error is MerkosError;
function isAuthError(error: unknown): error is AuthError;
```

### Strict TypeScript

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

## Build Output

### Package Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./providers": {
      "import": "./dist/providers/index.js",
      "require": "./dist/providers/index.cjs"
    },
    "./hooks": {
      "import": "./dist/hooks/index.js",
      "require": "./dist/hooks/index.cjs"
    },
    "./components": {
      "import": "./dist/components/index.js",
      "require": "./dist/components/index.cjs"
    },
    "./cdsso": {
      "import": "./dist/cdsso/index.js",
      "require": "./dist/cdsso/index.cjs"
    }
  }
}
```

### Build Configuration (tsup)

```typescript
// tsup.config.ts
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'providers/index': 'src/providers/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'components/index': 'src/components/index.ts',
    'cdsso/index': 'src/cdsso/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true,
  external: ['react', 'react-dom', '@chabaduniverse/auth', '@arkeytyp/valu-api'],
});
```

### Bundle Size

| Entry Point | ESM | CJS |
|-------------|-----|-----|
| index | ~98KB | ~102KB |
| providers | ~36KB | ~37KB |
| hooks | ~6KB | ~7KB |
| components | ~24KB | ~25KB |
| cdsso | ~22KB | ~23KB |

Note: These are pre-minification sizes. Tree-shaking significantly reduces final bundle size.

---

## Security Considerations

1. **Token Storage** - Tokens stored in localStorage (configurable)
2. **CDSSO** - Uses state parameter for CSRF protection
3. **Cookie Checks** - SameSite and Secure attributes respected
4. **JWT Validation** - Expiration checked client-side

---

## Iframe Integration

When running inside Valu Social iframes, there's a critical race condition to handle. See the [Valu Iframe Integration Guide](./VALU_IFRAME_INTEGRATION.md) for:

- Understanding the `api:ready` timing issue
- Implementing early message buffering
- Connection troubleshooting
- Best practices for iframe development

---

## Future Considerations

1. **Server Components** - React Server Component support
2. **Refresh Tokens** - Automatic token refresh
3. **Session Sync** - Cross-tab session synchronization
4. **Offline Support** - Cached authentication state
