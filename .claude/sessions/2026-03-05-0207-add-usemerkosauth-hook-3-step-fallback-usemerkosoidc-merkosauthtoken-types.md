# Add useMerkosAuth hook (3-step fallback) + useMerkosOIDC + MerkosAuthTokenMessage types (v0.3.0) #24
**Started:** 2026-03-05 02:07

## Session Overview
- **Start Time:** 2026-03-05 02:07
- **End Time:** 2026-03-05 12:30
- **Duration:** ~10 hours (with breaks/context resets)
- **Git Branch:** `feat/usemerkosauth-3-step-fallback-oidc-types`
- **Base Branch:** `main`
- **Related Issue:** #24
- **Session Type:** feat

## GitHub Issue #24 — Full Details

**Title:** feat: Add useMerkosAuth hook (3-step fallback) + useMerkosOIDC + MerkosAuthTokenMessage types (v0.3.0)

### The 3-Step Flow
1. **localStorage check** — `getStoredToken("merkos_auth_token")` → if valid, done
2. **Silent CDSSO** — `CDSSOUtils.authenticate()` → uses browser session cookies → if success, done
3. **OIDC popup fallback** — CDSSO failed → open `auth.chabaduniverse.com/merkos/reconnect` popup → user authenticates → postMessage → done

---

## Git Summary

### Commits: 0 (all changes uncommitted, pending `/save`)

### Files Changed: 13 total (8 added, 5 modified)

**New Files (8):**
| File | Description |
|------|-------------|
| `src/oidc/types.ts` | Constants, interfaces, type definitions |
| `src/oidc/popup-auth.ts` | Internal popup utility (postMessage + BroadcastChannel) |
| `src/oidc/useMerkosOIDC.ts` | Step 3 popup primitive hook |
| `src/oidc/useMerkosAuth.ts` | 3-step fallback orchestrator |
| `src/oidc/index.ts` | Barrel exports |
| `src/oidc/__tests__/popup-auth.test.ts` | 10 tests for popup utility |
| `src/oidc/__tests__/useMerkosOIDC.test.ts` | 8 tests for OIDC primitive |
| `src/oidc/__tests__/useMerkosAuth.test.ts` | 13 tests for orchestrator |

**Modified Files (5):**
| File | Change |
|------|--------|
| `src/index.ts` | Added OIDC exports section (useMerkosOIDCAuth, useMerkosOIDC, constants, types) |
| `tsup.config.ts` | Added `'oidc/index': 'src/oidc/index.ts'` entry |
| `package.json` | Version 0.2.0 → 0.3.0, added `"./oidc"` sub-path export |
| `CLAUDE.md` | Updated directory structure, test counts (363→394, 14→17 files) |
| `.claude/sessions/.current-session` | Session tracking |

### Final Git Status
All changes staged/unstaged on branch `feat/usemerkosauth-3-step-fallback-oidc-types`. No commits yet.

---

## Task Summary

### All Tasks Completed

- [x] Explore codebase for existing patterns and utilities
- [x] Design implementation plan
- [x] Implement `src/oidc/types.ts` — constants and type definitions
- [x] Implement `src/oidc/popup-auth.ts` — popup utility with postMessage + BroadcastChannel
- [x] Implement `src/oidc/useMerkosOIDC.ts` — Step 3 popup primitive hook
- [x] Implement `src/oidc/useMerkosAuth.ts` — 3-step fallback orchestrator
- [x] Implement `src/oidc/index.ts` — barrel exports
- [x] Update `src/index.ts` with OIDC exports
- [x] Update `tsup.config.ts` with oidc entry point
- [x] Update `package.json` — version bump + sub-path export
- [x] Write tests for popup-auth (10 tests)
- [x] Write tests for useMerkosOIDC (8 tests)
- [x] Write tests for useMerkosAuth (13 tests)
- [x] Run all checks (test: 394 pass, build: clean, lint: 0 errors, type-check: 0 errors)
- [x] Live end-to-end test via chabaduniverse.com iframe
- [x] Update CLAUDE.md documentation
- [x] Clean up test artifacts (pan-kloli, auth-relay, npm link)

