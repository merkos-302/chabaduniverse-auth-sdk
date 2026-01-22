# Ralph Loop Issue Plan - Chabad Universe Auth SDK

This document contains all GitHub Issues and their optimized `/ralph-loop` prompts for building the `@chabaduniverse/auth-sdk` package.

## Overview

**Total Issues:** 15 across 4 repos
**Estimated Total Effort:** 4-6 weeks with Ralph Loop automation

### Repos Involved

| Repo | Issues | Purpose |
|------|--------|---------|
| chabaduniverse-auth-sdk | 9 | Main SDK development |
| chabaduniverse-auth | 2 | Core package updates |
| universe-portal | 3 | Migration & CDSSO extraction |
| chinuch-universe | 1 | Migration |

---

## chabaduniverse-auth-sdk Issues (9 total)

### Issue #1: Project Setup & Tooling

**Title:** `[Setup] Initialize project with TypeScript, pnpm, and build tooling`

**Labels:** `setup`, `tooling`, `priority:high`

**Description:**
Set up the SDK project with modern tooling:
- pnpm as package manager
- TypeScript strict mode
- tsup for building (ESM + CJS)
- Vitest for testing
- ESLint + Prettier
- Changesets for versioning

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Initialize @chabaduniverse/auth-sdk project

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk

### Requirements:
1. Initialize pnpm project with package.json:
   - name: @chabaduniverse/auth-sdk
   - version: 0.1.0
   - type: module
   - exports for ESM and CJS
   - peerDependencies: @chabaduniverse/auth, @arkeytyp/valu-api, react, react-dom

2. Set up TypeScript:
   - tsconfig.json with strict mode
   - Target ES2020, module ESNext
   - Declaration files enabled
   - Path aliases for src/

3. Set up build with tsup:
   - ESM and CJS outputs
   - Declaration files
   - Source maps

4. Set up Vitest for testing:
   - vitest.config.ts
   - Test setup file with React Testing Library
   - Coverage configuration

5. Set up ESLint + Prettier:
   - ESLint with TypeScript and React plugins
   - Prettier configuration
   - Pre-commit hooks with husky + lint-staged

6. Create directory structure:
   src/
   ├── providers/
   ├── hooks/
   ├── components/
   ├── cdsso/
   ├── valu/
   ├── utils/
   └── index.ts

7. Add scripts to package.json:
   - dev, build, test, lint, type-check

### Success Criteria:
- pnpm install works
- pnpm build produces dist/ with ESM and CJS
- pnpm test runs (even if no tests yet)
- pnpm lint passes
- TypeScript compiles with no errors

Output <promise>SETUP COMPLETE</promise> when all criteria pass.
" --completion-promise "SETUP COMPLETE" --max-iterations 15
```

---

### Issue #2: Core Types & Interfaces

**Title:** `[Types] Define core TypeScript interfaces and types`

**Labels:** `types`, `typescript`, `priority:high`

**Description:**
Define all TypeScript interfaces for the SDK:
- UniverseUser (unified user type)
- Provider states (Valu, Merkos, Universe)
- Auth context types
- Hook return types
- Component props

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Define core TypeScript types for @chabaduniverse/auth-sdk

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk

### Requirements:

1. Create src/types/user.ts:
   - UniverseUser interface (merged user from all providers)
   - ValuUser interface (from @arkeytyp/valu-api)
   - MerkosUser interface (from @chabaduniverse/auth)

2. Create src/types/providers.ts:
   - ValuProviderState { isConnected, isAuthenticated, user, error }
   - MerkosProviderState { isAuthenticated, hasBearerToken, user, enrichment }
   - UniverseProviderState { isLinked, linkedProviders, identity }
   - ProvidersState { valu, merkos, universe }

3. Create src/types/context.ts:
   - UniverseAuthContextValue interface
   - AuthStatus enum (loading, authenticated, unauthenticated, error)
   - LoginOptions interface
   - LogoutOptions interface

4. Create src/types/hooks.ts:
   - UseUniverseAuthReturn interface
   - UseProvidersReturn interface
   - UseCdssoReturn interface

5. Create src/types/components.ts:
   - LoginButtonProps interface
   - AuthGuardProps interface
   - UserMenuProps interface

6. Create src/types/index.ts:
   - Re-export all types
   - Export type helpers

7. Update src/index.ts to export types

### Reference:
- Look at ../universe-portal/contexts/SimpleAuthContext.tsx for existing patterns
- Look at ../chabaduniverse-auth/src/ for MerkosAPIAdapter types

### Success Criteria:
- All type files created with JSDoc comments
- No TypeScript errors
- Types are exported from main index.ts
- pnpm type-check passes

Output <promise>TYPES COMPLETE</promise> when all criteria pass.
" --completion-promise "TYPES COMPLETE" --max-iterations 10
```

