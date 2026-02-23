# Document Valu API Race Condition Fix
**Started:** 2026-02-23 17:15

## Session Overview
- **Start Time:** 2026-02-23 17:15
- **Git Branch:** `docs/document-valu-api-race-condition-fix`
- **Base Branch:** `dev`
- **Related Issue:** #12

## GitHub Issue #12: docs: Document Valu API race condition fix and iframe integration setup

**Labels:** documentation, valu

> **Triage note:** This race condition was fixed in universe-portal (`lib/valu-api-singleton.ts`), not in auth-sdk. This issue requests SDK-side documentation of the pattern. Consider whether this should instead be:
> 1. A documentation issue in `universe-portal` (documenting the workaround where it lives), or
> 2. A feature issue here to build the early-message-buffer pattern *into* the SDK's Valu module so consumers get it for free
>
> If (1), close this and open in universe-portal. If (2), re-scope as a feature request.

---

### Problem Discovered

When integrating the SDK with Valu Social iframe applications, there's a **critical race condition**:

1. Valu Social sends `api:ready` message **immediately** when the iframe loads
2. The iframe application (React) is still initializing
3. By the time `ValuApi` is instantiated and starts listening, `api:ready` was already sent
4. Result: `api.connected` returns `false` and the connection never establishes

#### Console evidence from Valu Social parent:
```
localhost3000 -> api:ready:: {applicationId: 'localhost3000', action: 'open', params: {…}}
```

#### Console evidence from iframe (portal):
```
ValuApiSingleton: Timeout - API_READY not received. Connected: false
```

### Solution Implemented (in Universe Portal)

Created an **early message buffer** that:
1. Installs a message listener **immediately** when the module is imported (before React initializes)
2. Buffers any `api:ready` messages that arrive early
3. Replays buffered messages when `ValuApi` is finally instantiated

#### Key code pattern:
```typescript
// Install IMMEDIATELY at module load time (BEFORE React initializes)
interface BufferedMessage {
  data: any;
  origin: string;
  source: MessageEventSource | null;
  timestamp: number;
}

const earlyMessageBuffer: BufferedMessage[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data?.target === 'valuApi' || event.data?.name === 'api:ready') {
      earlyMessageBuffer.push({
        data: event.data,
        origin: event.origin,
        source: event.source,
        timestamp: Date.now()
      });
    }
  });
}

// Later, when ValuApi is created, replay buffered messages:
earlyMessageBuffer.forEach((buffered) => {
  const syntheticEvent = new MessageEvent('message', {
    data: buffered.data,
    origin: buffered.origin,
    source: buffered.source as Window
  });
  window.dispatchEvent(syntheticEvent);
});
```

### Reference
- Fix implemented in: https://github.com/merkos-302/universe-portal
- File: `lib/valu-api-singleton.ts`

## Goals

1. Build the early-message-buffer pattern into the SDK's Valu module so consumers get it for free
2. Document the race condition and the solution in SDK documentation
3. Add tests for the early message buffer
4. Update API docs and examples

## Progress

- [x] Explore current Valu module implementation
- [x] Build early-message-buffer into SDK Valu module
- [x] Add tests for the buffer
- [x] Update documentation (API.md, EXAMPLES.md)
- [x] Run all checks (test, build, lint, type-check)

## Session Summary

**End Time:** 2026-02-23 17:45
**Duration:** ~30 minutes

### Git Summary

**Branch:** `docs/document-valu-api-race-condition-fix` (from `dev`)
**Commits:** 0 (pending commit)
**Files Changed:** 7 total (2 new, 5 modified)

| File | Change | Description |
|------|--------|-------------|
| `src/valu/early-message-buffer.ts` | Added | Module-level early message buffer with auto-start, configurable limits, and replay API |
| `src/valu/__tests__/early-message-buffer.test.ts` | Added | 24 tests covering capture, filter, replay, reset, and race condition scenario |
| `src/valu/ValuProvider.tsx` | Modified | Import and call `replayBufferedMessages()` after `ValuApi` instantiation |
| `src/valu/index.ts` | Modified | Export all early message buffer functions and types |
| `docs/API.md` | Modified | Added Early Message Buffer subsection under Valu Module |
| `docs/EXAMPLES.md` | Modified | Added Valu API Race Condition section with problem/solution docs |
| `.claude/sessions/` | Modified | Session file and current-session tracking |

### Test Results

- **363 tests passing** across 14 test files (up from 339)
- **24 new tests** in `early-message-buffer.test.ts`
- Build, lint, and type-check all clean

### Key Accomplishments

1. **Built the early-message-buffer pattern into the SDK** — consumers get the race condition fix for free by using `ValuProvider`
2. **Module-level listener** — installs at bundle evaluation time, before React initializes
3. **Safety features** — max buffer size (50), max message age (30s), auto-stop after replay
4. **Full public API** — `startCapturing`, `stopCapturing`, `replayBufferedMessages`, `getBufferedMessages`, `hasBeenReplayed`, `isBufferCapturing`, `resetBuffer`
5. **Comprehensive documentation** — API.md and EXAMPLES.md updated with problem description, automatic and manual usage patterns

### Features Implemented

- `early-message-buffer.ts` — standalone module with auto-start on import
- `BufferedMessage` and `EarlyMessageBufferConfig` types exported for consumers
- Automatic integration in `ValuProvider` — zero config needed for standard usage
- Advanced manual usage supported for custom `ValuApi` instantiation

### Triage Decision

Chose option (2) from the issue triage: **build the pattern into the SDK** so consumers get it for free. This is the most valuable approach since every iframe consumer would otherwise need to implement this workaround independently.

### Breaking Changes

None. The early message buffer is additive and transparent to existing consumers.

### Dependencies Added/Removed

None.

### Tips for Future Developers

- The `startCapturing()` call at the bottom of `early-message-buffer.ts` is intentional — it must run at module load time to catch early messages
- The buffer automatically stops capturing after `replayBufferedMessages()` to prevent re-buffering synthetic events
- Use `resetBuffer()` in tests to clean up between test cases
- The `source` property from `MessageEvent` is intentionally not stored in the buffer because `MessageEventSource` cannot be cloned into synthetic events reliably
