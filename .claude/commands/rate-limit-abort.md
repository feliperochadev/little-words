# /rate-limit-abort — Safe abort when approaching usage quota

Call this command when you detect you are approaching 95% of your available quota mid-task. It reverts all uncommitted work, persists the task context, marks Claude as temporarily unavailable, and exits cleanly so another agent can resume.

**Never call this retroactively.** Call it as soon as you recognise the limit is approaching — before attempting any further tool calls.

## Steps

1. **Stop all work immediately.** Do not attempt any further file edits, commands, or tool calls beyond what is listed here.

2. **Revert uncommitted changes** — run the following in order:

   ```bash
   git reset
   git restore .
   ```

   Verify with `git status` — the working tree must be clean before continuing.

3. **Write the unfinished task file** — create `.agents/unfinished-tasks/task-{date}-{seq}.md` with this structure:

   ```
   # Unfinished Task

   status: pending
   created_by: claude
   created_at: {ISO timestamp}

   reason: rate_limit

   ---

   ## Task Description

   {What the task was — one paragraph}

   ---

   ## Task Context

   {The original user request or command, verbatim if possible}

   ---

   ## Progress Made

   {Bullet list of what was completed before interruption, or "(none)" if nothing was done}

   ---

   ## Files Touched

   {List of files that were modified — these should now be reverted, but list them so the next agent knows where to look}

   ---

   ## Next Steps

   {Explicit step-by-step instructions another agent must follow to complete the task from the beginning}

   ---

   ## Required Checks

   - run npm run ci
   - ensure tests pass
   - update .agents/AGENTS-CHANGELOG.md
   ```

4. **Mark Claude as unavailable** — update `.agents/agent-config.json`:

   ```json
   "claude": {
     "available": false
   }
   ```

5. **Output the following message and stop:**

   ```
   Rate limit protection triggered.
   All uncommitted changes have been reverted.
   Task context saved: .agents/unfinished-tasks/task-{date}-{seq}.md
   Claude marked as unavailable in .agents/agent-config.json

   Another agent (Codex or Gemini) can resume by running /check-unfinished-tasks.
   Claude will re-mark itself available on next invocation.
   ```

## Notes

- The working tree must be clean after Step 2. If `git restore .` fails, report the error and do not proceed.
- Do not delete the task file yourself — it is the handoff artifact.
- Do not run `/ship` before aborting.