---

### Issue #3: Valu Integration Module

**Title:** `[Valu] Create Valu Social integration module`

**Labels:** `valu`, `integration`, `priority:high`

**Description:**
Create a wrapper module for @arkeytyp/valu-api that:
- Provides React hooks for Valu state
- Handles connection lifecycle
- Manages Valu authentication
- Exposes Intent system

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Create Valu Social integration module

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk

### Requirements:

1. Create src/valu/ValuProvider.tsx:
   - Wrap @arkeytyp/valu-api initialization
   - Handle iframe vs standalone detection
   - Manage connection state
   - Provide context for Valu state

2. Create src/valu/useValu.ts:
   - Hook to access Valu state
   - Returns: isConnected, isAuthenticated, user, api, error
   - sendIntent() method
   - login() method

3. Create src/valu/valu-utils.ts:
   - isInIframe() detection
   - formatValuUser() to normalize user data
   - parseValuError() for error handling

4. Create src/valu/index.ts:
   - Export ValuProvider, useValu, utilities

5. Write tests in src/valu/__tests__/:
   - ValuProvider.test.tsx
   - useValu.test.ts
   - Mock @arkeytyp/valu-api

### Reference:
- ../universe-portal/contexts/ValuApiContext.tsx
- ../universe-portal/hooks/useValuAuth.ts
- ../universe-portal/lib/valu-api-singleton.ts

### Success Criteria:
- ValuProvider initializes Valu API correctly
- useValu returns proper state
- Tests pass with mocked Valu API
- TypeScript compiles cleanly

Output <promise>VALU MODULE COMPLETE</promise> when all criteria pass.
" --completion-promise "VALU MODULE COMPLETE" --max-iterations 15
```

---

### Issue #4: CDSSO Implementation

**Title:** `[CDSSO] Implement Cross-Domain SSO module`

**Labels:** `cdsso`, `sso`, `priority:high`

**Description:**
Extract and improve CDSSO logic from universe-portal:
- Cross-domain token exchange
- Cookie management
- State preservation
- Bearer token handling

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Implement CDSSO (Cross-Domain SSO) module

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk

### Requirements:

1. Create src/cdsso/cdsso-client.ts:
   - CdssoClient class
   - initiate() - Start CDSSO flow
   - handleCallback() - Process CDSSO response
   - getBearerToken() - Retrieve stored token
   - clearSession() - Logout

2. Create src/cdsso/cdsso-utils.ts:
   - parseCdssoParams() - Parse URL params
   - buildCdssoUrl() - Build redirect URL
   - validateState() - CSRF protection
   - storageHelpers for cookies/localStorage

3. Create src/cdsso/useCdsso.ts:
   - React hook for CDSSO operations
   - Auto-detect CDSSO callback on mount
   - Handle token storage
   - Error handling

4. Create src/cdsso/types.ts:
   - CdssoConfig interface
   - CdssoState interface
   - CdssoCallbackParams interface

5. Create src/cdsso/index.ts:
   - Export all CDSSO utilities

6. Write tests in src/cdsso/__tests__/:
   - cdsso-client.test.ts
   - cdsso-utils.test.ts
   - useCdsso.test.ts

### Reference:
- ../universe-portal/lib/cdsso-utils.ts (SOURCE - extract from here)
- ../universe-portal/pages/api/sso/ (API endpoints)
- ../universe-portal/contexts/SimpleAuthContext.tsx (usage patterns)

### Success Criteria:
- CDSSO flow works in tests
- State preservation works
- Bearer token storage/retrieval works
- All tests pass
- TypeScript clean

Output <promise>CDSSO COMPLETE</promise> when all criteria pass.
" --completion-promise "CDSSO COMPLETE" --max-iterations 15
```

