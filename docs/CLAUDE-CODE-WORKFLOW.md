# Claude Code Development Workflow Guide

**Version**: 1.2
**Last Updated**: 2025-11-30
**Purpose**: Universal development workflow for any project using Claude Code

## Table of Contents

1. Overview
2. Prerequisites & Setup
3. Complete Workflow
4. Detailed Step-by-Step Guide
5. Self-Documenting Workflow
6. Best Practices
7. Advanced Features
8. Common Pitfalls & Solutions
9. Quick Reference
10. Troubleshooting

## Overview

This guide documents a comprehensive, project-agnostic development workflow using Claude Code, emphasizing structured sessions with documentation, quality gates through automated checks, parallel execution capabilities, explicit approval for critical operations, complete traceability, and self-documenting processes through automated updates.

**Workflow Stages:**
Planning → Issue Creation → Development Session → Testing → Commit → PR → Merge → Deploy
(with Documentation Auto-Updates throughout)

## Prerequisites & Setup

### Initial Setup Requirements

1. **Claude Code Installation**: Install from claude.com/code with API key configured
2. **Project Initialization**: Git repository, package manager, pre-commit hooks
3. **Slash Commands Configuration**: Create `.claude/commands/` directory with custom commands
4. **Directory Structure**: Establish `.claude/commands/`, `.claude/sessions/`, and `docs/` directories
5. **Testing & Quality Tools**: Configure test runners, linters, build commands, formatters

## Complete Workflow

The workflow flows through these phases:
- Planning & Issue Creation
- Starting Development Sessions
- Development Work
- Ending Sessions
- Updating Documentation
- Saving Changes
- Creating Pull Requests
- Post-PR Workflow

## Detailed Step-by-Step Guide

### Phase 1: Planning & Issue Creation

Create planning documentation by prompting Claude to generate comprehensive GitHub issues with acceptance criteria, technical requirements, and estimated complexity grouped into milestones.

**Expected Output**: Detailed issues with clear titles, labels (feature, bug, refactor), and complexity estimates.

### Phase 2: Starting a Development Session

**Command**: `/session-start Implement user authentication`

**Process**:
1. Session name formatting (filesystem-friendly)
2. Commit type selection from numbered list
3. Git branch creation with format `{type}/{formatted-session-name}`
4. Session file creation in `.claude/sessions/`
5. Current session tracking via `.claude/sessions/.current-session`

**Branch naming**: Validates length (max 62 characters), suggests alternatives if needed.

### Phase 3: Development Work

#### Task Planning with TodoWrite

Claude proactively uses TodoWrite for complex multi-step tasks, tracking progress with statuses: pending, in_progress, completed.

**Critical Rules**:
- Mark tasks completed immediately after finishing
- Exactly ONE task should be "in_progress"
- Only mark completed when fully accomplished
- Create new tasks for discovered blockers

#### Using Parallel Agents

Request parallel execution for:
- Complex codebase exploration
- Multiple independent searches
- Multi-file analysis
- Benefits: 3-5x faster, more comprehensive, better context

#### Asking Questions

Claude uses `AskUserQuestion` tool to clarify requirements or design decisions when multiple valid approaches exist.

#### Session Progress Updates

**Command**: `/session-update`

Appends progress notes, updates task completion, documents blockers, adds timestamps.

#### Development Best Practices

- Write tests continuously
- Run linter frequently
- Keep commits atomic
- Document complex logic
- Ask clarifying questions
- Request parallel agents for complex exploration
- Update todos immediately

### Phase 4: Ending a Development Session

**Command**: `/session-end`

**Process**:
1. Reads current session file
2. Gathers comprehensive metrics (git status, diff, commits)
3. Appends detailed summary including:
   - Session duration and timestamps
   - Git summary (files changed, lines added/deleted, commits)
   - Todo completion status
   - Key accomplishments
   - Problems and solutions
   - Breaking changes or findings
   - Dependencies added/removed
   - Configuration changes
   - Lessons learned
   - Tips for future developers
4. Clears current session tracker

### Phase 5: Updating Documentation

**Command**: `/update-docs`

**Purpose**: Keep all project documentation synchronized with codebase automatically.

**Process**:
1. Self-update phase: scans for all markdown files, updates command itself
2. Analysis phase: analyzes project structure, features, APIs, schemas, coverage
3. Documentation update phase: updates relevant files intelligently
4. Consistency verification: ensures matching information across docs
5. Summary report: lists updated files and discovered changes

**When to run**:
- After adding features or components
- After changing architecture or patterns
- After dependency updates
- Before creating pull requests

**When NOT to run**:
- Minor bug fixes
- Formatting-only changes
- Test updates without feature changes

### Phase 6: Saving Changes (Commit & Push)

**Command**: `/save` or `/save --no-verify`

**Pre-Commit Quality Checks**:
1. Run all tests (must pass)
2. Run linter (no errors)
3. Run build (must succeed)
4. If any check fails, reports and asks before proceeding

**Git Status & Staging**:
- Claude intelligently stages source code, tests, configuration, documentation
- Does NOT stage: .env files, credentials, build artifacts
- Includes security check for sensitive files

**Change Analysis**: Claude analyzes what changed and provides summary.

