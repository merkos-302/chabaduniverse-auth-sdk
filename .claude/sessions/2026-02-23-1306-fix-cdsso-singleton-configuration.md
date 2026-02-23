# fix-cdsso-singleton-configuration — 2026-02-23 13:06

## Session Overview

- **Start Time:** 2026-02-23 13:06
- **End Time:** 2026-02-23 13:17
- **Duration:** ~11 minutes
- **Git Branch:** `fix/fix-cdsso-singleton-configuration`
- **Session Type:** 🐛 fix
- **Status:** Completed
- **GitHub Issue:** #16 — `CdssoClient` singleton (`defaultClient`) cannot be configured and breaks when modules are duplicated

## Issue Context (GitHub Issue #16)

### Problem
`src/cdsso/cdsso-client.ts` uses a module-level singleton (`defaultClient`) that:
- **Problem A:** Cannot be configured — `getDefaultCdssoClient()` always uses default config with no way to set custom Merkos base URL, token storage key, or replace/reset the singleton
- **Problem B:** Module duplication — With `splitting: false`, importing from both root and `./cdsso` creates two separate `defaultClient` instances (RESOLVED by PR #18 landing `splitting: true`)

### Impact
- Cannot configure the default client for different environments
- Silent state inconsistency when consuming from multiple entry points
- Untestable — no way to reset or mock the singleton

### Prerequisites
- `splitting: true` fix (PR #18) — LANDED

## Goals

- Fix CdssoClient singleton configuration (Issue #16, Problem A)
- Add `setDefaultCdssoClient(client)` to replace singleton with a pre-configured instance
- Add `resetDefaultCdssoClient()` to clear the singleton (for tests and reconfiguration)
- Modify `getDefaultCdssoClient(config?)` to accept optional config on first call
- Add tests for the new functions
- Update exports and documentation

## Git Summary

- **Total files changed:** 6 modified, 1 new (session file)
- **Commits made:** 0 (uncommitted changes)
- **Lines:** +117 / -5

### Changed Files

| File | Type | Description |
|------|------|-------------|
| `src/cdsso/cdsso-client.ts` | Modified | Added `setDefaultCdssoClient`, `resetDefaultCdssoClient`, updated `getDefaultCdssoClient` signature |
| `src/cdsso/index.ts` | Modified | Added 2 new exports |
| `src/index.ts` | Modified | Added 2 new exports from root |
| `src/cdsso/__tests__/cdsso-client.test.ts` | Modified | Added 5 new tests, `resetDefaultCdssoClient` in beforeEach |
| `docs/API.md` | Modified | Added "Singleton Management" subsection to CDSSO Module |
| `.claude/sessions/.current-session` | Modified | Session tracking |

## Task Summary

- **Total tasks:** 6/6 completed
- [x] Implement `setDefaultCdssoClient`, `resetDefaultCdssoClient`, modify `getDefaultCdssoClient` in `cdsso-client.ts`
- [x] Update `src/cdsso/index.ts` exports
- [x] Update `src/index.ts` exports
- [x] Add tests in `cdsso-client.test.ts` (5 new tests, 51 total in file)
- [x] Update `docs/API.md` (new Singleton Management subsection)
- [x] Run full verification — 294 tests pass, build/lint/type-check all clean

## Key Accomplishments

1. **Made CdssoClient singleton configurable** — `getDefaultCdssoClient(config?)` now accepts optional config on first call
2. **Added `setDefaultCdssoClient(client)`** — allows replacing the singleton with a fully pre-configured instance
3. **Added `resetDefaultCdssoClient()`** — clears singleton for test isolation and environment reconfiguration
4. **Full test coverage** — 5 new tests covering all singleton management scenarios
5. **API documentation updated** — New "Singleton Management" subsection with usage examples

## Features Implemented

- `getDefaultCdssoClient(config?)` — optional config parameter (only used on first call)
- `setDefaultCdssoClient(client)` — replace singleton with pre-configured CdssoClient
- `resetDefaultCdssoClient()` — clear singleton for fresh creation

## Problems Encountered & Solutions

- None — straightforward implementation

## Breaking Changes

- **None** — `getDefaultCdssoClient()` remains backward-compatible (config param is optional)

## Dependencies Added/Removed

- None

## Verification Results

| Check | Result |
|-------|--------|
| Tests | 294 passed (0 failures) |
| Build | Success (ESM + CJS + DTS) |
| Lint | 0 errors |
| Type-check | 0 errors |

## Tips for Future Developers

- Always call `resetDefaultCdssoClient()` in test `beforeEach` blocks to ensure singleton isolation between tests
- `setDefaultCdssoClient` is the preferred way to inject a fully configured client in app initialization
- The config param on `getDefaultCdssoClient(config?)` is only used on first call — subsequent calls return the existing singleton
- This fix addresses Problem A from Issue #16; Problem B was already resolved by PR #18 (`splitting: true`)