---

### Issue #5: Merkos Integration Module

**Title:** `[Merkos] Create Merkos Platform integration module`

**Labels:** `merkos`, `integration`, `priority:high`

**Description:**
Create wrapper for @chabaduniverse/auth MerkosAPIAdapter:
- React provider for Merkos state
- Hooks for auth and enrichment
- Bearer token management

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Create Merkos Platform integration module

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk

### Requirements:

1. Create src/merkos/MerkosProvider.tsx:
   - Initialize MerkosAPIAdapter from @chabaduniverse/auth
   - Manage authentication state
   - Handle bearer token from CDSSO
   - Provide context for Merkos state

2. Create src/merkos/useMerkos.ts:
   - Hook to access Merkos state
   - Returns: isAuthenticated, hasBearerToken, user, enrichment
   - login(credentials) method
   - loginWithBearerToken(token) method
   - logout() method
   - getEnrichment() method

3. Create src/merkos/merkos-utils.ts:
   - formatMerkosUser() to normalize user data
   - parseMerkosError() for error handling
   - extractBearerToken() from various sources

4. Create src/merkos/index.ts:
   - Export MerkosProvider, useMerkos, utilities

5. Write tests in src/merkos/__tests__/:
   - MerkosProvider.test.tsx
   - useMerkos.test.ts
   - Mock @chabaduniverse/auth

### Reference:
- ../chabaduniverse-auth/src/adapters/MerkosAPIAdapter.ts
- ../universe-portal/contexts/SimpleAuthContext.tsx (Merkos integration)

### Success Criteria:
- MerkosProvider initializes correctly
- useMerkos returns proper state
- Bearer token login works
- Tests pass
- TypeScript clean

Output <promise>MERKOS MODULE COMPLETE</promise> when all criteria pass.
" --completion-promise "MERKOS MODULE COMPLETE" --max-iterations 15
```

---

### Issue #6: UniverseAuthProvider

**Title:** `[Provider] Implement UniverseAuthProvider - unified auth context`

**Labels:** `provider`, `react`, `priority:critical`

**Description:**
Create the main UniverseAuthProvider that:
- Composes Valu, Merkos, and CDSSO providers
- Merges authentication states
- Provides unified user object
- Handles initialization sequence

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Implement UniverseAuthProvider - the unified auth context

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk

### Requirements:

1. Create src/providers/UniverseAuthProvider.tsx:
   - Compose ValuProvider + MerkosProvider internally
   - Merge auth states into unified state
   - Handle initialization sequence:
     a. Check CDSSO callback first
     b. Initialize Valu (if in iframe)
     c. Initialize Merkos (with bearer token if available)
     d. Link identities if both authenticated
   - Provide UniverseAuthContext

2. Create src/providers/UniverseAuthContext.ts:
   - React context definition
   - Default values
   - Context type exports

3. Create src/providers/state-merger.ts:
   - mergeUserStates() - Combine Valu + Merkos users
   - determineAuthStatus() - Unified status logic
   - prioritizeProvider() - Which provider takes precedence

4. Create src/providers/types.ts:
   - UniverseAuthProviderProps interface
   - Include: appId, children, onAuthChange, initialState

5. Update src/providers/index.ts:
   - Export UniverseAuthProvider
   - Export context utilities

6. Write tests in src/providers/__tests__/:
   - UniverseAuthProvider.test.tsx
   - state-merger.test.ts
   - Test various auth scenarios

### Key Behaviors:
- If Valu authenticated but not Merkos: status = 'partial'
- If both authenticated: status = 'authenticated', merge users
- If neither: status = 'unauthenticated'
- Always expose individual provider states via providers property

### Reference:
- ../universe-portal/contexts/SimpleAuthContext.tsx (pattern to follow)

### Success Criteria:
- Provider composes correctly
- State merging logic works
- All auth scenarios tested
- TypeScript clean
- pnpm test passes

Output <promise>PROVIDER COMPLETE</promise> when all criteria pass.
" --completion-promise "PROVIDER COMPLETE" --max-iterations 20
```

---

### Issue #7: useUniverseAuth Hook

**Title:** `[Hook] Implement useUniverseAuth - main consumer hook`

