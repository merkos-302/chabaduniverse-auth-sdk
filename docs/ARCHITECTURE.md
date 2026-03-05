# Architecture

Technical architecture documentation for @chabaduniverse/auth-sdk.

## Table of Contents

- [Overview](#overview)
- [Package Structure](#package-structure)
- [Component Hierarchy](#component-hierarchy)
- [State Management](#state-management)
- [Provider Integration](#provider-integration)
- [CDSSO Flow](#cdsso-flow)
- [OIDC Authentication Flow](#oidc-authentication-flow)
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
│   ├── AuthStatusDisplay.tsx   # Debug status display
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
│   ├── types.ts                # Merkos types
│   └── index.ts                # Merkos exports
│
└── valu/                       # Valu module
    ├── ValuProvider.tsx        # Valu context provider
    ├── useValu.ts              # Valu hooks
    ├── valu-utils.ts           # Utility functions
    ├── types.ts                # Valu types
    └── index.ts                # Valu exports
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

## OIDC Authentication Flow

The OIDC module provides a 3-step fallback authentication flow for mini apps running inside the `chabaduniverse.com` iframe. It is separate from the CDSSO flow — CDSSO is used as Step 2 *within* this flow.

### 3-Step Fallback

```
┌────────────────────────────────────────────────────────────────────┐
│                     useMerkosOIDCAuth()                            │
│                                                                    │
│  ┌──────────────────┐                                              │
│  │ Iframe Detection │──── Not in iframe ──▶ Return IDLE (no-op)   │
│  └────────┬─────────┘                                              │
│           │ In iframe                                              │
│           ▼                                                        │
│  ┌──────────────────┐                                              │
│  │ Step 1: Cache    │──── Token found + valid ──▶ Done (cached)   │
│  │ localStorage     │                                              │
│  └────────┬─────────┘                                              │
│           │ miss                                                   │
│           ▼                                                        │
│  ┌──────────────────┐                                              │
│  │ Step 2: CDSSO    │──── Session found ──▶ Done (cdsso)          │
│  │ Silent Auth      │                                              │
│  └────────┬─────────┘                                              │
│           │ fail                                                   │
│           ▼                                                        │
│  ┌──────────────────┐                                              │
│  │ Step 3: Popup    │──── reconnectMode?                          │
│  │ Reconnect        │     ├── 'auto'   → Open popup immediately   │
│  │                  │     └── 'manual' → Set needsReconnect=true  │
│  └──────────────────┘                                              │
└────────────────────────────────────────────────────────────────────┘
```

### Popup Reconnect Flow (Step 3)

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Mini App   │     │    Auth Relay        │     │  Merkos OIDC    │
│  (iframe)   │     │  auth.chabaduniverse │     │  Server         │
└──────┬──────┘     └──────────┬──────────┘     └────────┬────────┘
       │                       │                         │
       │  1. window.open()     │                         │
       │──────────────────────▶│                         │
       │    /merkos/reconnect  │                         │
       │    ?origin=<app>      │                         │
       │                       │                         │
       │                       │  2. User clicks         │
       │                       │     "Reconnect"         │
       │                       │                         │
       │                       │  3. Redirect to         │
       │                       │─────/merkos/login──────▶│
       │                       │     ?origin=<app>       │
       │                       │                         │
       │                       │  4. OIDC callback       │
       │                       │◀────────────────────────│
       │                       │     (token in response) │
       │                       │                         │
       │  5. postMessage       │                         │
       │◀──────────────────────│                         │
       │  { type: 'MERKOS_AUTH_TOKEN', token }           │
       │                       │                         │
       │  5b. BroadcastChannel │                         │
       │◀──── (fallback) ─────│                         │
       │                       │                         │
       │  6. Store in          │                         │
       │     localStorage      │                         │
       │                       │                         │
```

### Token Delivery

The auth relay callback page delivers the token back to the mini app via two channels (first one wins):

1. **postMessage** — `window.opener.postMessage({ type: 'MERKOS_AUTH_TOKEN', token }, origin)` — Primary channel, validated against `expectedOrigin`.

2. **BroadcastChannel** — `new BroadcastChannel('merkos_auth').postMessage(...)` — Fallback for browsers where `window.opener` is `null` (security policy).

### Iframe Detection Logic

```
window.self === window.top?
  ├── Yes → NOT in iframe → return false
  └── No/Error → IN iframe
       │
       ├── ancestorOrigins available? (Chrome/Safari)
       │   ├── Contains 'chabaduniverse.com' → return true
       │   └── Does not contain → return false
       │
       ├── document.referrer available? (Firefox)
       │   ├── Contains 'chabaduniverse.com' → return true
       │   └── Does not contain → return false
       │
       └── Neither available → return true (fail-open)
```

> For complete details, see [MERKOS-OIDC-AUTH.md](./MERKOS-OIDC-AUTH.md).

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
    },
    "./merkos": {
      "import": "./dist/merkos/index.js",
      "require": "./dist/merkos/index.cjs"
    },
    "./valu": {
      "import": "./dist/valu/index.js",
      "require": "./dist/valu/index.cjs"
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
    'merkos/index': 'src/merkos/index.ts',
    'valu/index': 'src/valu/index.ts',
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
| index | ~2.7KB | ~16.5KB |
| providers | ~0.5KB | ~2.0KB |
| hooks | ~0.4KB | ~1.6KB |
| components | ~0.3KB | ~0.8KB |
| cdsso | ~0.7KB | ~5.2KB |
| merkos | ~0.5KB | ~3.4KB |
| valu | ~0.6KB | ~4.3KB |

Note: With code splitting enabled, shared code is extracted into chunk files. ESM entry points are small re-export stubs; CJS entry points include more inlined code. Tree-shaking further reduces final bundle size.

---

## Security Considerations

1. **Token Storage** - Tokens stored in localStorage (configurable)
2. **CDSSO** - Uses state parameter for CSRF protection
3. **Cookie Checks** - SameSite and Secure attributes respected
4. **JWT Validation** - Expiration checked client-side

---

## Future Considerations

1. **Server Components** - React Server Component support
2. **Refresh Tokens** - Automatic token refresh
3. **Session Sync** - Cross-tab session synchronization
4. **Offline Support** - Cached authentication state