---

## Key Accomplishments

1. **Full OIDC module implementation** — 4 source files + barrel export
2. **31 new tests** — total now 394 tests across 17 files, all passing
3. **96.83% statement coverage** on new oidc module
4. **Live end-to-end testing** — confirmed full popup flow works inside chabaduniverse.com iframe
5. **SSR-compatible** — works with Next.js server rendering without hydration issues
6. **Cross-browser iframe detection** — ancestorOrigins (Chrome/Safari) + document.referrer (Firefox) + fail-open fallback

## Features Implemented

### `useMerkosAuth` — 3-Step Fallback Orchestrator
- Iframe guard: only activates inside `chabaduniverse.com` iframes
- Step 1: localStorage cache check (`getStoredToken` + `isTokenExpired`)
- Step 2: CDSSO silent auth (`getDefaultCdssoClient().authenticate()`)
- Step 3: Popup reconnect (auto or manual mode)
- `forceEnabled` option to bypass iframe guard for local development
- Auto-runs on mount when iframe detected
- Returns `method` field: `'cached'` | `'cdsso'` | `'popup'`
- `onAuthenticated` callback with token and method

### `useMerkosOIDC` — Step 3 Popup Primitive
- Opens popup to auth URL
- Returns `{ login, isOpen }` interface
- Cleanup on unmount

### `openAuthPopup` — Internal Popup Utility
- Dual-channel token delivery: postMessage (primary) + BroadcastChannel fallback
- Origin validation for postMessage security
- Appends `?origin=` query param (auth relay requires it)
- Polls `popup.closed` every 500ms for user dismissal
- Returns `{ promise, cleanup }` for lifecycle management

### Types & Constants
- `MerkosAuthTokenMessage`, `MerkosAuthMethod`, `MerkosReconnectMode`
- `UseMerkosAuthOptions`, `UseMerkosAuthReturn`
- `MERKOS_AUTH_MESSAGE_TYPE`, `DEFAULT_AUTH_URL`, `DEFAULT_RECONNECT_URL`, `DEFAULT_STORAGE_KEY`, `BROADCAST_CHANNEL_NAME`

---

## Problems Encountered and Solutions

### 1. Missing `?origin=` query parameter
**Problem:** Auth relay's `/merkos/login` route requires `?origin=` and returns 403 without it.
**Solution:** Added `popupUrl.searchParams.set('origin', window.location.origin)` in popup-auth.ts.

### 2. SSR iframe detection failure
**Problem:** `useRef(isQualifyingIframe())` ran during SSR where `window` is undefined, captured `false` permanently and never re-checked on client.
**Solution:** Changed to `useState(false)` + `useEffect` pattern — iframe check runs only on client mount.

### 3. `document.referrer` empty in cross-origin iframes
**Problem:** Parent `chabaduniverse.com` doesn't set referrer (referrer policy), so `document.referrer` was empty even though we were in the iframe.
**Solution:** Added `window.location.ancestorOrigins` as primary check (Chrome/Safari), `document.referrer` as Firefox fallback, and fail-open for unverifiable iframes.

### 4. Unhandled promise rejection when popup closes
**Problem:** `result.promise.finally()` without `.catch()` in useMerkosOIDC caused unhandled rejection.
**Solution:** Added `.catch(() => {})` before `.finally()`.

### 5. TypeScript error with `onMessage` hoisting
**Problem:** `onMessage` was defined inside Promise executor but referenced by `cleanup()` outside it.
**Solution:** Hoisted `onMessage` function and `succeed`/`fail` variables outside the Promise.

### 6. npm link / pnpm link breaking pan-kloli
**Problem:** `pnpm link` re-installed everything with pnpm, destroying npm-installed packages. `npm link` created symlinks that Turbopack couldn't resolve.
**Solution:** Direct `cp -R` of dist files into node_modules (no symlink).

---

## Breaking Changes
None — this is purely additive. The existing `useMerkosAuth` from `src/merkos/` is untouched. New hook exports as `useMerkosOIDCAuth` from root barrel to avoid naming conflict.

