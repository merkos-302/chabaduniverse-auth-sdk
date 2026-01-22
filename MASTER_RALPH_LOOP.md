# Master Ralph Loop Orchestration Prompt

This is the master orchestration prompt for building the entire @chabaduniverse/auth-sdk project.

## Quick Start

To run the master orchestration:

```
/ralph-loop "$(cat MASTER_RALPH_LOOP.md)" --completion-promise "SDK BUILD COMPLETE" --max-iterations 100
```

Or for a specific phase:

```
/ralph-loop "Execute Phase 1: Project Setup from MASTER_RALPH_LOOP.md" --completion-promise "SETUP COMPLETE" --max-iterations 15
```

---

## Master Orchestration Prompt

```
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
```
SDK Issue #1: [Setup] Initialize project with TypeScript, pnpm, and build tooling
SDK Issue #2: [Types] Define core TypeScript interfaces and types
```
**Completion:** Both issues closed, `pnpm build` works

### Phase 2: Integration Modules (Issues #3-5) - Can run in parallel
```
SDK Issue #3: [Valu] Create Valu Social integration module
SDK Issue #4: [CDSSO] Implement Cross-Domain SSO module
SDK Issue #5: [Merkos] Create Merkos Platform integration module
```
**Completion:** All three modules have passing tests

### Phase 3: Core Package Updates (chabaduniverse-auth #26-27)
```
Core Issue #26: [Core] Optimize exports for SDK peer dependency usage
Core Issue #27: [Types] Create shared types for SDK compatibility
```
**Completion:** Core package exports clean, tests pass

### Phase 4: Provider & Hook (Issues #6-7)
```
SDK Issue #6: [Provider] Implement UniverseAuthProvider
SDK Issue #7: [Hook] Implement useUniverseAuth
```
**Completion:** Provider composes modules, hook returns unified state

### Phase 5: UI & Documentation (Issues #8-9)
```
SDK Issue #8: [UI] Create pre-built auth UI components
SDK Issue #9: [Docs] Complete testing and documentation
```
**Completion:** Components work, docs complete, 80%+ coverage

### Phase 6: Portal Integration (universe-portal #174-176)
```
Portal Issue #174: [SDK] Extract CDSSO implementation
Portal Issue #175: [SDK] Migrate universe-portal to SDK
Portal Issue #176: [Docs] Update documentation
```
**Completion:** Portal uses SDK, all tests pass

### Phase 7: Consumer Migration (chinuch #7)
```
Chinuch Issue #7: [SDK] Migrate to SDK
```
**Completion:** Chinuch uses SDK, all tests pass

## Progress Tracking

Update this section as phases complete:

- [ ] Phase 1: SDK Foundation
  - [ ] Issue #1: Setup
  - [ ] Issue #2: Types
- [ ] Phase 2: Integration Modules
  - [ ] Issue #3: Valu Module
  - [ ] Issue #4: CDSSO Module
  - [ ] Issue #5: Merkos Module
- [ ] Phase 3: Core Package Updates
  - [ ] chabaduniverse-auth #26
  - [ ] chabaduniverse-auth #27
- [ ] Phase 4: Provider & Hook
  - [ ] Issue #6: UniverseAuthProvider
  - [ ] Issue #7: useUniverseAuth
- [ ] Phase 5: UI & Documentation
  - [ ] Issue #8: UI Components
  - [ ] Issue #9: Documentation
- [ ] Phase 6: Portal Integration
  - [ ] universe-portal #174
  - [ ] universe-portal #175
  - [ ] universe-portal #176
- [ ] Phase 7: Consumer Migration
  - [ ] chabaduniverse-chinuch #7

## Decision Points (Prompt User)

STOP and ask the user when:
1. **Architecture decisions** not covered in existing docs
2. **Breaking changes** to existing packages
3. **Priority conflicts** if timeline constrained
4. **External dependency issues** (version conflicts, etc.)
5. **Test failures** that require investigation
6. **Unclear requirements** for any feature

Example prompt format:
```
🛑 DECISION NEEDED

I've encountered [situation]. The options are:

1. [Option A] - [pros/cons]
2. [Option B] - [pros/cons]

Which approach should I take?
```

## Iteration Pattern

Each Ralph Loop iteration:
1. Check GitHub for issue status: `gh issue list --repo merkos-302/chabaduniverse-auth-sdk --state all`
2. Find the first open issue in execution order
3. Read its Ralph Loop prompt from docs/RALPH_LOOP_ISSUE_PLAN.md
4. Execute that prompt's task
5. When task complete, close the issue: `gh issue close <number> --repo <repo>`
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

If this is the first iteration:
1. Run `gh issue list --repo merkos-302/chabaduniverse-auth-sdk --state open` to see current state
2. Start with Phase 1, Issue #1
3. Follow the execution order strictly

If resuming:
1. Check which issues are already closed
2. Find the first open issue in execution order
3. Continue from there

BEGIN ORCHESTRATION NOW.
```

---

## Individual Phase Prompts

For running specific phases independently:

### Phase 1 Only
```
/ralph-loop "Execute SDK Phase 1: Foundation. Working in /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk. Complete Issue #1 (Setup) then Issue #2 (Types). Output <promise>FOUNDATION COMPLETE</promise> when both issues are done." --completion-promise "FOUNDATION COMPLETE" --max-iterations 25
```

### Phase 2 Only
```
/ralph-loop "Execute SDK Phase 2: Integration Modules. Working in /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk. Complete Issues #3 (Valu), #4 (CDSSO), #5 (Merkos). Output <promise>MODULES COMPLETE</promise> when all three have passing tests." --completion-promise "MODULES COMPLETE" --max-iterations 45
```

### Phase 4 Only
```
/ralph-loop "Execute SDK Phase 4: Provider & Hook. Working in /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk. Complete Issue #6 (Provider) then Issue #7 (Hook). Output <promise>CORE COMPLETE</promise> when unified auth works." --completion-promise "CORE COMPLETE" --max-iterations 35
```

---

## Troubleshooting

### If Ralph gets stuck
```
/cancel-ralph
```
Then investigate the issue manually before restarting.

### If tests fail repeatedly
Stop Ralph, investigate manually, fix the issue, then resume.

### If dependencies conflict
Prompt the user with specific version requirements and options.

---

## Notes for Claude

1. **Reference existing code** - universe-portal has working implementations to extract from
2. **Don't reinvent** - Copy patterns from existing code where appropriate
3. **Test frequently** - Run tests after each significant change
4. **Commit often** - Small, focused commits are better than large ones
5. **Close issues** - Mark issues closed on GitHub when complete
6. **Ask when unsure** - Better to ask than make wrong assumptions
