# CLAUDE.md - @chabaduniverse/auth-sdk

## Project Overview

**Package:** @chabaduniverse/auth-sdk
**Purpose:** Unified authentication SDK for Chabad Universe ecosystem
**Status:** Initial Development

## Architecture

This SDK is the **composition layer** that unifies:
- `@chabaduniverse/auth` - Core identity, Merkos Platform integration
- `@arkeytyp/valu-api` - Valu Social integration

### Package Dependency Graph

```
@chabaduniverse/auth-sdk (this package)
         │
    ┌────┴────┐
    ▼         ▼
@chabaduniverse/auth    @arkeytyp/valu-api
(peer dependency)       (peer dependency)
```

### Directory Structure (Target)

```
src/
├── providers/
│   ├── UniverseAuthProvider.tsx    # Main unified provider
│   └── types.ts                     # Provider types
├── hooks/
│   ├── useUniverseAuth.ts          # Unified auth hook
│   ├── useProviders.ts             # Provider-specific access
│   └── index.ts
├── components/
│   ├── LoginButton.tsx             # Pre-built login UI
│   ├── AuthGuard.tsx               # Route protection
│   ├── UserMenu.tsx                # User dropdown
│   └── index.ts
├── cdsso/
│   ├── cdsso-client.ts             # Cross-domain SSO
│   ├── cdsso-utils.ts              # CDSSO utilities
│   └── index.ts
├── valu/
│   ├── ValuIntegration.ts          # Valu API wrapper
│   └── index.ts
├── utils/
│   └── index.ts
└── index.ts                         # Main exports
```

## Key Design Decisions

1. **Peer Dependencies** - `@chabaduniverse/auth` and `@arkeytyp/valu-api` are peer deps, not bundled
2. **Provider Pattern** - Single `<UniverseAuthProvider>` wraps the app
3. **Unified State** - One `useUniverseAuth()` hook returns merged state
4. **Provider Access** - Can still access individual providers via `providers.valu`, `providers.merkos`
5. **CDSSO Built-in** - Cross-domain SSO logic extracted from universe-portal

## Consumer Apps

| App | Repo | Status |
|-----|------|--------|
| universe-portal | merkos-302/universe-portal | Will migrate |
| chinuch-universe | merkos-302/chinuch-universe | Will migrate |
| pan-kloli | merkos-302/pan-kloli | New implementation |

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Watch mode
pnpm build            # Production build
pnpm test             # Run tests
pnpm lint             # Lint code
pnpm type-check       # TypeScript check
```

## Testing Strategy

- Unit tests for hooks and utilities
- Integration tests for provider interactions
- Mock implementations for both Valu and Merkos APIs

## Critical Notes

- **NEVER break @chabaduniverse/auth API** - Existing consumers depend on it
- **Peer dependencies** - Let consumers control versions
- **Tree-shakeable** - Export individual components for bundle optimization
- **TypeScript strict** - Full type safety required

## Related Documentation

- [universe-portal CLAUDE.md](../universe-portal/CLAUDE.md)
- [chabaduniverse-auth](../chabaduniverse-auth/)
- [Unified SDK Vision](../universe-portal/docs/planning/UNIFIED_AUTH_PACKAGE_VISION.md)
