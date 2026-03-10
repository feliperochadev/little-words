# /ship — Commit and push all unshipped changelog entries

Commit all staged/unstaged changes and push to the remote branch. The commit message is built from every `CLAUDE-CHANGELOG.md` entry that has not yet appeared in the git log.

> **`(apsc)`** — *Agent-Programmed Source Commit*. A marker appended to every commit subject to identify commits where the code changes were authored by an AI agent (Claude). It is not a co-author credit — the human remains the sole git author — but serves as an internal audit trail distinguishing agent-driven work from manually written commits.

## Steps

1. **Branch check** — run `git branch --show-current`. If the current branch is `main` or `master`, stop immediately and ask the user to create a feature branch before shipping. Do not proceed.

2. **Find unshipped changelog entries** — do both of the following:
   - Run `git log --oneline -20` to get recent commit subjects.
   - Read `CLAUDE-CHANGELOG.md` in full.

   Then, working from the top of the changelog (most recent first), collect every entry (heading + content) whose heading ID (e.g. `2026-03-09_5`) does **not** appear in any recent commit subject. Stop collecting when you hit an entry whose ID **is** already in a commit subject — everything from that point is already shipped.

   If all entries are already in git log, stop and tell the user there is nothing new to ship.

3. **Stage changes** — run `git status` to see what is modified/untracked. Stage relevant files (prefer specific file names over `git add -A`; exclude secrets like `.env`).

4. **Commit** — build the commit message from the collected unshipped entries:
   - **Subject line**: all the bold titles from every unshipped entry (`**[tag] Description**` lines), joined with ` / `, followed by ` (apsc)`. Trim to 72 characters if needed.
   - **Body**: the full content of every unshipped entry, in chronological order (most recent first), separated by blank lines. Include the `### YYYY-MM-DD_N` heading for each entry so the history is traceable.
   - Use a HEREDOC to pass the message so formatting is preserved.

5. **Push** — run `git push -u origin <branch>` (the `-u` flag sets the upstream if not already set).

6. **Confirm** — output the commit hash and a one-line summary of how many changelog entries were included.
