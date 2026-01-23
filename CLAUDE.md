# CLAUDE.md - @chabaduniverse/auth-sdk

## Project Overview

**Package:** @chabaduniverse/auth-sdk
**Version:** 0.1.0
**Purpose:** Unified authentication SDK for Chabad Universe ecosystem
**Status:** Ready for Release

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

### Directory Structure

```
src/
├── providers/
│   ├── UniverseAuthProvider.tsx    # Main unified provider
│   ├── state-merger.ts             # State merging logic
│   ├── types.ts                    # Provider types
│   └── index.ts
├── hooks/
│   ├── useUniverseAuth.ts          # Unified auth hook
│   ├── useProviders.ts             # Provider-specific access
│   ├── useAuthStatus.ts            # Auth status utilities
│   └── index.ts
├── components/
│   ├── LoginButton.tsx             # Pre-built login UI
│   ├── AuthGuard.tsx               # Route protection
│   ├── UserMenu.tsx                # User dropdown
│   ├── AuthStatus.tsx              # Auth status display
│   └── index.ts
├── cdsso/
│   ├── cdsso-client.ts             # Cross-domain SSO client
│   ├── cdsso-utils.ts              # CDSSO utilities
│   ├── useCdsso.ts                 # React hooks for CDSSO
│   ├── types.ts                    # CDSSO types
│   └── index.ts
├── valu/
│   ├── ValuProvider.tsx            # Valu context provider
│   ├── useValu.ts                  # Valu React hooks
│   ├── valu-utils.ts               # Valu utilities
│   ├── valu-types.ts               # Valu types
│   └── index.ts
├── merkos/
│   ├── MerkosProvider.tsx          # Merkos context provider
│   ├── useMerkos.ts                # Merkos React hooks
│   ├── merkos-utils.ts             # Merkos utilities
│   ├── merkos-types.ts             # Merkos types
│   └── index.ts
├── types/
│   ├── user.ts                     # User types
│   ├── providers.ts                # Provider types
│   ├── context.ts                  # Context types
│   ├── hooks.ts                    # Hook types
│   ├── components.ts               # Component types
│   └── index.ts
├── utils/
│   └── index.ts                    # Shared utilities
├── test/
│   └── setup.ts                    # Test configuration
└── index.ts                        # Main exports
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
| universe-portal | merkos-302/universe-portal | Pending migration (Issues #174-176) |
| chinuch-universe | merkos-302/chinuch-universe | SDK integrated on feature branch |
| pan-kloli | merkos-302/pan-kloli | New implementation pending |

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

- **289 tests passing** across 12 test files
- Unit tests for hooks and utilities
- Integration tests for provider interactions
- Mock implementations for both Valu and Merkos APIs
- Tests run with Vitest and happy-dom environment

### Test Files
| Module | Tests | Description |
|--------|-------|-------------|
| merkos-utils | 42 | Merkos utility functions |
| valu-utils | 37 | Valu utility functions |
| cdsso-utils | 40 | CDSSO utility functions |
| cdsso-client | 46 | CDSSO client implementation |
| useMerkos | 22 | Merkos React hooks |
| useValu | 20 | Valu React hooks |
| useCdsso | 16 | CDSSO React hooks |
| ValuProvider | 15 | Valu context provider |
| hooks | 18 | Unified auth hooks |
| components | 15 | UI components |
| integration | 13 | Full auth flow |
| UniverseAuthProvider | 5 | Main provider |

## Critical Notes

- **NEVER break @chabaduniverse/auth API** - Existing consumers depend on it
- **Peer dependencies** - Let consumers control versions
- **Tree-shakeable** - Export individual components for bundle optimization
- **TypeScript strict** - Full type safety required

---

## Critical Testing Requirements

**⚠️ MANDATORY: Always run tests before committing or pushing code**

Before any git commit or push operation, you MUST:

1. **Run the full test suite:** `pnpm test` - All tests must pass
2. **Run build checks:** `pnpm build` - Build must succeed without errors
3. **Run linting:** `pnpm lint` - No linting errors allowed
4. **Run type checking:** `pnpm type-check` - No TypeScript errors
5. **Fix any failing tests** - Do not commit code with failing tests
6. **Verify test coverage** - Ensure new code has appropriate test coverage

**Test Execution Order:**

```bash
pnpm test           # Must pass with 0 failures
pnpm build          # Must complete successfully
pnpm lint           # Must have 0 errors
pnpm type-check     # Must have 0 errors
```

**If tests fail:**
- Fix the failing tests before proceeding
- Write new tests for untested code paths
- Ensure all mocks and test fixtures are properly configured
- Never commit code that breaks existing functionality

**No exceptions:** Broken tests indicate broken functionality. Always prioritize test fixes before any other work.

---

## Development Workflow: Session Management and Code Commits

This project uses the Claude Code development workflow for structured sessions, documentation, and quality gates.

### Development Flow Overview

The recommended development workflow follows these steps:

1. **Start Development Session:** Use `/session-start [description]` to begin tracking work
2. **Code Implementation:** Write code and complete tasks using TodoWrite for tracking
3. **Complete Session:** When todos are complete, prompt user if they want to end session with `/session-end`
4. **Commit Code:** After `/session-end`, prompt user if they want to run `/save` to commit and push code
5. **Create Pull Request:** After `/save`, prompt user if they want to create a PR

### Session Management Guidelines

- **NEVER automatically commit code** - always prompt user to run `/save` command
- **When todos are completed:** Ask user "Would you like to end this session with `/session-end`?"
- **After session ends:** Ask user "Would you like to commit and push your changes with `/save`?"
- **After /save completes:** User will be prompted by `/save` command if they want to create a PR

### Code Commit Guidelines

**IMPORTANT:** Claude should NEVER directly commit code. Instead, always prompt the user to use the `/save` slash command.

When work is complete and todos are finished:

1. Prompt: "Your todos are complete. Would you like to end this session with `/session-end`?"
2. After session ends, prompt: "Would you like to commit and push your changes with `/save`?"
3. Let the `/save` command handle all git operations including commits, pushes, and PR creation prompts

The `/save` command (implemented in `.claude/commands/save.md`) handles:
- Pre-commit checks (tests, linting, build)
- Git status and diff analysis
- **Commit message approval** - MUST get explicit user approval before committing
- Automatic staging and committing with conventional commit format
- Pushing to remote repository
- **Pull request approval** - MUST get explicit user approval before creating PR

Important notes:
- NEVER update the git config during development workflow
- NEVER run git commands directly when `/save` is available
- DO NOT push to the remote repository unless using `/save` command
- IMPORTANT: Never use git commands with the -i flag since they require interactive input

### ⚠️ CRITICAL: Pull Request Approval Requirements ⚠️

**YOU MUST GET EXPLICIT USER APPROVAL BEFORE CREATING ANY PULL REQUEST**

This is a MANDATORY workflow step that must NEVER be skipped:

1. **Draft the PR title and description** - Create complete PR content
2. **Present to user for review** - Show the full proposed PR message
3. **STOP and WAIT for approval** - Do NOT proceed without explicit "yes", "y", "approve", or similar response
4. **Only after approval** - Execute `gh pr create` command

**NEVER:**
- Create a PR without showing the user the proposed title and description first
- Assume approval based on commit approval
- Skip the approval step "to save time"
- Create the PR and then ask for changes

**ALWAYS:**
- Draft complete PR content before asking for approval
- Wait for explicit user confirmation
- Allow user to request changes to the PR description
- Follow the same approval pattern as commits

### Workflow Documentation
- [Claude Code Workflow Guide](./docs/CLAUDE-CODE-WORKFLOW.md) - Comprehensive workflow documentation
- [Workflow Quick Reference](./docs/WORKFLOW-QUICK-REFERENCE.md) - Commands and diagrams cheat sheet

### Key Commands
| Command | Purpose |
|---------|---------|
| `/session-start [name]` | Start a development session |
| `/session-end` | End session with summary |
| `/update-docs` | Sync all documentation |
| `/save` | Commit and push changes |

### Workflow Structure
```
.claude/
├── commands/     # Slash commands (session-*, save, update-docs)
├── agents/       # Specialist subagents
└── sessions/     # Session documentation files
```

---

## Important Notes for Claude Code

### Critical Instructions

1. **NEVER commit and push anything without my review, approval, and permission!!!!** (from global .claude/CLAUDE.md)
2. **Always wait for the user to review a PR message before saving** - MANDATORY approval before creating PRs
3. **Use TodoWrite tool for complex multi-step tasks** - Helps track progress and ensures thoroughness
4. **Always run tests before committing** - `pnpm test && pnpm build && pnpm lint` must all pass
5. **Update CLAUDE.md and relevant docs when making changes** - Keep documentation synchronized
6. **Check session files for context** - Review `.claude/sessions/` for recent work and patterns
7. **Peer Dependencies First** - SDK depends on @chabaduniverse/auth and @arkeytyp/valu-api as peer deps
8. **Test Coverage Requirement** - Maintain 80%+ coverage on all metrics (289+ tests)
9. **TypeScript Strict Mode** - Full type safety required, no `any` types without justification
10. **Tree-Shakeable Exports** - Export individual components for bundle optimization

### Session Context Management

- **Session Files Location:** `.claude/sessions/` contains timestamped session files
- **Context Gathering:** Check last 3-5 sessions before starting work to understand:
  - Previous development work and patterns
  - Ongoing tasks and goals
  - Implementation decisions and context
  - Blockers or issues encountered
- **Session File Format:** `YYYY-MM-DD-HHMM-description.md` with structured tracking
- **Current Session:** `.claude/sessions/.current-session` tracks active session

### Claude Subagents

The project includes specialized subagents in `.claude/agents/`:

- **agent-architect** - Creates specialized subagents
- **auth-flow-specialist** - Authentication flow expert
- **merkos-integration-specialist** - Merkos Platform integration
- **valu-api-specialist** - Valu Social API expert
- **test-writer** - Test writing specialist
- **security-reviewer** - Security review expert

---

## Related Documentation

- [API Reference](./docs/API.md) - Complete API documentation
- [Architecture](./docs/ARCHITECTURE.md) - Technical architecture
- [Examples](./docs/EXAMPLES.md) - Usage examples and patterns
- [Migration Guide](./docs/MIGRATION.md) - Migrating from direct package usage
- [Valu Iframe Integration](./docs/VALU_IFRAME_INTEGRATION.md) - Iframe setup, race condition fixes
- [universe-portal CLAUDE.md](../universe-portal/CLAUDE.md)
- [chabaduniverse-auth](../chabaduniverse-auth/)
- [Unified SDK Vision](../universe-portal/docs/planning/UNIFIED_AUTH_PACKAGE_VISION.md)