**Labels:** `hooks`, `react`, `priority:critical`

**Description:**
Create the main hook that consumers will use:
- Access unified auth state
- Access provider-specific states
- Auth actions (login, logout)
- Loading and error states

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Implement useUniverseAuth hook

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk

### Requirements:

1. Create src/hooks/useUniverseAuth.ts:
   - Hook that consumes UniverseAuthContext
   - Returns unified auth state and actions

   Return interface:
   {
     // Unified state
     user: UniverseUser | null;
     isAuthenticated: boolean;
     isLoading: boolean;
     error: AuthError | null;
     status: AuthStatus;

     // Provider-specific access
     providers: {
       valu: ValuProviderState;
       merkos: MerkosProviderState;
       universe: UniverseProviderState;
     };

     // Actions
     login(options?: LoginOptions): Promise<void>;
     logout(): Promise<void>;
     loginWithBearerToken(token: string): Promise<void>;
     sendIntent(intent: Intent): Promise<void>;
     linkAccount(provider: 'merkos' | 'valu'): Promise<void>;
     refreshAuth(): Promise<void>;
   }

2. Create src/hooks/useProviders.ts:
   - Direct access to individual providers
   - useValuProvider() - Valu-specific state
   - useMerkosProvider() - Merkos-specific state

3. Create src/hooks/useAuthStatus.ts:
   - Computed auth status helpers
   - isFullyAuthenticated - Both providers
   - isPartiallyAuthenticated - One provider
   - needsLinking - Authenticated but not linked

4. Create src/hooks/index.ts:
   - Export all hooks

5. Write tests in src/hooks/__tests__/:
   - useUniverseAuth.test.ts
   - useProviders.test.ts
   - useAuthStatus.test.ts

### Success Criteria:
- useUniverseAuth returns correct unified state
- Actions work correctly
- Provider-specific access works
- All tests pass
- TypeScript clean

Output <promise>HOOKS COMPLETE</promise> when all criteria pass.
" --completion-promise "HOOKS COMPLETE" --max-iterations 15
```

---

### Issue #8: UI Components

**Title:** `[UI] Create pre-built auth UI components`

**Labels:** `ui`, `components`, `react`

**Description:**
Create ready-to-use React components:
- LoginButton - Triggers auth flow
- AuthGuard - Protects routes
- UserMenu - User dropdown with logout

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Create pre-built auth UI components

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk

### Requirements:

1. Create src/components/LoginButton.tsx:
   - Customizable login button
   - Props: provider ('auto' | 'valu' | 'merkos'), variant, size, children
   - Uses useUniverseAuth internally
   - Shows loading state during auth
   - Handles errors gracefully

2. Create src/components/AuthGuard.tsx:
   - Route/component protection
   - Props: fallback, requiredProvider, redirectTo
   - Shows fallback while loading
   - Redirects or shows fallback when not authenticated
   - Can require specific provider auth

3. Create src/components/UserMenu.tsx:
   - User avatar/name dropdown
   - Props: showProviders, onLogout, menuItems
   - Shows which providers are connected
   - Logout action
   - Customizable menu items

4. Create src/components/AuthStatus.tsx:
   - Debug/status component
   - Shows current auth state
   - Shows provider states
   - Useful for development

5. Create src/components/index.ts:
   - Export all components

6. Style approach:
   - Use CSS custom properties for theming
   - Provide unstyled base + default styles
   - Easy to override with className

7. Write tests in src/components/__tests__/:
   - LoginButton.test.tsx
   - AuthGuard.test.tsx
   - UserMenu.test.tsx

### Success Criteria:
- All components render correctly
- Components use SDK hooks properly
- Styling is customizable
- Tests pass
- TypeScript clean

Output <promise>UI COMPONENTS COMPLETE</promise> when all criteria pass.
" --completion-promise "UI COMPONENTS COMPLETE" --max-iterations 15
```

---

### Issue #9: Testing & Documentation

**Title:** `[Docs] Complete testing and documentation`

**Labels:** `documentation`, `testing`, `priority:high`

**Description:**
Finalize testing and create comprehensive documentation:
- Integration tests
- API documentation
- Migration guides
- Examples

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Complete testing and documentation

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth-sdk

