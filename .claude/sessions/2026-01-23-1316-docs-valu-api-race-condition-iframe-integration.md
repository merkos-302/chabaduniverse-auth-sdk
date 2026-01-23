# docs-valu-api-race-condition-iframe-integration

**Started:** 2026-01-23 13:16

## Session Overview

| Field | Value |
|-------|-------|
| **Start Time** | 2026-01-23 13:16 |
| **Branch** | `docs/docs-valu-api-race-condition-iframe-integration` |
| **Type** | 📝 docs |
| **GitHub Issue** | #12 |

## Goals

Based on GitHub Issue #12, this session will document:

1. **Iframe Integration Guide**
   - Explain the `api:ready` timing issue (race condition)
   - Recommend early message buffering pattern
   - Provide copy-paste code for SDK users

2. **Connection Troubleshooting**
   - Add section for "api.connected always false" issue
   - Document the race condition scenario
   - Provide debugging steps

3. **Best Practices**
   - Initialize message listeners at module load time (NOT in React lifecycle)
   - Check `api.connected` property before operations
   - Implement proper fallback for when Valu API isn't available

## Context

**Problem:** When integrating the SDK with Valu Social iframe applications, there's a critical race condition where Valu Social sends `api:ready` immediately when the iframe loads, but the React app is still initializing. By the time `ValuApi` is instantiated, the `api:ready` message was already sent and missed.

**Solution Pattern:** Early message buffer that installs a listener immediately at module load time, buffers early messages, and replays them when ValuApi is instantiated.

**Reference Implementation:** `lib/valu-api-singleton.ts` in universe-portal

## Progress

- [x] Review existing Valu documentation in SDK
- [x] Create Iframe Integration Guide
- [x] Add Connection Troubleshooting section
- [x] Document Best Practices
- [x] Update main README if needed
- [x] Run tests and build to verify changes

## Completed Work

### New Documentation Created
- **`docs/VALU_IFRAME_INTEGRATION.md`** - Comprehensive guide covering:
  - Overview of Valu Social iframe communication
  - The race condition problem explained with diagrams
  - Solution: Early message buffering pattern with full code examples
  - Step-by-step implementation guide
  - Connection troubleshooting section
  - Best practices for iframe integration
  - Complete example project structure

### Documentation Updates
- **`README.md`** - Added link to new Valu Iframe Integration guide in documentation table
- **`docs/API.md`** - Added note in Valu Module section linking to iframe guide
- **`docs/EXAMPLES.md`** - Added note in Valu-Specific Operations section for connection issues

### Verification
- All 289 tests passing
- Build successful
- Lint: No errors
- Type-check: No errors

## Notes

This documentation addresses GitHub Issue #12, providing SDK users with clear guidance on handling the `api:ready` race condition when building iframe applications for Valu Social.

---

## Session End Summary

**Ended:** 2026-01-23 13:28
**Duration:** ~12 minutes

### Git Summary

| Metric | Count |
|--------|-------|
| Files Modified | 3 |
| Files Added | 2 |
| Total Files Changed | 5 |
| Commits Made | 0 (pending) |

**Changed Files:**
| File | Status | Description |
|------|--------|-------------|
| `docs/VALU_IFRAME_INTEGRATION.md` | Added | New comprehensive iframe integration guide (450+ lines) |
| `.claude/sessions/2026-01-23-1316-...md` | Added | Session tracking file |
| `README.md` | Modified | Added link to new guide in documentation table |
| `docs/API.md` | Modified | Added note in Valu Module section |
| `docs/EXAMPLES.md` | Modified | Added note for connection troubleshooting |

### Todo Summary

| Status | Count |
|--------|-------|
| Completed | 6 |
| Remaining | 0 |

**Completed Tasks:**
1. ✅ Review existing Valu documentation in SDK
2. ✅ Create Iframe Integration Guide
3. ✅ Add Connection Troubleshooting section
4. ✅ Document Best Practices
5. ✅ Update main README if needed
6. ✅ Run tests and build to verify changes

### Key Accomplishments

1. Created comprehensive `docs/VALU_IFRAME_INTEGRATION.md` covering the entire iframe integration workflow
2. Documented the `api:ready` race condition with visual diagrams
3. Provided copy-paste early message buffer solution
4. Added connection troubleshooting guide with diagnosis steps
5. Documented 6 best practices for iframe development
6. Included complete example project structure
7. Updated README, API.md, and EXAMPLES.md with cross-references

### Features Implemented

- **Early Message Buffer Pattern** - Complete TypeScript implementation
- **Valu API Singleton Pattern** - With automatic replay functionality
- **Troubleshooting Table** - Issue/Solution mapping
- **Debugging Checklist** - Step-by-step diagnosis

### Problems Encountered & Solutions

| Problem | Solution |
|---------|----------|
| None | Session proceeded without issues |

### Breaking Changes

None - documentation only.

### Dependencies Added/Removed

None.

### Configuration Changes

None.

### Deployment Steps

None required - documentation changes only.

### Lessons Learned

1. The race condition is a fundamental timing issue between parent/iframe communication
2. Early message buffering must happen at module load time, before React
3. The solution pattern is applicable to any iframe postMessage communication

### What Wasn't Completed

All planned work was completed.

### Tips for Future Developers

1. When updating Valu integration, ensure the early buffer documentation stays in sync
2. The example code in the guide should be tested if @arkeytyp/valu-api is updated
3. Consider adding automated tests for the early buffer pattern if SDK includes it natively
4. The troubleshooting section should be updated as new issues are discovered

---

**Session Status:** ✅ COMPLETED
