# useMerkosAuth: add authUrl option to override hardcoded login URL #27

**Started:** 2026-03-12 12:44

## Session Overview

- **Branch:** `fix/usemerkosauth-authurl-override-option-27`
- **Type:** fix (🐛 Bug fix)
- **GitHub Issue:** #27

## Goals

- Add `authUrl` option to `useMerkosAuth` hook to allow consumers to override the hardcoded login URL
- Thread `authUrl` through to internal `useMerkosOIDC` / popup calls
- Handle `expectedOrigin` derivation correctly for both auth and reconnect popups
- Update types and tests accordingly

## GitHub Issue #27 — Full Details

### Problem

`useMerkosAuth` hardcodes the auth popup login URL to production:

```ts
// src/oidc/types.ts
const DEFAULT_AUTH_URL = "https://auth.chabaduniverse.com/merkos/login";
```

The hook accepts a `reconnectUrl` option (Step 3 popup), but has **no equivalent option for the login/auth URL**. The lower-level `useMerkosOIDC` hook _does_ accept `authUrl`, but `useMerkosAuth` never passes it through.

This means consumers in test environments (e.g. `test-starterkit.chabaduniverse.com`) always open a popup to **production** `auth.chabaduniverse.com/merkos/login` instead of `test-auth.chabaduniverse.com/merkos/login`.

### How it surfaces

The test starterkit at `chabaduniverse.com/test-cu-starterkit` triggers the Merkos login flow. The popup opens `auth.chabaduniverse.com` (production), which rejects the origin with **"Forbidden: origin not allowed"** because `test-starterkit.chabaduniverse.com` isn't deployed to the production auth relay yet.

Even if the origin _were_ allowed, test environments should not be hitting the production auth relay at all.

### Root cause

In `src/oidc/useMerkosAuth.ts` (the 3-step fallback orchestrator), Step 3 calls `openAuthPopup()` with `reconnectUrl`:

```ts
const { promise, cleanup } = openAuthPopup(reconnectUrl, expectedOrigin, storageKey);
```

But there is no configurable URL for the initial OIDC popup that `useMerkosOIDC` opens. The `useMerkosAuth` hook destructures options like this:

```ts
const {
  storageKey = DEFAULT_STORAGE_KEY,
  reconnectMode = "auto",
  reconnectUrl = DEFAULT_RECONNECT_URL,
  expectedOrigin = new URL(reconnectUrl).origin,
  onAuthenticated,
  debug = false,
  forceEnabled = false,
} = options;
```

There is no `authUrl` parameter, and the internal `useMerkosOIDC` call (if any) gets the hardcoded `DEFAULT_AUTH_URL`.

### Proposed fix

**1. Add `authUrl` to `UseMerkosAuthOptions`**

```ts
interface UseMerkosAuthOptions {
  /** URL for the auth login popup (defaults to production auth relay) */
  authUrl?: string;
  // ... existing options
}
```

**2. Thread it through to internal popup calls**

Wherever `useMerkosAuth` opens the auth popup (or delegates to `useMerkosOIDC`), pass the configured `authUrl` instead of relying on `DEFAULT_AUTH_URL`.

**3. Derive `expectedOrigin` from `authUrl` when provided**

Currently `expectedOrigin` defaults to `new URL(reconnectUrl).origin`. If `authUrl` is provided, the origin for postMessage validation should match whichever URL is being opened. The reconnect popup and auth popup may be on different hosts in test vs prod scenarios.

### Consumer usage (starterkit AuthProvider.tsx)

```tsx
useMerkosAuth({
  storageKey: TOKEN_STORAGE_KEY,
  reconnectMode: "manual",
  authUrl:
    process.env.NEXT_PUBLIC_MERKOS_AUTH_URL ||
    "https://auth.chabaduniverse.com/merkos/login",
  reconnectUrl:
    process.env.NEXT_PUBLIC_MERKOS_AUTH_RECONNECT_URL ||
    "https://auth.chabaduniverse.com/merkos/reconnect",
});
```

### Current SDK types for reference

