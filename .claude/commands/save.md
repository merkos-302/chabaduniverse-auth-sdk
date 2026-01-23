# Git Commit : Well Formatted Commits

This command helps you create well-formatted commits with conventional commit messages and emoji.

## Usage

To create a commit, just type:
```
/commit
```

Or with options:
```
/commit --no-verify
```

## What This Command Does

### ⚠️ CRITICAL REQUIREMENT: NEVER COMMIT WITHOUT EXPLICIT USER APPROVAL ⚠️

**STOP AND READ:** You MUST get explicit approval for the commit message BEFORE running git commit.

### Step-by-Step Process (DO NOT SKIP ANY STEP):

1. **Run pre-commit checks** (unless --no-verify is specified):
   - Run tests to ensure regression fidelity
   - Run linting to ensure code quality
   - Run build to verify the build succeeds
   - Run documentation generation if applicable

2. **Check git status** to see what files will be committed

3. **Stage files** with `git add` for all modified and new files

4. **Analyze changes** with `git diff --cached` to understand what's being committed

5. **CREATE the commit message** using emoji conventional commit format

6. **🛑 STOP HERE - DO NOT PROCEED WITHOUT APPROVAL 🛑**
   
   **PRESENT the proposed commit message to the user:**
   ```
   "I propose the following commit message:
   
   [YOUR COMMIT MESSAGE HERE]
   
   Do you approve this commit message? (yes/no)"
   ```

7. **WAIT for explicit user approval**
   - Only proceed if user says "yes", "y", "approve", or similar
   - If user says "no" or suggests changes, revise and ask again
   - DO NOT ASSUME APPROVAL - WAIT FOR EXPLICIT CONFIRMATION

8. **ONLY AFTER APPROVAL:** Run `git commit` with the approved message

9. **Push** the commit to the origin branch

10. **After successful push**, prompt: "Would you like to create a pull request for these changes?"

11. **🛑 IF USER WANTS PR - STOP HERE FOR PR APPROVAL 🛑**

    **YOU MUST GET EXPLICIT APPROVAL FOR THE PR BEFORE CREATING IT**

    **Step-by-Step PR Creation Process:**

    a. **Draft the complete PR title and description** - Create full PR content

    b. **PRESENT the proposed PR to the user:**
       ```
       "I propose the following pull request:

       Title: [YOUR PR TITLE]

       Description:
       [YOUR COMPLETE PR DESCRIPTION]

       Do you approve this pull request? (yes/no)"
       ```

    c. **WAIT for explicit user approval**
       - Only proceed if user says "yes", "y", "approve", or similar
       - If user says "no" or suggests changes, revise the PR content and ask again
       - DO NOT ASSUME APPROVAL - WAIT FOR EXPLICIT CONFIRMATION

    d. **ONLY AFTER PR APPROVAL:** Run `gh pr create` with the approved content

12. **Confirm PR creation** and provide the PR URL to the user

## Best Practices for Commits

- **Verify before committing**: Ensure code is linted, builds correctly, and documentation is updated. Make sure to run ALL of the pre-commit checks first.
- **Atomic commits**: Each commit should contain related changes that serve a single purpose
- **Split large changes**: If changes touch multiple concerns, split them into separate commits
- **Conventional commit format**: Use the format `<type>: <description>` where type is one of:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `design`: UX/UI design changes and improvements
  - `content`: Content/copy changes
  - `docs`: Documentation changes
  - `style`: Code style changes (formatting, etc)
  - `refactor`: Code changes that neither fix bugs nor add features
  - `perf`: Performance improvements
  - `test`: Adding or fixing tests
  - `chore`: Changes to the build process, tools, etc.
- **Present tense, imperative mood**: Write commit messages as commands (e.g., "add feature" not "added feature")
- **Concise first line**: Keep the first line under 72 characters
- **Emoji**: Each commit type is paired with an appropriate emoji:
  - ✨ `feat`: New feature
  - 🐛 `fix`: Bug fix
  - 🎨 `design`: UX/UI design changes
  - 📝 `content`: Content/copy
  - 📝 `docs`: Documentation
  - 💄 `style`: Formatting/style
  - ♻️ `refactor`: Code refactoring
  - ⚡️ `perf`: Performance improvements
  - ✅ `test`: Tests
  - 🔧 `chore`: Tooling, configuration
  - 🚀 `ci`: CI/CD improvements
  - 🗑️ `revert`: Reverting changes
  - 🧪 `test`: Add a failing test
  - 🚨 `fix`: Fix compiler/linter warnings
  - 🔒️ `fix`: Fix security issues
  - 👥 `chore`: Add or update contributors
  - 🚚 `refactor`: Move or rename resources
  - 🏗️ `refactor`: Make architectural changes
  - 🔀 `chore`: Merge branches
  - 📦️ `chore`: Add or update compiled files or packages
  - ➕ `chore`: Add a dependency
  - ➖ `chore`: Remove a dependency
  - 🌱 `chore`: Add or update seed files
  - 🧑‍💻 `chore`: Improve developer experience
  - 🧵 `feat`: Add or update code related to multithreading or concurrency