## Dependencies Added/Removed
None — reuses existing `cdsso-utils` and `cdsso-client` from the SDK.

## Configuration Changes
- `package.json` version: `0.2.0` → `0.3.0`
- `package.json` exports: added `"./oidc"` sub-path
- `tsup.config.ts`: added `oidc/index` entry point

## Test Artifacts Cleaned Up
- **pan-kloli:** Reverted package.json, pages/index.tsx; removed test-merkos-auth.tsx, api/merkos/callback.ts; restored package-lock.json; reinstalled node_modules from registry
- **auth-relay:** Reverted .env.local (NEXT_PUBLIC_APP_URL back to :3000, removed :3001 from ALLOWED_ORIGINS)
- **Global:** Removed `npm link -g` for `@chabaduniverse/auth-sdk`

---

## Lessons Learned

1. **ancestorOrigins over document.referrer** — In cross-origin iframes, `document.referrer` is unreliable due to referrer policies. `window.location.ancestorOrigins` (Chrome/Safari) is the robust primary check.
2. **SSR iframe detection** — Never compute browser-dependent values in `useRef()` initializers. Use `useState(false)` + `useEffect` for SSR-safe client-only computation.
3. **Auth relay requires `?origin=`** — The popup URL must include the caller's origin as a query param for the auth relay to validate and postMessage back correctly.
4. **Direct copy > npm link for Turbopack** — When testing local SDK changes with Next.js Turbopack, copying dist files directly into node_modules is more reliable than symlinks.
5. **BroadcastChannel is essential** — Some browsers set `window.opener = null` for cross-origin popups, so postMessage alone isn't sufficient. The dual-channel approach (postMessage + BroadcastChannel) ensures token delivery.

## Tips for Future Developers

- Consumer apps import `useMerkosOIDCAuth` from `@chabaduniverse/auth-sdk` (root) or `useMerkosAuth` from `@chabaduniverse/auth-sdk/oidc`
- The hook is a no-op outside chabaduniverse.com iframes — use `forceEnabled: true` for local dev testing
- The auth relay at `auth.chabaduniverse.com` handles `/merkos/login`, `/merkos/reconnect`, and `/api/merkos/callback`
- For local testing: auth relay on port 3001, consumer app on port 3000, access via `chabaduniverse.com/localhost3000`

---

## Session Continuation: OIDC Documentation (Phase 2)

**Started:** 2026-03-05 ~12:30
**Ended:** 2026-03-05 ~12:45
**Duration:** ~15 minutes

### Purpose
Document the OIDC 3-step authentication module. The implementation was complete (Phase 1 above) but existing docs (README, API, ARCHITECTURE, EXAMPLES) had zero coverage of the OIDC module.

### Git Summary (Documentation Phase)

**Commits:** 0 (pending `/save`)

**New Files (1):**
| File | Description |
|------|-------------|
| `docs/MERKOS-OIDC-AUTH.md` | Comprehensive 3-part feature + developer integration guide |

**Modified Files (4):**
| File | Change |
|------|--------|
| `README.md` | Added OIDC feature mention, sub-path import, doc link |
| `docs/API.md` | Added full OIDC Module section (hooks, options, returns, constants, types) |
| `docs/ARCHITECTURE.md` | Added OIDC Authentication Flow section (3-step diagram, popup sequence, iframe detection) |
| `docs/EXAMPLES.md` | Added 5 OIDC integration examples (minimal, full UI, auto, local dev, low-level hook) |

### Task Summary (Documentation Phase)

- [x] Create `docs/MERKOS-OIDC-AUTH.md` — main feature + developer guide
- [x] Update `README.md` with OIDC references
- [x] Update `docs/API.md` with OIDC module section
- [x] Update `docs/ARCHITECTURE.md` with OIDC flow
- [x] Update `docs/EXAMPLES.md` with OIDC examples
- [x] Verify build/lint/type-check still pass

### Verification
- `pnpm build` — clean
- `pnpm lint` — 0 errors
- `pnpm type-check` — 0 errors
