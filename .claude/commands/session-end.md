End the current development session by:

1. Check `.claude/sessions/.current-session` for the active session
2. If no active session, inform user there's nothing to end
3. If session exists, append a comprehensive summary including:
   - Session duration
   - Git summary:
     * Total files changed (added/modified/deleted)
     * List all changed files with change type
     * Number of commits made (if any)
     * Final git status
   - Todo summary:
     * Total tasks completed/remaining
     * List all completed tasks
     * List any incomplete tasks with status
   - Key accomplishments
   - All features implemented
   - Problems encountered and solutions
   - Breaking changes or important findings
   - Dependencies added/removed
   - Configuration changes
   - Deployment steps taken
   - Lessons learned
   - What wasn't completed
   - Tips for future developers

4. Empty the `.claude/sessions/.current-session` file (don't remove it, just clear its contents)
5. Inform user the session has been documented
6. IMPORTANT: After documenting the session, prompt the user: "Would you like to commit and push your changes with `/save`?"

The summary should be thorough enough that another developer (or AI) can understand everything that happened without reading the entire session.

## Post-Session Workflow

After ending a session, follow this workflow:
1. Complete session documentation as described above
2. Prompt user: "Would you like to commit and push your changes with `/save`?"
3. If user accepts, they will run `/save` which handles commit and push operations
4. The `/save` command will then prompt the user about creating a pull request