### Requirements:

1. Integration Tests:
   - src/__tests__/integration/full-auth-flow.test.tsx
   - Test complete auth flow from mount to logout
   - Test CDSSO flow
   - Test provider fallback scenarios

2. Create docs/API.md:
   - Full API reference
   - All hooks with examples
   - All components with props
   - All types documented

3. Create docs/MIGRATION.md:
   - Migration from SimpleAuthContext
   - Migration from direct Valu API usage
   - Step-by-step guide
   - Code examples before/after

4. Create docs/EXAMPLES.md:
   - Basic usage example
   - Protected routes example
   - Custom login UI example
   - Multi-provider example

5. Create docs/ARCHITECTURE.md:
   - How the SDK works internally
   - Provider composition diagram
   - State flow diagram
   - CDSSO flow diagram

6. Update README.md:
   - Installation instructions
   - Quick start guide
   - Links to docs
   - Badge for npm version

7. Add JSDoc to all exports:
   - Every exported function
   - Every exported type
   - Every exported component

8. Ensure test coverage:
   - Run pnpm test:coverage
   - Target 80%+ coverage
   - Add tests for uncovered paths

### Success Criteria:
- All integration tests pass
- Documentation complete and accurate
- JSDoc on all exports
- 80%+ test coverage
- README is clear and helpful

Output <promise>DOCS COMPLETE</promise> when all criteria pass.
" --completion-promise "DOCS COMPLETE" --max-iterations 15
```

---

## chabaduniverse-auth Issues (2 total)

### Issue #26: Peer Dependency Optimization

**Title:** `[Core] Optimize exports for SDK peer dependency usage`

**Labels:** `enhancement`, `sdk-support`

**Description:**
Update @chabaduniverse/auth to work optimally as a peer dependency:
- Clean exports
- Tree-shakeable
- Type exports

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Optimize @chabaduniverse/auth for SDK peer dependency

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth

### Requirements:

1. Review and clean up exports in src/index.ts:
   - Export MerkosAPIAdapter
   - Export all types separately (for type-only imports)
   - Export hooks
   - Ensure tree-shakeable

2. Add explicit type exports:
   - Create src/types/index.ts if not exists
   - Export all public types
   - Use 'export type' for type-only exports

3. Verify package.json exports field:
   - Main entry
   - Types entry
   - Subpath exports if needed

4. Add @chabaduniverse/auth-sdk to peerDependenciesMeta:
   - Mark as optional (SDK depends on this, not vice versa)

5. Update documentation:
   - Note about SDK usage
   - Note about peer dependency

6. Run all tests to ensure nothing broken

### Success Criteria:
- Clean exports in index.ts
- Type exports work correctly
- All tests pass
- Package builds correctly

Output <promise>CORE OPTIMIZED</promise> when all criteria pass.
" --completion-promise "CORE OPTIMIZED" --max-iterations 10
```

---

### Issue #27: Shared Types Package

**Title:** `[Types] Create shared types for SDK compatibility`

**Labels:** `types`, `sdk-support`

**Description:**
Ensure types are properly shared between core and SDK packages.

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Ensure proper type sharing with SDK

Working in: /Users/reuven/Projects/merkos/chabaduniverse-auth

### Requirements:

1. Review types used by SDK:
   - MerkosAPIAdapter types
   - User types
   - Auth state types
   - Error types

2. Ensure all SDK-needed types are exported:
   - Check src/types/index.ts
   - Add any missing exports
   - Use explicit 'export type'

3. Create type compatibility tests:
   - Test that exported types match SDK expectations
   - Add to existing test suite

4. Document exported types:
   - JSDoc on all exported types
   - Note which are used by SDK

### Success Criteria:
- All SDK-needed types exported
- Type tests pass
- Documentation complete

