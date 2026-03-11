# /check-unfinished-tasks — Resume pending work from another agent (Gemini)

Call this command at the start of a session to check whether any agent left unfinished work. If pending tasks exist, resume the highest-priority one.

## Steps

1. **Mark Gemini as available** — update `.agents/agent-config.json`:

   ```json
   "gemini": {
     "available": true
   }
   ```

2. **Check for pending tasks** — read all files matching `.agents/unfinished-tasks/task-*.md` where `status: pending`.

   - If no pending tasks exist, output:
     ```
     No pending unfinished tasks. All clear.
     ```
     and stop.

3. **List available agents** — read `.agents/agent-config.json` and report which agents are currently online/offline:

   ```
   Agent availability:
     [online]  claude
     [online]  gemini
     [offline] codex
   ```

4. **Display pending tasks** — for each pending task file, output:

   ```
   Pending task: .agents/unfinished-tasks/task-{date}-{seq}.md
     created_by: {agent}
     created_at: {timestamp}
     reason:     rate_limit
   ```

5. **Select task to resume** — if only one task exists, select it automatically. If multiple tasks exist, select the oldest one (lowest timestamp in filename).

6. **Mark task as in-progress** — update the selected task file:

   ```
   status: in_progress
   ```

7. **Read and follow Next Steps** — read the `## Next Steps` section of the task file and execute the instructions exactly as written.

   - Treat the Next Steps as a direct continuation of the original user request.
   - Do not skip any step listed there.

8. **On completion:**

   - Run `npm run ci` — it must pass.
   - Update `.agents/AGENTS-CHANGELOG.md` with the completed work.
   - Run `/review` to verify quality.
   - Delete the task file: `rm .agents/unfinished-tasks/task-{date}-{seq}.md`
   - Inform the user the recovered task is complete and ready to `/ship`.

## Notes

- If `npm run ci` fails during recovery, fix the issues before deleting the task file.
- If the task is too large or blocked, update `status: pending` again with additional context in `## Progress Made` and stop — do not delete.
- Never resume a task created by the same agent that is currently running it (a rate-limited agent should not self-resume).