```ts
// UseMerkosOIDCOptions — lower-level hook (already has authUrl)
interface UseMerkosOIDCOptions {
  authUrl?: string;           // ✅ exists here
  expectedOrigin?: string;
  storageKey?: string;
}

// UseMerkosAuthOptions — higher-level hook (missing authUrl)
interface UseMerkosAuthOptions {
  storageKey?: string;
  reconnectMode?: MerkosReconnectMode;
  reconnectUrl?: string;      // ✅ exists
  expectedOrigin?: string;
  onAuthenticated?: (token: string, method: MerkosAuthMethod) => void;
  debug?: boolean;
  forceEnabled?: boolean;
  // ❌ no authUrl
}
```

### Affected version

`@chabaduniverse/auth-sdk@^0.3.0`

## Progress

**Session ended:** 2026-03-12 12:50
**Duration:** ~6 minutes

### Git Summary

- **Branch:** `fix/usemerkosauth-authurl-override-option-27`
- **Commits:** 0 (changes staged but not committed)
- **Files changed:** 4 modified, 1 new (session file)

| File | Change | Details |
|------|--------|---------|
| `src/oidc/types.ts` | Modified | Added `authUrl?: string` to `UseMerkosAuthOptions` |
| `src/oidc/useMerkosAuth.ts` | Modified | Imported `DEFAULT_AUTH_URL`, destructured `authUrl`, computed per-URL origins, parameterized `openPopupAndWait(url, origin)` |
| `src/oidc/__tests__/useMerkosAuth.test.ts` | Modified | Updated existing assertion for Step 3 auto (now uses `authUrl`), added 4 new tests |
| `.claude/sessions/.current-session` | Modified | Session tracking |
| `.claude/sessions/2026-03-12-1244-...` | New | Session documentation |

### Test Summary

- **398 tests passing** (up from 394 — 4 new tests)
- **17 test files**, all passing
- Build, type-check, lint — all clean

### Key Accomplishments

1. Added `authUrl` option to `UseMerkosAuthOptions` interface
2. Threaded `authUrl` through the 3-step fallback orchestrator:
   - Step 3 auto-popup now uses `authUrl` (login URL) instead of `reconnectUrl`
   - Manual `reconnect()` continues to use `reconnectUrl`
3. Improved `expectedOrigin` handling:
   - Per-URL origin derivation (`authExpectedOrigin` vs `reconnectExpectedOrigin`)
   - Explicit `expectedOrigin` overrides both (backward compatible)
4. Updated existing test assertion to reflect Step 3 auto now using `authUrl`
5. Added 4 new tests covering:
   - Custom `authUrl` for Step 3 auto popup
   - `reconnectUrl` used for manual reconnect (not `authUrl`)
   - Independent origin derivation from different URLs
   - Explicit `expectedOrigin` overriding derived origins

### Design Decisions

- **Parameterized `openPopupAndWait(popupUrl, popupOrigin)`** — Instead of two separate helper functions, the existing helper now accepts the URL and origin as arguments. This keeps the code DRY while allowing different URLs for login vs reconnect.
- **Per-URL origin derivation** — `expectedOrigin` is no longer a single default. Each popup call derives its origin from its own URL unless an explicit `expectedOrigin` is provided, which overrides both. This is fully backward compatible since the default `authUrl` and `reconnectUrl` share the same origin.
- **No breaking changes** — All existing options continue to work identically. The new `authUrl` option is purely additive.

### Consumer Usage After Fix

```tsx
useMerkosAuth({
  storageKey: TOKEN_STORAGE_KEY,
  reconnectMode: "manual",
  authUrl: process.env.NEXT_PUBLIC_MERKOS_AUTH_URL || "https://auth.chabaduniverse.com/merkos/login",
  reconnectUrl: process.env.NEXT_PUBLIC_MERKOS_AUTH_RECONNECT_URL || "https://auth.chabaduniverse.com/merkos/reconnect",
});
```

### Problems Encountered

None — straightforward implementation.

### Breaking Changes

None. Fully backward compatible. New `authUrl` option defaults to `DEFAULT_AUTH_URL`.

### Dependencies Added/Removed

None.

### Tips for Future Developers

- `useMerkosAuth` (high-level orchestrator) and `useMerkosOIDC` (low-level primitive) both now support `authUrl`. They are independent hooks — `useMerkosAuth` does NOT delegate to `useMerkosOIDC` internally.
- When auth and reconnect URLs are on different hosts, `expectedOrigin` is derived per-URL automatically. Only pass an explicit `expectedOrigin` if you need to override both.
