# Update Documentation : Automatically Update All Project Documentation

This command automatically analyzes the project structure and updates all documentation files to keep them in sync with the codebase.

## Usage

To update all documentation files:
```
/update-docs
```

## What This Command Does

1. **Analyze Project Structure**: Scans the entire project to understand:
   - Current modules and components
   - API and type definitions
   - Testing coverage and status
   - Recent changes and additions

2. **Identify Documentation Files**: Automatically discovers all documentation files:

   **Root Documentation Files:**
   - `README.md` (root project README)
   - `CLAUDE.md` (AI assistant instructions and project overview)

   **API Documentation (/docs/):**
   - `docs/API.md` (API reference documentation)
   - `docs/ARCHITECTURE.md` (Technical architecture)
   - `docs/EXAMPLES.md` (Usage examples and patterns)
   - `docs/MIGRATION.md` (Migration guide for consumers)

   **Claude Subagents:**
   - `.claude/agents/*.md` (Specialist subagents)
   - `.claude/commands/*.md` (Slash commands)

   **Any other documentation files discovered during analysis**

3. **Update Documentation**: For each file:
   - Updates feature lists based on implemented functionality
   - Updates module and hook listings
   - Updates type definitions documentation
   - Updates test coverage information (289 tests across 12 files)
   - Maintains consistent information across all docs

4. **Verify Consistency**: Ensures all documentation files contain matching information

5. **Summary Report**: Shows what was updated in each file

## Documentation Update Strategy

### Files to Update

1. **CLAUDE.md** (Project Overview):
   - Project status and version
   - Directory structure (actual, not target)
   - Test coverage stats
   - Consumer app status

2. **README.md**:
   - Features list with current implementation status
   - Installation instructions
   - Quick start examples
   - API overview

3. **docs/API.md**:
   - Complete API documentation
   - Type definitions
   - Hook signatures
   - Component props

4. **docs/ARCHITECTURE.md**:
   - Module structure
   - Provider hierarchy
   - State management patterns

5. **docs/EXAMPLES.md**:
   - Usage examples
   - Integration patterns
   - Common use cases

6. **docs/MIGRATION.md**:
   - Migration steps from direct package usage
   - Breaking changes
   - Compatibility notes

### Update Process

For each documentation file:
1. Read the current content
2. Analyze the entire codebase for relevant information
3. Update sections with accurate, current data
4. Ensure consistency with other documentation
5. Preserve manual content and custom sections

## Best Practices

- **Automatic Analysis**: Always analyzes the project first to ensure accuracy
- **Comprehensive Updates**: Updates ALL documentation files in one pass
- **Consistency**: Ensures all files contain matching information
- **Preserves Custom Content**: Maintains manually added sections
- **Current State**: Reflects the actual implementation, not plans

## Files to NEVER Update

**CRITICAL:** The following files should NEVER be modified by this command:

- **Session Files**: `.claude/sessions/*.md` - These are historical records and must remain unchanged

These files are source material and historical records that should be preserved exactly as created.

## Implementation Steps

1. **Analysis Phase**:
   - Scan project structure using Glob patterns
   - Read and analyze:
     - Source directories (`src/**`)
     - Test files (`**/__tests__/**`)
     - Configuration files
   - **SKIP** all session files

2. **Update Phase**:
   - For each documentation file:
     - **VERIFY** it's not in the exclusion list
     - Identify sections that need updating
     - Update with current, accurate information
     - Maintain formatting and structure
   - Ensure consistency across all files
   - **NEVER** modify session files

3. **Summary Phase**:
   - Provide a detailed summary of all updates made
   - List any new documentation files discovered
   - Confirm that no excluded files were modified
   - DO NOT automatically commit - let user review changes first
