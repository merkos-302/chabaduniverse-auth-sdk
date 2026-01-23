# Claude Code Workflow - Quick Reference

A concise guide to the development workflow. For detailed documentation, see [CLAUDE-CODE-WORKFLOW.md](./CLAUDE-CODE-WORKFLOW.md).

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPMENT WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │ START SESSION │
  │ /session-start│
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  1. Format session name              │
  │  2. Select commit type (feat/fix/...) │
  │  3. Select PR target branch          │
  │  4. Create git branch                │
  │  5. Create session file              │
  └──────────────┬───────────────────────┘
                 │
                 ▼
  ┌──────────────────────────────────────┐
  │         DEVELOPMENT LOOP              │
  │  ┌────────────────────────────────┐  │
  │  │  • Write code                  │  │
  │  │  • Track with TodoWrite        │  │
  │  │  • /session-update (optional)  │  │
  │  │  • Repeat until complete       │  │
  │  └────────────────────────────────┘  │
  └──────────────┬───────────────────────┘
                 │
                 ▼
  ┌──────────────┐
  │  END SESSION  │
  │ /session-end  │
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  • Calculate duration                │
  │  • Summarize git changes             │
  │  • Document accomplishments          │
  │  • Note incomplete items             │
  │  • Prompt for /save                  │
  └──────────────┬───────────────────────┘
                 │
                 ▼
  ┌──────────────┐
  │  UPDATE DOCS  │
  │ /update-docs  │ (if needed)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │     SAVE      │
  │    /save      │
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  1. Run pre-commit checks            │
  │  2. Stage files                      │
  │  3. Create commit message            │
  │  4. ⚠️  GET USER APPROVAL            │
  │  5. Commit & push                    │
  │  6. Prompt for PR                    │
  └──────────────┬───────────────────────┘
                 │
                 ▼
  ┌──────────────────────────────────────┐
  │         CREATE PULL REQUEST           │
  │  Target: Branch set in /session-start │
  └──────────────┬───────────────────────┘
                 │
                 ▼
  ┌──────────────┐
  │   COMPLETE    │
  └──────────────┘
```

---

## Commands Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/session-start [name]` | Start new session | Beginning of work |
| `/session-update [notes]` | Add progress notes | During long sessions |
| `/session-end` | End and document session | Work complete |
| `/session-current` | Show active session | Check status |
| `/session-list` | List all sessions | Review history |
| `/session-help` | Show help | Get command info |
| `/update-docs` | Sync documentation | After features |
| `/save` | Commit and push | After session ends |

---

## Step-by-Step

### 1. Start Session

```
/session-start my-feature-name
```

- Select commit type (feat, fix, chore, etc.)
- Select PR target branch (defaults to current branch)
- Branch created: `{type}/my-feature-name`

### 2. Develop

- Write code
- Claude tracks progress with TodoWrite
- Run `/session-update` for long sessions

### 3. End Session

```
/session-end
```

- Generates comprehensive summary
- Prompts for `/save`

### 4. Update Docs (if needed)

```
/update-docs
```

- Syncs all documentation with codebase

### 5. Save & Create PR

```
/save
```

- Runs quality checks
- **Requires approval** for commit message
- Pushes to remote
- Creates PR targeting the branch you specified

---

## Branch & PR Flow

```
Base Branch (e.g., develop)
    │
    ├── /session-start ──► Creates: feat/my-feature
    │                           │
    │                           │ (development)
    │                           │
    │                           ▼
    │                      /save ──► Push to origin
    │                           │
    │◄──────────────────────────┘
    │         PR targets base branch
    │
    ▼
Merge
```

---

## Session File Structure

```
.claude/sessions/YYYY-MM-DD-HHMM-session-name.md

┌─────────────────────────────────────┐
│ # Session Name                       │
│ **Session Started:** timestamp       │
│                                      │
│ ## Session Overview                  │
│ | Start Time | Git Branch |          │
│ | Base Branch | Target Branch (PR) | │
│                                      │
│ ## Goals                             │
│ - Goal 1                             │
│ - Goal 2                             │
│                                      │
│ ## Progress                          │
│ (updates added during session)       │
│                                      │
│ ## Session Summary                   │
│ (added by /session-end)              │
└─────────────────────────────────────┘
```

---

## Key Principles

1. **Always start with `/session-start`** - Creates tracking and sets PR target
2. **One task in progress at a time** - TodoWrite discipline
3. **End sessions properly** - `/session-end` creates valuable documentation
4. **Never commit without approval** - `/save` always asks first
5. **PR targets are set at session start** - Consistent, predictable workflow

---

## Commit Types

| Type | Emoji | Use For |
|------|-------|---------|
| `feat` | ✨ | New features |
| `fix` | 🐛 | Bug fixes |
| `docs` | 📝 | Documentation |
| `style` | 💄 | Formatting |
| `refactor` | ♻️ | Code restructuring |
| `perf` | ⚡️ | Performance |
| `test` | ✅ | Tests |
| `chore` | 🔧 | Tooling/config |
| `ci` | 🚀 | CI/CD |

---

## File Locations

```
project/
├── .claude/
│   ├── commands/          # Slash commands
│   │   ├── session-start.md
│   │   ├── session-update.md
│   │   ├── session-end.md
│   │   ├── save.md
│   │   └── ...
│   ├── agents/            # Specialized agents
│   │   └── agent-architect.md
│   └── sessions/          # Session documentation
│       ├── .current-session
│       └── YYYY-MM-DD-*.md
└── docs/
    ├── CLAUDE-CODE-WORKFLOW.md    # Full documentation
    └── WORKFLOW-QUICK-REFERENCE.md # This file
```

---

## Common Scenarios

### Starting Fresh Work

```
/session-start implement-login
→ Select: feat
→ Target: develop
→ Branch: feat/implement-login
```

### Continuing After Break

```
/session-current          # Check active session
/session-update resuming  # Note you're back
```

### Finishing Work

```
/session-end
/update-docs              # If you added features
/save
→ Approve commit message
→ Create PR to: develop
```

### Quick Bug Fix

```
/session-start fix-null-error
→ Select: fix
→ Target: main
... fix the bug ...
/session-end
/save
```

---

**Full Documentation:** [CLAUDE-CODE-WORKFLOW.md](./CLAUDE-CODE-WORKFLOW.md)