Output <promise>TYPES SHARED</promise> when all criteria pass.
" --completion-promise "TYPES SHARED" --max-iterations 8
```

---

## universe-portal Issues (3 total)

### Issue #172: Extract CDSSO to SDK

**Title:** `[SDK] Extract CDSSO implementation to @chabaduniverse/auth-sdk`

**Labels:** `sdk`, `cdsso`, `refactor`

**Description:**
Extract CDSSO logic from universe-portal to the SDK, then update portal to use SDK.

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Extract CDSSO implementation to SDK

Working in: /Users/reuven/Projects/merkos/universe-portal

### Requirements:

1. Identify CDSSO code to extract:
   - lib/cdsso-utils.ts
   - pages/api/sso/ endpoints
   - CDSSO logic in SimpleAuthContext.tsx

2. Create extraction checklist:
   - List all functions to move
   - List all types to move
   - Identify dependencies

3. Coordinate with SDK repo:
   - Ensure SDK CDSSO module matches portal's needs
   - Note any portal-specific customizations

4. Do NOT modify code yet - this is planning only
   - Create docs/planning/CDSSO_EXTRACTION_PLAN.md
   - Document what moves, what stays
   - Document API endpoint strategy

### Success Criteria:
- Extraction plan documented
- Dependencies identified
- No code changes yet (planning only)

Output <promise>EXTRACTION PLANNED</promise> when plan is complete.
" --completion-promise "EXTRACTION PLANNED" --max-iterations 8
```

---

### Issue #173: Migrate to SDK

**Title:** `[SDK] Migrate universe-portal to @chabaduniverse/auth-sdk`

**Labels:** `sdk`, `migration`, `priority:high`

**Description:**
Replace current auth implementation with @chabaduniverse/auth-sdk.

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Migrate universe-portal to @chabaduniverse/auth-sdk

Working in: /Users/reuven/Projects/merkos/universe-portal

### Prerequisites:
- @chabaduniverse/auth-sdk is published and working
- CDSSO extraction is complete

### Requirements:

1. Install SDK:
   - pnpm add @chabaduniverse/auth-sdk

2. Update _app.tsx:
   - Replace current auth providers with UniverseAuthProvider
   - Configure with portal's appId

3. Update components using auth:
   - Replace useAuth/useSimpleAuth with useUniverseAuth
   - Update any provider-specific code

4. Update CDSSO usage:
   - Remove local cdsso-utils.ts (now in SDK)
   - Use SDK's CDSSO utilities

5. Update tests:
   - Mock SDK instead of individual providers
   - Ensure all auth tests pass

6. Run full test suite:
   - npm test must pass
   - npm run build must pass

### Success Criteria:
- SDK installed and configured
- All auth works as before
- All tests pass
- Build succeeds
- No regressions

Output <promise>PORTAL MIGRATED</promise> when migration complete.
" --completion-promise "PORTAL MIGRATED" --max-iterations 20
```

---

### Issue #174: Update Documentation for SDK

**Title:** `[Docs] Update documentation to reference SDK`

**Labels:** `documentation`, `sdk`

**Description:**
Update all portal documentation to reference the SDK.

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Update portal documentation for SDK usage

Working in: /Users/reuven/Projects/merkos/universe-portal

### Requirements:

1. Update CLAUDE.md:
   - Reference SDK instead of SimpleAuthContext
   - Update architecture description
   - Update hook references

2. Update docs/ARCHITECTURE_OVERVIEW.md:
   - Add SDK to tech stack
   - Update auth architecture section

3. Update docs/DEVELOPMENT_GUIDELINES.md:
   - Update auth usage examples
   - Reference SDK hooks

4. Update components/CLAUDE.md:
   - Update any auth component references

5. Update hooks/CLAUDE.md:
   - Remove deprecated auth hooks
   - Reference SDK hooks

6. Update any inline comments:
   - Search for SimpleAuthContext references
   - Update to SDK references

### Success Criteria:
- All docs reference SDK correctly
- No stale SimpleAuthContext references
- Documentation is accurate

Output <promise>DOCS UPDATED</promise> when complete.
" --completion-promise "DOCS UPDATED" --max-iterations 10
```

---

## chinuch-universe Issue (1 total)

### Issue #X: Migrate to SDK

**Title:** `[SDK] Migrate chinuch-universe to @chabaduniverse/auth-sdk`

**Labels:** `sdk`, `migration`

**Description:**
Migrate chinuch-universe from direct @chabaduniverse/auth usage to SDK.

