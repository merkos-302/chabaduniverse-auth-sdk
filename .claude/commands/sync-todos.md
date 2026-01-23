# Sync TODOS.md to GitHub Gist

Synchronize the local TODOS.md file with the GitHub Gist and optionally with Jira.

## Instructions

Read @TODOS_INSTRUCTIONS.md for complete sync workflow details including:
- GitHub Gist synchronization commands
- Jira bidirectional sync behavior
- Status emoji mapping (✨ = In Progress)
- State tracking via `.todos-sync-state`
- Conflict resolution rules

## Quick Reference

**Gist Details:**
- **Gist ID:** 9fd8a2400625328992779453e6614163
- **URL:** https://gist.github.com/ReuvenEtzion/9fd8a2400625328992779453e6614163

**Sync Commands:**

Standard sync (push to Gist):
```bash
cp TODOS.md merkos_todos.md && gh gist edit 9fd8a2400625328992779453e6614163 --add merkos_todos.md && rm merkos_todos.md
```

**Sync Modes:**
- "sync todos" → One-way push to Jira + Gist
- "sync todos with Jira" → Bidirectional sync with Jira + Gist
