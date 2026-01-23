We want a specific formatting for what we will call the "Formatted Session Name". It should only allow filesystem-friendly characters and not allow any spaces.
Format the proposed ($ARGUMENTS) or generated Session name as follows:
Input arguements: `This is an "Example" Session Name`
Formatted Session Name: `this-is-an-example-session-name`

Start a new development session by creating a session file in `.claude/sessions/` with the format `YYYY-MM-DD-HHMM-$ARGUMENTS.md` (or just `YYYY-MM-DD-HHMM.md` if no name provided).

Now we will create a "Git Branch Name" by prefixing the Formatted Session Name with the Type of session (or commit) this session is being classified as. 
* Determine this by prompting the user with a numbered list of ALL commit types from the "Emoji" section in @./claude/commands/save.md, including their emojis and an option for "None". **ALWAYS SHOW ALL THE TYPE OPTIONS, Not Just One For Each Type, but all the options with all the available emojis** When multiple commit types share the same category (e.g., multiple "chore" types), list each one separately with its specific purpose.
* When the user selects a `commit type`, let's use its value (without any emoji) as the "Session Type" for this session. Or if the user selected "None" we will ignore the next steps.
* If we have a Session Type (not equal to "None") let's prepend our Formatted Session Name with our newly obtained Session Type. Here is an example:
    - User starts a session with the command `/session-start My feature session`.
    - Claude formats the arguments to obtain this Formatted Session Name: "my-feature-session".
    - Claude reviews the `commit type`s contained in @./claude/commands/save.md and prompts the user to choose one from a numbered list. The choosen type becomes what we call the "Session Type".
    - Claude combines the Session Type and the Formatted Session Name into this new Git Branch Name using this format: `{Session Type}/{Formatted Session Name}`
    - If the Git Branch Name is more than 62 character long, show the user a list of a few suggested shorter branch names to choose from. Also give the user an option to write their own revised branch name in the prompt. Then continue with the newly choosen or revised Git Branch Name.
* If the "None" option was selected as the Session Type, we will set the Git Branch Name to the Formatted Session Name.
* Claude creates a new git branch from the current branch using the Git Branch Name: `git checkout -b {Git Branch Name}`

The session file should begin with:
1. Unformatted Session Name (original input arguement) and timestamp as the title
2. Session overview section with start time and Git Branch Name
3. Goals section (ask user for goals if not clear)
4. Empty progress section ready for updates

After creating the file, create or update `.claude/sessions/.current-session` to track the active session filename.

Confirm the session has started and remind the user they can:
- Update it with `/session-update`
- End it with `/session-end`