**Commit Message Creation**: Uses conventional commit format with emoji.

**Example Message**:
```
✨ feat: Implement user authentication system

Add comprehensive authentication with:
- User registration with email validation
- Login with bcrypt password hashing
- JWT token generation and validation
- Password reset functionality
- Rate limiting for security
- 15 unit tests with 95% coverage

Dependencies added:
- bcrypt for password hashing
- jsonwebtoken for JWT handling

Configuration:
- Added JWT_SECRET environment variable
- Added token expiration settings

Documentation:
- Updated API specification
- Added authentication guide

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Approval Required**: "Claude NEVER commits without explicit user approval" - presents message and waits for confirmation.

**Push to Remote**: Pushes branch to origin with tracking.

**PR Prompt**: Offers to create pull request after successful push.

### Phase 7: Creating a Pull Request

**Process**:
1. Claude analyzes branch using git commands
2. Creates comprehensive PR with:
   - Summary of changes
   - Technical details and architecture
   - Testing coverage and plan
   - Breaking changes (if any)
   - Deployment notes
   - Related issue links

### Phase 8: Post-PR Workflow

**Command**: Checkout main and pull latest changes

Prepares repository for next development cycle.

## Self-Documenting Workflow

The workflow creates multiple documentation layers automatically:

### Documentation Layers

1. **Session Files** (.claude/sessions/): Real-time development diary with complete context
2. **Project Documentation**: Auto-updated technical docs
3. **Commit Messages**: Permanent "what" and "why" records
4. **Pull Request Descriptions**: Comprehensive change summaries with review checklists
5. **Git History**: Immutable, searchable record

### The Self-Documenting Cycle

1. Start Session (/session-start) → Creates session file with goals
2. Develop & Track Progress (TodoWrite) → Session file updated in real-time
3. End Session (/session-end) → Comprehensive summary appended
4. Update Documentation (/update-docs) → All project docs synchronized
5. Commit (/save) → Detailed commit message
6. Create PR (pr) → Comprehensive PR description
7. Merge → Everything preserved in git history

### Result

Your project becomes a complete knowledge base without extra effort, with:
- No separate documentation to maintain
- No wiki to keep updated
- No manual changelog writing
- Everything auto-documented

## Best Practices

### Session Management

**DO**:
- Start every development session with `/session-start`
- Choose appropriate commit types
- End sessions properly for documentation
- Update long sessions periodically
- Review session summaries

**DON'T**:
- Skip session documentation
- Use vague session names
- Leave sessions unclosed
- Start new work without ending previous session

### Task Management with TodoWrite

**DO**:
- Use for complex tasks (3+ steps)
- Mark todos completed immediately
- Keep exactly ONE task in-progress
- Only mark complete when fully done
- Create new tasks for discovered work

**DON'T**:
- Batch completions
- Mark incomplete work as complete
- Skip TodoWrite for complex tasks
- Leave multiple in-progress tasks

### Commit Best Practices

**Quality Gates - Always ensure**:
- All tests pass
- Linting passes
- Build succeeds
- Documentation updated
- No sensitive data exposed

**Atomic Commits**: Each should serve single purpose, be self-contained, include tests and docs, have clear message.

## Quick Reference

### Essential Commands

| Command | Purpose | When to Use |
|---------|---------|------------|
| `/session-start [name]` | Start session | Beginning of new work |
| `/session-update` | Document progress | During long sessions |
| `/session-end` | End and document | When work complete/pausing |
| `/session-current` | Show active session | Check which session active |
| `/session-list` | List session files | Review past sessions |
| `/session-help` | Show help | Get command usage |
| `/update-docs` | Sync documentation | After features, before commits |
| `/save` | Commit and push | After session & docs updated |
| `/save --no-verify` | Skip hooks | Emergency only |

### Commit Type Reference

| Emoji | Type | When to Use |
|-------|------|------------|
| ✨ | `feat` | New feature |
| 🐛 | `fix` | Bug fix |
| ♻️ | `refactor` | Code refactor |
| 📝 | `docs` | Documentation |
| ✅ | `test` | Tests |
| ⚡️ | `perf` | Performance |
| 💄 | `style` | Code style |
| 🔧 | `chore` | Tooling/config |

### File Structure Reference

```
.claude/
├── commands/
│   ├── session-start.md
│   ├── session-update.md
│   ├── session-end.md
│   ├── session-current.md
│   ├── session-list.md
│   ├── session-help.md
│   ├── save.md
│   └── update-docs.md
└── sessions/
    ├── .current-session
    └── YYYY-MM-DD-HHMM-*.md

docs/
└── [documentation files]

CLAUDE.md
README.md
```

## Troubleshooting

### Common Error Messages

**"No current session found"**: Start new session with `/session-start`

**"Branch already exists"**: Choose different session name or delete old branch

**"Nothing to commit"**: Make changes before running `/save`

**"Tests failed"**: Fix tests before committing or use `--no-verify`

**"Documentation files not found"**: Create missing files or update command configuration

---

**End of Workflow Guide**

This comprehensive guide documents a complete, self-documenting development workflow using Claude Code that ensures automatic tracking, documentation, and preservation of all work without extra manual effort.