**Ralph Loop Prompt:**
```
/ralph-loop "
## Task: Migrate chinuch-universe to @chabaduniverse/auth-sdk

Working in: /Users/reuven/Projects/merkos/chinuch-universe

### Requirements:

1. Analyze current auth usage:
   - How is @chabaduniverse/auth currently used?
   - What hooks/components use auth?
   - Any custom auth logic?

2. Install SDK:
   - pnpm add @chabaduniverse/auth-sdk

3. Update auth provider:
   - Wrap app with UniverseAuthProvider
   - Configure appropriately

4. Update auth consumers:
   - Replace current hooks with useUniverseAuth
   - Update any Merkos-specific code

5. Test thoroughly:
   - All auth flows work
   - All tests pass
   - Build succeeds

### Success Criteria:
- SDK installed and working
- Auth works as before
- Tests pass
- No regressions

Output <promise>CHINUCH MIGRATED</promise> when complete.
" --completion-promise "CHINUCH MIGRATED" --max-iterations 15
```

---

## Master Orchestration Prompt

This prompt should be used to orchestrate the entire build process:

```
/ralph-loop "
## Master Orchestration: Build @chabaduniverse/auth-sdk

You are orchestrating the build of the Chabad Universe Auth SDK. This is a multi-phase project across multiple repositories.

### Project Repos:
- chabaduniverse-auth-sdk (NEW - main SDK)
- chabaduniverse-auth (existing - core package)
- universe-portal (consumer - will migrate)
- chinuch-universe (consumer - will migrate)

### Your Role:
1. Check current progress across all repos
2. Identify the next incomplete issue
3. Prompt user if decisions/clarifications needed
4. Execute the next phase
5. Track progress in this file

### Progress Tracking:
Check GitHub issues in each repo for status. Update this section as you complete phases:

#### Phase Status:
- [ ] SDK Setup (Issue #1)
- [ ] SDK Types (Issue #2)
- [ ] Valu Module (Issue #3)
- [ ] CDSSO Module (Issue #4)
- [ ] Merkos Module (Issue #5)
- [ ] UniverseAuthProvider (Issue #6)
- [ ] useUniverseAuth Hook (Issue #7)
- [ ] UI Components (Issue #8)
- [ ] Testing & Docs (Issue #9)
- [ ] Core Package Updates (Issues #26-27)
- [ ] Portal CDSSO Extraction (Issue #172)
- [ ] Portal Migration (Issue #173)
- [ ] Portal Docs (Issue #174)
- [ ] Chinuch Migration

### Current State Assessment:
Before each iteration:
1. Run: gh issue list --repo merkos-302/chabaduniverse-auth-sdk --state all
2. Run: gh issue list --repo merkos-302/chabaduniverse-auth --state all
3. Check for blockers or dependencies

### Decision Points (prompt user):
- Architecture decisions not in plan
- Breaking changes to existing packages
- Priorities if timeline constrained
- External dependency version conflicts

### Execution Pattern:
1. Identify next incomplete issue
2. Read the issue's Ralph Loop prompt
3. Execute that prompt's task
4. Close the issue when complete
5. Move to next issue

### Completion:
When all phases complete, output:
<promise>SDK BUILD COMPLETE</promise>

Continue until all checkboxes above are checked or user cancels.
" --completion-promise "SDK BUILD COMPLETE" --max-iterations 100
```

---

## Execution Order

Recommended order (respects dependencies):

1. **SDK Setup** (#1) - Foundation
2. **SDK Types** (#2) - Types needed by everything
3. **Valu Module** (#3) - Independent module
4. **CDSSO Module** (#4) - Independent module
5. **Merkos Module** (#5) - Independent module
6. **Core Package Updates** (#26-27) - Parallel with SDK modules
7. **UniverseAuthProvider** (#6) - Depends on modules
8. **useUniverseAuth Hook** (#7) - Depends on provider
9. **UI Components** (#8) - Depends on hooks
10. **Testing & Docs** (#9) - After implementation
11. **Portal CDSSO Extraction** (#172) - After SDK CDSSO
12. **Portal Migration** (#173) - After SDK complete
13. **Portal Docs** (#174) - After migration
14. **Chinuch Migration** - After portal proven

---

## Notes

- Each Ralph Loop prompt is self-contained
- Prompts reference other repos for patterns
- Completion promises enable automation
- Max iterations prevent runaway loops
- Master orchestration can run the whole thing
