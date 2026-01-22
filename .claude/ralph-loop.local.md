---
active: true
iteration: 1
max_iterations: 100
completion_promise: "SDK BUILD COMPLETE"
started_at: "2026-01-22T19:27:38Z"
---


You are orchestrating the build of @chabaduniverse/auth-sdk - a unified authentication SDK for the Chabad Universe ecosystem.

## Project Context

### Repositories
| Repo | Purpose | Local Path |
|------|---------|------------|
| chabaduniverse-auth-sdk | NEW unified SDK | /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk |
| chabaduniverse-auth | Core auth package | /Users/reuven/Projects/merkos/chabaduniverse-auth |
| universe-portal | Primary consumer | /Users/reuven/Projects/merkos/universe-portal |
| chabaduniverse-chinuch | Consumer | /Users/reuven/Projects/merkos/chinuch-universe |
| pan-kloli | New consumer | /Users/reuven/Projects/merkos/pan-kloli |

### Additional Resources (Reference Only)
- /Users/reuven/Projects/merkos/merkos-platform - Merkos API docs
- /Users/reuven/Projects/merkos/value-api - Valu API reference
- /Users/reuven/Projects/merkos/valusampleapp - Valu sample app

### GitHub Issue Tracking
- SDK Issues: https://github.com/merkos-302/chabaduniverse-auth-sdk/issues
- Core Issues: https://github.com/merkos-302/chabaduniverse-auth/issues
- Portal Issues: https://github.com/merkos-302/universe-portal/issues
- Chinuch Issues: https://github.com/merkos-302/chabaduniverse-chinuch/issues

## Your Role

1. **Check current progress** - Review GitHub issues and local code state
2. **Identify the next incomplete phase** - Follow the execution order below
3. **Prompt user for decisions** - If architecture decisions or clarifications needed
4. **Execute the phase** - Run the appropriate Ralph Loop prompt
5. **Track progress** - Close issues when complete
6. **Continue to next phase** - Loop until all phases complete

## Execution Order (Dependency-Aware)

### Phase 1: SDK Foundation (Issues #1-2)
SDK Issue #1: [Setup] Initialize project with TypeScript, pnpm, and build tooling
SDK Issue #2: [Types] Define core TypeScript interfaces and types
**Completion:** Both issues closed, pnpm build works

### Phase 2: Integration Modules (Issues #3-5) - Can run in parallel
SDK Issue #3: [Valu] Create Valu Social integration module
SDK Issue #4: [CDSSO] Implement Cross-Domain SSO module
SDK Issue #5: [Merkos] Create Merkos Platform integration module
**Completion:** All three modules have passing tests

### Phase 3: Core Package Updates (chabaduniverse-auth #26-27)
Core Issue #26: [Core] Optimize exports for SDK peer dependency usage
Core Issue #27: [Types] Create shared types for SDK compatibility
**Completion:** Core package exports clean, tests pass

### Phase 4: Provider & Hook (Issues #6-7)
SDK Issue #6: [Provider] Implement UniverseAuthProvider
SDK Issue #7: [Hook] Implement useUniverseAuth
**Completion:** Provider composes modules, hook returns unified state

### Phase 5: UI & Documentation (Issues #8-9)
SDK Issue #8: [UI] Create pre-built auth UI components
SDK Issue #9: [Docs] Complete testing and documentation
**Completion:** Components work, docs complete, 80%+ coverage

### Phase 6: Portal Integration (universe-portal #174-176)
Portal Issue #174: [SDK] Extract CDSSO implementation
Portal Issue #175: [SDK] Migrate universe-portal to SDK
Portal Issue #176: [Docs] Update documentation
**Completion:** Portal uses SDK, all tests pass

### Phase 7: Consumer Migration (chinuch #7)
Chinuch Issue #7: [SDK] Migrate to SDK
**Completion:** Chinuch uses SDK, all tests pass

## Iteration Pattern

Each Ralph Loop iteration:
1. Check GitHub for issue status: gh issue list --repo merkos-302/chabaduniverse-auth-sdk --state all
2. Find the first open issue in execution order
3. Read its Ralph Loop prompt from docs/RALPH_LOOP_ISSUE_PLAN.md
4. Execute that prompt's task
5. When task complete, close the issue: gh issue close <number> --repo <repo>
6. Commit changes with meaningful message
7. Continue to next issue

## Completion Criteria

The project is complete when:
1. All GitHub issues are closed
2. @chabaduniverse/auth-sdk builds and passes tests
3. universe-portal uses SDK and passes tests
4. chabaduniverse-chinuch uses SDK and passes tests
5. Documentation is complete

When ALL phases complete, output:
<promise>SDK BUILD COMPLETE</promise>

## Starting the Build

If resuming:
1. Check which issues are already closed
2. Find the first open issue in execution order
3. Continue from there

BEGIN ORCHESTRATION NOW.

